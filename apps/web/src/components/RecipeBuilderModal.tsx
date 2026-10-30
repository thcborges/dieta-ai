import React, { useState, useEffect, useMemo } from 'react';
import {
  calculateRecipeMacros,
  type FoodItem,
  type RecipeInput,
  type RecipeIngredient,
} from '@dieta-ai/core';
import { X, Plus, Trash2, ChefHat, Sparkles, AlertCircle } from 'lucide-react';

interface RecipeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRecipe: (recipe: RecipeInput) => void;
  availableFoods: FoodItem[];
  editingRecipe?: RecipeInput | null;
}

export const RecipeBuilderModal: React.FC<RecipeBuilderModalProps> = ({
  isOpen,
  onClose,
  onSaveRecipe,
  availableFoods,
  editingRecipe,
}) => {
  const [name, setName] = useState('');
  const [servings, setServings] = useState<number | ''>(1);
  const [servingUnitName, setServingUnitName] = useState('porção');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  // Estado para adicionar novo ingrediente
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [ingredientGrams, setIngredientGrams] = useState<number | ''>(100);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (editingRecipe) {
      setName(editingRecipe.name);
      setServings(editingRecipe.servings || 1);
      setServingUnitName(editingRecipe.servingUnitName || 'porção');
      setIngredients(editingRecipe.ingredients || []);
    } else {
      setName('');
      setServings(1);
      setServingUnitName('porção');
      setIngredients([]);
    }
    setErrorMessage(null);
  }, [editingRecipe, isOpen]);

  useEffect(() => {
    if (availableFoods.length > 0 && !selectedFoodId) {
      setSelectedFoodId(availableFoods[0].id);
    }
  }, [availableFoods, selectedFoodId]);

  const foodMap = useMemo(() => {
    const map = new Map<string, FoodItem>();
    for (const food of availableFoods) {
      map.set(food.id, food);
    }
    return map;
  }, [availableFoods]);

  // Cálculo em tempo real dos macros da receita
  const calculation = useMemo(() => {
    const parsedServings = typeof servings === 'number' && servings > 0 ? servings : 1;
    return calculateRecipeMacros(
      {
        name: name || 'Nova Receita',
        servings: parsedServings,
        servingUnitName,
        ingredients,
      },
      availableFoods
    );
  }, [name, servings, servingUnitName, ingredients, availableFoods]);

  if (!isOpen) return null;

  const handleAddIngredient = () => {
    setErrorMessage(null);
    if (!selectedFoodId) {
      setErrorMessage('Selecione um alimento para adicionar.');
      return;
    }
    const grams = typeof ingredientGrams === 'number' ? ingredientGrams : Number(ingredientGrams);
    if (!grams || grams <= 0) {
      setErrorMessage('Informe uma quantidade válida em gramas.');
      return;
    }

    // Se o ingrediente já existe, soma a quantidade; senão adiciona
    setIngredients(prev => {
      const existingIdx = prev.findIndex(item => item.foodId === selectedFoodId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          gramsOrUnits: updated[existingIdx].gramsOrUnits + grams,
        };
        return updated;
      }
      return [...prev, { foodId: selectedFoodId, gramsOrUnits: grams }];
    });

    setIngredientGrams(100);
  };

  const handleRemoveIngredient = (foodId: string) => {
    setIngredients(prev => prev.filter(item => item.foodId !== foodId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('O nome da receita é obrigatório.');
      return;
    }

    if (ingredients.length === 0) {
      setErrorMessage('Adicione pelo menos um ingrediente à receita.');
      return;
    }

    const parsedServings = typeof servings === 'number' && servings > 0 ? servings : 1;

    const recipeToSave: RecipeInput = {
      ...(editingRecipe?.id ? { id: editingRecipe.id } : {}),
      name: trimmedName,
      servings: parsedServings,
      servingUnitName: servingUnitName.trim() || 'porção',
      ingredients,
    };

    onSaveRecipe(recipeToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#1e1f20] border border-[#2e2f30] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-neutral-200 my-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-[#2e2f30] bg-[#1a1b1c]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#a8c7fa]/10 text-[#a8c7fa]">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-wide">
                {editingRecipe ? 'Editar Receita' : 'Criar Nova Receita'}
              </h2>
              <p className="text-xs text-neutral-400">
                Engenharia reversa de receitas compostas e rendimento
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

        {/* Corpo do Modal */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl flex items-center gap-2.5 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Dados Gerais da Receita */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label htmlFor="recipe-name" className="block text-xs font-medium text-neutral-300 mb-1.5">
                Nome da Receita *
              </label>
              <input
                id="recipe-name"
                type="text"
                placeholder="Ex: Bolo de Whey Cappuccino, Panqueca Anabólica..."
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#131314] border border-[#3c4043] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#a8c7fa] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="recipe-servings" className="block text-xs font-medium text-neutral-300 mb-1.5">
                Rendimento (Porções) *
              </label>
              <input
                id="recipe-servings"
                type="number"
                min="1"
                step="1"
                value={servings}
                onChange={e => setServings(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#131314] border border-[#3c4043] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#a8c7fa] transition-colors font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="recipe-unit-name" className="block text-xs font-medium text-neutral-300 mb-1.5">
                Unidade da Porção
              </label>
              <input
                id="recipe-unit-name"
                type="text"
                placeholder="Ex: porção, fatia, pote, copo..."
                value={servingUnitName}
                onChange={e => setServingUnitName(e.target.value)}
                className="w-full bg-[#131314] border border-[#3c4043] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#a8c7fa] transition-colors"
              />
            </div>
          </div>

          {/* Seção de Ingredientes */}
          <div className="border border-[#2e2f30] rounded-xl p-4 bg-[#171819] space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#a8c7fa]" />
              Ingredientes da Receita
            </h3>

            {/* Input de Adicionar Ingrediente */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-7">
                <label htmlFor="select-food-ingredient" className="block text-xs text-neutral-400 mb-1">
                  Selecionar Ingrediente
                </label>
                <select
                  id="select-food-ingredient"
                  value={selectedFoodId}
                  onChange={e => setSelectedFoodId(e.target.value)}
                  className="w-full bg-[#131314] border border-[#3c4043] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a8c7fa]"
                >
                  {availableFoods.map(food => (
                    <option key={food.id} value={food.id}>
                      {food.name} ({food.caloriesPer100g} kcal/100g | {food.proteinPer100g}g P)
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="ingredient-grams-input" className="block text-xs text-neutral-400 mb-1">
                  Quantidade (g)
                </label>
                <input
                  id="ingredient-grams-input"
                  type="number"
                  min="1"
                  value={ingredientGrams}
                  onChange={e => setIngredientGrams(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#131314] border border-[#3c4043] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a8c7fa] font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="w-full h-[38px] bg-[#a8c7fa] hover:bg-[#8ab4f8] text-neutral-950 font-medium text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              </div>
            </div>

            {/* Lista de Ingredientes Adicionados */}
            {ingredients.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500 border border-dashed border-[#2e2f30] rounded-xl">
                Nenhum ingrediente adicionado ainda. Escolha um alimento acima e clique em Adicionar.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {ingredients.map(ing => {
                  const food = foodMap.get(ing.foodId);
                  const factor = ing.gramsOrUnits / 100;
                  const cals = food ? Math.round(food.caloriesPer100g * factor) : 0;
                  const prot = food ? Math.round(food.proteinPer100g * factor * 10) / 10 : 0;

                  return (
                    <div
                      key={ing.foodId}
                      className="flex items-center justify-between p-2.5 bg-[#1e1f20] border border-[#2e2f30] rounded-xl text-xs"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="font-medium text-neutral-200 truncate">
                          {food?.name || ing.foodId}
                        </div>
                        <div className="text-neutral-400 font-mono text-[11px]">
                          {ing.gramsOrUnits}g • {cals} kcal • {prot}g P
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(ing.foodId)}
                        aria-label={`Remover ${food?.name || ing.foodId}`}
                        className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-neutral-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumo Nutricional Analítico */}
          <div className="border border-[#2e2f30] rounded-xl p-4 bg-[#141516] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#a8c7fa]" />
                Resumo Nutricional da Receita
              </h3>
              <div className="text-[11px] font-mono text-neutral-400">
                Peso Total: <strong className="text-white">{calculation.totalWeightGrams}g</strong>
              </div>
            </div>

            {/* Grid Comparativo: Total vs Porção */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Receita Completa */}
              <div className="bg-[#1a1b1c] p-3 rounded-xl border border-[#282a2d] space-y-1.5">
                <div className="text-neutral-400 text-[11px] font-medium border-b border-[#282a2d] pb-1">
                  Receita Completa ({calculation.totalServings} {servingUnitName}s)
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">Calorias:</span>
                  <span className="font-semibold text-white">{calculation.totalMacros.calories} kcal</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">Proteínas:</span>
                  <span className="font-semibold text-blue-400">{calculation.totalMacros.proteinGrams}g</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">Carboidratos:</span>
                  <span className="font-semibold text-amber-400">{calculation.totalMacros.carbGrams}g</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">Gorduras:</span>
                  <span className="font-semibold text-rose-400">{calculation.totalMacros.fatGrams}g</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">Fibras:</span>
                  <span className="font-semibold text-emerald-400">{calculation.totalMacros.fiberGrams}g</span>
                </div>
              </div>

              {/* Por Porção */}
              <div className="bg-[#1a1b1c] p-3 rounded-xl border border-[#282a2d] space-y-1.5">
                <div className="text-[#a8c7fa] text-[11px] font-medium border-b border-[#282a2d] pb-1 flex justify-between">
                  <span>Por {servingUnitName}</span>
                  <span className="font-mono text-neutral-400 text-[10px]">
                    {calculation.totalWeightGrams > 0
                      ? `~${Math.round(calculation.totalWeightGrams / calculation.totalServings)}g`
                      : ''}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">Calorias:</span>
                  <span className="font-semibold text-white">{calculation.perServing.calories} kcal</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">Proteínas:</span>
                  <span className="font-semibold text-blue-400">{calculation.perServing.proteinGrams}g</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">Carboidratos:</span>
                  <span className="font-semibold text-amber-400">{calculation.perServing.carbGrams}g</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">Gorduras:</span>
                  <span className="font-semibold text-rose-400">{calculation.perServing.fatGrams}g</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">Fibras:</span>
                  <span className="font-semibold text-emerald-400">{calculation.perServing.fiberGrams}g</span>
                </div>
              </div>
            </div>

            {/* Indicador de Densidade Proteica */}
            <div className="bg-[#1a1b1c] px-3 py-2 rounded-xl border border-[#282a2d] flex items-center justify-between text-xs">
              <span className="text-neutral-400">Densidade Proteica:</span>
              <span className="font-mono font-bold text-[#a8c7fa]">
                {calculation.proteinDensity}g / 100 kcal
              </span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#2e2f30]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#a8c7fa] hover:bg-[#8ab4f8] text-neutral-950 text-xs font-semibold tracking-wide transition-colors shadow-lg shadow-[#a8c7fa]/10"
            >
              Salvar Receita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
