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

## ⚡ Botão "Auto-Completar Proteína" (Solver Matemático)

Quando restam proteínas para atingir a meta diária e há margem calórica suficiente, o usuário não precisa fazer contas de cabeça. 

O solver calcula a gramatura exata necessária de uma fonte pura de proteína (como Sassami ou Whey Protein) para zerar o déficit proteico:

$$\text{Gramas Necessárias} = \frac{P_{faltante}}{\text{Proteína por grama do alimento}}$$

O algoritmo verifica ainda se as gorduras e calorias associadas à porção calculada respeitam o teto calórico restante.

---

## 🔄 Cópia Ágil de Refeições & Módulo de Receitas

- **Cópia de Refeições:** Duplicação instantânea de refeições de dias anteriores ou entre janelas (ex: replicar o almoço de ontem no almoço de hoje com um clique).
- **Módulo de Receitas Compostas:** Criação de preparações culinárias (como bolos de whey, cappuccino proteico ou tortas fit), armazenando o rendimento total e permitindo o lançamento no diário em frações ou porções fracionadas.
