import { VertexAI } from '@google-cloud/vertexai';

export interface NutritionalDensity {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface AnalyzedFoodItem {
  name: string;
  estimatedGrams: number;
  confidence: 'high' | 'medium' | 'low';
  clarificationNote?: string;
  per100g: NutritionalDensity;
}

export interface PhotoAnalysisResult {
  isFoodIdentified: boolean;
  feedbackMessage: string;
  items: AnalyzedFoodItem[];
}

export interface AnalyzePhotoInput {
  imageBase64: string;
  mimeType: string;
  description?: string;
}

export interface VertexPhotoAnalysisServiceOptions {
  vertexAIClient?: VertexAI;
  projectId?: string;
  region?: string;
  modelName?: string;
}

export const PHOTO_ANALYSIS_SYSTEM_INSTRUCTION = `Você é o analisador nutricional multimodal de fotos do MacroMetrics Pro (dieta-ai).
Sua missão é avaliar a foto do prato enviada pelo usuário, identificar os alimentos visíveis, estimar suas porções em gramas e calcular sua densidade nutricional por 100g (calorias, proteínas, carboidratos, gorduras e fibras).

DIRETRIZES CENTRAIS E REGRAS DE EXECUÇÃO:
1. VERIFICAÇÃO DE ALIMENTO:
   - Se a imagem NÃO for de um prato de comida ou alimentos reconhecíveis (ex: objetos inanimados, paisagens, fotos sem comida, etc.), defina "isFoodIdentified": false e explique em "feedbackMessage" que nenhum alimento foi detectado, solicitando uma nova foto nítida e iluminada da refeição. Defina "items": [].
   - Se contiver comida, defina "isFoodIdentified": true.

2. IDENTIFICAÇÃO DE ITENS E DENSIDADE NUTRICIONAL:
   - Isole cada componente visível do prato (ex: carnes, arroz, feijão, saladas, molhos, massas, etc.).
   - Para cada item, forneça a estimativa de porção em gramas ("estimatedGrams") e a densidade nutricional rigorosa para 100g do alimento ("per100g": calories, protein, carbs, fat, fiber) baseando-se em tabelas confiáveis (TACO, IBGE ou USDA).

3. REGRA CRÍTICA DE INCERTEZA (BAIXA TOLERÂNCIA A SUPOSIÇÕES OCULTAS):
   - Nunca faça suposições veladas sobre métodos de preparo que impactem macronutrientes (especialmente gorduras e calorias).
   - Se houver qualquer dúvida ou ambiguidade (ex: frango grelhado vs frito, presença de azeite/manteiga, corte de carne específico, teor de queijo ou molho oculto), preencha o campo "clarificationNote" explicando a incerteza e a suposição adotada para que o usuário possa validar no modal.
   - Atribua o nível de certeza ("confidence": "high" | "medium" | "low"). Havendo qualquer incerteza razoável, use "medium" ou "low".

4. CONSIDERAÇÃO DA DESCRIÇÃO DO USUÁRIO:
   - Se o usuário forneceu uma descrição prévia do prato, utilize-a como forte indicativo de ingredientes e preparo para guiar e refinar a análise visual.

5. FORMATO DE SAÍDA:
   - Retorne SEMPRE E EXCLUSIVAMENTE um objeto JSON válido, sem texto introdutório ou markdown externo, respeitando a estrutura:
   {
     "isFoodIdentified": boolean,
     "feedbackMessage": string,
     "items": [
       {
         "name": string,
         "estimatedGrams": number,
         "confidence": "high" | "medium" | "low",
         "clarificationNote": string (opcional),
         "per100g": {
           "calories": number,
           "protein": number,
           "carbs": number,
           "fat": number,
           "fiber": number
         }
       }
     ]
   }`;

export const DEFAULT_PHOTO_ANALYSIS_MODEL = 'gemini-2.5-flash-image';

export class VertexPhotoAnalysisService {
  private readonly vertexAI: VertexAI;
  private readonly region: string;
  private readonly modelName: string;
  private readonly projectId: string;

  constructor(options: VertexPhotoAnalysisServiceOptions = {}) {
    this.region = options.region || process.env.GCP_REGION || 'us-central1';
    this.projectId = options.projectId || process.env.GCP_PROJECT_ID || 'thcborges-dieta-ai-dev';
    this.modelName =
      options.modelName ||
      process.env.VERTEX_AI_PHOTO_MODEL ||
      process.env.VERTEX_AI_MODEL ||
      DEFAULT_PHOTO_ANALYSIS_MODEL;

    this.vertexAI =
      options.vertexAIClient ||
      new VertexAI({
        project: this.projectId,
        location: this.region,
      });
  }

  public getModelName(): string {
    return this.modelName;
  }

  public getRegion(): string {
    return this.region;
  }

  public async analyzeMealPhoto(input: AnalyzePhotoInput): Promise<PhotoAnalysisResult> {
    const generationConfig: Record<string, any> = {
      temperature: 0.1, // Temperatura baixa para consistência analítica
      maxOutputTokens: 1000,
    };
    if (!this.modelName.includes('flash-image')) {
      generationConfig.responseMimeType = 'application/json';
    }

    const generativeModel = this.vertexAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: PHOTO_ANALYSIS_SYSTEM_INSTRUCTION,
      generationConfig,
    });

    // Sanitiza base64 removendo prefixos data:image/...;base64, se existirem
    const cleanBase64 = input.imageBase64.includes(',')
      ? input.imageBase64.split(',')[1]
      : input.imageBase64;

    const promptParts: any[] = [
      {
        inlineData: {
          mimeType: input.mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      },
    ];

    const userText = input.description
      ? `Descrição prévia informada pelo usuário sobre o prato: "${input.description}". Avalie a imagem e extraia os itens nutricionais.`
      : 'Avalie a imagem do prato em anexo e extraia os itens e macronutrientes conforme as instruções.';

    promptParts.push({ text: userText });

    const response = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: promptParts }],
    });

    const responseContent =
      response.response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Remove eventuais marcadores markdown ```json ... ``` se retornados
    const sanitizedText = responseContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(sanitizedText);

    return {
      isFoodIdentified: Boolean(parsed.isFoodIdentified),
      feedbackMessage:
        parsed.feedbackMessage ||
        (parsed.isFoodIdentified
          ? 'Alimentos identificados com sucesso.'
          : 'Nenhum alimento detectado na imagem.'),
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item: any) => ({
            name: String(item.name || 'Alimento').trim(),
            estimatedGrams: Math.max(0, Number(item.estimatedGrams) || 0),
            confidence: ['high', 'medium', 'low'].includes(item.confidence)
              ? item.confidence
              : 'medium',
            clarificationNote: item.clarificationNote
              ? String(item.clarificationNote).trim()
              : undefined,
            per100g: {
              calories: Math.max(0, Math.round(Number(item.per100g?.calories) || 0)),
              protein: Math.max(0, Math.round((Number(item.per100g?.protein) || 0) * 10) / 10),
              carbs: Math.max(0, Math.round((Number(item.per100g?.carbs) || 0) * 10) / 10),
              fat: Math.max(0, Math.round((Number(item.per100g?.fat) || 0) * 10) / 10),
              fiber: Math.max(0, Math.round((Number(item.per100g?.fiber) || 0) * 10) / 10),
            },
          }))
        : [],
    };
  }
}

export const vertexPhotoAnalysisService = new VertexPhotoAnalysisService();
