# Módulo 2: Simulador de Buffer de Evento Social

O diferencial primordial do MacroMetrics Pro é a **Engenharia Reversa de Macronutrientes**. 

Em vez de registrar passivamente excessos calóricos após o fato (o que gera frustração e abandono da dieta), o usuário planeja o evento social com antecedência.

---

## 🍕 Presets de Eventos Hipercalóricos

O simulador disponibiliza presets realistas calibrados com precisão nutricional:

- **Noite da Pizza (3 a 4 fatias):** ~1.400 kcal, 48g proteína, 150g carboidratos, 65g gorduras, 6g fibras.
- **Festa Infantil (Salgadinhos e Doces):** ~1.100 kcal, 22g proteína, 130g carboidratos, 55g gorduras, 4g fibras.
- **Churrasco / Almoço de Família:** ~1.350 kcal, 115g proteína, 25g carboidratos, 85g gorduras, 2g fibras.
- **Input Customizado:** Permite ao usuário informar os macros exatos do evento planejado.

---

## 📊 Orçamento Limpo Restante

Ao selecionar o evento social, o sistema subtrai imediatamente os valores do orçamento diário total:

$$Kcal_{restante} = Kcal_{meta} - Kcal_{evento}$$
$$P_{restante} = P_{meta} - P_{evento}$$
$$C_{restante} = C_{meta} - C_{evento}$$
$$G_{restante} = G_{meta} - G_{evento}$$
$$F_{restante} = F_{meta} - F_{evento}$$

---

## 🔍 Índice de Densidade Proteica Exigida

O sistema calcula a métrica crítica:

$$\text{Densidade Proteica Exigida} = \frac{P_{restante}}{Kcal_{restante}} \times 100 \quad (\text{g de proteína por 100 kcal})$$

### Classificação do Risco de Densidade:
- **Normal ($\le 12 \text{ g/100 kcal}$):** O usuário pode consumir alimentos convencionais (arroz, feijão, frango, ovos).
- **Atenção ($12 \text{ a } 18 \text{ g/100 kcal}$):** O dia exigirá priorização de fontes magras de proteína.
- **Crítico ($> 18 \text{ g/100 kcal}$):** O dia exigirá quase exclusivamente fontes puras de proteína magra (Sassami desfiado, claras de ovo, Whey isolado).
- **Inviabilidade Matemática ($P_{restante} \times 4 > Kcal_{restante}$):** O evento social consumiu calorias em excesso, tornando fisicamente impossível atingir a meta proteica sem ultrapassar o teto calórico.
