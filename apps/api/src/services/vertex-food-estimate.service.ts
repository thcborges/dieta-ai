import { VertexAI } from '@google-cloud/vertexai';

export interface FoodEstimateInput {
  foodName: string;
  portionGrams?: number;
}

export interface FoodEstimateResult {
  foodName: string;
  servingSizeGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  confidence: 'high' | 'medium' | 'low';
  sourceNote?: string;
}

export interface VertexFoodEstimateServiceOptions {
  vertexAIClient?: VertexAI;
  projectId?: string;
  region?: string;
  modelName?: string;
}

export const FOOD_ESTIMATE_SYSTEM_INSTRUCTION = `Você é o analisador e estimador nutricional analítico do MacroMetrics Pro (dieta-ai).
Sua missão é receber o nome de um alimento e opcionalmente uma porção informada pelo usuário, consultando ou calculando com precisão técnica a partir de tabelas nutricionais padrão confiáveis (TACO, IBGE ou USDA) os valores de macronutrientes e calorias.

DIRETRIZES CENTRAIS:
1. PRECISÃO TÉCNICA E OBJETIVIDADE:
   - Seja direto, analítico e objetivo, sem floreios ou conversas desnecessárias, priorizando a precisão técnica dos macronutrientes.
   - Forneça a densidade nutricional por 100g de alimento ("caloriesPer100g", "proteinPer100g", "carbsPer100g", "fatPer100g", "fiberPer100g").
   - Se o usuário especificou uma porção em gramas ("portionGrams"), adote-a como "servingSizeGrams". Se não especificado, adote 100g ou a porção padrão usual de consumo (ex: 1 pote de 120g, 1 fatia de 30g, etc.) em gramas.
   - O cálculo calórico total deve ser consistente com a regra dos 4-4-9 (P*4 + C*4 + G*9) com pequenas variações naturais de tabelas de alimentos.

2. FORMATO DE SAÍDA:
   - Retorne SEMPRE E EXCLUSIVAMENTE um objeto JSON válido, sem texto introdutório ou markdown externo, respeitando a estrutura:
   {
     "foodName": string,
     "servingSizeGrams": number,
     "caloriesPer100g": number,
     "proteinPer100g": number,
     "carbsPer100g": number,
     "fatPer100g": number,
     "fiberPer100g": number,
     "confidence": "high" | "medium" | "low",
     "sourceNote": string
   }`;

export const DEFAULT_FOOD_ESTIMATE_MODEL = 'gemini-1.5-flash';
export const FALLBACK_FOOD_ESTIMATE_MODELS = [
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-001',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash',
];

export class VertexFoodEstimateService {
  private readonly vertexAI: VertexAI;
  private readonly region: string;
  private readonly modelName: string;
  private readonly fallbackModels: string[];
  private readonly projectId: string;

  constructor(options: VertexFoodEstimateServiceOptions = {}) {
    this.region = options.region || process.env.GCP_REGION || 'us-central1';
    this.projectId = options.projectId || process.env.GCP_PROJECT_ID || 'thcborges-dieta-ai-dev';
    this.modelName =
      options.modelName ||
      process.env.VERTEX_AI_FOOD_ESTIMATE_MODEL ||
      process.env.VERTEX_AI_MODEL ||
      DEFAULT_FOOD_ESTIMATE_MODEL;

    const envFallbacks = process.env.VERTEX_AI_FALLBACK_MODELS
      ? process.env.VERTEX_AI_FALLBACK_MODELS.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    this.fallbackModels = envFallbacks.length > 0 ? envFallbacks : FALLBACK_FOOD_ESTIMATE_MODELS;

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

  public getFallbackModels(): string[] {
    return [...this.fallbackModels];
  }

  public getRegion(): string {
    return this.region;
  }

  public async estimateFoodNutrition(input: FoodEstimateInput): Promise<FoodEstimateResult> {
    const modelsToTry = [
      this.modelName,
      ...this.fallbackModels.filter((m) => m !== this.modelName),
    ];

    let lastError: any = null;
    for (const candidate of modelsToTry) {
      try {
        const generativeModel = this.vertexAI.getGenerativeModel({
          model: candidate,
          systemInstruction: FOOD_ESTIMATE_SYSTEM_INSTRUCTION,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 150,
          },
        });

        const userText = input.portionGrams
          ? `@macro-metrics-estimativa "${input.foodName}" ${input.portionGrams}g`
          : `@macro-metrics-estimativa "${input.foodName}" 100g`;

        const response = await generativeModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: userText }] }],
        });

        const responseContent =
          response.response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        const sanitizedText = responseContent
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const parsed = JSON.parse(sanitizedText);

        const p = Math.max(0, Math.round((Number(parsed.proteinPer100g) || 0) * 10) / 10);
        const c = Math.max(0, Math.round((Number(parsed.carbsPer100g) || 0) * 10) / 10);
        const f = Math.max(0, Math.round((Number(parsed.fatPer100g) || 0) * 10) / 10);
        const fib = Math.max(0, Math.round((Number(parsed.fiberPer100g) || 0) * 10) / 10);

        const calculatedCalories = Math.round(p * 4 + c * 4 + f * 9);
        const finalCalories =
          parsed.caloriesPer100g !== undefined
            ? Math.max(0, Math.round(Number(parsed.caloriesPer100g) || 0))
            : calculatedCalories;

        return {
          foodName: String(parsed.foodName || input.foodName).trim(),
          servingSizeGrams: Math.max(
            1,
            Math.round(Number(parsed.servingSizeGrams) || input.portionGrams || 100)
          ),
          caloriesPer100g: finalCalories,
          proteinPer100g: p,
          carbsPer100g: c,
          fatPer100g: f,
          fiberPer100g: fib,
          confidence: ['high', 'medium', 'low'].includes(parsed.confidence)
            ? parsed.confidence
            : 'high',
          sourceNote: parsed.sourceNote ? String(parsed.sourceNote).trim() : 'Estimativa analítica IA',
        };
      } catch (err: any) {
        lastError = err;
        const isNotFound =
          err?.status === 404 ||
          String(err?.message || '').includes('not found') ||
          String(err?.message || '').includes('NOT_FOUND');
        if (!isNotFound) {
          throw new Error(`Falha na estimativa nutricional pelo Vertex AI: ${err.message || String(err)}`);
        }
      }
    }

    throw new Error(`Falha na estimativa nutricional pelo Vertex AI: ${lastError?.message || String(lastError)}`);
  }
}

export const vertexFoodEstimateService = new VertexFoodEstimateService();
