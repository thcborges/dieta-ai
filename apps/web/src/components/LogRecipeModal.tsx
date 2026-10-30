import React, { useState, useMemo } from 'react';
import {
  calculateRecipeMacros,
  calculateRecipePortionMacros,
  type MealWindow,
  type FoodItem,
  type RecipeInput,
} from '@dieta-ai/core';
import { type LoggedFood } from './MealBuilder.js';
import { X, ChefHat, Sunrise, Sun, Sunset, Moon, Sparkles, Check } from 'lucide-react';

interface LogRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: RecipeInput | null;
  availableFoods: FoodItem[];
  defaultWindow?: MealWindow;
  onLogPortion: (window: MealWindow, item: LoggedFood) => void;
}

type PortionMode = 'serving' | 'fraction' | 'grams';

const WINDOW_OPTIONS: { id: MealWindow; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'breakfast', label: 'Café da Manhã', icon: Sunrise },
  { id: 'lunch', label: 'Almoço', icon: Sun },
  { id: 'afternoon_snack', label: 'Lanche', icon: Sunset },
  { id: 'dinner_event', label: 'Jantar / Evento', icon: Moon },
];

export const LogRecipeModal: React.FC<LogRecipeModalProps> = ({
  isOpen,
  onClose,
  recipe,
  availableFoods,
  defaultWindow = 'lunch',
  onLogPortion,
}) => {
  const [selectedWindow, setSelectedWindow] = useState<MealWindow>(defaultWindow);
  const [portionMode, setPortionMode] = useState<PortionMode>('serving');
  const [servingValue, setServingValue] = useState<number | ''>(1);
  const [fractionValue, setFractionValue] = useState<number>(0.25);
  const [gramsValue, setGramsValue] = useState<number | ''>(100);

  // Calcula totais da receita base
  const recipeCalculation = useMemo(() => {
    if (!recipe) return null;
    return calculateRecipeMacros(recipe, availableFoods);
  }, [recipe, availableFoods]);

  // Calcula a porção conforme o modo selecionado
  const portionCalculation = useMemo(() => {
    if (!recipeCalculation) return null;

    if (portionMode === 'serving') {
      const val = typeof servingValue === 'number' && servingValue > 0 ? servingValue : 1;
      return calculateRecipePortionMacros(recipeCalculation, { type: 'serving', value: val });
    }
    if (portionMode === 'fraction') {
      const val = fractionValue > 0 ? fractionValue : 0.25;
      return calculateRecipePortionMacros(recipeCalculation, { type: 'fraction', value: val });
    }
    if (portionMode === 'grams') {
      const val = typeof gramsValue === 'number' && gramsValue > 0 ? gramsValue : 100;
      return calculateRecipePortionMacros(recipeCalculation, { type: 'grams', value: val });
    }
    return null;
  }, [recipeCalculation, portionMode, servingValue, fractionValue, gramsValue]);

  if (!isOpen || !recipe || !recipeCalculation || !portionCalculation) {
    return null;
  }

  const unitName = recipe.servingUnitName || 'porção';

  const handleLog = (e: React.FormEvent) => {
    e.preventDefault();

    let portionDesc = '';
    if (portionMode === 'serving') {
      const count = typeof servingValue === 'number' ? servingValue : 1;
      portionDesc = `${count} ${unitName}${count !== 1 && unitName === 'porção' ? 'ões' : count !== 1 ? 's' : ''}`;
    } else if (portionMode === 'fraction') {
      if (fractionValue === 0.25) portionDesc = '1/4 da receita';
      else if (fractionValue === 0.33) portionDesc = '1/3 da receita';
      else if (fractionValue === 0.5) portionDesc = '1/2 da receita';
      else if (fractionValue === 1.0) portionDesc = '1/1 (receita inteira)';
      else portionDesc = `${Math.round(fractionValue * 100)}% da receita`;
    } else {
      portionDesc = `${portionCalculation.equivalentGrams}g`;
    }

    const newFood: LoggedFood = {
      id: `recipe_log_${recipe.id || 'item'}_${Date.now()}`,
      foodId: recipe.id || `recipe_${Date.now()}`,
      name: `${recipe.name} (${portionDesc})`,
      grams: portionCalculation.equivalentGrams,
      calories: portionCalculation.calories,
      protein: portionCalculation.proteinGrams,
      carbs: portionCalculation.carbGrams,
      fat: portionCalculation.fatGrams,
      fiber: portionCalculation.fiberGrams,
    };

    onLogPortion(selectedWindow, newFood);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#1e1f20] border border-[#2e2f30] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-200 my-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-[#2e2f30] bg-[#1a1b1c]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#a8c7fa]/10 text-[#a8c7fa]">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Lançar Receita no Diário
              </h2>
              <p className="text-xs text-neutral-400">
                {recipe.name} • Rendimento: {recipeCalculation.totalServings} {unitName}s
                {recipeCalculation.totalWeightGrams > 0 ? ` (${recipeCalculation.totalWeightGrams}g)` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário de Lançamento */}
        <form onSubmit={handleLog} className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Seletor de Janela da Refeição */}
          <div>
            <label htmlFor="meal-window-select" className="block text-xs font-medium text-neutral-300 mb-2">
              Janela da Refeição
            </label>
            <select
              id="meal-window-select"
              value={selectedWindow}
              onChange={e => setSelectedWindow(e.target.value as MealWindow)}
              className="w-full bg-[#131314] border border-[#3c4043] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#a8c7fa]"
            >
              {WINDOW_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Seleção do Modo de Porção */}
          <div className="space-y-3">
            <span className="block text-xs font-medium text-neutral-300">Modo de Quantidade</span>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`flex items-center justify-center p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                  portionMode === 'serving'
                    ? 'bg-[#a8c7fa]/15 border-[#a8c7fa] text-white'
                    : 'bg-[#141516] border-[#2e2f30] text-neutral-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="portionMode"
                  value="serving"
                  checked={portionMode === 'serving'}
                  onChange={() => setPortionMode('serving')}
                  className="sr-only"
                />
                Porção ({unitName})
              </label>

              <label
                className={`flex items-center justify-center p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                  portionMode === 'fraction'
                    ? 'bg-[#a8c7fa]/15 border-[#a8c7fa] text-white'
                    : 'bg-[#141516] border-[#2e2f30] text-neutral-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="portionMode"
                  value="fraction"
                  checked={portionMode === 'fraction'}
                  onChange={() => setPortionMode('fraction')}
                  className="sr-only"
                />
                Fração da Receita
              </label>

              <label
                className={`flex items-center justify-center p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                  portionMode === 'grams'
                    ? 'bg-[#a8c7fa]/15 border-[#a8c7fa] text-white'
                    : 'bg-[#141516] border-[#2e2f30] text-neutral-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="portionMode"
                  value="grams"
                  checked={portionMode === 'grams'}
                  onChange={() => setPortionMode('grams')}
                  className="sr-only"
                />
                Peso em Gramas
              </label>
            </div>

            {/* Inputs por Modo */}
            {portionMode === 'serving' && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  {[0.5, 1, 1.5, 2].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setServingValue(num)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                        servingValue === num
                          ? 'bg-[#a8c7fa] text-neutral-950 font-bold border-[#a8c7fa]'
                          : 'bg-[#141516] border-[#3c4043] text-neutral-300 hover:text-white'
                      }`}
                    >
                      {num} {unitName}{num !== 1 && unitName === 'porção' ? 'ões' : num !== 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
                <div>
                  <label htmlFor="custom-serving-input" className="block text-[11px] text-neutral-400 mb-1">
                    Ou digite quantidade de {unitName}s customizada:
                  </label>
                  <input
                    id="custom-serving-input"
                    type="number"
                    step="0.25"
                    min="0.1"
                    value={servingValue}
                    onChange={e => setServingValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#131314] border border-[#3c4043] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a8c7fa] font-mono"
                  />
                </div>
              </div>
            )}

            {portionMode === 'fraction' && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '1/4', value: 0.25 },
                    { label: '1/3', value: 0.33 },
                    { label: '1/2', value: 0.5 },
                    { label: '1/1', value: 1.0 },
                  ].map(f => (
                    <button
                      key={f.label}
                      type="button"
                      onClick={() => setFractionValue(f.value)}
                      className={`py-2 rounded-lg border text-xs font-mono transition-colors ${
                        fractionValue === f.value
                          ? 'bg-[#a8c7fa] text-neutral-950 font-bold border-[#a8c7fa]'
                          : 'bg-[#141516] border-[#3c4043] text-neutral-300 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {portionMode === 'grams' && (
              <div className="space-y-2 pt-1">
                <label htmlFor="grams-consumed-input" className="block text-[11px] text-neutral-400">
                  Gramas consumidos (Total da receita: {recipeCalculation.totalWeightGrams}g):
                </label>
                <input
                  id="grams-consumed-input"
                  type="number"
                  min="1"
                  step="1"
                  value={gramsValue}
                  onChange={e => setGramsValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-[#131314] border border-[#3c4043] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a8c7fa] font-mono"
                />
              </div>
            )}
          </div>

          {/* Card com os Macros a Serem Adicionados */}
          <div className="bg-[#141516] border border-[#2e2f30] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#282a2d] pb-2">
              <span className="text-xs font-semibold text-[#a8c7fa] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Macronutrientes da Porção
              </span>
              <span className="text-xs font-mono text-neutral-300">
                {portionCalculation.equivalentGrams}g ({portionCalculation.equivalentServings} {unitName}s)
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center font-mono">
              <div className="bg-[#1a1b1c] p-2 rounded-lg border border-[#282a2d]">
                <div className="text-[10px] text-neutral-400 uppercase">Kcal</div>
                <div className="text-sm font-bold text-white">{portionCalculation.calories}</div>
              </div>
              <div className="bg-[#1a1b1c] p-2 rounded-lg border border-[#282a2d]">
                <div className="text-[10px] text-neutral-400 uppercase">Proteína</div>
                <div className="text-sm font-bold text-blue-400">{portionCalculation.proteinGrams}g</div>
              </div>
              <div className="bg-[#1a1b1c] p-2 rounded-lg border border-[#282a2d]">
                <div className="text-[10px] text-neutral-400 uppercase">Carboidrato</div>
                <div className="text-sm font-bold text-amber-400">{portionCalculation.carbGrams}g</div>
              </div>
              <div className="bg-[#1a1b1c] p-2 rounded-lg border border-[#282a2d]">
                <div className="text-[10px] text-neutral-400 uppercase">Gordura</div>
                <div className="text-sm font-bold text-rose-400">{portionCalculation.fatGrams}g</div>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2e2f30]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleLog}
              className="px-5 py-2.5 rounded-xl bg-[#a8c7fa] hover:bg-[#8ab4f8] text-neutral-950 text-xs font-semibold tracking-wide transition-colors shadow-lg shadow-[#a8c7fa]/10 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Adicionar ao Diário
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
