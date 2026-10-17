import { describe, it, expect } from 'vitest';
import {
  solveProteinDeficit,
  PROTEIN_SOURCES,
  calculateMultiProteinSelection,
  suggestGramsForSource,
} from '../src/protein-solver.js';

describe('Auto-Completar Proteína Solver (Módulo 3)', () => {
  it('deve calcular a porção exata de filé de sassami desfiado para bater o déficit proteico', () => {
    // Faltam 48g de proteína e restam 300 kcal
    // Sassami Growth/Padrão: 100g = 31g P, 0g C, 3.6g G, 156.4 kcal (ou 165 kcal)
    const solution = solveProteinDeficit({
      missingProteinGrams: 48,
      remainingCalories: 300,
      preferredSource: 'sassami',
    });

    expect(solution.sourceName).toBe('Filé de Sassami Desfiado');
    // Para 48g com 31g/100g: 48 / 0.31 = 154.8g -> aprox 155g
    expect(solution.gramsNeeded).toBeCloseTo(155, 0);
    expect(solution.proteinProvided).toBeCloseTo(48, 1);
    expect(solution.caloriesAdded).toBeLessThanOrEqual(260);
    expect(solution.fitsInRemainingCalories).toBe(true);
  });

  it('deve calcular scoops e gramas de Whey Protein Growth para zerar déficit', () => {
    // Faltam 36g de proteína
    // Whey Growth: scoop 30g = 24g P, 3g C, 1.8g G, 124 kcal
    const solution = solveProteinDeficit({
      missingProteinGrams: 36,
      remainingCalories: 300,
      preferredSource: 'whey_growth',
    });

    expect(solution.sourceName).toBe('Whey Protein Concentrado (Growth)');
    // 36g P a 0.8g P/g -> 45g (1.5 scoops de 30g)
    expect(solution.gramsNeeded).toBe(45);
    expect(solution.scoopsNeeded).toBe(1.5);
    expect(solution.proteinProvided).toBe(36);
    expect(solution.fitsInRemainingCalories).toBe(true);
  });

  it('deve sinalizar quando a quantidade necessária de proteína ultrapassa as calorias restantes', () => {
    // Faltam 80g de proteína, mas só restam 200 kcal
    const solution = solveProteinDeficit({
      missingProteinGrams: 80,
      remainingCalories: 200,
      preferredSource: 'sassami',
    });

    expect(solution.fitsInRemainingCalories).toBe(false);
    expect(solution.calorieOverhead).toBeGreaterThan(0);
    expect(solution.warning).toContain('ultrapassará o orçamento calórico');
  });

  it('deve fornecer as fontes padrão da dieta real (Sassami, Whey, Claras de Ovo)', () => {
    expect(PROTEIN_SOURCES.sassami).toBeDefined();
    expect(PROTEIN_SOURCES.whey_growth).toBeDefined();
    expect(PROTEIN_SOURCES.egg_whites).toBeDefined();
  });

  describe('Modal de Auto-Completar Proteína com Múltiplas Fontes (Tracking Interativo)', () => {
    it('deve calcular em tempo real quanto falta para atingir a meta conforme o usuário especifica as gramas', () => {
      // Faltam 50g de proteína no dia, restam 500 kcal
      const result = calculateMultiProteinSelection({
        missingProteinGrams: 50,
        remainingCalories: 500,
        selections: [
          { sourceId: 'sassami', grams: 100 }, // 31g P, 165 kcal
        ],
      });

      expect(result.totalProteinSelected).toBeCloseTo(31.0, 1);
      expect(result.remainingProteinDeficit).toBeCloseTo(19.0, 1);
      expect(result.status).toBe('missing');
      expect(result.fitsInRemainingCalories).toBe(true);
      expect(result.calorieOverhead).toBe(0);
      expect(result.totalCaloriesSelected).toBe(165);
    });

    it('deve somar múltiplas fontes (ex: Sassami + Whey) e informar quando atinge ou supera a meta', () => {
      const result = calculateMultiProteinSelection({
        missingProteinGrams: 50,
        remainingCalories: 500,
        selections: [
          { sourceId: 'sassami', grams: 100 }, // 31g P, 165 kcal
          { sourceId: 'whey_growth', grams: 30 }, // 24g P, 124 kcal
        ],
      });

      // Total P = 31 + 24 = 55g (supera em 5g)
      expect(result.totalProteinSelected).toBeCloseTo(55.0, 1);
      expect(result.remainingProteinDeficit).toBeCloseTo(-5.0, 1);
      expect(result.status).toBe('surplus');
      expect(result.fitsInRemainingCalories).toBe(true);
      expect(result.totalCaloriesSelected).toBe(289);
    });

    it('deve alertar sobrecarga calórica se a combinação escolhida ultrapassar as calorias restantes', () => {
      const result = calculateMultiProteinSelection({
        missingProteinGrams: 60,
        remainingCalories: 200,
        selections: [
          { sourceId: 'sassami', grams: 200 }, // 62g P, 330 kcal
        ],
      });

      expect(result.fitsInRemainingCalories).toBe(false);
      expect(result.calorieOverhead).toBe(130); // 330 - 200
      expect(result.warning).toContain('ultrapassará o orçamento calórico');
    });

    it('deve sugerir a gramatura exata para completar o restante com uma fonte específica', () => {
      // Faltam 24g de proteína restante
      const wheyGrams = suggestGramsForSource(PROTEIN_SOURCES.whey_growth, 24);
      // Whey tem 80g P / 100g -> 24 / 0.8 = 30g
      expect(wheyGrams).toBe(30);

      const sassamiGrams = suggestGramsForSource(PROTEIN_SOURCES.sassami, 31);
      // Sassami tem 31g P / 100g -> 31 / 0.31 = 100g
      expect(sassamiGrams).toBe(100);

      // Se não falta nada (ou já superou), deve sugerir 0g
      expect(suggestGramsForSource(PROTEIN_SOURCES.sassami, 0)).toBe(0);
      expect(suggestGramsForSource(PROTEIN_SOURCES.sassami, -5)).toBe(0);
      expect(suggestGramsForSource({ ...PROTEIN_SOURCES.sassami, proteinPer100g: 0 }, 10)).toBe(0);
    });

    it('deve retornar status reached quando a quantidade selecionada atinge exatamente a meta', () => {
      const result = calculateMultiProteinSelection({
        missingProteinGrams: 31,
        remainingCalories: 300,
        selections: [
          { sourceId: 'sassami', grams: 100 },
          { sourceId: 'unknown_source', grams: 50 }, // fonte desconhecida deve ser ignorada
          { sourceId: 'whey_growth', grams: 0 }, // 0g deve ser ignorado
        ],
      });

      expect(result.remainingProteinDeficit).toBe(0);
      expect(result.status).toBe('reached');
      expect(result.items.length).toBe(1);
    });

    it('deve suportar fontes customizadas de proteína', () => {
      const customSources = {
        tilapia: {
          id: 'tilapia',
          name: 'Filé de Tilápia Grelhado',
          proteinPer100g: 26,
          carbsPer100g: 0,
          fatPer100g: 2.5,
          caloriesPer100g: 128,
        },
      };

      const result = calculateMultiProteinSelection({
        missingProteinGrams: 26,
        remainingCalories: 200,
        selections: [{ sourceId: 'tilapia', grams: 100 }],
        customSources,
      });

      expect(result.totalProteinSelected).toBe(26);
      expect(result.items[0]!.source.name).toBe('Filé de Tilápia Grelhado');
    });
  });
});

