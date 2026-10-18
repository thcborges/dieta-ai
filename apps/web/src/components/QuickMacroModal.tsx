import React, { useState } from 'react';
import { type MealWindow } from '@dieta-ai/core';
import { Zap, X, Calculator } from 'lucide-react';
import { type LoggedFood } from './MealBuilder.js';

const WINDOW_LABELS: Record<MealWindow, string> = {
  breakfast: 'Café da Manhã / Pré-Treino',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche da Tarde',
  dinner_event: 'Jantar / Evento',
};

export interface QuickMacroModalProps {
  isOpen: boolean;
  windowKey: MealWindow;
  onClose: () => void;
  onSave: (food: LoggedFood) => void;
}

export const QuickMacroModal: React.FC<QuickMacroModalProps> = ({
  isOpen,
  windowKey,
  onClose,
  onSave,
}) => {
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState<number | ''>('');
  const [protein, setProtein] = useState<number | ''>('');
  const [carbs, setCarbs] = useState<number | ''>('');
  const [fat, setFat] = useState<number | ''>('');
  const [fiber, setFiber] = useState<number | ''>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculateCaloriesFromMacros = (p: number, c: number, f: number) => {
    return Math.round(p * 4 + c * 4 + f * 9);
  };

  const handleExplicitCalculate = () => {
    const p = typeof protein === 'number' ? protein : 0;
    const c = typeof carbs === 'number' ? carbs : 0;
    const f = typeof fat === 'number' ? fat : 0;
    const calculated = calculateCaloriesFromMacros(p, c, f);
    setCalories(calculated);
    setErrorMessage(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const p = typeof protein === 'number' ? protein : 0;
    const c = typeof carbs === 'number' ? carbs : 0;
    const f = typeof fat === 'number' ? fat : 0;
    const fib = typeof fiber === 'number' ? fiber : 0;

    let cal = typeof calories === 'number' ? calories : 0;

    // Se o usuário não informou calorias explicitamente, mas preencheu macros, calcula automaticamente
    if (cal <= 0 && (p > 0 || c > 0 || f > 0)) {
      cal = calculateCaloriesFromMacros(p, c, f);
    }

    if (cal <= 0 && p <= 0 && c <= 0 && f <= 0) {
      setErrorMessage('Informe ao menos as calorias ou um macronutriente válido.');
      return;
    }

    const name = description.trim() || 'Lançamento Rápido';

    const newFood: LoggedFood = {
      id: `quick_macro_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      foodId: 'quick_macro',
      name,
      grams: 100, // Porção base de referência (100g)
      calories: Math.round(cal),
      protein: Math.round(p * 10) / 10,
      carbs: Math.round(c * 10) / 10,
      fat: Math.round(f * 10) / 10,
      fiber: Math.round(fib * 10) / 10,
    };

    onSave(newFood);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-macro-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-m3-surface-container-high border border-m3-outline rounded-2xl p-5 max-w-md w-full text-m3-on-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-m3-outline-variant/50 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 id="quick-macro-title" className="text-sm font-semibold text-m3-on-surface">
                Lançamento Rápido de Macros
              </h3>
              <p className="text-[11px] text-m3-outline font-mono">
                {WINDOW_LABELS[windowKey]}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-m3-outline hover:text-m3-on-surface p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-m3-outline mb-4 leading-relaxed">
          Informe os macronutrientes totais estimados da refeição (ex: retorno da análise do Gemini por foto do prato ou estimativa rápida).
        </p>

        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-950/40 text-red-300 border border-red-800/50 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="quick-macro-description"
              className="block text-[11px] font-mono text-m3-outline uppercase mb-1"
            >
              Descrição / Nome da Refeição (opcional)
            </label>
            <input
              id="quick-macro-description"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Prato Feito Almoço (Gemini) / Foto do Prato"
              className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs text-m3-on-surface placeholder:text-m3-outline/60 focus:outline-none focus:border-m3-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="quick-macro-calories"
                  className="block text-[11px] font-mono text-m3-outline uppercase"
                >
                  Calorias (kcal)
                </label>
              </div>
              <input
                id="quick-macro-calories"
                type="number"
                min="0"
                step="1"
                value={calories}
                onChange={e => {
                  const val = e.target.value;
                  setCalories(val === '' ? '' : Number(val));
                  setErrorMessage(null);
                }}
                placeholder="Ex: 550"
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>

            <div>
              <label
                htmlFor="quick-macro-protein"
                className="block text-[11px] font-mono text-m3-outline uppercase mb-1"
              >
                Proteínas (g)
              </label>
              <input
                id="quick-macro-protein"
                type="number"
                min="0"
                step="0.1"
                value={protein}
                onChange={e => {
                  const val = e.target.value;
                  setProtein(val === '' ? '' : Number(val));
                  setErrorMessage(null);
                }}
                placeholder="Ex: 40"
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="quick-macro-carbs"
                className="block text-[11px] font-mono text-m3-outline uppercase mb-1"
              >
                Carboidratos (g)
              </label>
              <input
                id="quick-macro-carbs"
                type="number"
                min="0"
                step="0.1"
                value={carbs}
                onChange={e => {
                  const val = e.target.value;
                  setCarbs(val === '' ? '' : Number(val));
                  setErrorMessage(null);
                }}
                placeholder="Ex: 50"
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>

            <div>
              <label
                htmlFor="quick-macro-fat"
                className="block text-[11px] font-mono text-m3-outline uppercase mb-1"
              >
                Gorduras (g)
              </label>
              <input
                id="quick-macro-fat"
                type="number"
                min="0"
                step="0.1"
                value={fat}
                onChange={e => {
                  const val = e.target.value;
                  setFat(val === '' ? '' : Number(val));
                  setErrorMessage(null);
                }}
                placeholder="Ex: 15"
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>

            <div>
              <label
                htmlFor="quick-macro-fiber"
                className="block text-[11px] font-mono text-m3-outline uppercase mb-1"
              >
                Fibras (g)
              </label>
              <input
                id="quick-macro-fiber"
                type="number"
                min="0"
                step="0.1"
                value={fiber}
                onChange={e => {
                  const val = e.target.value;
                  setFiber(val === '' ? '' : Number(val));
                }}
                placeholder="Ex: 5"
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleExplicitCalculate}
              className="flex items-center gap-1.5 text-[11px] text-m3-primary hover:underline font-mono"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calcular Calorias pelos Macros</span>
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-m3-outline-variant/40">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-m3-outline-variant text-xs text-m3-outline hover:text-m3-on-surface hover:bg-m3-surface-container transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-semibold shadow transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Lançar na Refeição</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
