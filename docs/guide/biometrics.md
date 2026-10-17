# Módulo 1: Motor Biométrico & Metas por Objetivo

O Motor Biométrico calcula a Taxa Metabólica Basal (TMB), o Gasto Energético Total (GET / TDEE) e as metas dinâmicas de macronutrientes, permitindo ao usuário escolher entre fornecer a TMB diretamente (ex: exame de bioimpedância) ou recalcular via equação clínica Mifflin-St Jeor, além de definir metas otimizadas por objetivo nutricional.

---

## 🧮 Fontes de Taxa Metabólica Basal (TMB)

O usuário pode definir sua TMB de duas formas complementares:

1. **Exame de Bioimpedância Clínico (`manual_bioimpedance`):**
   - Fornecimento direto do valor exato de TMB medido por bioimpedância médica (ex: InBody, BodPod), eliminando desvios estatísticos de equações populacionais.
2. **Equação Clínica de Mifflin-St Jeor (`mifflin_st_jeor`):**
   - Padrão-ouro clínico calculado a partir do perfil antropométrico:

Para homens:
$$TMB = 10 \times \text{peso (kg)} + 6.25 \times \text{altura (cm)} - 5 \times \text{idade (anos)} + 5$$

Para mulheres:
$$TMB = 10 \times \text{peso (kg)} + 6.25 \times \text{altura (cm)} - 5 \times \text{idade (anos)} - 161$$

---

## ⚡ Gasto Energético Total (GET / TDEE)

O TDEE é determinado pela multiplicação da TMB efetiva pelo fator de atividade física:

$$GET = TMB \times \text{Fator de Atividade}$$

| Nível de Atividade | Fator Multiplicador | Descrição |
| :--- | :--- | :--- |
| **Sedentário** | `1.200` | Pouco ou nenhum exercício diário |
| **Leve** | `1.375` | Exercício leve 1 a 3 dias/semana |
| **Moderado** | `1.550` | Musculação 4x/semana + cardio moderado |
| **Intenso** | `1.725` | Exercício pesado 6 a 7 dias/semana |
| **Atleta** | `1.900` | Treinos 2x ao dia ou atletas de alta performance |

---

## 🎯 Metas e Proporções Recomendadas por Objetivo Nutricional

O motor analítico ajusta a meta calórica e a distribuição matemática dos macronutrientes conforme o objetivo selecionado:

### 1. Emagrecer (`weight_loss` / Cutting)
- **Balanço Energético:** Déficit calórico controlado de **-500 kcal** (respeitando piso de segurança de 1.200 kcal).
- **Proteína:** **2.2 g/kg** (alta proteção da massa magra durante restrição energética).
- **Gorduras:** **0.8 g/kg** (suporte hormonal essencial e saciedade).
- **Carboidratos:** Saldo calórico restante ($(\text{Calorias Alvo} - (\text{Proteína}\times 4 + \text{Gordura}\times 9)) / 4$).

### 2. Manutenção (`maintenance` / Homeostase)
- **Balanço Energético:** Equilíbrio calórico rigoroso ($\Delta = 0$, Calorias = GET).
- **Proteína:** **2.0 g/kg** (homeostase de massa muscular e síntese proteica).
- **Gorduras:** **0.9 g/kg** (lipídios funcionais para perfil lipídico ótimo).
- **Carboidratos:** Saldo calórico restante para energia constante.

### 3. Ganho de Peso (`muscle_gain` / Bulking Limpo)
- **Balanço Energético:** Superávit calórico controlado de **+350 kcal** para maximizar anabolismo minimizando acúmulo de tecido adiposo.
- **Proteína:** **2.0 g/kg** (teto ótimo para saturação da síntese proteica miofibrilar).
- **Gorduras:** **0.9 g/kg**.
- **Carboidratos:** Elevados para máxima reposição de glicogênio muscular e rendimento em treinos de alta sobrecarga.

---

## 🌾 Fibras como Macro Oficial por Idade (DRI)

As fibras alimentares desempenham papel crucial na saciedade, modulação glicêmica e saúde intestinal. No MacroMetrics Pro, a meta de fibras é calculada automaticamente conforme as diretrizes da *Dietary Reference Intakes (DRI)*:

```typescript
export function calculateRecommendedFiber(age: number, gender: Gender): number {
  if (age <= 3) return 19;
  if (age <= 8) return 25;
  if (age <= 13) return gender === 'male' ? 31 : 26;
  if (age <= 50) return gender === 'male' ? 38 : 25;
  return gender === 'male' ? 30 : 21;
}
```

- **Homem adulto padrão (19 a 50 anos):** **38g/dia**
- **Mulher adulta padrão (19 a 50 anos):** **25g/dia**
- **Homem sênior (> 50 anos):** **30g/dia**
- **Mulher sênior (> 50 anos):** **21g/dia**

---

## 🥩 Tetos Proteicos e Travas de Segurança

O sistema suporta travas de proteína customizáveis entre **2.0g/kg e 2.5g/kg**, ou trava máxima fixa de até **240g de proteína/dia**, essenciais para preservar a massa magra durante déficits calóricos acentuados em praticantes de musculação de grande porte.

---

## 🎯 Item 3: Metas de Macros Diárias & Recálculo Bidirecional

No modal de **Controle de Macronutrientes**, a seção **3. Metas de Macros Diárias** conta com um motor matemático bidirecional e reativo:

### 1. Cálculo Automático de Calorias Alvo a partir dos Macros
Sempre que o usuário altera a gramatura de **Proteína**, **Carboidrato** ou **Gordura**, a quantidade de **Calorias Alvo** é recalculada instantaneamente:

$$\text{Calorias Alvo (kcal)} = (P \times 4) + (C \times 4) + (G \times 9)$$

- $P$: Gramas de proteína (4 kcal/g)
- $C$: Gramas de carboidrato (4 kcal/g)
- $G$: Gramas de gordura (9 kcal/g)

### 2. Ajuste Exclusivo de Carboidratos ao Alterar Calorias Alvo
Se o usuário alterar diretamente o campo **Calorias Alvo**, o sistema preserva integralmente as quantidades de proteína (para proteção da massa magra) e gordura (para suporte hormonal), aumentando ou reduzindo **apenas a quantidade de carboidrato**:

$$C_{\text{novo}} = \max\left(0, \text{round}\left(\frac{\text{Calorias Alvo} - (P \times 4 + G \times 9)}{4}\right)\right)$$

Caso a caloria alvo informada seja inferior à soma de calorias fornecidas por proteína e gordura, o carboidrato é delimitado pelo piso de segurança de **0g**, impedindo valores negativos no plano alimentar.

