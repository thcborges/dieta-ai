import React from 'react';
import type { MacroBudget } from '@dieta-ai/core';
import { Target, Activity, Flame, ShieldCheck, Leaf } from 'lucide-react';

interface MacroSummaryProps {
  target: MacroBudget;
  current: {
    calories: number;
    proteinGrams: number;
    carbGrams: number;
    fatGrams: number;
    fiberGrams?: number;
  };
  weeklyBankKcal?: number;
}

export const MacroSummary: React.FC<MacroSummaryProps> = ({
  target,
  current,
  weeklyBankKcal = 0,
}) => {
  const caloriesPercent = Math.min(100, Math.round((current.calories / Math.max(1, target.calories)) * 100));
  const proteinPercent = Math.min(100, Math.round((current.proteinGrams / Math.max(1, target.proteinGrams)) * 100));
  const carbsPercent = Math.min(100, Math.round((current.carbGrams / Math.max(1, target.carbGrams)) * 100));
  const fatPercent = Math.min(100, Math.round((current.fatGrams / Math.max(1, target.fatGrams)) * 100));
  const targetFiber = target.fiberGrams ?? 38;
  const currentFiber = current.fiberGrams ?? 0;
  const fiberPercent = Math.min(100, Math.round((currentFiber / Math.max(1, targetFiber)) * 100));
  const remainingFiber = Math.max(0, targetFiber - currentFiber);

  const remainingKcal = target.calories - current.calories;
  const isSurplus = remainingKcal < 0;

  return (
    <div className="bg-m3-surface-container rounded-2xl p-5 border border-m3-outline-variant shadow-lg mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-m3-outline-variant/60 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-m3-primary-container text-m3-on-primary-container">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-m3-on-surface">Orçamento Diário de Macronutrientes</h1>
            <p className="text-xs text-m3-outline font-mono">
              Blindagem de Déficit Calórico & Densidade Proteica Estrita
            </p>
          </div>
        </div>

        {/* Indicador do Banco Semanal */}
        <div className="flex items-center gap-3 bg-m3-surface-container-low px-3 py-1.5 rounded-xl border border-m3-outline-variant/80">
          <Activity className="w-4 h-4 text-m3-tertiary" />
          <div className="text-xs">
            <span className="text-m3-outline font-sans">Banco Semanal: </span>
            <span
              className={`font-mono font-bold ${
                weeklyBankKcal >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {weeklyBankKcal >= 0 ? `+${weeklyBankKcal}` : weeklyBankKcal} kcal
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Macros */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 mt-4">
        {/* Calorias */}
        <div className="bg-m3-surface-container-low p-3.5 rounded-xl border border-m3-outline-variant/40">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-m3-on-surface flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-m3-metric-calories" />
              Calorias
            </span>
            <span className="font-mono text-m3-outline text-[11px]">
              {isSurplus ? (
                <span className="text-red-400 font-bold">+{Math.abs(remainingKcal)} kcal</span>
              ) : (
                <span>{remainingKcal} rest.</span>
              )}
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-m3-metric-calories mb-1">
            {current.calories}{' '}
            <span className="text-xs font-normal text-m3-outline">/ {target.calories} kcal</span>
          </div>
          <div className="w-full bg-m3-surface-container-highest h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isSurplus ? 'bg-red-500' : 'bg-m3-metric-calories'
              }`}
              style={{ width: `${caloriesPercent}%` }}
            />
          </div>
        </div>

        {/* Proteínas */}
        <div className="bg-m3-surface-container-low p-3.5 rounded-xl border border-m3-outline-variant/40">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-m3-on-surface flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-m3-metric-protein" />
              Proteínas
            </span>
            <span className="font-mono text-m3-outline text-[11px]">
              {Math.max(0, target.proteinGrams - current.proteinGrams)}g rest.
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-m3-metric-protein mb-1">
            {current.proteinGrams}g{' '}
            <span className="text-xs font-normal text-m3-outline">/ {target.proteinGrams}g</span>
          </div>
          <div className="w-full bg-m3-surface-container-highest h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-m3-metric-protein transition-all duration-300"
              style={{ width: `${proteinPercent}%` }}
            />
          </div>
        </div>

        {/* Carboidratos */}
        <div className="bg-m3-surface-container-low p-3.5 rounded-xl border border-m3-outline-variant/40">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-m3-on-surface">Carboidratos</span>
            <span className="font-mono text-m3-outline text-[11px]">
              {Math.max(0, target.carbGrams - current.carbGrams)}g rest.
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-m3-metric-carbs mb-1">
            {current.carbGrams}g{' '}
            <span className="text-xs font-normal text-m3-outline">/ {target.carbGrams}g</span>
          </div>
          <div className="w-full bg-m3-surface-container-highest h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-m3-metric-carbs transition-all duration-300"
              style={{ width: `${carbsPercent}%` }}
            />
          </div>
        </div>

        {/* Gorduras */}
        <div className="bg-m3-surface-container-low p-3.5 rounded-xl border border-m3-outline-variant/40">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-m3-on-surface">Gorduras</span>
            <span className="font-mono text-m3-outline text-[11px]">
              {Math.max(0, target.fatGrams - current.fatGrams)}g rest.
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-m3-metric-fat mb-1">
            {current.fatGrams}g{' '}
            <span className="text-xs font-normal text-m3-outline">/ {target.fatGrams}g</span>
          </div>
          <div className="w-full bg-m3-surface-container-highest h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-m3-metric-fat transition-all duration-300"
              style={{ width: `${fatPercent}%` }}
            />
          </div>
        </div>

        {/* Fibras (Macro Essencial & Meta por Idade) */}
        <div className="bg-m3-surface-container-low p-3.5 rounded-xl border border-m3-outline-variant/40">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-m3-on-surface flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              Fibras
            </span>
            <span className="font-mono text-m3-outline text-[11px]">
              {remainingFiber}g rest.
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mb-1">
            {currentFiber}g{' '}
            <span className="text-xs font-normal text-m3-outline">/ {targetFiber}g</span>
          </div>
          <div className="w-full bg-m3-surface-container-highest h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${fiberPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
