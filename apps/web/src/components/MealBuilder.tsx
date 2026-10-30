import React, { useState, useEffect, useMemo } from 'react';
import {
  type MealWindow,
  PREPOPULATED_FOODS,
  type FoodItem,
  getCommonFoodsForMeal,
  searchFoodItems,
  type RecipeInput,
} from '@dieta-ai/core';
import {
  Plus,
  Trash2,
  Copy,
  Zap,
  Sparkles,
  UtensilsCrossed,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Search,
  PlusCircle,
  Loader2,
  CheckCircle,
  AlertCircle,
  ScanBarcode,
  ChefHat,
} from 'lucide-react';
import { FoodRegistrationModal } from './FoodRegistrationModal.js';
import { BarcodeScannerModal } from './BarcodeScannerModal.js';
import { ProteinAutocompleteModal } from './ProteinAutocompleteModal.js';
import { QuickMacroModal } from './QuickMacroModal.js';
import { CopyMealModal } from './CopyMealModal.js';
import { RecipeListModal } from './RecipeListModal.js';
import { RecipeBuilderModal } from './RecipeBuilderModal.js';
import { LogRecipeModal } from './LogRecipeModal.js';

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
  availableFoods?: FoodItem[];
  recipes?: RecipeInput[];
  onAddFood: (window: MealWindow, item: LoggedFood) => void;
  onRemoveFood: (window: MealWindow, itemId: string) => void;
  onCopyMeal: (fromWindow: MealWindow, toWindow: MealWindow, copiedItems?: LoggedFood[]) => void;
  onAutoCompleteProtein: (source: 'sassami' | 'whey_growth') => void;
  onRegisterFood?: (food: FoodItem) => void;
  onSaveRecipe?: (recipe: RecipeInput) => void;
  onDeleteRecipe?: (recipeId: string) => void;
  missingProtein: number;
  remainingCalories: number;
  currentUser?: { id: string } | null;
  selectedDate?: string;
  onLoadMealsForDate?: (date: string) => Promise<MealMap> | MealMap;
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
  availableFoods,
  recipes = [],
  onAddFood,
  onRemoveFood,
  onCopyMeal,
  onAutoCompleteProtein,
  onRegisterFood,
  onSaveRecipe,
  onDeleteRecipe,
  missingProtein,
  remainingCalories,
  currentUser,
  selectedDate,
  onLoadMealsForDate,
}) => {
  const [internalFoods, setInternalFoods] = useState<FoodItem[]>(() => {
    return availableFoods && availableFoods.length > 0 ? availableFoods : PREPOPULATED_FOODS;
  });

  const [selectedFoodId, setSelectedFoodId] = useState<string>('sassami');
  const [servingGrams, setServingGrams] = useState<number | ''>(100);
  const [activeWindow, setActiveWindow] = useState<MealWindow>('lunch');
  const [showCopyModal, setShowCopyModal] = useState<MealWindow | null>(null);
  const [quickMacroWindow, setQuickMacroWindow] = useState<MealWindow | null>(null);

  // Gestão de Receitas Compostas (Módulo 3)
  const [isRecipeListOpen, setIsRecipeListOpen] = useState<boolean>(false);
  const [isRecipeBuilderOpen, setIsRecipeBuilderOpen] = useState<boolean>(false);
  const [isLogRecipeOpen, setIsLogRecipeOpen] = useState<boolean>(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeInput | null>(null);
  const [recipeToLog, setRecipeToLog] = useState<RecipeInput | null>(null);

  // Busca e Cadastro
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchFeedback, setSearchFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isProteinModalOpen, setIsProteinModalOpen] = useState<boolean>(false);
  const [prefillBarcode, setPrefillBarcode] = useState<string>('');

  useEffect(() => {
    if (availableFoods && availableFoods.length > 0) {
      setInternalFoods(availableFoods);
    }
  }, [availableFoods]);

  const selectedFood =
    internalFoods.find(f => f.id === selectedFoodId) ??
    internalFoods[0] ??
    PREPOPULATED_FOODS[0]!;

  const handleWindowChange = (newWindow: MealWindow) => {
    setActiveWindow(newWindow);
    const commonForNewWindow = getCommonFoodsForMeal(newWindow, internalFoods);
    const isAlreadyCommon = commonForNewWindow.some(f => f.id === selectedFoodId);
    if (!isAlreadyCommon && commonForNewWindow.length > 0) {
      const firstCommon = commonForNewWindow[0]!;
      setSelectedFoodId(firstCommon.id);
      setServingGrams(firstCommon.servingSizeGrams || 100);
    }
  };

  const handleBarcodeScanned = async (code: string) => {
    setSearchQuery(code);
    setSearchFeedback(null);

    // 1. Consulta em primeiro lugar o nosso banco de dados local
    const localMatches = searchFoodItems(internalFoods, code, currentUser?.id);
    if (localMatches.length > 0) {
      const found = localMatches[0]!;
      setSelectedFoodId(found.id);
      setServingGrams(found.servingSizeGrams || 100);
      setSearchFeedback({
        type: 'success',
        message: `Alimento encontrado no banco local: ${found.name}`,
      });
      return;
    }

    // 2. Não encontrado localmente: consulta a API (cache do Firestore / Open Food Facts)
    setIsSearching(true);
    try {
      let offFood: FoodItem | null = null;
      const headers: Record<string, string> = {};
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;

      // Consulta rota de código de barras
      const barcodeRes = await fetch(`/api/v1/foods/barcode/${encodeURIComponent(code)}`, { headers });
      if (barcodeRes.ok) {
        const barcodeData = await barcodeRes.json();
        if (barcodeData.food) {
          offFood = barcodeData.food;
        }
      }

      if (!offFood) {
        const searchRes = await fetch(`/api/v1/foods/search?q=${encodeURIComponent(code)}`, { headers });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.foods && searchData.foods.length > 0) {
            offFood = searchData.foods[0];
          }
        }
      }

      if (offFood) {
        setInternalFoods(prev => {
          if (prev.some(f => f.id === offFood!.id)) return prev;
          return [offFood!, ...prev];
        });
        onRegisterFood?.(offFood);
        setSelectedFoodId(offFood.id);
        setServingGrams(offFood.servingSizeGrams || 100);
        setSearchFeedback({
          type: 'success',
          message: `Alimento encontrado e salvo no banco de dados: ${offFood.name}`,
        });
      } else {
        // Código não encontrado: abre formulário rápido M3 com o código pré-preenchido
        setPrefillBarcode(code);
        setSearchFeedback({
          type: 'error',
          message: `Código ${code} não cadastrado. Preencha os macronutrientes para inclusão imediata.`,
        });
        setIsRegisterModalOpen(true);
      }
    } catch {
      setPrefillBarcode(code);
      setSearchFeedback({
        type: 'error',
        message: `Código ${code} não cadastrado. Preencha os macronutrientes para inclusão imediata.`,
      });
      setIsRegisterModalOpen(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectFoodFromSearch = (food: FoodItem) => {
    setInternalFoods(prev => {
      if (prev.some(f => f.id === food.id)) return prev;
      return [food, ...prev];
    });
    setSelectedFoodId(food.id);
    setServingGrams(food.servingSizeGrams || 100);
    setSearchFeedback({
      type: 'success',
      message: `Alimento selecionado: ${food.name}`,
    });
  };

  const handleDirectLaunchFromSearch = (food: FoodItem, window: MealWindow) => {
    setInternalFoods(prev => {
      if (prev.some(f => f.id === food.id)) return prev;
      return [food, ...prev];
    });
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
    setSearchFeedback({
      type: 'success',
      message: `"${food.name}" lançado com sucesso em ${WINDOW_META[window].label}!`,
    });
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    const query = val.trim();
    if (query.length >= 2) {
      const matches = searchFoodItems(internalFoods, query, currentUser?.id);
      setSearchResults(matches);
      if (matches.length > 0) {
        setSelectedFoodId(matches[0].id);
        setServingGrams(matches[0].servingSizeGrams || 100);
        setSearchFeedback({
          type: 'success',
          message: `${matches.length} alimento(s) encontrado(s) no banco local para "${query}". Escolha abaixo ou consulte online:`,
        });
      } else {
        setSearchFeedback(null);
      }
    } else if (query.length === 0) {
      setSearchResults([]);
      setSearchFeedback(null);
    }
  };

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearchFeedback(null);

    // 1. Consulta em primeiro lugar o nosso banco de dados local (resposta instantânea offline-first)
    const localMatches = searchFoodItems(internalFoods, query, currentUser?.id);
    if (localMatches.length > 0) {
      setSearchResults(localMatches);
      const first = localMatches[0]!;
      setSelectedFoodId(first.id);
      setServingGrams(first.servingSizeGrams || 100);

      if (localMatches.length === 1) {
        setSearchFeedback({
          type: 'success',
          message: `Alimento encontrado no banco local: ${first.name}`,
        });
      } else {
        setSearchFeedback({
          type: 'success',
          message: `${localMatches.length} alimentos encontrados para "${query}". Escolha um abaixo para lançar:`,
        });
      }
    }

    // 2. Consulta a API com include_remote=true para complementar com Open Food Facts
    setIsSearching(true);
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;

      const res = await fetch(`/api/v1/foods/search?q=${encodeURIComponent(query)}&include_remote=true`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.foods && Array.isArray(data.foods) && data.foods.length > 0) {
          const apiFoods: FoodItem[] = data.foods;
          setInternalFoods(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const toAdd = apiFoods.filter(f => !existingIds.has(f.id));
            return [...toAdd, ...prev];
          });
          for (const f of apiFoods) {
            onRegisterFood?.(f);
          }

          // Mescla resultados locais com remotos sem duplicatas
          const mergedResults = [...localMatches];
          const existingIds = new Set(mergedResults.map(r => r.id));
          const existingBarcodes = new Set(
            mergedResults.map(r => (r as { barcode?: string }).barcode).filter(Boolean)
          );

          for (const f of apiFoods) {
            const barcode = (f as { barcode?: string }).barcode;
            if (!existingIds.has(f.id) && (!barcode || !existingBarcodes.has(barcode))) {
              existingIds.add(f.id);
              if (barcode) existingBarcodes.add(barcode);
              mergedResults.push(f);
            }
          }

          setSearchResults(mergedResults);
          if (mergedResults.length > 0 && !selectedFoodId) {
            setSelectedFoodId(mergedResults[0].id);
            setServingGrams(mergedResults[0].servingSizeGrams || 100);
          }

          if (mergedResults.length === 1) {
            if (localMatches.length === 1) {
              setSearchFeedback({
                type: 'success',
                message: `Alimento encontrado no banco local: ${mergedResults[0].name}`,
              });
            } else {
              setSearchFeedback({
                type: 'success',
                message: `Alimento encontrado e salvo no banco de dados: ${mergedResults[0].name}`,
              });
            }
          } else {
            setSearchFeedback({
              type: 'success',
              message: `${mergedResults.length} alimentos encontrados para "${query}". Escolha um abaixo para lançar:`,
            });
          }
          return;
        }
      }

      if (localMatches.length > 0) {
        if (localMatches.length === 1) {
          setSearchFeedback({
            type: 'success',
            message: `Alimento encontrado no banco local: ${localMatches[0].name}`,
          });
        } else {
          setSearchFeedback({
            type: 'success',
            message: `${localMatches.length} alimentos encontrados para "${query}". Escolha um abaixo para lançar:`,
          });
        }
      } else {
        setSearchResults([]);
        setSearchFeedback({
          type: 'error',
          message: 'Alimento não encontrado no banco de dados nem no Open Food Facts.',
        });
      }
    } catch {
      if (localMatches.length > 0) {
        setSearchFeedback({
          type: 'success',
          message: `${localMatches.length} alimento(s) encontrado(s) no banco local para "${query}".`,
        });
      } else {
        setSearchResults([]);
        setSearchFeedback({
          type: 'error',
          message: 'Alimento não encontrado no banco de dados nem no Open Food Facts.',
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveCustomFood = (newFood: FoodItem) => {
    const foodWithUser: FoodItem = {
      ...newFood,
      userId: newFood.userId || currentUser?.id,
      isValidated: newFood.isValidated ?? false,
    };
    setInternalFoods(prev => [foodWithUser, ...prev]);
    onRegisterFood?.(foodWithUser);
    setSelectedFoodId(foodWithUser.id);
    setServingGrams(foodWithUser.servingSizeGrams || 100);
    setSearchFeedback({
      type: 'success',
      message: `Alimento "${foodWithUser.name}" cadastrado com sucesso!`,
    });
  };

  const handleAddFoodSubmit = (window: MealWindow) => {
    const parsedGrams = typeof servingGrams === 'number' ? servingGrams : Number(servingGrams);
    if (!parsedGrams || parsedGrams <= 0) {
      return;
    }
    const factor = parsedGrams / 100;
    const newFood: LoggedFood = {
      id: `${selectedFood.id}_${Date.now()}`,
      foodId: selectedFood.id,
      name: selectedFood.name,
      grams: parsedGrams,
      calories: Math.round(selectedFood.caloriesPer100g * factor),
      protein: Math.round(selectedFood.proteinPer100g * factor * 10) / 10,
      carbs: Math.round(selectedFood.carbsPer100g * factor * 10) / 10,
      fat: Math.round(selectedFood.fatPer100g * factor * 10) / 10,
      fiber: Math.round((selectedFood.fiberPer100g ?? 0) * factor * 10) / 10,
    };
    onAddFood(window, newFood);
    setServingGrams('');
  };

  const handleAddFrequentChip = (window: MealWindow, foodId: string) => {
    const food =
      internalFoods.find(f => f.id === foodId) || PREPOPULATED_FOODS.find(f => f.id === foodId);
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

  const commonFoods = useMemo(() => {
    return getCommonFoodsForMeal(activeWindow, internalFoods);
  }, [activeWindow, internalFoods]);

  const otherFoods = useMemo(() => {
    return internalFoods.filter(f => !commonFoods.some(cf => cf.id === f.id));
  }, [internalFoods, commonFoods]);

  const displayedFoods = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length > 0) {
      if (searchResults.length > 0) {
        return searchResults;
      }
      return searchFoodItems(internalFoods, trimmed, currentUser?.id);
    }
    // Quando não houver busca ativa, traz os 10 alimentos mais consumidos na janela ativa
    return commonFoods;
  }, [searchQuery, searchResults, internalFoods, currentUser, commonFoods]);

  return (
    <div className="space-y-6">
      {/* Barra de Ação Rápida Cronometer-Style */}
      <div className="bg-m3-surface-container rounded-2xl p-4 border border-m3-outline-variant shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-m3-primary" />
            <h3 className="text-sm font-semibold text-m3-on-surface">
              Lançamento Rápido de Alimentos (Cronometer UX)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botão Gerenciar Receitas */}
            <button
              type="button"
              onClick={() => setIsRecipeListOpen(true)}
              className="flex items-center gap-1.5 bg-m3-surface-container-high hover:bg-m3-surface-variant border border-m3-outline-variant text-xs text-amber-300 font-medium px-3 py-1.5 rounded-xl transition-all shadow-sm"
              aria-label="Minhas Receitas"
            >
              <ChefHat className="w-3.5 h-3.5 text-amber-400" />
              <span>Receitas ({recipes.length})</span>
            </button>

            {/* Botão Cadastrar Novo Alimento */}
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center gap-1.5 bg-m3-surface-container-high hover:bg-m3-surface-variant border border-m3-outline-variant text-xs text-m3-primary font-medium px-3 py-1.5 rounded-xl transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Novo Alimento</span>
            </button>

            {/* Botão Auto-Completar Proteína */}
            <button
              type="button"
              onClick={() => setIsProteinModalOpen(true)}
              className="flex items-center gap-1.5 bg-m3-primary text-m3-on-primary font-medium text-xs px-3 py-1.5 rounded-xl hover:bg-m3-primary/90 shadow transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Completar Proteína
              {missingProtein > 0 && (
                <span className="font-mono text-[11px] opacity-90">
                  ({missingProtein}g / {remainingCalories} kcal)
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Item 1: Janela de Refeição (Primeiro Item do Lançamento Rápido) */}
        <div className="mb-4 p-3 bg-m3-surface-container-low border border-m3-outline-variant/60 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor="window-select"
                className="text-xs font-mono text-m3-primary uppercase font-bold tracking-wider"
              >
                Janela de Refeição:
              </label>
              <select
                id="window-select"
                aria-label="Janela de Refeição"
                value={activeWindow}
                onChange={e => handleWindowChange(e.target.value as MealWindow)}
                className="bg-m3-surface-container-high border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs text-m3-on-surface font-semibold focus:outline-none focus:border-m3-primary"
              >
                {Object.entries(WINDOW_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-m3-outline font-mono">
              Alimentos sugeridos atualizados para: <span className="text-m3-on-surface font-medium">{WINDOW_META[activeWindow].label}</span>
            </div>
          </div>
        </div>

        {/* Linha de Consulta / Busca no Banco e Open Food Facts */}
        <form onSubmit={handleSearchSubmit} className="mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder="Consultar alimento ou código de barras no banco / Open Food Facts..."
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl pl-8 pr-3 py-2 text-xs text-m3-on-surface placeholder:text-m3-outline/60 focus:outline-none focus:border-m3-primary"
              />
              <Search className="w-3.5 h-3.5 text-m3-outline absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="flex items-center gap-1.5 bg-m3-surface-container-high hover:bg-m3-surface-variant border border-m3-outline-variant text-xs font-medium text-m3-on-surface px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5 text-m3-primary" />
              )}
              <span>Consultar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 bg-m3-surface-container-high hover:bg-m3-surface-variant border border-m3-outline-variant text-xs font-medium text-m3-primary px-3 py-2 rounded-xl transition-colors shadow-sm"
              aria-label="Escanear Código de Barras / QR Code"
            >
              <ScanBarcode className="w-3.5 h-3.5" />
              <span>Escanear Código</span>
            </button>
          </div>

          {searchFeedback && (
            <div
              className={`mt-2 p-2 rounded-xl text-xs flex items-center justify-between gap-2 ${
                searchFeedback.type === 'success'
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50'
                  : 'bg-red-950/40 text-red-300 border border-red-800/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {searchFeedback.type === 'success' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
                <span>{searchFeedback.message}</span>
              </div>
              {searchFeedback.type === 'error' && (
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="underline font-medium hover:text-white shrink-0"
                >
                  Cadastrar agora
                </button>
              )}
            </div>
          )}
        </form>

        {/* Painel do Alimento Selecionado e Porção para Lançamento */}
        <div className="mb-4 p-3.5 bg-m3-surface-container-high border border-m3-outline-variant rounded-2xl shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-7">
              <span className="block text-[11px] font-mono text-m3-outline uppercase mb-1">
                Alimento Selecionado
              </span>
              <div
                data-testid="selected-food-display"
                className="flex items-center justify-between p-2.5 bg-m3-surface-container-low border border-m3-primary/50 rounded-xl min-h-[42px]"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-m3-on-surface truncate">
                      {selectedFood.name}
                    </span>
                    {selectedFood.isRecipe && (
                      <span className="text-[10px] bg-amber-400/15 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded-full font-mono font-semibold">
                        Receita
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-m3-outline font-mono mt-0.5">
                    <span className="text-m3-primary font-medium">{selectedFood.caloriesPer100g} kcal/100g</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">{selectedFood.proteinPer100g}g P</span>
                    <span>•</span>
                    <span className="text-amber-400">{selectedFood.carbsPer100g}g C</span>
                    <span>•</span>
                    <span className="text-purple-400">{selectedFood.fatPer100g}g G</span>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono shrink-0">
                  Pronto para Lançar
                </span>
              </div>

              {/* Elemento acessível para testes e leitores de tela */}
              <select
                id="food-select"
                aria-label="Alimento Selecionado"
                value={selectedFoodId}
                onChange={e => {
                  const id = e.target.value;
                  setSelectedFoodId(id);
                  const found = internalFoods.find(f => f.id === id);
                  if (found) setServingGrams(found.servingSizeGrams || 100);
                }}
                className="sr-only"
              >
                {searchResults.length > 0 && (
                  <optgroup label="Resultados da Busca">
                    {searchResults.map(food => (
                      <option key={`search_opt_${food.id}`} value={food.id}>
                        {food.name} ({food.caloriesPer100g} kcal/100g)
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={`Mais Comuns para ${WINDOW_META[activeWindow].label}`}>
                  {commonFoods.map(food => (
                    <option key={`common_${food.id}`} value={food.id}>
                      {food.name} ({food.caloriesPer100g} kcal/100g)
                    </option>
                  ))}
                </optgroup>
                {otherFoods.length > 0 && (
                  <optgroup label="Todos os Alimentos Disponíveis">
                    {otherFoods.map(food => (
                      <option key={`all_${food.id}`} value={food.id}>
                        {food.name} ({food.caloriesPer100g} kcal/100g)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="serving-input"
                className="block text-[11px] font-mono text-m3-outline uppercase mb-1"
              >
                Porção (Gramas)
              </label>
              <input
                id="serving-input"
                type="number"
                min="1"
                max="2000"
                value={servingGrams}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    setServingGrams('');
                  } else {
                    const num = Number(val);
                    setServingGrams(isNaN(num) ? '' : num);
                  }
                }}
                placeholder="Ex: 100"
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary h-[42px]"
              />
            </div>

            <div className="sm:col-span-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => handleAddFoodSubmit(activeWindow)}
                className="flex-1 flex items-center justify-center gap-1 bg-m3-primary text-m3-on-primary hover:bg-m3-primary/90 font-medium text-xs py-2 px-2.5 rounded-xl transition-all shadow-sm h-[42px]"
              >
                <Plus className="w-4 h-4" />
                Lançar
              </button>
              {selectedFood.isRecipe && (
                <button
                  type="button"
                  onClick={() => {
                    const rec =
                      recipes.find(r => r.id === selectedFood.id) ||
                      (selectedFood.recipeData as RecipeInput) || {
                        id: selectedFood.id,
                        name: selectedFood.name,
                        servings: 1,
                        ingredients: [],
                      };
                    setRecipeToLog(rec);
                    setIsLogRecipeOpen(true);
                  }}
                  className="px-2.5 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-medium transition-colors flex items-center justify-center h-[42px]"
                  title="Lançar por Fração / Porção da Receita"
                  aria-label="Lançar por Fração / Porção"
                >
                  <ChefHat className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista Fixa de Alimentos / Resultados da Busca (Sempre Disponível) */}
        <div
          data-testid="search-results-list"
          className="p-3 bg-m3-surface-container-high border border-m3-outline-variant rounded-2xl space-y-2 shadow-md"
        >
          <div className="flex items-center justify-between pb-2 border-b border-m3-outline-variant/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-m3-on-surface">
                {searchQuery.trim().length > 0
                  ? `Resultados da busca (${displayedFoods.length} alimentos):`
                  : `Alimentos sugeridos para ${WINDOW_META[activeWindow].label} (10 mais consumidos):`}
              </span>
              <span className="text-[11px] text-m3-outline hidden sm:inline font-mono">
                Selecione para definir porção e lançar
              </span>
            </div>
            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setSearchFeedback(null);
                }}
                className="text-xs text-m3-outline hover:text-m3-on-surface transition-colors px-2 py-0.5 rounded-lg hover:bg-m3-surface-container"
                title="Limpar busca e voltar aos sugeridos"
              >
                Limpar Busca
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {displayedFoods.length === 0 ? (
              <div className="p-4 text-center text-xs text-m3-outline">
                Nenhum alimento encontrado para "{searchQuery}". Clique em "Consultar" acima para buscar online no Open Food Facts ou cadastre um novo alimento.
              </div>
            ) : (
              displayedFoods.map(food => {
                const isSelected = food.id === selectedFoodId;
                return (
                  <div
                    key={food.id}
                    data-testid={`search-item-${food.id}`}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-m3-primary/10 border-m3-primary text-m3-on-surface shadow-sm'
                        : 'bg-m3-surface-container-low border-m3-outline-variant/60 hover:border-m3-outline text-m3-on-surface'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-3 mb-2 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-m3-on-surface truncate">
                          {food.name}
                        </span>
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
                        {food.id.startsWith('off_') && (
                          <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded-full font-mono">
                            Open Food Facts
                          </span>
                        )}
                        {!food.isRecipe && !food.isCustom && !food.id.startsWith('off_') && (
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-mono">
                            Banco Local
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-m3-outline mt-0.5 font-mono">
                        <span>{food.servingDescription || `${food.servingSizeGrams || 100}g`}</span>
                        <span>•</span>
                        <span className="text-m3-primary font-medium">{food.caloriesPer100g} kcal/100g</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium">{food.proteinPer100g}g P</span>
                        <span>•</span>
                        <span className="text-amber-400">{food.carbsPer100g}g C</span>
                        <span>•</span>
                        <span className="text-purple-400">{food.fatPer100g}g G</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        aria-label={`Selecionar ${food.name}`}
                        onClick={() => handleSelectFoodFromSearch(food)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-m3-primary text-m3-on-primary font-semibold shadow-sm'
                            : 'bg-m3-surface-container-highest hover:bg-m3-surface-variant text-m3-on-surface border border-m3-outline-variant'
                        }`}
                      >
                        {isSelected ? '✓ Selecionado' : 'Selecionar'}
                      </button>
                      <button
                        type="button"
                        aria-label={
                          searchQuery.trim().length > 0
                            ? `Lançar ${food.name}`
                            : `Adicionar ${food.name}`
                        }
                        onClick={() => handleDirectLaunchFromSearch(food, activeWindow)}
                        className="flex items-center gap-1 bg-m3-primary/20 hover:bg-m3-primary/30 text-m3-primary border border-m3-primary/40 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                        title={`Lançar ${food.servingSizeGrams || 100}g em ${WINDOW_META[activeWindow].label}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{searchQuery.trim().length > 0 ? 'Lançar' : '+ Rápido'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Grade com as 4 Janelas Práticas */}
      <div className="space-y-4">
        {(Object.keys(WINDOW_META) as MealWindow[]).map(windowKey => {
          const meta = WINDOW_META[windowKey];
          const Icon = meta.icon;
          const items = (meals && meals[windowKey]) || [];

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
                    title="Lançamento Rápido de Macros"
                    aria-label="Lançamento Rápido de Macros"
                    onClick={() => setQuickMacroWindow(windowKey)}
                    className="p-1.5 rounded-lg text-m3-outline hover:text-amber-400 hover:bg-m3-surface-container-high transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Copiar Refeição"
                    aria-label="Copiar Refeição"
                    onClick={() => setShowCopyModal(windowKey)}
                    className="p-1.5 rounded-lg text-m3-outline hover:text-m3-on-surface hover:bg-m3-surface-container-high transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sugestões Contextuais (Alimentos Frequentes da Janela) */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3 mb-2">
                <span className="text-[10px] text-m3-outline font-mono uppercase mr-1">
                  Frequentes:
                </span>
                {frequentFoodIds.map(fId => {
                  const food =
                    internalFoods.find(f => f.id === fId) ||
                    PREPOPULATED_FOODS.find(f => f.id === fId);
                  if (!food) return null;
                  return (
                    <button
                      key={fId}
                      type="button"
                      onClick={() => handleAddFrequentChip(windowKey, fId)}
                      className="text-[11px] bg-m3-surface-container-low hover:bg-m3-surface-container-high border border-m3-outline-variant/60 text-m3-on-surface px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
                    >
                      <span>+ {food.name.split(' ')[0]}</span>
                      <span className="text-m3-outline text-[10px] font-mono">
                        ({food.proteinPer100g}g P)
                      </span>
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
                          {item.calories} kcal • {item.protein}g P • {item.carbs}g C • {item.fat}g G
                          • {item.fiber ?? 0}g Fibra
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

      {/* Modal de Cópia de Refeição Completo (Entre Dias e Janelas com Edição de Porções e Remoção) */}
      <CopyMealModal
        isOpen={showCopyModal !== null}
        initialSourceWindow={showCopyModal ?? 'breakfast'}
        initialTargetWindow="dinner_event"
        currentDate={selectedDate || new Date().toISOString().slice(0, 10)}
        meals={meals}
        onClose={() => setShowCopyModal(null)}
        onConfirm={(targetWindow, copiedItems) => {
          if (showCopyModal) {
            onCopyMeal(showCopyModal, targetWindow, copiedItems);
          }
          setShowCopyModal(null);
        }}
        onLoadMealsForDate={onLoadMealsForDate}
        currentUser={currentUser}
      />

      {/* Modal de Lançamento Rápido de Macros */}
      {quickMacroWindow && (
        <QuickMacroModal
          isOpen={quickMacroWindow !== null}
          windowKey={quickMacroWindow}
          onClose={() => setQuickMacroWindow(null)}
          onSave={food => {
            onAddFood(quickMacroWindow, food);
            setQuickMacroWindow(null);
          }}
        />
      )}

      {/* Modal de Scanner de Código de Barras / QR Code */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Modal de Cadastro de Novo Alimento */}
      <FoodRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => {
          setIsRegisterModalOpen(false);
          setPrefillBarcode('');
        }}
        onSave={handleSaveCustomFood}
        initialName={searchQuery}
        initialBarcode={prefillBarcode}
      />

      {/* Modal de Auto-Completar Proteína Interativo */}
      <ProteinAutocompleteModal
        isOpen={isProteinModalOpen}
        onClose={() => setIsProteinModalOpen(false)}
        missingProtein={missingProtein}
        remainingCalories={remainingCalories}
        activeWindow={activeWindow}
        availableFoods={internalFoods}
        onConfirm={(items, targetWindow) => {
          items.forEach(item => {
            onAddFood(targetWindow, {
              id: `autocomplete_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              foodId: item.sourceId,
              name: item.name,
              grams: item.grams,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              fiber: item.fiber,
            });
          });
          onAutoCompleteProtein?.('sassami');
        }}
      />

      {/* Modal de Gestão / Lista de Receitas */}
      <RecipeListModal
        isOpen={isRecipeListOpen}
        onClose={() => setIsRecipeListOpen(false)}
        recipes={recipes}
        availableFoods={internalFoods}
        onOpenCreate={() => {
          setEditingRecipe(null);
          setIsRecipeBuilderOpen(true);
        }}
        onOpenEdit={rec => {
          setEditingRecipe(rec);
          setIsRecipeBuilderOpen(true);
        }}
        onOpenLog={rec => {
          setRecipeToLog(rec);
          setIsLogRecipeOpen(true);
        }}
        onDeleteRecipe={id => onDeleteRecipe?.(id)}
      />

      {/* Modal de Criação e Edição de Receitas */}
      <RecipeBuilderModal
        isOpen={isRecipeBuilderOpen}
        onClose={() => {
          setIsRecipeBuilderOpen(false);
          setEditingRecipe(null);
        }}
        onSaveRecipe={rec => {
          onSaveRecipe?.(rec);
          setIsRecipeBuilderOpen(false);
          setEditingRecipe(null);
        }}
        availableFoods={internalFoods}
        editingRecipe={editingRecipe}
      />

      {/* Modal de Lançamento de Porção / Fração de Receita no Diário */}
      <LogRecipeModal
        isOpen={isLogRecipeOpen}
        onClose={() => {
          setIsLogRecipeOpen(false);
          setRecipeToLog(null);
        }}
        recipe={recipeToLog}
        availableFoods={internalFoods}
        defaultWindow={activeWindow}
        onLogPortion={(targetWindow, item) => {
          onAddFood(targetWindow, item);
        }}
      />
    </div>
  );
};
