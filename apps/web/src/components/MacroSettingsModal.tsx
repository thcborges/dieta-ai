import React, { useState, useEffect } from 'react';
import {
  calculateBMR,
  calculateTDEE,
  calculateMacroTargets,
  calculateRecommendedFiber,
  calculateCaloriesFromMacros,
  calculateCarbsFromCalories,
  calculateMacrosForGoal,
  type Gender,
  type ActivityLevel,
  type DietGoal,
  type BmrSource,
} from '@dieta-ai/core';
import { Sliders, X, Sparkles, ShieldCheck, Flame, Activity } from 'lucide-react';

export interface UserMacroSettings {
  ageYears: number;
  gender: Gender;
  heightCm?: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  bmrSource?: BmrSource;
  manualBmr?: number;
  goal?: DietGoal;
  dailyDeficitKcal: number;
  dailySurplusKcal?: number;
  tolerancePercent?: number;
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  fiberGrams: number;
}

interface MacroSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: UserMacroSettings;
  onSave: (settings: UserMacroSettings) => void;
}

export const MacroSettingsModal: React.FC<MacroSettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
}) => {
  const [form, setForm] = useState<UserMacroSettings>(() => ({
    ...currentSettings,
    heightCm: currentSettings.heightCm ?? 190,
    bmrSource: currentSettings.bmrSource ?? 'mifflin_st_jeor',
    manualBmr: currentSettings.manualBmr ?? 1850,
    goal: currentSettings.goal ?? 'weight_loss',
    activityLevel: currentSettings.activityLevel ?? 'moderate',
  }));

  useEffect(() => {
    setForm({
      ...currentSettings,
      heightCm: currentSettings.heightCm ?? 190,
      bmrSource: currentSettings.bmrSource ?? 'mifflin_st_jeor',
      manualBmr: currentSettings.manualBmr ?? 1850,
      goal: currentSettings.goal ?? 'weight_loss',
      activityLevel: currentSettings.activityLevel ?? 'moderate',
    });
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const bmrSource: BmrSource = form.bmrSource ?? 'mifflin_st_jeor';
  const age = Math.max(1, form.ageYears || 1);
  const weight = Math.max(1, form.weightKg || 1);
  const height = Math.max(1, form.heightCm || 190);
  const activityLevel = form.activityLevel ?? 'moderate';
  const goal: DietGoal = form.goal ?? 'weight_loss';

  // TMB calculada via Mifflin-St Jeor
  const mifflinBmr = calculateBMR({
    gender: form.gender,
    age,
    heightCm: height,
    weightKg: weight,
  });

  // TMB efetiva conforme seleção do usuário (Bioimpedância vs Mifflin-St Jeor)
  const effectiveBmr = bmrSource === 'manual_bioimpedance' ? (form.manualBmr || 1850) : mifflinBmr;
  const currentTdee = calculateTDEE(effectiveBmr, activityLevel);

  const recommendedFiber = calculateRecommendedFiber(age, form.gender);

  // Recalcular via Mifflin-St Jeor (atalho direto mantendo compatibilidade)
  const handleRecalculateMifflin = () => {
    const tdee = calculateTDEE(mifflinBmr, activityLevel);
    let effectiveDeficit = 0;
    if (goal === 'weight_loss') {
      effectiveDeficit = form.dailyDeficitKcal || 500;
    } else if (goal === 'weight_gain') {
      effectiveDeficit = -(form.dailySurplusKcal || 400);
    } else {
      effectiveDeficit = 0;
    }

    const calculated = calculateMacroTargets({
      tdee,
      weightKg: weight,
      deficitKcal: effectiveDeficit,
      age,
      gender: form.gender,
      proteinStrategy: { type: 'fixed', grams: form.proteinGrams || 220 },
      fatPerKg: 0.8,
    });

    setForm(prev => ({
      ...prev,
      bmrSource: 'mifflin_st_jeor',
      calories: calculated.calories,
      proteinGrams: calculated.proteinGrams,
      carbGrams: calculated.carbGrams,
      fatGrams: calculated.fatGrams,
      fiberGrams: calculated.fiberGrams,
    }));
  };

  // Calcular metas recomendadas de calorias e macros baseado no Objetivo e Nível de Atividade
  const handleCalculateForGoal = () => {
    const calculated = calculateMacrosForGoal({
      bmr: effectiveBmr,
      activityLevel,
      goal,
      weightKg: weight,
      age,
      gender: form.gender,
      heightCm: height,
    });

    setForm(prev => ({
      ...prev,
      calories: calculated.calories,
      proteinGrams: calculated.proteinGrams,
      carbGrams: calculated.carbGrams,
      fatGrams: calculated.fatGrams,
      fiberGrams: calculated.fiberGrams,
      dailyDeficitKcal: -calculated.calorieDelta,
    }));
  };

  const handleProteinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProtein = Math.max(0, Number(e.target.value));
    const newCalories = calculateCaloriesFromMacros({
      proteinGrams: newProtein,
      carbGrams: form.carbGrams,
      fatGrams: form.fatGrams,
    });
    setForm(prev => ({
      ...prev,
      proteinGrams: newProtein,
      calories: newCalories,
    }));
  };

  const handleCarbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCarb = Math.max(0, Number(e.target.value));
    const newCalories = calculateCaloriesFromMacros({
      proteinGrams: form.proteinGrams,
      carbGrams: newCarb,
      fatGrams: form.fatGrams,
    });
    setForm(prev => ({
      ...prev,
      carbGrams: newCarb,
      calories: newCalories,
    }));
  };

  const handleFatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFat = Math.max(0, Number(e.target.value));
    const newCalories = calculateCaloriesFromMacros({
      proteinGrams: form.proteinGrams,
      carbGrams: form.carbGrams,
      fatGrams: newFat,
    });
    setForm(prev => ({
      ...prev,
      fatGrams: newFat,
      calories: newCalories,
    }));
  };

  const handleCaloriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCalories = Math.max(0, Number(e.target.value));
    const newCarb = calculateCarbsFromCalories({
      calories: newCalories,
      proteinGrams: form.proteinGrams,
      fatGrams: form.fatGrams,
    });
    setForm(prev => ({
      ...prev,
      calories: newCalories,
      carbGrams: newCarb,
    }));
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-m3-surface-container rounded-3xl max-w-xl w-full border border-m3-outline-variant shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-m3-outline-variant/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-m3-primary/10 text-m3-primary border border-m3-primary/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-m3-on-surface">
                Controle de Macronutrientes
              </h2>
              <p className="text-xs text-m3-outline font-mono">
                Cálculo de TMB (Bioimpedância / Mifflin-St Jeor) & Metas por Objetivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-m3-surface-container-high text-m3-outline transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Escolha da Fonte da Taxa Metabólica Basal (TMB) */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-m3-tertiary uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            1. Taxa Metabólica Basal (TMB)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-m3-surface-container-low p-2.5 rounded-2xl border border-m3-outline-variant/60">
            <label
              htmlFor="bmr-source-mifflin"
              className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer border text-xs transition-colors ${
                bmrSource === 'mifflin_st_jeor'
                  ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface font-semibold'
                  : 'border-transparent text-m3-outline hover:text-m3-on-surface'
              }`}
            >
              <input
                id="bmr-source-mifflin"
                aria-label="Recalcular via Mifflin-St Jeor"
                type="radio"
                name="bmrSource"
                checked={bmrSource === 'mifflin_st_jeor'}
                onChange={() => setForm(prev => ({ ...prev, bmrSource: 'mifflin_st_jeor' }))}
                className="accent-m3-primary cursor-pointer"
              />
              <span>Recalcular via Mifflin-St Jeor</span>
            </label>

            <label
              htmlFor="bmr-source-bioimpedance"
              className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer border text-xs transition-colors ${
                bmrSource === 'manual_bioimpedance'
                  ? 'bg-m3-primary/15 border-m3-primary text-m3-on-surface font-semibold'
                  : 'border-transparent text-m3-outline hover:text-m3-on-surface'
              }`}
            >
              <input
                id="bmr-source-bioimpedance"
                aria-label="Fornecer TMB (Bioimpedância)"
                type="radio"
                name="bmrSource"
                checked={bmrSource === 'manual_bioimpedance'}
                onChange={() => setForm(prev => ({ ...prev, bmrSource: 'manual_bioimpedance' }))}
                className="accent-m3-primary cursor-pointer"
              />
              <span>Fornecer TMB (Bioimpedância)</span>
            </label>
          </div>

          {/* Campos Biométricos & TMB */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {bmrSource === 'manual_bioimpedance' ? (
              <div className="flex flex-col justify-between">
                <label htmlFor="manual-bmr-input" className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                  TMB do Exame <span className="text-[10px] text-m3-outline/80 font-normal">(kcal)</span>
                </label>
                <input
                  id="manual-bmr-input"
                  aria-label="TMB do Exame"
                  type="number"
                  value={form.manualBmr ?? 1850}
                  onChange={e =>
                    setForm(prev => ({ ...prev, manualBmr: Math.max(1, Number(e.target.value)) }))
                  }
                  className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
                />
              </div>
            ) : (
              <div className="flex flex-col justify-between">
                <label htmlFor="height-input" className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                  Altura <span className="text-[10px] text-m3-outline/80 font-normal">(cm)</span>
                </label>
                <input
                  id="height-input"
                  aria-label="Altura"
                  type="number"
                  value={form.heightCm ?? 190}
                  onChange={e =>
                    setForm(prev => ({ ...prev, heightCm: Math.max(1, Number(e.target.value)) }))
                  }
                  className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
                />
              </div>
            )}

            <div className="flex flex-col justify-between">
              <label htmlFor="age-input" className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                Idade <span className="text-[10px] text-m3-outline/80 font-normal">(Anos)</span>
              </label>
              <input
                id="age-input"
                aria-label="Idade"
                type="number"
                value={form.ageYears}
                onChange={e =>
                  setForm(prev => ({ ...prev, ageYears: Math.max(1, Number(e.target.value)) }))
                }
                className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
              />
            </div>

            <div className="flex flex-col justify-between">
              <label htmlFor="weight-input" className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                Peso Corporal <span className="text-[10px] text-m3-outline/80 font-normal">(kg)</span>
              </label>
              <input
                id="weight-input"
                aria-label="Peso Corporal"
                type="number"
                value={form.weightKg}
                onChange={e =>
                  setForm(prev => ({ ...prev, weightKg: Math.max(1, Number(e.target.value)) }))
                }
                className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
              />
            </div>

            <div className="flex flex-col justify-between">
              <label htmlFor="gender-select" className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                Sexo Biológico
              </label>
              <select
                id="gender-select"
                aria-label="Sexo Biológico"
                value={form.gender}
                onChange={e =>
                  setForm(prev => ({ ...prev, gender: e.target.value as Gender }))
                }
                className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-medium text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
              >
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono bg-m3-surface-container-low/60 px-3 py-1.5 rounded-xl border border-m3-outline-variant/40">
            <span className="text-m3-outline">TMB Selecionada:</span>
            <span className="text-amber-400 font-bold">
              {Math.round(effectiveBmr)} kcal/dia{' '}
              <span className="text-[10px] text-m3-outline font-normal">
                ({bmrSource === 'manual_bioimpedance' ? 'Exame Bioimpedância' : 'Equação Mifflin-St Jeor'})
              </span>
            </span>
          </div>
        </div>

        {/* 2. Nível de Atividade & Objetivo Nutricional */}
        <div className="space-y-3 pt-1 border-t border-m3-outline-variant/60">
          <h3 className="text-xs font-semibold text-m3-tertiary uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            2. Atividade Física & Objetivo Nutricional
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col justify-between">
              <label htmlFor="activity-select" className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                Nível de Atividade Física
              </label>
              <select
                id="activity-select"
                aria-label="Nível de Atividade"
                value={form.activityLevel}
                onChange={e =>
                  setForm(prev => ({ ...prev, activityLevel: e.target.value as ActivityLevel }))
                }
                className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-medium text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
              >
                <option value="sedentary">Sedentário (fator 1.2 • pouco exercício)</option>
                <option value="light">Leve (fator 1.375 • 1-3 dias/sem)</option>
                <option value="moderate">Moderado (fator 1.55 • 3-5 dias/sem)</option>
                <option value="heavy">Intenso (fator 1.725 • 6-7 dias/sem)</option>
                <option value="athlete">Atleta (fator 1.9 • 2 treinos ao dia)</option>
              </select>
            </div>

            <div className="flex flex-col justify-between">
              <label htmlFor="goal-select" className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                Objetivo Nutricional
              </label>
              <select
                id="goal-select"
                aria-label="Objetivo Nutricional"
                value={form.goal ?? 'weight_loss'}
                onChange={e =>
                  setForm(prev => ({ ...prev, goal: e.target.value as DietGoal }))
                }
                className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-medium text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
              >
                <option value="weight_loss">Perda de Peso (Déficit / Blindagem)</option>
                <option value="muscle_gain">Ganho de Peso (Superávit / Anabolismo)</option>
                <option value="maintenance">Manutenção (Equilíbrio / Homeostase)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {form.goal === 'weight_gain' || form.goal === 'muscle_gain' ? (
              <div className="flex flex-col justify-between">
                <label className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                  Superávit Diário Alvo <span className="text-[10px] text-m3-outline/80 font-normal">(kcal)</span>
                </label>
                <input
                  aria-label="Superávit Diário Alvo"
                  type="number"
                  value={form.dailySurplusKcal ?? 400}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      dailySurplusKcal: Math.max(0, Number(e.target.value)),
                    }))
                  }
                  className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
                />
              </div>
            ) : form.goal === 'maintenance' ? (
              <div className="flex flex-col justify-between">
                <label className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                  Tolerância de Nível <span className="text-[10px] text-m3-outline/80 font-normal">(± %)</span>
                </label>
                <input
                  aria-label="Tolerância de Nível"
                  type="number"
                  value={form.tolerancePercent ?? 3}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      tolerancePercent: Math.max(1, Number(e.target.value)),
                    }))
                  }
                  className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
                />
              </div>
            ) : (
              <div className="flex flex-col justify-between">
                <label className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                  Déficit Diário Planejado <span className="text-[10px] text-m3-outline/80 font-normal">(kcal)</span>
                </label>
                <input
                  aria-label="Déficit Diário Planejado"
                  type="number"
                  value={form.dailyDeficitKcal}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      dailyDeficitKcal: Math.max(0, Number(e.target.value)),
                    }))
                  }
                  className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-m3-surface-container-low p-3 rounded-2xl border border-m3-outline-variant/60">
              <div className="text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <span className="text-m3-outline font-mono">GET / TDEE Projetado:</span>
                <strong className="text-cyan-400 font-mono text-sm whitespace-nowrap">{currentTdee} kcal</strong>
              </div>

              <button
                type="button"
                onClick={handleCalculateForGoal}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 bg-m3-primary/15 hover:bg-m3-primary/25 border border-m3-primary/40 rounded-xl text-xs font-semibold text-m3-primary transition-colors shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Calcular Metas para este Objetivo</span>
              </button>
            </div>
          </div>
        </div>


        {/* 3. Metas de Macronutrientes & Fibra */}
        <div className="space-y-3 pt-1 border-t border-m3-outline-variant/60">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-m3-tertiary uppercase tracking-wider">
              3. Metas de Macros Diárias
            </h3>
            <button
              type="button"
              onClick={handleRecalculateMifflin}
              className="flex items-center gap-1 text-[11px] font-medium text-m3-primary hover:underline"
            >
              <Sparkles className="w-3 h-3" />
              Recalcular via Mifflin-St Jeor
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col justify-between">
              <label htmlFor="calorias-input" className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                Calorias Alvo <span className="text-[10px] text-m3-outline/80 font-normal">(kcal)</span>
              </label>
              <input
                id="calorias-input"
                aria-label="Calorias Alvo"
                type="number"
                value={form.calories}
                onChange={handleCaloriesChange}
                className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
              />
            </div>

            <div className="flex flex-col justify-between">
              <label htmlFor="proteinas-input" className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                Proteínas <span className="text-[10px] text-m3-outline/80 font-normal">(g)</span>
              </label>
              <input
                id="proteinas-input"
                aria-label="Proteínas"
                type="number"
                value={form.proteinGrams}
                onChange={handleProteinChange}
                className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
              />
            </div>

            <div className="flex flex-col justify-between">
              <label htmlFor="carbos-input" className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                Carboidratos <span className="text-[10px] text-m3-outline/80 font-normal">(g)</span>
              </label>
              <input
                id="carbos-input"
                aria-label="Carboidratos"
                type="number"
                value={form.carbGrams}
                onChange={handleCarbChange}
                className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
              />
            </div>

            <div className="flex flex-col justify-between">
              <label htmlFor="gorduras-input" className="text-[11px] font-mono text-m3-outline mb-1 leading-tight">
                Gorduras <span className="text-[10px] text-m3-outline/80 font-normal">(g)</span>
              </label>
              <input
                id="gorduras-input"
                aria-label="Gorduras"
                type="number"
                value={form.fatGrams}
                onChange={handleFatChange}
                className="h-9 w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary box-border"
              />
            </div>
          </div>

          {/* Seção Exclusiva de Fibra como Macro */}
          <div className="bg-m3-surface-container-low p-3.5 rounded-2xl border border-m3-outline-variant/60 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="meta-fibras-input"
                className="text-xs font-bold text-m3-on-surface flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Meta de Fibras (g/dia)
              </label>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                Diretriz DRI Oficial
              </span>
            </div>

            <p className="text-[11px] text-m3-outline">
              Recomendado para sua idade ({form.ageYears} anos,{' '}
              {form.gender === 'male' ? 'homem' : 'mulher'}):{' '}
              <strong className="text-m3-on-surface font-mono">{recommendedFiber}g/dia</strong>.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="meta-fibras-input"
                aria-label="Meta de Fibras"
                type="number"
                value={form.fiberGrams}
                onChange={e =>
                  setForm(prev => ({ ...prev, fiberGrams: Number(e.target.value) }))
                }
                className="w-24 bg-m3-surface-container-highest border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, fiberGrams: recommendedFiber }))}
                className="text-[11px] text-m3-primary hover:underline font-mono"
              >
                Usar recomendação ({recommendedFiber}g)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-m3-outline-variant/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-m3-outline hover:bg-m3-surface-container-high transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-m3-primary text-m3-on-primary hover:bg-m3-primary/90 shadow transition-colors"
          >
            Salvar Metas
          </button>
        </div>
      </div>
    </div>
  );
};
