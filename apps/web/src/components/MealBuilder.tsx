import { useState } from 'react';
import {
  type MealWindow,
  PREPOPULATED_FOODS,
} from '@dieta-ai/core';
import {
  Plus,
  Trash2,
  Copy,
  Sparkles,
  UtensilsCrossed,
  Sun,
  Sunrise,
  Sunset,
  Moon,
} from 'lucide-react';

export interface LoggedFood {
  id: string;
  foodId: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export type MealMap = Record<MealWindow, LoggedFood[]>;

interface MealBuilderProps {
  meals: MealMap;
  onAddFood: (window: MealWindow, item: LoggedFood) => void;
  onRemoveFood: (window: MealWindow, itemId: string) => void;
  onCopyMeal: (fromWindow: MealWindow, toWindow: MealWindow) => void;
  onAutoCompleteProtein: (source: 'sassami' | 'whey_growth') => void;
  missingProtein: number;
  remainingCalories: number;
}

const WINDOW_META: Record<
  MealWindow,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  breakfast: { label: 'Café da Manhã / Pré-Treino', icon: Sunrise },
  lunch: { label: 'Almoço', icon: Sun },
  afternoon_snack: { label: 'Lanche da Tarde', icon: Sunset },
  dinner_event: { label: 'Jantar / Evento', icon: Moon },
};

const FREQUENT_PRESETS_BY_WINDOW: Record<MealWindow, string[]> = {
  breakfast: ['ovos_inteiros', 'claras_pasteurizadas', 'pao_integral', 'cafe_especial'],
  lunch: ['sassami', 'feijao_preto', 'arroz_branco', 'batata_doce'],
  afternoon_snack: ['whey_growth_30g', 'ovos_inteiros', 'pao_integral'],
  dinner_event: ['sassami', 'batata_doce', 'pizza_calabresa', 'salgadinho_festa'],
};

export const MealBuilder: React.FC<MealBuilderProps> = ({
  meals,
  onAddFood,
  onRemoveFood,
  onCopyMeal,
  onAutoCompleteProtein,
  missingProtein,
  remainingCalories,
}) => {
  const [selectedFoodId, setSelectedFoodId] = useState<string>('sassami');
  const [servingGrams, setServingGrams] = useState<number>(100);
  const [activeWindow, setActiveWindow] = useState<MealWindow>('lunch');
  const [copyTargetWindow, setCopyTargetWindow] = useState<MealWindow>('dinner_event');
  const [showCopyModal, setShowCopyModal] = useState<MealWindow | null>(null);

  const selectedFood = PREPOPULATED_FOODS.find(f => f.id === selectedFoodId) ?? PREPOPULATED_FOODS[0]!;

  const handleAddFoodSubmit = (window: MealWindow) => {
    const factor = servingGrams / 100;
    const newFood: LoggedFood = {
      id: `${selectedFood.id}_${Date.now()}`,
      foodId: selectedFood.id,
      name: selectedFood.name,
      grams: servingGrams,
      calories: Math.round(selectedFood.caloriesPer100g * factor),
      protein: Math.round(selectedFood.proteinPer100g * factor * 10) / 10,
      carbs: Math.round(selectedFood.carbsPer100g * factor * 10) / 10,
      fat: Math.round(selectedFood.fatPer100g * factor * 10) / 10,
      fiber: Math.round((selectedFood.fiberPer100g ?? 0) * factor * 10) / 10,
    };
    onAddFood(window, newFood);
  };

  const handleAddFrequentChip = (window: MealWindow, foodId: string) => {
    const food = PREPOPULATED_FOODS.find(f => f.id === foodId);
    if (!food) return;

    const grams = food.servingSizeGrams || 100;
    const factor = grams / 100;
    const newFood: LoggedFood = {
      id: `${food.id}_${Date.now()}`,
      foodId: food.id,
      name: food.name,
      grams,
      calories: Math.round(food.caloriesPer100g * factor),
      protein: Math.round(food.proteinPer100g * factor * 10) / 10,
      carbs: Math.round(food.carbsPer100g * factor * 10) / 10,
      fat: Math.round(food.fatPer100g * factor * 10) / 10,
      fiber: Math.round((food.fiberPer100g ?? 0) * factor * 10) / 10,
    };
    onAddFood(window, newFood);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Ação Rápida Cronometer-Style (Porção & Peso no Topo) */}
      <div className="bg-m3-surface-container rounded-2xl p-4 border border-m3-outline-variant shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-m3-primary" />
            <h3 className="text-sm font-semibold text-m3-on-surface">
              Lançamento Rápido de Alimentos (Cronometer UX)
            </h3>
          </div>

          {/* Botão Auto-Completar Proteína */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAutoCompleteProtein('sassami')}
              className="flex items-center gap-1.5 bg-m3-primary text-m3-on-primary font-medium text-xs px-3 py-1.5 rounded-xl hover:bg-m3-primary/90 shadow transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Completar Proteína
              {missingProtein > 0 && (
                <span className="font-mono text-[11px] opacity-90">({missingProtein}g / {remainingCalories} kcal)</span>
              )}
            </button>
          </div>
        </div>

        {/* Linha de Inputs: Peso/Porção SEMPRE no Topo */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label className="block text-[11px] font-mono text-m3-outline uppercase mb-1">
              Alimento da Base Real
            </label>
            <select
              value={selectedFoodId}
              onChange={e => {
                const id = e.target.value;
                setSelectedFoodId(id);
                const found = PREPOPULATED_FOODS.find(f => f.id === id);
                if (found) setServingGrams(found.servingSizeGrams || 100);
              }}
              className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs text-m3-on-surface font-medium focus:outline-none focus:border-m3-primary"
            >
              {PREPOPULATED_FOODS.map(food => (
                <option key={food.id} value={food.id}>
                  {food.name} ({food.caloriesPer100g} kcal/100g)
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-mono text-m3-outline uppercase mb-1">
              Porção (Gramas)
            </label>
            <input
              type="number"
              min="1"
              max="2000"
              value={servingGrams}
              onChange={e => setServingGrams(Math.max(1, Number(e.target.value) || 0))}
              className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-mono text-m3-outline uppercase mb-1">
              Janela de Refeição
            </label>
            <select
              value={activeWindow}
              onChange={e => setActiveWindow(e.target.value as MealWindow)}
              className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs text-m3-on-surface font-medium focus:outline-none focus:border-m3-primary"
            >
              {Object.entries(WINDOW_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => handleAddFoodSubmit(activeWindow)}
              className="w-full flex items-center justify-center gap-1.5 bg-m3-surface-container-highest hover:bg-m3-surface-variant border border-m3-outline text-m3-on-surface text-xs font-medium py-2 px-3 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4 text-m3-primary" />
              Lançar
            </button>
          </div>
        </div>
      </div>

      {/* Grade com as 4 Janelas Práticas */}
      <div className="space-y-4">
        {(Object.keys(WINDOW_META) as MealWindow[]).map(windowKey => {
          const meta = WINDOW_META[windowKey];
          const Icon = meta.icon;
          const items = meals[windowKey];

          const totalCalories = items.reduce((acc, i) => acc + i.calories, 0);
          const totalProtein = Math.round(items.reduce((acc, i) => acc + i.protein, 0) * 10) / 10;
          const totalCarbs = Math.round(items.reduce((acc, i) => acc + i.carbs, 0) * 10) / 10;
          const totalFat = Math.round(items.reduce((acc, i) => acc + i.fat, 0) * 10) / 10;

          const frequentFoodIds = FREQUENT_PRESETS_BY_WINDOW[windowKey];

          return (
            <div
              key={windowKey}
              className="bg-m3-surface-container rounded-2xl p-4 border border-m3-outline-variant shadow"
            >
              {/* Header da Janela */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-m3-outline-variant/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-m3-surface-container-high text-m3-primary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-m3-on-surface">{meta.label}</h4>
                    <div className="text-[11px] font-mono text-m3-outline">
                      {totalCalories} kcal • {totalProtein}g P • {totalCarbs}g C • {totalFat}g G
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Copiar Refeição"
                    onClick={() => setShowCopyModal(windowKey)}
                    className="p-1.5 rounded-lg text-m3-outline hover:text-m3-on-surface hover:bg-m3-surface-container-high transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sugestões Contextuais (Alimentos Frequentes da Janela) */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3 mb-2">
                <span className="text-[10px] text-m3-outline font-mono uppercase mr-1">Frequentes:</span>
                {frequentFoodIds.map(fId => {
                  const food = PREPOPULATED_FOODS.find(f => f.id === fId);
                  if (!food) return null;
                  return (
                    <button
                      key={fId}
                      type="button"
                      onClick={() => handleAddFrequentChip(windowKey, fId)}
                      className="text-[11px] bg-m3-surface-container-low hover:bg-m3-surface-container-high border border-m3-outline-variant/60 text-m3-on-surface px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
                    >
                      <span>+ {food.name.split(' ')[0]}</span>
                      <span className="text-m3-outline text-[10px] font-mono">({food.proteinPer100g}g P)</span>
                    </button>
                  );
                })}
              </div>

              {/* Itens Lançados */}
              {items.length === 0 ? (
                <p className="text-xs text-m3-outline/60 italic py-2">
                  Nenhum alimento lançado nesta janela.
                </p>
              ) : (
                <div className="divide-y divide-m3-outline-variant/30">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-medium text-m3-on-surface">
                          {item.name}{' '}
                          <span className="font-mono text-m3-outline font-normal">
                            ({item.grams}g)
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-m3-outline">
                          {item.calories} kcal • {item.protein}g P • {item.carbs}g C • {item.fat}g G • {item.fiber ?? 0}g Fibra
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveFood(windowKey, item.id)}
                        className="text-m3-outline hover:text-m3-error p-1 rounded-lg transition-colors"
                        title="Remover Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Simples de Cópia de Refeição */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-m3-surface-container-high border border-m3-outline rounded-2xl p-5 max-w-sm w-full text-m3-on-surface">
            <h4 className="text-sm font-semibold mb-2">
              Copiar {WINDOW_META[showCopyModal].label}
            </h4>
            <p className="text-xs text-m3-outline mb-4">
              Selecione o destino para duplicar os alimentos desta refeição:
            </p>

            <select
              value={copyTargetWindow}
              onChange={e => setCopyTargetWindow(e.target.value as MealWindow)}
              className="w-full bg-m3-surface-container border border-m3-outline-variant rounded-xl px-3 py-2 text-xs mb-4"
            >
              {Object.entries(WINDOW_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCopyModal(null)}
                className="px-3 py-1.5 rounded-xl border border-m3-outline-variant text-xs text-m3-outline hover:text-m3-on-surface"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onCopyMeal(showCopyModal, copyTargetWindow);
                  setShowCopyModal(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-m3-primary text-m3-on-primary text-xs font-semibold shadow"
              >
                Confirmar Cópia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
