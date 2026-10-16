import { describe, it, expect } from 'vitest';
import * as Core from '../src/index.js';

describe('@dieta-ai/core index exports', () => {
  it('deve exportar todas as funções centrais', () => {
    expect(Core.calculateBMR).toBeDefined();
    expect(Core.calculateTDEE).toBeDefined();
    expect(Core.calculateMacroTargets).toBeDefined();
    expect(Core.calculateEventBuffer).toBeDefined();
    expect(Core.solveProteinDeficit).toBeDefined();
    expect(Core.auditDailyIntake).toBeDefined();
    expect(Core.calculateLgpdDeletionDeadline).toBeDefined();
    expect(Core.generateBlindIndex).toBeDefined();
    expect(Core.validateDeletionRequest).toBeDefined();
    expect(Core.calculateRecipeMacros).toBeDefined();
    expect(Core.getMealFrequentFoodSuggestions).toBeDefined();
    expect(Core.PREPOPULATED_FOODS).toBeDefined();
    expect(Core.EVENT_PRESETS).toBeDefined();
  });
});
