import { describe, it, expect } from 'vitest';
import {
  solveProteinDeficit,
  PROTEIN_SOURCES,
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
});
