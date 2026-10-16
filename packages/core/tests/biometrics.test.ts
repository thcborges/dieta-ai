import { describe, it, expect } from 'vitest';
import {
  calculateBMR,
  calculateTDEE,
  calculateMacroTargets,
  calculateRecommendedFiber,
  type BiometricProfile,
  type ActivityLevel,
} from '../src/biometrics.js';

describe('Biometrics & Dynamic Targets (Módulo 1)', () => {
  describe('calculateBMR (Mifflin-St Jeor)', () => {
    it('deve calcular a TMB exata para homem de 40 anos, 190 cm e 95 kg', () => {
      const profile: BiometricProfile = {
        gender: 'male',
        age: 40,
        heightCm: 190,
        weightKg: 95,
      };

      // 10 * 95 + 6.25 * 190 - 5 * 40 + 5 = 950 + 1187.5 - 200 + 5 = 1942.5
      const bmr = calculateBMR(profile);
      expect(bmr).toBe(1942.5);
    });

    it('deve calcular a TMB para mulher de 35 anos, 165 cm e 65 kg', () => {
      const profile: BiometricProfile = {
        gender: 'female',
        age: 35,
        heightCm: 165,
        weightKg: 65,
      };

      // 10 * 65 + 6.25 * 165 - 5 * 35 - 161 = 650 + 1031.25 - 175 - 161 = 1345.25
      const bmr = calculateBMR(profile);
      expect(bmr).toBe(1345.25);
    });

    it('deve lançar erro se peso, altura ou idade forem inválidos', () => {
      expect(() =>
        calculateBMR({ gender: 'male', age: 0, heightCm: 190, weightKg: 95 })
      ).toThrow('Idade deve ser maior que zero');

      expect(() =>
        calculateBMR({ gender: 'male', age: 40, heightCm: 0, weightKg: 95 })
      ).toThrow('Altura deve ser maior que zero');

      expect(() =>
        calculateBMR({ gender: 'male', age: 40, heightCm: 190, weightKg: -5 })
      ).toThrow('Peso deve ser maior que zero');
    });
  });

  describe('calculateTDEE (Gasto Energético Total)', () => {
    it('deve calcular o GET para rotina moderada (4x musculação + cardio)', () => {
      const bmr = 1942.5;
      const activity: ActivityLevel = 'moderate'; // fator 1.55
      const tdee = calculateTDEE(bmr, activity);
      expect(tdee).toBe(Math.round(1942.5 * 1.55)); // 3011 kcal
    });

    it('deve aplicar fatores de atividade corretos para todos os níveis', () => {
      const bmr = 2000;
      expect(calculateTDEE(bmr, 'sedentary')).toBe(2400); // 1.2
      expect(calculateTDEE(bmr, 'light')).toBe(2750); // 1.375
      expect(calculateTDEE(bmr, 'moderate')).toBe(3100); // 1.55
      expect(calculateTDEE(bmr, 'heavy')).toBe(3450); // 1.725
      expect(calculateTDEE(bmr, 'athlete')).toBe(3800); // 1.9
    });
  });

  describe('calculateMacroTargets', () => {
    it('deve calcular metas com déficit e teto proteico de 240g', () => {
      const tdee = 3000;
      const weightKg = 95;
      const targets = calculateMacroTargets({
        tdee,
        weightKg,
        deficitKcal: 600, // Alvo: 2400 kcal
        proteinStrategy: { type: 'fixed', grams: 240 },
        fatPerKg: 0.8, // 95 * 0.8 = 76g gordura (684 kcal)
      });

      expect(targets.calories).toBe(2400);
      expect(targets.proteinGrams).toBe(240);
      expect(targets.fatGrams).toBe(76);
      // Carboidratos = (2400 - (240 * 4 + 76 * 9)) / 4 = (2400 - (960 + 684)) / 4 = 756 / 4 = 189g
      expect(targets.carbGrams).toBe(189);
    });

    it('deve calcular metas com estratégia proteica por g/kg (ex: 2.2g/kg)', () => {
      const tdee = 2800;
      const weightKg = 90;
      const targets = calculateMacroTargets({
        tdee,
        weightKg,
        deficitKcal: 500, // 2300 kcal
        proteinStrategy: { type: 'per_kg', gramsPerKg: 2.2 }, // 198g proteína
        fatPerKg: 0.7, // 63g gordura
      });

      expect(targets.calories).toBe(2300);
      expect(targets.proteinGrams).toBe(198);
      expect(targets.fatGrams).toBe(63);
      // Carbs = (2300 - (198 * 4 + 63 * 9)) / 4 = (2300 - (792 + 567)) / 4 = 941 / 4 = 235g
      expect(targets.carbGrams).toBe(235);
    });

    it('deve respeitar a trava máxima de 240g quando configurada', () => {
      const targets = calculateMacroTargets({
        tdee: 3200,
        weightKg: 110,
        deficitKcal: 500,
        proteinStrategy: { type: 'per_kg', gramsPerKg: 2.5, maxCapGrams: 240 },
      });

      expect(targets.proteinGrams).toBe(240); // 110 * 2.5 seria 275g, mas trava em 240g
    });

    it('deve calcular a meta de fibras com base na idade e sexo do usuário', () => {
      const targets = calculateMacroTargets({
        tdee: 2800,
        weightKg: 95,
        age: 40,
        gender: 'male',
        proteinStrategy: { type: 'fixed', grams: 220 },
      });

      // Homem de 40 anos: meta de fibras é 38g
      expect(targets.fiberGrams).toBe(38);
    });

    it('deve permitir customizar a meta de fibras diretamente', () => {
      const targets = calculateMacroTargets({
        tdee: 2800,
        weightKg: 95,
        customFiberGrams: 45,
        proteinStrategy: { type: 'fixed', grams: 220 },
      });

      expect(targets.fiberGrams).toBe(45);
    });
  });

  describe('calculateRecommendedFiber (Diretrizes DRI por Idade e Gênero)', () => {
    it('deve recomendar 38g para homens adultos entre 19 e 50 anos (perfil do usuário: 40 anos)', () => {
      expect(calculateRecommendedFiber(40, 'male')).toBe(38);
      expect(calculateRecommendedFiber(19, 'male')).toBe(38);
      expect(calculateRecommendedFiber(50, 'male')).toBe(38);
    });

    it('deve recomendar 25g para mulheres adultas entre 19 e 50 anos', () => {
      expect(calculateRecommendedFiber(40, 'female')).toBe(25);
      expect(calculateRecommendedFiber(25, 'female')).toBe(25);
    });

    it('deve ajustar para maiores de 50 anos (30g para homens e 21g para mulheres)', () => {
      expect(calculateRecommendedFiber(55, 'male')).toBe(30);
      expect(calculateRecommendedFiber(65, 'female')).toBe(21);
    });

    it('deve calcular corretamente para crianças e adolescentes', () => {
      expect(calculateRecommendedFiber(3, 'male')).toBe(19);
      expect(calculateRecommendedFiber(7, 'female')).toBe(25);
      expect(calculateRecommendedFiber(12, 'male')).toBe(31);
      expect(calculateRecommendedFiber(12, 'female')).toBe(26);
      expect(calculateRecommendedFiber(16, 'male')).toBe(38);
      expect(calculateRecommendedFiber(16, 'female')).toBe(26);
    });

    it('deve lançar erro se a idade for zero ou negativa', () => {
      expect(() => calculateRecommendedFiber(0, 'male')).toThrow('Idade deve ser maior que zero');
      expect(() => calculateRecommendedFiber(-5, 'female')).toThrow('Idade deve ser maior que zero');
    });
  });
});

