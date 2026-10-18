import React, { useState, useEffect, useRef } from 'react';
import { type MealWindow } from '@dieta-ai/core';
import {
  Copy,
  X,
  Trash2,
  Calendar,
  ArrowRight,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Loader2,
} from 'lucide-react';
import { type LoggedFood, type MealMap } from './MealBuilder.js';

const WINDOW_META: Record<
  MealWindow,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  breakfast: { label: 'Café da Manhã / Pré-Treino', icon: Sunrise },
  lunch: { label: 'Almoço', icon: Sun },
  afternoon_snack: { label: 'Lanche da Tarde', icon: Sunset },
  dinner_event: { label: 'Jantar / Evento', icon: Moon },
};

export interface CopyMealModalProps {
  isOpen: boolean;
  initialSourceWindow: MealWindow;
  initialTargetWindow?: MealWindow;
  currentDate: string;
  meals: MealMap;
  onClose: () => void;
  onConfirm: (targetWindow: MealWindow, copiedItems: LoggedFood[]) => void;
  onLoadMealsForDate?: (date: string) => Promise<MealMap> | MealMap;
  currentUser?: { id: string } | null;
}

interface EditableCopyItem extends LoggedFood {
  baseGrams: number;
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  baseFiber: number;
}

const getYesterdayDate = (dateStr: string): string => {
  try {
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      date.setUTCDate(date.getUTCDate() - 1);
      return date.toISOString().slice(0, 10);
    }
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
};

export const CopyMealModal: React.FC<CopyMealModalProps> = ({
  isOpen,
  initialSourceWindow,
  initialTargetWindow,
  currentDate,
  meals,
  onClose,
  onConfirm,
  onLoadMealsForDate,
  currentUser,
}) => {
  const [sourceDate, setSourceDate] = useState<string>(currentDate);
  const [sourceWindow, setSourceWindow] = useState<MealWindow>(initialSourceWindow);
  const [targetWindow, setTargetWindow] = useState<MealWindow>(
    initialTargetWindow || initialSourceWindow
  );
  const [isLoadingDateMeals, setIsLoadingDateMeals] = useState<boolean>(false);
  const [currentDayMealsMap, setCurrentDayMealsMap] = useState<MealMap>(meals);
  const [itemsToCopy, setItemsToCopy] = useState<EditableCopyItem[]>([]);

  const onLoadRef = useRef(onLoadMealsForDate);
  useEffect(() => {
    onLoadRef.current = onLoadMealsForDate;
  }, [onLoadMealsForDate]);

  const mealsRef = useRef(meals);
  useEffect(() => {
    mealsRef.current = meals;
  }, [meals]);

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }

    const isJustOpening = !prevIsOpenRef.current;
    prevIsOpenRef.current = true;

    if (isJustOpening) {
      setSourceDate(currentDate);
      setSourceWindow(initialSourceWindow);
      setTargetWindow(initialTargetWindow || initialSourceWindow);
      setCurrentDayMealsMap(mealsRef.current);
      const items = (mealsRef.current && mealsRef.current[initialSourceWindow]) || [];
      setItemsToCopy(
        items.map(item => ({
          ...item,
          baseGrams: item.grams,
          baseCalories: item.calories,
          baseProtein: item.protein,
          baseCarbs: item.carbs,
          baseFat: item.fat,
          baseFiber: item.fiber ?? 0,
        }))
      );
      return;
    }

    if (sourceDate === currentDate) {
      setCurrentDayMealsMap(mealsRef.current);
      const items = (mealsRef.current && mealsRef.current[sourceWindow]) || [];
      setItemsToCopy(
        items.map(item => ({
          ...item,
          baseGrams: item.grams,
          baseCalories: item.calories,
          baseProtein: item.protein,
          baseCarbs: item.carbs,
          baseFat: item.fat,
          baseFiber: item.fiber ?? 0,
        }))
      );
      return;
    }

    let isSubscribed = true;
    setIsLoadingDateMeals(true);

    const loadDate = async () => {
      try {
        let loadedMeals: MealMap | null = null;

        if (onLoadRef.current) {
          const res = await onLoadRef.current(sourceDate);
          if (res) loadedMeals = res;
        }

        if (!loadedMeals) {
          const userId = currentUser?.id ?? 'default';
          const savedStr =
            localStorage.getItem(`macrometrics_meals_${userId}_${sourceDate}`) ||
            localStorage.getItem(`macrometrics_meals_${sourceDate}`);
          if (savedStr) {
            loadedMeals = JSON.parse(savedStr);
          }
        }

        if (isSubscribed) {
          const resolvedMeals: MealMap = loadedMeals || {
            breakfast: [],
            lunch: [],
            afternoon_snack: [],
            dinner_event: [],
          };
          setCurrentDayMealsMap(resolvedMeals);
          const items = resolvedMeals[sourceWindow] || [];
          setItemsToCopy(
            items.map(item => ({
              ...item,
              baseGrams: item.grams,
              baseCalories: item.calories,
              baseProtein: item.protein,
              baseCarbs: item.carbs,
              baseFat: item.fat,
              baseFiber: item.fiber ?? 0,
            }))
          );
        }
      } catch {
        if (isSubscribed) {
          setItemsToCopy([]);
        }
      } finally {
        if (isSubscribed) {
          setIsLoadingDateMeals(false);
        }
      }
    };

    void loadDate();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, sourceDate, sourceWindow, currentDate, initialSourceWindow, initialTargetWindow, currentUser?.id]);

  // Atualiza itemsToCopy se a janela de origem mudar dentro do mesmo dia
  const handleSourceWindowChange = (newWindow: MealWindow) => {
    setSourceWindow(newWindow);
    const items = currentDayMealsMap[newWindow] || [];
    setItemsToCopy(
      items.map(item => ({
        ...item,
        baseGrams: item.grams,
        baseCalories: item.calories,
        baseProtein: item.protein,
        baseCarbs: item.carbs,
        baseFat: item.fat,
        baseFiber: item.fiber ?? 0,
      }))
    );
  };

  const handlePortionChange = (id: string, newGrams: number | '') => {
    setItemsToCopy(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        if (newGrams === '' || newGrams <= 0) {
          return {
            ...item,
            grams: 0,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
          };
        }
        const ratio = newGrams / (item.baseGrams || 1);
        return {
          ...item,
          grams: newGrams,
          calories: Math.round(item.baseCalories * ratio),
          protein: Math.round(item.baseProtein * ratio * 10) / 10,
          carbs: Math.round(item.baseCarbs * ratio * 10) / 10,
          fat: Math.round(item.baseFat * ratio * 10) / 10,
          fiber: Math.round(item.baseFiber * ratio * 10) / 10,
        };
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItemsToCopy(prev => prev.filter(item => item.id !== id));
  };

  const handleConfirm = () => {
    if (itemsToCopy.length === 0) return;

    const cleanedItems: LoggedFood[] = itemsToCopy.map((item, idx) => ({
      id: `${item.foodId}_copy_${Date.now()}_${idx}`,
      foodId: item.foodId,
      name: item.name,
      grams: item.grams,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber,
    }));

    onConfirm(targetWindow, cleanedItems);
    onClose();
  };

  if (!isOpen) return null;

  const yesterday = getYesterdayDate(currentDate);

  const totalCalories = itemsToCopy.reduce((acc, i) => acc + i.calories, 0);
  const totalProtein = Math.round(itemsToCopy.reduce((acc, i) => acc + i.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(itemsToCopy.reduce((acc, i) => acc + i.carbs, 0) * 10) / 10;
  const totalFat = Math.round(itemsToCopy.reduce((acc, i) => acc + i.fat, 0) * 10) / 10;
  const totalFiber = Math.round(itemsToCopy.reduce((acc, i) => acc + (i.fiber ?? 0), 0) * 10) / 10;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="copy-meal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-m3-surface-container-high border border-m3-outline rounded-2xl p-5 max-w-lg w-full text-m3-on-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-m3-outline-variant/50 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-m3-surface-container text-m3-primary">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h3 id="copy-meal-title" className="text-sm font-semibold text-m3-on-surface">
                Copiar Refeição
              </h3>
              <p className="text-[11px] text-m3-outline">
                Duplique refeições do dia atual ou de datas anteriores com controle total de itens e porções.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-m3-outline hover:text-m3-on-surface p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Seleção de Origem e Destino */}
        <div className="space-y-3 mb-4 bg-m3-surface-container-low p-3.5 rounded-xl border border-m3-outline-variant/60">
          {/* Data de Origem */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="copy-source-date"
                className="text-[11px] font-mono text-m3-outline uppercase flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-m3-primary" />
                <span>Data de Origem</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSourceDate(currentDate)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-colors ${
                    sourceDate === currentDate
                      ? 'bg-m3-primary text-m3-on-primary font-bold'
                      : 'bg-m3-surface-container text-m3-outline hover:text-m3-on-surface'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setSourceDate(yesterday)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-colors ${
                    sourceDate === yesterday
                      ? 'bg-m3-primary text-m3-on-primary font-bold'
                      : 'bg-m3-surface-container text-m3-outline hover:text-m3-on-surface'
                  }`}
                >
                  Ontem
                </button>
              </div>
            </div>
            <input
              id="copy-source-date"
              aria-label="Data de Origem"
              type="date"
              value={sourceDate}
              onChange={e => setSourceDate(e.target.value)}
              className="w-full bg-m3-surface-container border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs text-m3-on-surface font-mono focus:outline-none focus:border-m3-primary"
            />
          </div>

          {/* Seletores de Janela Origem -> Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label
                htmlFor="copy-source-window"
                className="block text-[11px] font-mono text-m3-outline uppercase mb-1"
              >
                Refeição de Origem
              </label>
              <select
                id="copy-source-window"
                aria-label="Refeição de Origem"
                value={sourceWindow}
                onChange={e => handleSourceWindowChange(e.target.value as MealWindow)}
                className="w-full bg-m3-surface-container border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs text-m3-on-surface font-medium focus:outline-none focus:border-m3-primary"
              >
                {Object.entries(WINDOW_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="copy-target-window"
                className="block text-[11px] font-mono text-m3-outline uppercase mb-1 flex items-center gap-1"
              >
                <ArrowRight className="w-3 h-3 text-m3-primary" />
                <span>Refeição de Destino</span>
              </label>
              <select
                id="copy-target-window"
                aria-label="Refeição de Destino"
                value={targetWindow}
                onChange={e => setTargetWindow(e.target.value as MealWindow)}
                className="w-full bg-m3-surface-container border border-m3-outline-variant rounded-xl px-3 py-1.5 text-xs text-m3-on-surface font-medium focus:outline-none focus:border-m3-primary"
              >
                {Object.entries(WINDOW_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resumo e Edição de Itens */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase font-mono text-m3-outline">
              Itens da Refeição ({itemsToCopy.length})
            </h4>
            {itemsToCopy.length > 0 && (
              <span className="text-[11px] font-mono text-m3-primary">
                Total: {totalCalories} kcal • {totalProtein}g P
              </span>
            )}
          </div>

          {isLoadingDateMeals ? (
            <div className="flex items-center justify-center py-8 text-xs text-m3-outline gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-m3-primary" />
              <span>Carregando alimentos da data selecionada...</span>
            </div>
          ) : itemsToCopy.length === 0 ? (
            <div className="p-4 rounded-xl bg-m3-surface-container-low border border-m3-outline-variant/40 text-center">
              <p className="text-xs text-m3-outline/70 italic">
                Nenhum alimento registrado nesta refeição para a data selecionada.
              </p>
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {itemsToCopy.map(item => (
                <div
                  key={item.id}
                  className="bg-m3-surface-container-low border border-m3-outline-variant/50 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-m3-on-surface truncate">{item.name}</div>
                    <div className="text-[11px] font-mono text-m3-outline mt-0.5">
                      {item.calories} kcal • {item.protein}g P • {item.carbs}g C • {item.fat}g G
                    </div>
                  </div>

                  {/* Controle de Porção */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 bg-m3-surface-container px-2 py-1 rounded-lg border border-m3-outline-variant/70">
                      <input
                        type="number"
                        min="1"
                        max="2000"
                        aria-label={`Porção de ${item.name}`}
                        value={item.grams === 0 ? '' : item.grams}
                        onChange={e => {
                          const val = e.target.value;
                          handlePortionChange(item.id, val === '' ? '' : Number(val));
                        }}
                        className="w-14 bg-transparent font-mono text-xs text-m3-on-surface text-right focus:outline-none"
                      />
                      <span className="text-[10px] text-m3-outline font-mono">g</span>
                    </div>

                    {/* Botão de Remover Item */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      aria-label={`Remover ${item.name} da cópia`}
                      title="Remover da Cópia"
                      className="text-m3-outline hover:text-m3-error p-1.5 rounded-lg hover:bg-m3-surface-container transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {itemsToCopy.length > 0 && (
            <div className="mt-3 p-2.5 bg-m3-surface-container rounded-xl border border-m3-outline-variant/40 text-[11px] font-mono text-m3-outline flex flex-wrap justify-between gap-2">
              <span>{totalCalories} kcal</span>
              <span>{totalProtein}g Proteína</span>
              <span>{totalCarbs}g Carboidrato</span>
              <span>{totalFat}g Gordura</span>
              <span>{totalFiber}g Fibra</span>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-3 border-t border-m3-outline-variant/40">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-m3-outline-variant text-xs text-m3-outline hover:text-m3-on-surface hover:bg-m3-surface-container transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={itemsToCopy.length === 0}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-m3-primary hover:bg-m3-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-m3-on-primary text-xs font-semibold shadow transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Confirmar Cópia</span>
          </button>
        </div>
      </div>
    </div>
  );
};
