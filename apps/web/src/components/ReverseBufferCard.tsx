import React from 'react';
import {
  calculateEventBuffer,
  EVENT_PRESETS,
  type MacroBudget,
  type EventBufferInput,
} from '@dieta-ai/core';
import { Pizza, PartyPopper, Flame, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ReverseBufferCardProps {
  dailyTarget: MacroBudget;
  activeEvent: EventBufferInput | null;
  onSelectEvent: (event: EventBufferInput | null) => void;
}

export const ReverseBufferCard: React.FC<ReverseBufferCardProps> = ({
  dailyTarget,
  activeEvent,
  onSelectEvent,
}) => {
  const calculation = activeEvent ? calculateEventBuffer(dailyTarget, activeEvent) : null;

  return (
    <div className="bg-m3-surface-container rounded-2xl p-5 border border-m3-outline-variant shadow-lg mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-m3-on-surface flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-m3-tertiary"></span>
            Simulador de Buffer de Evento Social (Engenharia Reversa)
          </h2>
          <p className="text-xs text-m3-outline mt-0.5">
            Aloque primeiro o evento hipercalórico e recalcule o orçamento limpo restante do dia.
          </p>
        </div>

        {activeEvent && (
          <button
            onClick={() => onSelectEvent(null)}
            className="flex items-center gap-1.5 text-xs text-m3-error hover:text-red-300 bg-m3-surface-container-high px-2.5 py-1 rounded-lg border border-m3-outline-variant transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Remover Reserva
          </button>
        )}
      </div>

      {/* Botões de Presets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <button
          type="button"
          onClick={() => onSelectEvent(EVENT_PRESETS.PIZZA_NIGHT ?? null)}
          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
            activeEvent?.name.includes('Pizza')
              ? 'bg-m3-primary-container border-m3-primary text-m3-on-primary-container ring-1 ring-m3-primary'
              : 'bg-m3-surface-container-low border-m3-outline-variant hover:bg-m3-surface-container-high text-m3-on-surface'
          }`}
        >
          <Pizza className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs">
            <div className="font-medium">Noite da Pizza</div>
            <div className="text-m3-outline text-[11px] font-mono">~1100 kcal • 38g P</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectEvent(EVENT_PRESETS.KIDS_PARTY ?? null)}
          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
            activeEvent?.name.includes('Festa')
              ? 'bg-m3-primary-container border-m3-primary text-m3-on-primary-container ring-1 ring-m3-primary'
              : 'bg-m3-surface-container-low border-m3-outline-variant hover:bg-m3-surface-container-high text-m3-on-surface'
          }`}
        >
          <PartyPopper className="w-5 h-5 text-purple-400 shrink-0" />
          <div className="text-xs">
            <div className="font-medium">Festa Infantil</div>
            <div className="text-m3-outline text-[11px] font-mono">~950 kcal • 18g P</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectEvent(EVENT_PRESETS.FAMILY_BARBECUE ?? null)}
          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
            activeEvent?.name.includes('Churrasco')
              ? 'bg-m3-primary-container border-m3-primary text-m3-on-primary-container ring-1 ring-m3-primary'
              : 'bg-m3-surface-container-low border-m3-outline-variant hover:bg-m3-surface-container-high text-m3-on-surface'
          }`}
        >
          <Flame className="w-5 h-5 text-red-400 shrink-0" />
          <div className="text-xs">
            <div className="font-medium">Churrasco em Família</div>
            <div className="text-m3-outline text-[11px] font-mono">~1350 kcal • 75g P</div>
          </div>
        </button>
      </div>

      {/* Painel Analítico do Orçamento Limpo Restante */}
      {calculation && (
        <div className="p-4 rounded-xl bg-m3-surface-container-lowest border border-m3-outline-variant">
          <div className="flex items-center justify-between mb-3 border-b border-m3-outline-variant/50 pb-2.5">
            <div className="text-xs font-semibold text-m3-on-surface tracking-wider uppercase font-mono">
              Orçamento Limpo Restante (Refeições Controladas)
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {calculation.isThermodynamicallyPossible ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Viável
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Inviável
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-3">
            <div className="p-2.5 rounded-lg bg-m3-surface-container-low">
              <div className="text-[10px] uppercase tracking-wider text-m3-outline font-mono">Calorias Livres</div>
              <div className="text-lg font-bold font-mono text-m3-metric-calories">
                {calculation.remainingBudget.calories} <span className="text-xs font-normal">kcal</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-m3-surface-container-low">
              <div className="text-[10px] uppercase tracking-wider text-m3-outline font-mono">Proteína Restante</div>
              <div className="text-lg font-bold font-mono text-m3-metric-protein">
                {calculation.remainingBudget.proteinGrams} <span className="text-xs font-normal">g</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-m3-surface-container-low">
              <div className="text-[10px] uppercase tracking-wider text-m3-outline font-mono">Carboidratos</div>
              <div className="text-lg font-bold font-mono text-m3-metric-carbs">
                {calculation.remainingBudget.carbGrams} <span className="text-xs font-normal">g</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-m3-surface-container-low">
              <div className="text-[10px] uppercase tracking-wider text-m3-outline font-mono">Gorduras</div>
              <div className="text-lg font-bold font-mono text-m3-metric-fat">
                {calculation.remainingBudget.fatGrams} <span className="text-xs font-normal">g</span>
              </div>
            </div>
          </div>

          {/* Métrica Chave: Densidade Proteica Exigida */}
          <div className="p-3 rounded-lg bg-m3-surface-container border border-m3-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-semibold text-m3-on-surface">Densidade Proteica Exigida: </span>
              <span className="font-mono text-m3-tertiary font-bold text-sm">
                {calculation.requiredProteinDensity.toFixed(1)} g / 100 kcal
              </span>
            </div>
            <p className="text-[11px] text-m3-on-surface-variant leading-tight">
              {calculation.advisoryMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
