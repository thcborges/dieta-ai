import React from 'react';
import {
  type RecipeInput,
  type FoodItem,
  calculateRecipeMacros,
} from '@dieta-ai/core';
import { ChefHat, Plus, Edit2, Trash2, CalendarPlus, X, Scale, Flame } from 'lucide-react';

export interface RecipeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: RecipeInput[];
  availableFoods: FoodItem[];
  onOpenCreate: () => void;
  onOpenEdit: (recipe: RecipeInput) => void;
  onOpenLog: (recipe: RecipeInput) => void;
  onDeleteRecipe: (recipeId: string) => void;
}

export const RecipeListModal: React.FC<RecipeListModalProps> = ({
  isOpen,
  onClose,
  recipes,
  availableFoods,
  onOpenCreate,
  onOpenEdit,
  onOpenLog,
  onDeleteRecipe,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#1e1f20] border border-[#2e2f30] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-200 my-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-[#2e2f30] bg-[#1a1b1c]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#a8c7fa]/10 text-[#a8c7fa]">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Minhas Receitas
              </h2>
              <p className="text-xs text-neutral-400">
                {recipes.length} {recipes.length === 1 ? 'receita cadastrada' : 'receitas cadastradas'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#a8c7fa] hover:bg-[#8ab4f8] text-neutral-950 text-xs font-semibold tracking-wide transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Receita</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lista de Receitas */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {recipes.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-[#3c4043] rounded-2xl bg-[#141516]/50">
              <ChefHat className="w-12 h-12 text-neutral-500 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-neutral-200 mb-1">
                Nenhuma receita cadastrada
              </h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto mb-5 leading-relaxed">
                Crie receitas compostas por múltiplos ingredientes com porções e rendimento customizados para lançar facilmente frações ou porções no seu diário.
              </p>
              <button
                onClick={onOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#a8c7fa] hover:bg-[#8ab4f8] text-neutral-950 text-xs font-semibold rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Criar Primeira Receita
              </button>
            </div>
          ) : (
            recipes.map(recipe => {
              const calculation = calculateRecipeMacros(recipe, availableFoods);
              const unit = recipe.servingUnitName || 'porção';
              const unitLabel = recipe.servings !== 1 ? (unit === 'porção' ? 'porções' : `${unit}s`) : unit;

              return (
                <div
                  key={recipe.id || recipe.name}
                  className="bg-[#141516] border border-[#2e2f30] rounded-xl p-4.5 hover:border-[#3c4043] transition-all space-y-3.5"
                >
                  {/* Topo do Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white tracking-wide">
                          {recipe.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-[#a8c7fa]/15 text-[#a8c7fa] border border-[#a8c7fa]/30">
                          Receita
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-400">
                        <span>
                          Rendimento: <strong className="text-neutral-200">{recipe.servings} {unitLabel}</strong>
                        </span>
                        {calculation.totalWeightGrams > 0 && (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Scale className="w-3.5 h-3.5 text-neutral-500" />
                            {calculation.totalWeightGrams}g total (~{Math.round(calculation.totalWeightGrams / recipe.servings)}g/{unit})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ações da Receita */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => onOpenLog(recipe)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#a8c7fa]/15 hover:bg-[#a8c7fa]/25 border border-[#a8c7fa]/30 text-[#a8c7fa] text-xs font-medium transition-colors"
                        title="Lançar no Diário"
                        aria-label={`Lançar ${recipe.name} no Diário`}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>Lançar</span>
                      </button>
                      <button
                        onClick={() => onOpenEdit(recipe)}
                        className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                        title="Editar Receita"
                        aria-label={`Editar ${recipe.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => recipe.id && onDeleteRecipe(recipe.id)}
                        className="p-1.5 text-rose-400/70 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Excluir Receita"
                        aria-label={`Excluir ${recipe.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Resumo Nutricional (Por Porção) */}
                  <div className="bg-[#1a1b1c] rounded-xl p-3 border border-[#282a2d] grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
                    <div className="bg-[#141516] p-2 rounded-lg border border-[#232426]">
                      <div className="text-[10px] text-neutral-400 uppercase">Kcal / {unit}</div>
                      <div className="text-xs font-bold text-white">{calculation.perServing.calories}</div>
                    </div>
                    <div className="bg-[#141516] p-2 rounded-lg border border-[#232426]">
                      <div className="text-[10px] text-neutral-400 uppercase">Proteína</div>
                      <div className="text-xs font-bold text-blue-400">{calculation.perServing.proteinGrams}g</div>
                    </div>
                    <div className="bg-[#141516] p-2 rounded-lg border border-[#232426]">
                      <div className="text-[10px] text-neutral-400 uppercase">Carbo</div>
                      <div className="text-xs font-bold text-amber-400">{calculation.perServing.carbGrams}g</div>
                    </div>
                    <div className="bg-[#141516] p-2 rounded-lg border border-[#232426]">
                      <div className="text-[10px] text-neutral-400 uppercase">Gordura</div>
                      <div className="text-xs font-bold text-rose-400">{calculation.perServing.fatGrams}g</div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 bg-[#141516] p-2 rounded-lg border border-[#232426] flex flex-col justify-center">
                      <div className="text-[10px] text-neutral-400 uppercase flex items-center justify-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        Densidade
                      </div>
                      <div className="text-xs font-bold text-orange-300">
                        {calculation.proteinDensity}g/100k
                      </div>
                    </div>
                  </div>

                  {/* Ingredientes Compactos */}
                  <div className="text-xs text-neutral-400 flex flex-wrap gap-1.5 items-center">
                    <span className="text-neutral-500 text-[11px] font-medium">Ingredientes:</span>
                    {recipe.ingredients.map(ing => {
                      const food = availableFoods.find(f => f.id === ing.foodId);
                      return (
                        <span
                          key={ing.foodId}
                          className="bg-[#242526] px-2 py-0.5 rounded text-[11px] text-neutral-300 border border-[#303133]"
                        >
                          {food?.name || ing.foodId}: <strong className="text-neutral-100 font-mono">{ing.gramsOrUnits}g</strong>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
