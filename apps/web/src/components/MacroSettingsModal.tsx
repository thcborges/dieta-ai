import React, { useState, useEffect } from 'react';
import {
  calculateBMR,
  calculateTDEE,
  calculateMacroTargets,
  calculateRecommendedFiber,
  type Gender,
  type ActivityLevel,
} from '@dieta-ai/core';
import { Sliders, X, Sparkles, ShieldCheck } from 'lucide-react';

export interface UserMacroSettings {
  ageYears: number;
  gender: Gender;
  weightKg: number;
  activityLevel: ActivityLevel;
  dailyDeficitKcal: number;
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
  const [form, setForm] = useState<UserMacroSettings>(currentSettings);

  useEffect(() => {
    setForm(currentSettings);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const recommendedFiber = calculateRecommendedFiber(
    Math.max(1, form.ageYears || 1),
    form.gender
  );

  const handleRecalculateMifflin = () => {
    const bmr = calculateBMR({
      gender: form.gender,
      age: form.ageYears,
      heightCm: 190, // Altura padrão do usuário
      weightKg: form.weightKg,
    });
    const tdee = calculateTDEE(bmr, form.activityLevel);
    const calculated = calculateMacroTargets({
      tdee,
      weightKg: form.weightKg,
      deficitKcal: form.dailyDeficitKcal,
      age: form.ageYears,
      gender: form.gender,
      proteinStrategy: { type: 'fixed', grams: form.proteinGrams || 220 },
      fatPerKg: 0.8,
    });

    setForm(prev => ({
      ...prev,
      calories: calculated.calories,
      proteinGrams: calculated.proteinGrams,
      carbGrams: calculated.carbGrams,
      fatGrams: calculated.fatGrams,
      fiberGrams: calculated.fiberGrams,
    }));
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-m3-surface-container rounded-3xl max-w-lg w-full border border-m3-outline-variant shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
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
                Personalização de Metas & Fibra por Faixa Etária
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

        {/* Biometria & Parâmetros */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-m3-tertiary uppercase tracking-wider">
            1. Perfil Biométrico do Usuário
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="age-input" className="block text-[11px] font-mono text-m3-outline mb-1">
                Idade (Anos)
              </label>
              <input
                id="age-input"
                aria-label="Idade"
                type="number"
                value={form.ageYears}
                onChange={e =>
                  setForm(prev => ({ ...prev, ageYears: Math.max(1, Number(e.target.value)) }))
                }
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-m3-outline mb-1">
                Peso Corporal (kg)
              </label>
              <input
                type="number"
                value={form.weightKg}
                onChange={e =>
                  setForm(prev => ({ ...prev, weightKg: Math.max(1, Number(e.target.value)) }))
                }
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-m3-outline mb-1">
                Sexo Biológico
              </label>
              <select
                value={form.gender}
                onChange={e =>
                  setForm(prev => ({ ...prev, gender: e.target.value as Gender }))
                }
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-medium text-m3-on-surface focus:outline-none focus:border-m3-primary"
              >
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </div>
          </div>
        </div>

        {/* Metas de Macronutrientes & Fibra */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-m3-tertiary uppercase tracking-wider">
              2. Metas de Macros Diárias
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
            <div>
              <label className="block text-[11px] font-mono text-m3-outline mb-1">
                Calorias Alvo (kcal)
              </label>
              <input
                type="number"
                value={form.calories}
                onChange={e =>
                  setForm(prev => ({ ...prev, calories: Number(e.target.value) }))
                }
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-m3-outline mb-1">
                Proteínas (g)
              </label>
              <input
                type="number"
                value={form.proteinGrams}
                onChange={e =>
                  setForm(prev => ({ ...prev, proteinGrams: Number(e.target.value) }))
                }
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-m3-outline mb-1">
                Carboidratos (g)
              </label>
              <input
                type="number"
                value={form.carbGrams}
                onChange={e =>
                  setForm(prev => ({ ...prev, carbGrams: Number(e.target.value) }))
                }
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-m3-outline mb-1">
                Gorduras (g)
              </label>
              <input
                type="number"
                value={form.fatGrams}
                onChange={e =>
                  setForm(prev => ({ ...prev, fatGrams: Number(e.target.value) }))
                }
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
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
