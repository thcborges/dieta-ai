import React, { useState, useEffect } from 'react';
import {
  type MealWindow,
  PREPOPULATED_FOODS,
  type FoodItem,
  getCommonFoodsForMeal,
  searchFoodItems,
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
  Search,
  PlusCircle,
  Loader2,
  CheckCircle,
  AlertCircle,
  ScanBarcode,
} from 'lucide-react';
import { FoodRegistrationModal } from './FoodRegistrationModal.js';
import { BarcodeScannerModal } from './BarcodeScannerModal.js';
import { ProteinAutocompleteModal } from './ProteinAutocompleteModal.js';

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
  onAddFood: (window: MealWindow, item: LoggedFood) => void;
  onRemoveFood: (window: MealWindow, itemId: string) => void;
  onCopyMeal: (fromWindow: MealWindow, toWindow: MealWindow) => void;
  onAutoCompleteProtein: (source: 'sassami' | 'whey_growth') => void;
  onRegisterFood?: (food: FoodItem) => void;
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
  availableFoods,
  onAddFood,
  onRemoveFood,
  onCopyMeal,
  onAutoCompleteProtein,
  onRegisterFood,
  missingProtein,
  remainingCalories,
}) => {
  const [internalFoods, setInternalFoods] = useState<FoodItem[]>(() => {
    return availableFoods && availableFoods.length > 0 ? availableFoods : PREPOPULATED_FOODS;
  });

  const [selectedFoodId, setSelectedFoodId] = useState<string>('sassami');
  const [servingGrams, setServingGrams] = useState<number>(100);
  const [activeWindow, setActiveWindow] = useState<MealWindow>('lunch');
  const [copyTargetWindow, setCopyTargetWindow] = useState<MealWindow>('dinner_event');
  const [showCopyModal, setShowCopyModal] = useState<MealWindow | null>(null);

  // Busca e Cadastro
  const [searchQuery, setSearchQuery] = useState<string>('');
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
    const localMatches = searchFoodItems(internalFoods, code);
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

      // Consulta rota de código de barras
      const barcodeRes = await fetch(`/api/v1/foods/barcode/${encodeURIComponent(code)}`);
      if (barcodeRes.ok) {
        const barcodeData = await barcodeRes.json();
        if (barcodeData.food) {
          offFood = barcodeData.food;
        }
      }

      if (!offFood) {
        const searchRes = await fetch(`/api/v1/foods/search?q=${encodeURIComponent(code)}`);
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

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearchFeedback(null);

    // 1. Consulta em primeiro lugar o nosso banco de dados local
    const localMatches = searchFoodItems(internalFoods, query);
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
      const res = await fetch(`/api/v1/foods/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error('Falha na requisição');
      }
      const data = await res.json();
      if (data.foods && Array.isArray(data.foods) && data.foods.length > 0) {
        const offFood: FoodItem = data.foods[0];
        setInternalFoods(prev => {
          if (prev.some(f => f.id === offFood.id)) return prev;
          return [offFood, ...prev];
        });
        onRegisterFood?.(offFood);
        setSelectedFoodId(offFood.id);
        setServingGrams(offFood.servingSizeGrams || 100);
        setSearchFeedback({
          type: 'success',
          message: `Alimento encontrado e salvo no banco de dados: ${offFood.name}`,
        });
      } else {
        setSearchFeedback({
          type: 'error',
          message: 'Alimento não encontrado no banco de dados nem no Open Food Facts.',
        });
      }
    } catch {
      setSearchFeedback({
        type: 'error',
        message: 'Alimento não encontrado no banco de dados nem no Open Food Facts.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveCustomFood = (newFood: FoodItem) => {
    setInternalFoods(prev => [newFood, ...prev]);
    onRegisterFood?.(newFood);
    setSelectedFoodId(newFood.id);
    setServingGrams(newFood.servingSizeGrams || 100);
    setSearchFeedback({
      type: 'success',
      message: `Alimento "${newFood.name}" cadastrado com sucesso!`,
    });
  };

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

  const commonFoods = getCommonFoodsForMeal(activeWindow, internalFoods);
  const otherFoods = internalFoods.filter(f => !commonFoods.some(cf => cf.id === f.id));

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

          <div className="flex items-center gap-2">
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

        {/* Linha de Consulta / Busca no Banco e Open Food Facts */}
        <form onSubmit={handleSearchSubmit} className="mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
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

        {/* Linha de Inputs: Peso/Porção SEMPRE no Topo */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label
              htmlFor="food-select"
              className="block text-[11px] font-mono text-m3-outline uppercase mb-1"
            >
              Alimento Selecionado
            </label>
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
              className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs text-m3-on-surface font-medium focus:outline-none focus:border-m3-primary"
            >
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

          <div className="sm:col-span-2">
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
              onChange={e => setServingGrams(Math.max(1, Number(e.target.value) || 0))}
              className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
            />
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="window-select"
              className="block text-[11px] font-mono text-m3-outline uppercase mb-1"
            >
              Janela de Refeição
            </label>
            <select
              id="window-select"
              aria-label="Janela de Refeição"
              value={activeWindow}
              onChange={e => handleWindowChange(e.target.value as MealWindow)}
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
    </div>
  );
};
