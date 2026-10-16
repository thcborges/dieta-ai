import { describe, it, expect } from 'vitest';
import {
  calculateEventBuffer,
  EVENT_PRESETS,
  type MacroBudget,
  type EventBufferInput,
} from '../src/reverse-buffer.js';

describe('Social Event Buffer Simulator (Módulo 2: Engenharia Reversa)', () => {
  const dailyTarget: MacroBudget = {
    calories: 2200,
    proteinGrams: 220,
    carbGrams: 180,
    fatGrams: 67,
  };

  it('deve abater o preset de Pizza Night e calcular o orçamento limpo restante', () => {
    const pizzaEvent: EventBufferInput = EVENT_PRESETS.PIZZA_NIGHT; // ex: 1100 kcal, 38g P, 120g C, 52g F

    const result = calculateEventBuffer(dailyTarget, pizzaEvent);

    expect(result.remainingBudget.calories).toBe(1100);
    expect(result.remainingBudget.proteinGrams).toBe(182); // 220 - 38
    expect(result.remainingBudget.carbGrams).toBe(60);     // 180 - 120
    expect(result.remainingBudget.fatGrams).toBe(15);      // 67 - 52

    // Densidade proteica exigida = (182 / 1100) * 100 = 16.55 g / 100 kcal
    expect(result.requiredProteinDensity).toBeCloseTo(16.55, 1);
    expect(result.feasibilityStatus).toBe('COMPRESSED');
    expect(result.isThermodynamicallyPossible).toBe(true);
  });

  it('deve detectar inviabilidade matemática termodinâmica se a proteína exigir mais que as calorias restantes', () => {
    // Evento que consome 2000 kcal e deixa só 200 kcal, mas faltam 100g de proteína (100g P = 400 kcal)
    const heavyEvent: EventBufferInput = {
      name: 'Super Churrasco',
      calories: 2000,
      proteinGrams: 120,
      carbGrams: 100,
      fatGrams: 100,
    };

    const target: MacroBudget = {
      calories: 2200,
      proteinGrams: 220, // faltarão 100g
      carbGrams: 150,
      fatGrams: 70,
    };

    const result = calculateEventBuffer(target, heavyEvent);

    expect(result.remainingBudget.calories).toBe(200);
    expect(result.remainingBudget.proteinGrams).toBe(100);
    // 100g * 4 kcal/g = 400 kcal > 200 kcal restantes -> impossível
    expect(result.isThermodynamicallyPossible).toBe(false);
    expect(result.feasibilityStatus).toBe('IMPOSSIBLE');
    expect(result.advisoryMessage).toContain('Inviabilidade termodinâmica');
  });

  it('deve classificar como FEASIBLE quando a densidade proteica exigida for moderada', () => {
    const lightEvent: EventBufferInput = {
      name: 'Almoço Familiar Controlado',
      calories: 600,
      proteinGrams: 40,
      carbGrams: 60,
      fatGrams: 20,
    };

    const result = calculateEventBuffer(dailyTarget, lightEvent);

    // 180g P restantes em 1600 kcal -> (180 / 1600) * 100 = 11.25 g / 100 kcal
    expect(result.requiredProteinDensity).toBeCloseTo(11.25, 1);
    expect(result.feasibilityStatus).toBe('BALANCED');
    expect(result.isThermodynamicallyPossible).toBe(true);
  });

  it('deve classificar como EXTREME quando a densidade proteica for superior a 18g / 100 kcal', () => {
    // Orçamento diário com alvo alto de proteína e evento que deixa poucas calorias
    const target: MacroBudget = {
      calories: 2000,
      proteinGrams: 220,
      carbGrams: 150,
      fatGrams: 60,
    };

    const heavyCarbEvent: EventBufferInput = {
      name: 'Rodízio de Massas',
      calories: 1500,
      proteinGrams: 30, // sobram 190g P
      carbGrams: 200,
      fatGrams: 40,
    };

    // Restam 500 kcal e 190g P -> 190 * 4 = 760 > 500 (impossível)
    // Vamos ajustar para restar 1000 kcal e 190g P -> 19g / 100 kcal (> 18)
    const target2: MacroBudget = {
      calories: 2500,
      proteinGrams: 220,
      carbGrams: 200,
      fatGrams: 70,
    };

    const result = calculateEventBuffer(target2, heavyCarbEvent);
    expect(result.remainingBudget.calories).toBe(1000);
    expect(result.remainingBudget.proteinGrams).toBe(190);
    expect(result.requiredProteinDensity).toBe(19);
    expect(result.feasibilityStatus).toBe('EXTREME');
    expect(result.advisoryMessage).toContain('Compressão extrema');
  });

  it('deve suportar todos os presets obrigatórios (Pizza, Festa Infantil, Churrasco)', () => {
    expect(EVENT_PRESETS.PIZZA_NIGHT).toBeDefined();
    expect(EVENT_PRESETS.KIDS_PARTY).toBeDefined();
    expect(EVENT_PRESETS.FAMILY_BARBECUE).toBeDefined();
  });

  it('deve calcular o orçamento de fibras restante após abater o evento social', () => {
    const targetWithFiber: MacroBudget = {
      ...dailyTarget,
      fiberGrams: 38,
    };
    const eventWithFiber: EventBufferInput = {
      ...EVENT_PRESETS.PIZZA_NIGHT,
      fiberGrams: 8,
    };
    const result = calculateEventBuffer(targetWithFiber, eventWithFiber);
    expect(result.remainingBudget.fiberGrams).toBe(30);
  });
});
