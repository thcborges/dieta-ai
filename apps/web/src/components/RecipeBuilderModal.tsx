import React, { useState, useEffect, useMemo } from 'react';
import {
  calculateRecipeMacros,
  searchFoodItems,
  type FoodItem,
  type RecipeInput,
  type RecipeIngredient,
} from '@dieta-ai/core';
import { X, Plus, Trash2, ChefHat, Sparkles, AlertCircle, Search } from 'lucide-react';

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

  // Estado para adicionar novo ingrediente e busca
  const [searchQuery, setSearchQuery] = useState('');
  const [allFoodsList, setAllFoodsList] = useState<FoodItem[]>(availableFoods);
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [ingredientGrams, setIngredientGrams] = useState<number | ''>(100);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setAllFoodsList(availableFoods);
  }, [availableFoods]);

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
    setSearchQuery('');
  }, [editingRecipe, isOpen]);

  useEffect(() => {
    if (allFoodsList.length > 0 && !selectedFoodId) {
      setSelectedFoodId(allFoodsList[0].id);
    }
  }, [allFoodsList, selectedFoodId]);

  const foodMap = useMemo(() => {
    const map = new Map<string, FoodItem>();
    for (const food of allFoodsList) {
      map.set(food.id, food);
    }
    return map;
  }, [allFoodsList]);

  // Lista fixa e sempre disponível com suporte a busca em tempo real
  const filteredFoods = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return allFoodsList;
    return searchFoodItems(allFoodsList, query);
  }, [allFoodsList, searchQuery]);

  const selectedFood = useMemo(() => {
    return foodMap.get(selectedFoodId) || allFoodsList.find(f => f.id === selectedFoodId) || null;
  }, [foodMap, selectedFoodId, allFoodsList]);

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
      allFoodsList
    );
  }, [name, servings, servingUnitName, ingredients, allFoodsList]);

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

            {/* Campo de Busca de Ingredientes */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar ingrediente por nome, marca ou corte..."
                className="w-full bg-[#131314] border border-[#3c4043] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#a8c7fa] transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Painel de Lançamento / Ingrediente Selecionado */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3 bg-[#131314] border border-[#2e2f30] rounded-xl">
              <div className="sm:col-span-7">
                <span className="block text-xs text-neutral-400 mb-1 font-mono uppercase">
                  Ingrediente Selecionado
                </span>
                <div className="flex items-center justify-between p-2.5 bg-[#1a1b1c] border border-[#a8c7fa]/40 rounded-xl min-h-[42px]">
                  {selectedFood ? (
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-xs font-semibold text-white truncate">{selectedFood.name}</div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        {selectedFood.caloriesPer100g} kcal • {selectedFood.proteinPer100g}g P • {selectedFood.carbsPer100g}g C • {selectedFood.fatPer100g}g G por 100g
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-500">Selecione um ingrediente na lista abaixo</span>
                  )}
                  {selectedFood && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono shrink-0">
                      Pronto
                    </span>
                  )}
                </div>

                {/* Elemento acessível para testes e leitores de tela */}
                <select
                  id="select-food-ingredient"
                  aria-label="Selecionar Ingrediente"
                  value={selectedFoodId}
                  onChange={e => setSelectedFoodId(e.target.value)}
                  className="sr-only"
                >
                  {allFoodsList.map(food => (
                    <option key={food.id} value={food.id}>
                      {food.name} ({food.caloriesPer100g} kcal/100g | {food.proteinPer100g}g P)
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="ingredient-grams-input" className="block text-xs text-neutral-400 mb-1 font-mono uppercase">
                  Quantidade (g)
                </label>
                <input
                  id="ingredient-grams-input"
                  type="number"
                  min="1"
                  value={ingredientGrams}
                  onChange={e => setIngredientGrams(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#1a1b1c] border border-[#3c4043] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a8c7fa] font-mono h-[42px]"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="w-full h-[42px] bg-[#a8c7fa] hover:bg-[#8ab4f8] text-neutral-950 font-medium text-xs rounded-xl flex items-center justify-center gap-1 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              </div>
            </div>

            {/* Lista Fixa de Ingredientes / Resultados da Busca (Sempre Disponível) */}
            <div className="p-3 bg-[#131314] border border-[#2e2f30] rounded-xl space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#2e2f30]">
                <span className="text-xs font-semibold text-neutral-300">
                  {searchQuery.trim().length > 0
                    ? `Resultados da busca (${filteredFoods.length} alimentos):`
                    : `Ingredientes Disponíveis (${filteredFoods.length}):`}
                </span>
                <span className="text-[11px] text-neutral-500 font-mono hidden sm:inline">
                  Clique para selecionar ou adicione diretamente
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredFoods.length === 0 ? (
                  <div className="py-4 text-center text-xs text-neutral-500">
                    Nenhum alimento encontrado para "{searchQuery}".
                  </div>
                ) : (
                  filteredFoods.map(food => {
                    const isSelected = food.id === selectedFoodId;
                    return (
                      <div
                        key={food.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-[#a8c7fa]/10 border-[#a8c7fa] text-white shadow-sm'
                            : 'bg-[#1a1b1c] border-[#2e2f30] hover:border-[#3c4043] text-neutral-300'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white truncate">{food.name}</span>
                            {food.isRecipe && (
                              <span className="text-[10px] bg-amber-400/15 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded-full font-mono font-semibold">
                                Receita
                              </span>
                            )}
                            {food.isCustom && !food.isRecipe && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded-full font-mono">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                            {food.caloriesPer100g} kcal • {food.proteinPer100g}g P • {food.carbsPer100g}g C • {food.fatPer100g}g G por 100g
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            aria-label={`Selecionar ${food.name}`}
                            onClick={() => setSelectedFoodId(food.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-[#a8c7fa] text-neutral-950 font-semibold'
                                : 'bg-[#2e2f30] hover:bg-[#3c4043] text-neutral-200'
                            }`}
                          >
                            {isSelected ? '✓ Selecionado' : 'Selecionar'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Lista de Ingredientes Adicionados */}
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Ingredientes Adicionados ({ingredients.length})
              </h4>
              {ingredients.length === 0 ? (
                <div className="py-5 text-center text-xs text-neutral-500 border border-dashed border-[#2e2f30] rounded-xl">
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
          </div>

          {/* Resumo Nutricional Analítico */}
          <div className="border border-[#2e2f30] rounded-xl p-4 bg-[#141516] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#a8c7fa]" />
                Resumo Nutricional da Receita
              </h3>
              <span className="text-[11px] font-mono text-[#a8c7fa] bg-[#a8c7fa]/10 px-2 py-0.5 rounded-full">
                {calculation.totalServings} {servingUnitName || 'porção'}(ões) • Total {calculation.totalWeightGrams}g
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 bg-[#1e1f20] rounded-xl border border-[#2e2f30]">
                <div className="text-[10px] text-neutral-400 uppercase font-mono">Calorias / Porção</div>
                <div className="text-lg font-bold text-white font-mono mt-0.5">
                  {calculation.perServing.calories}{' '}
                  <span className="text-[11px] font-normal text-neutral-400">kcal</span>
                </div>
                <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  Total: {calculation.totalMacros.calories} kcal
                </div>
              </div>

              <div className="p-2.5 bg-[#1e1f20] rounded-xl border border-[#2e2f30]">
                <div className="text-[10px] text-emerald-400 uppercase font-mono">Proteínas / Porção</div>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                  {calculation.perServing.proteinGrams}{' '}
                  <span className="text-[11px] font-normal text-neutral-400">g</span>
                </div>
                <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  Total: {calculation.totalMacros.proteinGrams}g
                </div>
              </div>

              <div className="p-2.5 bg-[#1e1f20] rounded-xl border border-[#2e2f30]">
                <div className="text-[10px] text-amber-400 uppercase font-mono">Carboidratos / Porção</div>
                <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                  {calculation.perServing.carbGrams}{' '}
                  <span className="text-[11px] font-normal text-neutral-400">g</span>
                </div>
                <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  Total: {calculation.totalMacros.carbGrams}g
                </div>
              </div>

              <div className="p-2.5 bg-[#1e1f20] rounded-xl border border-[#2e2f30]">
                <div className="text-[10px] text-purple-400 uppercase font-mono">Gorduras / Porção</div>
                <div className="text-lg font-bold text-purple-400 font-mono mt-0.5">
                  {calculation.perServing.fatGrams}{' '}
                  <span className="text-[11px] font-normal text-neutral-400">g</span>
                </div>
                <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  Total: {calculation.totalMacros.fatGrams}g
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé com Ações */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2e2f30]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#3c4043] text-neutral-300 hover:text-white hover:bg-neutral-800 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#a8c7fa] hover:bg-[#8ab4f8] text-neutral-950 text-sm font-semibold transition-colors shadow-lg"
            >
              {editingRecipe ? 'Atualizar Receita' : 'Salvar Receita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
