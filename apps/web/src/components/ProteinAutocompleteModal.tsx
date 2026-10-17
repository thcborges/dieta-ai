import React, { useState, useEffect, useMemo } from 'react';
import {
  type MealWindow,
  type FoodItem,
  PROTEIN_SOURCES,
  type ProteinSource,
  calculateMultiProteinSelection,
  suggestGramsForSource,
} from '@dieta-ai/core';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Scale,
  RotateCcw,
  Utensils,
} from 'lucide-react';

export interface LoggedProteinItem {
  sourceId: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface ProteinAutocompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  missingProtein: number;
  remainingCalories: number;
  activeWindow?: MealWindow;
  availableFoods?: FoodItem[];
  onConfirm: (items: LoggedProteinItem[], targetWindow: MealWindow) => void;
}

const WINDOW_LABELS: Record<MealWindow, string> = {
  breakfast: 'Café da Manhã / Pré-Treino',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche da Tarde',
  dinner_event: 'Jantar / Evento',
};

export const ProteinAutocompleteModal: React.FC<ProteinAutocompleteModalProps> = ({
  isOpen,
  onClose,
  missingProtein,
  remainingCalories,
  activeWindow = 'dinner_event',
  availableFoods = [],
  onConfirm,
}) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [targetWindow, setTargetWindow] = useState<MealWindow>(activeWindow);

  useEffect(() => {
    if (isOpen) {
      setQuantities({});
      setTargetWindow(activeWindow);
    }
  }, [isOpen, activeWindow]);

  // Combina fontes padrão e alimentos adicionais de alta densidade proteica (>= 12g de proteína / 100g)
  const allProteinSources = useMemo(() => {
    const sources: Record<string, ProteinSource> = { ...PROTEIN_SOURCES };

    availableFoods.forEach(food => {
      if (food.proteinPer100g >= 12 && !sources[food.id]) {
        sources[food.id] = {
          id: food.id,
          name: food.name,
          proteinPer100g: food.proteinPer100g,
          carbsPer100g: food.carbsPer100g,
          fatPer100g: food.fatPer100g,
          caloriesPer100g: food.caloriesPer100g,
          servingSizeGrams: food.servingSizeGrams,
          servingUnitName: food.servingDescription,
        };
      }
    });

    return sources;
  }, [availableFoods]);

  // Cálculo reativo usando o solver do core
  const calculation = useMemo(() => {
    const selections = Object.entries(quantities).map(([sourceId, grams]) => ({
      sourceId,
      grams: Math.max(0, grams || 0),
    }));

    return calculateMultiProteinSelection({
      missingProteinGrams: Math.max(0, missingProtein),
      remainingCalories,
      selections,
      customSources: allProteinSources,
    });
  }, [quantities, missingProtein, remainingCalories, allProteinSources]);

  if (!isOpen) return null;

  const handleQuantityChange = (sourceId: string, val: string) => {
    const num = parseFloat(val);
    setQuantities(prev => ({
      ...prev,
      [sourceId]: isNaN(num) ? 0 : Math.max(0, Math.round(num * 10) / 10),
    }));
  };

  const handleIncrement = (sourceId: string, amount: number) => {
    setQuantities(prev => ({
      ...prev,
      [sourceId]: Math.max(0, Math.round(((prev[sourceId] || 0) + amount) * 10) / 10),
    }));
  };

  const handleReset = (sourceId: string) => {
    setQuantities(prev => {
      const next = { ...prev };
      delete next[sourceId];
      return next;
    });
  };

  // Preenche a quantidade exata desta fonte para zerar o déficit restante atual
  const handleCompleteRemaining = (source: ProteinSource) => {
    // Quantidade já suprida por outras fontes
    const otherSourcesGrams = Object.entries(quantities)
      .filter(([id]) => id !== source.id)
      .map(([id, g]) => ({ sourceId: id, grams: g }));

    const intermediateCalc = calculateMultiProteinSelection({
      missingProteinGrams: Math.max(0, missingProtein),
      remainingCalories,
      selections: otherSourcesGrams,
      customSources: allProteinSources,
    });

    const neededProtein = intermediateCalc.remainingProteinDeficit;
    const suggestedGrams = suggestGramsForSource(source, neededProtein);

    setQuantities(prev => ({
      ...prev,
      [source.id]: suggestedGrams,
    }));
  };

  const handleConfirm = () => {
    const itemsToLog: LoggedProteinItem[] = calculation.items
      .filter(item => item.grams > 0)
      .map(item => ({
        sourceId: item.source.id,
        name: `${item.source.name} (Auto-Completar)`,
        grams: item.grams,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: 0,
      }));

    if (itemsToLog.length === 0) return;

    onConfirm(itemsToLog, targetWindow);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="protein-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-m3-surface-container-high border border-m3-outline-variant rounded-3xl w-full max-w-2xl my-auto p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in-50 zoom-in-95">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 border-b border-m3-outline-variant/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-m3-primary/10 border border-m3-primary/30 flex items-center justify-center text-m3-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="protein-modal-title" className="text-base sm:text-lg font-bold text-m3-on-surface">
                Auto-Completar Proteína
              </h2>
              <p className="text-xs text-m3-on-surface-variant">
                Simule e distribua as gramas de cada fonte proteica para zerar o déficit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-m3-outline hover:text-m3-on-surface p-1.5 rounded-full hover:bg-m3-surface-variant transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dashboard de Acompanhamento em Tempo Real */}
        <div className="bg-m3-surface-container rounded-2xl p-4 border border-m3-outline-variant space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-m3-surface-container-low p-2.5 rounded-xl border border-m3-outline-variant/50">
              <span className="text-[10px] uppercase font-semibold text-m3-outline block">
                Meta Faltante
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-m3-on-surface">
                {missingProtein.toFixed(1)}g
              </span>
            </div>

            <div className="bg-m3-surface-container-low p-2.5 rounded-xl border border-m3-outline-variant/50">
              <span className="text-[10px] uppercase font-semibold text-m3-outline block">
                Planejada
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-m3-primary">
                {calculation.totalProteinSelected.toFixed(1)}g
              </span>
            </div>

            <div className="bg-m3-surface-container-low p-2.5 rounded-xl border border-m3-outline-variant/50">
              <span className="text-[10px] uppercase font-semibold text-m3-outline block">
                Calorias
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-m3-on-surface">
                +{calculation.totalCaloriesSelected} kcal
              </span>
            </div>

            <div className="bg-m3-surface-container-low p-2.5 rounded-xl border border-m3-outline-variant/50">
              <span className="text-[10px] uppercase font-semibold text-m3-outline block">
                Disponível
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-m3-outline">
                {remainingCalories} kcal
              </span>
            </div>
          </div>

          {/* Feedback Dinâmico: Quanto Falta para o Alvo */}
          <div
            className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-colors ${
              calculation.status === 'reached'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : calculation.status === 'surplus'
                  ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
          >
            {calculation.status === 'reached' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : calculation.status === 'surplus' ? (
              <Scale className="w-4 h-4 text-cyan-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}

            <div className="flex-1">
              {calculation.status === 'reached' && (
                <span>Meta atingida com perfeição! (0.0g restantes)</span>
              )}
              {calculation.status === 'surplus' && (
                <span>
                  Meta superada em +{Math.abs(calculation.remainingProteinDeficit).toFixed(1)}g de proteína!
                </span>
              )}
              {calculation.status === 'missing' && (
                <span>
                  Faltam {calculation.remainingProteinDeficit.toFixed(1)}g de proteína para atingir o necessário.
                </span>
              )}
            </div>
          </div>

          {/* Alerta de Sobrecarga Calórica */}
          {!calculation.fitsInRemainingCalories && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300">
              <Flame className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                Atenção: A seleção adicionará {calculation.totalCaloriesSelected} kcal e ultrapassará o orçamento calórico restante em {calculation.calorieOverhead} kcal.
              </span>
            </div>
          )}
        </div>

        {/* Seleção de Janela de Destino */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-m3-surface-container-low p-3 rounded-2xl border border-m3-outline-variant/60">
          <label htmlFor="target-meal-window" className="text-xs font-semibold text-m3-on-surface flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5 text-m3-primary" />
            Lançar os alimentos na janela:
          </label>
          <select
            id="target-meal-window"
            value={targetWindow}
            onChange={e => setTargetWindow(e.target.value as MealWindow)}
            className="bg-m3-surface border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs text-m3-on-surface font-medium focus:outline-none focus:border-m3-primary"
          >
            {Object.entries(WINDOW_LABELS).map(([winKey, label]) => (
              <option key={winKey} value={winKey}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Lista de Proteínas */}
        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
          {Object.values(allProteinSources).map(source => {
            const grams = quantities[source.id] || 0;
            const multiplier = grams / 100;
            const itemProtein = Math.round(source.proteinPer100g * multiplier * 10) / 10;
            const itemCalories = Math.round(source.caloriesPer100g * multiplier);

            return (
              <div
                key={source.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  grams > 0
                    ? 'bg-m3-surface-container border-m3-primary/50 shadow-sm'
                    : 'bg-m3-surface-container-low border-m3-outline-variant/50 hover:border-m3-outline-variant'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h3 className="text-sm font-semibold text-m3-on-surface">{source.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-m3-outline font-mono">
                      <span>{source.proteinPer100g}g P / 100g</span>
                      <span>•</span>
                      <span>{source.caloriesPer100g} kcal / 100g</span>
                      {source.servingSizeGrams && (
                        <>
                          <span>•</span>
                          <span>1 {source.servingUnitName || 'porção'} = {source.servingSizeGrams}g</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Campo de Gramas e Ações Rápidas */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="5"
                        aria-label={`Gramas de ${source.name}`}
                        placeholder="0"
                        value={quantities[source.id] ?? ''}
                        onChange={e => handleQuantityChange(source.id, e.target.value)}
                        className="w-24 bg-m3-surface border border-m3-outline-variant rounded-xl px-2.5 py-1.5 text-xs text-right font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
                      />
                      <span className="absolute right-7 top-1/2 -translate-y-1/2 text-[10px] text-m3-outline pointer-events-none">
                        g
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCompleteRemaining(source)}
                      title="Calcular gramas para completar o restante necessário com esta fonte"
                      className="px-2.5 py-1.5 rounded-xl bg-m3-primary/10 hover:bg-m3-primary/20 text-m3-primary border border-m3-primary/30 text-[11px] font-medium transition-colors"
                    >
                      Completar restante
                    </button>

                    {grams > 0 && (
                      <button
                        type="button"
                        onClick={() => handleReset(source.id)}
                        title="Zerar quantidade"
                        className="p-1.5 rounded-xl text-m3-outline hover:text-red-400 hover:bg-m3-surface-variant transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtotal da Linha e Chips de Atalho */}
                <div className="mt-2.5 pt-2 border-t border-m3-outline-variant/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {source.servingSizeGrams ? (
                      <button
                        type="button"
                        onClick={() => handleIncrement(source.id, source.servingSizeGrams!)}
                        className="px-2 py-0.5 rounded-lg bg-m3-surface-container-high hover:bg-m3-surface-variant border border-m3-outline-variant/60 text-[10px] text-m3-on-surface font-mono"
                      >
                        +1 {source.servingUnitName || 'porção'} ({source.servingSizeGrams}g)
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleIncrement(source.id, 50)}
                          className="px-2 py-0.5 rounded-lg bg-m3-surface-container-high hover:bg-m3-surface-variant border border-m3-outline-variant/60 text-[10px] text-m3-on-surface font-mono"
                        >
                          +50g
                        </button>
                        <button
                          type="button"
                          onClick={() => handleIncrement(source.id, 100)}
                          className="px-2 py-0.5 rounded-lg bg-m3-surface-container-high hover:bg-m3-surface-variant border border-m3-outline-variant/60 text-[10px] text-m3-on-surface font-mono"
                        >
                          +100g
                        </button>
                      </>
                    )}
                  </div>

                  <div className="font-mono text-[11px] text-m3-on-surface-variant">
                    {grams > 0 ? (
                      <span className="text-m3-primary font-semibold">
                        {itemProtein.toFixed(1)}g P • {itemCalories} kcal
                      </span>
                    ) : (
                      <span className="text-m3-outline opacity-60">0g selecionados</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer com Ações */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-m3-outline-variant/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-m3-outline-variant text-xs font-semibold text-m3-on-surface hover:bg-m3-surface-variant transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={calculation.totalProteinSelected <= 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-m3-primary hover:bg-m3-primary/90 disabled:opacity-40 disabled:hover:bg-m3-primary text-xs font-semibold text-m3-on-primary shadow transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Lançar no Diário
            {calculation.totalProteinSelected > 0 && (
              <span className="font-mono opacity-90 text-[11px]">
                ({calculation.totalProteinSelected.toFixed(1)}g)
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
