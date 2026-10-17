# Módulo 1: Motor Biométrico & Fibras por Idade

O Motor Biométrico calcula a Taxa Metabólica Basal (TMB), o Gasto Energético Total (GET / TDEE) e as metas dinâmicas de macronutrientes, tratando as fibras como macro oficial de primeira classe.

---

## 🧮 Fórmulas e Algoritmos

### 1. Taxa Metabólica Basal (Mifflin-St Jeor)

A fórmula de Mifflin-St Jeor é considerada o padrão-ouro clínico para estimativa de gasto energético:

Para homens:
$$TMB = 10 \times \text{peso (kg)} + 6.25 \times \text{altura (cm)} - 5 \times \text{idade (anos)} + 5$$

Para mulheres:
$$TMB = 10 \times \text{peso (kg)} + 6.25 \times \text{altura (cm)} - 5 \times \text{idade (anos)} - 161$$

### 2. Gasto Energético Total (GET / TDEE)
O TDEE é determinado pela multiplicação da TMB pelo fator de atividade física:

| Nível de Atividade | Fator Multiplicador | Descrição |
| :--- | :--- | :--- |
| **Sedentário** | `1.200` | Pouco ou nenhum exercício diário |
| **Leve** | `1.375` | Exercício leve 1 a 3 dias/semana |
| **Moderado** | `1.550` | Musculação 4x/semana + cardio moderado |
| **Muito Ativo** | `1.725` | Exercício intenso 6 a 7 dias/semana |
| **Extremamente Ativo**| `1.900` | Atletas profissionais ou trabalho braçal intenso |

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

## 🥩 Tetos Proteicos Agressivos

O sistema suporta travas de proteína customizáveis entre **2.0g/kg e 2.5g/kg**, ou valores fixos de até **240g de proteína/dia**, essenciais para preservar a massa muscular durante déficits calóricos acentuados em praticantes de musculação.

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

