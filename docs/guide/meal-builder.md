# Módulo 3: Construtor de Refeições & Solver de Proteína

O Construtor de Refeições oferece uma interface analítica ágil inspirada na ergonomia do Cronometer, com janelas temporais lógicas e solvers matemáticos embutidos.

---

## 🍽️ Janelas Práticas de Consumo

O dia é organizado em quatro janelas temporais de alta aderência:
1. **Café da Manhã / Pré-Treino**
2. **Almoço**
3. **Lanche da Tarde**
4. **Jantar / Evento**

### Sugestões Contextuais por Refeição
Para eliminar atrito na busca, os alimentos sugeridos priorizam a frequência de consumo específica da janela. Alimentos habituais do café da manhã (como ovos, pão e café com whey) não poluem as sugestões do almoço.

---

## 🍗 Banco de Alimentos Realista

O sistema é pré-populado com os alimentos essenciais consumidos na rotina de praticantes de musculação e entusiastas de alimentação limpa:

| Alimento | Porção Base | Calorias | Proteínas | Carboidratos | Gorduras | Fibras |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Sassami Desfiado Cozido** | 100g | 120 kcal | 26.0g | 0.0g | 1.8g | 0.0g |
| **Ovo Inteiro Cozido** | 50g (1 unid) | 78 kcal | 6.5g | 0.6g | 5.3g | 0.0g |
| **Clara de Ovo Pasteurizada** | 100g | 52 kcal | 11.0g | 0.7g | 0.2g | 0.0g |
| **Whey Protein Concentrado 80%** | 30g | 121 kcal | 24.0g | 2.2g | 1.8g | 0.0g |
| **Feijão Preto Cozido** | 100g | 77 kcal | 4.5g | 14.0g | 0.5g | 4.8g |
| **Batata Doce Cozida** | 100g | 77 kcal | 0.6g | 18.4g | 0.1g | 2.2g |
| **Arroz Branco Cozido** | 100g | 128 kcal | 2.5g | 28.1g | 0.2g | 0.4g |
| **Pão Integral (2 fatias)** | 50g | 120 kcal | 5.0g | 22.0g | 1.5g | 3.5g |

---

## ⚡ Botão "Auto-Completar Proteína" (Modal & Solver Interativo)

Quando restam proteínas para atingir a meta diária e há margem calórica suficiente, o usuário conta com um **Modal Interativo de Planejamento de Proteínas**:

1. **Lista de Fontes Proteicas:** Exibe as opções mais eficientes da dieta (Filé de Sassami Desfiado, Whey Protein Growth, Claras de Ovo Pasteurizadas, etc.) e alimentos proteicos cadastrados.
2. **Entrada Personalizada de Gramas:** O usuário informa a quantidade exata que planeja ingerir de cada alimento.
3. **Cálculo Reativo em Tempo Real:** Conforme as gramaturas são digitadas, o modal calcula instantaneamente:
   - **Proteína Planejada vs. Meta:** Quanto já foi suprido e quanto ainda falta ($P_{restante} = P_{meta} - \sum P_{selecionado}$).
   - **Feedback Visual de Status:** Alerta se faltam gramas, se a meta foi atingida com perfeição ($0.0\text{g}$) ou se foi superada.
   - **Auditoria de Orçamento Calórico:** Valida se as calorias associadas cabem no teto calórico diário restante, sinalizando sobrecargas ($Kcal_{adicionadas} > Kcal_{restantes}$).
4. **Botão de Atalho "Completar restante":** Calcula automaticamente a porção precisa de qualquer alimento para zerar o déficit residual:

$$\text{Gramas Necessárias} = \frac{P_{residual}}{\text{Proteína por grama do alimento}}$$

5. **Lançamento Direto no Diário:** Permite escolher a janela de refeição de destino e adiciona os alimentos selecionados em uma única confirmação.

---

## 🔍 Busca Inteligente & Cache de Alimentos (Open Food Facts + Banco Local)

Para flexibilidade máxima sem lentidão, o cadastro e seleção de alimentos segue um fluxo hierárquico implacável:

1. **Consulta Prioritária ao Banco de Dados Local (Cache Global / Firestore):**
   - Ao digitar no campo de busca ou escanear um código de barras, o sistema consulta primeiro a base local e os alimentos já cacheados ou cadastrados.
   - Retorno imediato em memória com latência inferior a 10ms.
2. **Fallback Automático para API do Open Food Facts:**
   - Caso o alimento não exista no banco de dados, o backend consulta a API oficial do **Open Food Facts** (`world.openfoodfacts.org`).
   - Os dados nutricionais (calorias, proteínas, carboidratos, gorduras, fibras e porção) são normalizados automaticamente.
3. **Persistência Imediata no Banco de Dados (Cache Global):**
   - Todo alimento descoberto no Open Food Facts é imediatamente salvo no Firestore/banco local como cache de primeiro nível, garantindo que buscas subsequentes ocorram instantaneamente.
4. **Cadastro Rápido de Novo Alimento (Formulário M3):**
   - Caso o alimento não conste em nenhuma base ou seja uma preparação caseira, o usuário conta com o modal **"+ Novo Alimento"**.
   - Interface Material Design 3 com validação em tempo real de macronutrientes por 100g e tamanho de porção, sincronizando offline-first com o diário e com a API.

---

## 🔄 Cópia Ágil de Refeições & Módulo de Receitas

- **Cópia de Refeições:** Duplicação instantânea de refeições de dias anteriores ou entre janelas (ex: replicar o almoço de ontem no almoço de hoje com um clique).
- **Módulo de Receitas Compostas:** Criação de preparações culinárias (como bolos de whey, cappuccino proteico ou tortas fit), armazenando o rendimento total e permitindo o lançamento no diário em frações ou porções fracionadas.

---

## ☁️ Persistência Duradoura no Firestore (Offline-First & Blind Indexing)

Os alimentos cadastrados e lançados no diário alimentar são persistidos no **Google Cloud Firestore (Native Mode)** com garantia de privacidade e conformidade estrita com a **LGPD**:

- **Chave de Documento Pseudo-Anonimizada:** A chave do diário combina o identificador pseudo-anonimizado do usuário via **Blind Indexing (HMAC-SHA256 com pepper seguro)** e a data da refeição (`${blindUserId}_${date}`). O Google Subject ID ou e-mail nunca é exposto em texto plano.
- **Auditoria Matemática Automática dos Totais:** A cada gravação (`PUT /api/v1/diaries/:date`), o serviço backend recalcula com precisão analítica os totais de calorias, proteínas, carboidratos, gorduras e fibras.
- **Sincronização Bidirecional Offline-First:** O frontend mantém o cache local instantâneo via `localStorage` e sincroniza em segundo plano com as rotas REST do Cloud Run:
  - `GET /api/v1/diaries/:date`: Consulta diário e restaura estado em caso de troca de dispositivo ou recarregamento.
  - `PUT /api/v1/diaries/:date`: Persistência completa do mapa de refeições (`breakfast`, `lunch`, `afternoon_snack`, `dinner_event`).
  - `POST /api/v1/diaries/:date/meals/:window`: Inclusão direta de alimento em uma refeição específica.
  - `DELETE /api/v1/diaries/:date/meals/:window/:itemId`: Remoção granular de item do Firestore.
- **Expurgo Total de Dados (Direito ao Esquecimento LGPD):** Quando o usuário ou o administrador aciona a exclusão da conta, todos os registros de diários associados àquele usuário no Firestore são permanentemente deletados.

