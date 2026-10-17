# Módulo 5: Banco de Calorias e Macros Semanal & Termômetro Móvel

A fisiologia humana e a recomposição corporal respondem ao **balanço energético semanal consolidado em janela móvel**, e não a cortes artificiais a cada 24 horas.

O Banco de Calorias funciona como um **Termômetro Analítico de Janela Móvel (últimos 7 dias)**, auditando o esforço contínuo ao longo do tempo, quantificando deslizes semanais e alertando riscos com base no objetivo configurado.

---

## 📈 Janela Móvel de 7 Dias & Adesão à Dieta

Em vez de zerar arbitrariamente a cada segunda-feira, o termômetro avalia continuamente os **últimos 7 dias** ($d \in \{1, \dots, 7\}$):

$$\text{Orçamento Alvo da Janela} = \sum_{i=1}^{N} \text{Meta Diária}_i = N \times C_{\text{alvo}}$$

$$\text{Consumo Acumulado} = \sum_{i=1}^{N} C_i^{\text{real}}$$

$$\text{Deslize Semanal } (\text{kcal}) = \text{Consumo Acumulado} - \text{Orçamento Alvo}$$

$$\text{Índice Térmico } (\theta) = \frac{\text{Consumo Acumulado}}{\text{Orçamento Alvo}} \times 100\%$$

### Pontuação de Adesão ($\text{Adesão \%}$)
Mede a consistência e dispersão diária em relação à meta planejada:
$$\text{Desvio Médio Diário} = \frac{1}{N} \sum_{i=1}^{N} \frac{|C_i^{\text{real}} - C_{\text{alvo}}|}{C_{\text{alvo}}}$$
$$\text{Adesão} = \max(0, \min(100, \text{round}((1 - \text{Desvio Médio Diário}) \times 100)))$$

---

## 🌡️ Comportamento do Termômetro por Objetivo (`DietGoal`)

### 1. Perda de Peso (`weight_loss` / Cutting)
* **Objetivo:** Blindar o déficit calórico semanal e preservar massa magra.
* **Estados do Termômetro:**
  * $\theta \le 100\%$: **Zona Ótima (Verde/Ciano Analítico)** — Déficit cumprido com poupança calórica disponível.
  * $100\% < \theta \le 105\%$: **Atenção / Margem Estreita (Âmbar)** — Alerta `WARNING_BUDGET`. Deslize leve absorvível na janela.
  * $\theta > 105\%$: **Termômetro Estourado (Vermelho Crítico / Alerta `BLOWN_BUDGET`)** — O superávit acumulado neutralizou dias de déficit:
    $$\text{Dias Neutralizados} = \frac{\text{Deslize Semanal}}{\text{Déficit Diário Planejado}}$$

### 2. Ganho de Peso (`weight_gain` / Bulking)
* **Objetivo:** Manter ambiente anabólico hipertrófico contínuo. O risco crítico é o **subconsumo calórico involuntário**.
* **Estados do Termômetro:**
  * $\theta \ge 98\%$: **Zona Anabólica Ótima (Verde/Azul Analítico)** — Superávit sustentado.
  * $90\% \le \theta < 98\%$: **Atenção (Âmbar / `WARNING_LOW_CALORIES`)** — Superávit abaixo do planejado.
  * $\text{Consumo Acumulado} < (N \times TDEE)$: **Termômetro Congelado (Azul Gélido / Alerta Crítico `CRITICAL_WEIGHT_LOSS`)** — O usuário entrou em déficit involuntário:
    $$\Delta \text{Peso Projetado (kg)} = \frac{\text{Consumo Acumulado} - (N \times TDEE)}{7.700}$$
    Alerta matemático de risco iminente de catabolismo proteico e perda ponderal de peso corporal.

### 3. Manutenção (`maintenance` / Homeostase)
* **Objetivo:** Manter peso estável com flutuações calóricas controladas em torno do GET/TDEE.
* **Estados do Termômetro (Nível Central / Calibrador):**
  * $| \theta - 100\% | \le \text{Tolerância \%}$ (padrão: $\pm 3\%$): **Homeostase / Nível Equilibrado (Esmeralda)**.
  * $\theta > 100\% + \text{Tolerância \%}$: **Desvio de Manutenção para Cima (Âmbar / `MAINTENANCE_DRIFT_HIGH`)** — Risco de ganho indesejado.
  * $\theta < 100\% - \text{Tolerância \%}$: **Desvio de Manutenção para Baixo (Âmbar / `MAINTENANCE_DRIFT_LOW`)** — Risco de perda indesejada.
