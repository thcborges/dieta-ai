import React, { useState, useRef } from 'react';
import {
  type MealWindow,
} from '@dieta-ai/core';
import type { LoggedFood } from './MealBuilder.js';
import {
  Camera,
  Upload,
  Sparkles,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  X,
  ChevronLeft,
  Info,
} from 'lucide-react';

export interface NutritionalDensity {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface AnalyzedItem {
  id: string;
  name: string;
  estimatedGrams: number;
  currentGrams: number;
  confidence: 'high' | 'medium' | 'low';
  clarificationNote?: string;
  per100g: NutritionalDensity;
}

export async function resizeAndCompressImage(
  file: File,
  maxDimension = 1280,
  quality = 0.85
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    if (typeof FileReader === 'undefined') {
      resolve({ base64: '', mimeType: file.type || 'image/jpeg' });
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      resolve({ base64: '', mimeType: file.type || 'image/jpeg' });
    };
    reader.onload = (e) => {
      const rawDataUrl = (e.target?.result as string) || '';
      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve({ base64: rawDataUrl, mimeType: file.type || 'image/jpeg' });
        return;
      }

      const img = new Image();
      let resolved = false;

      const finish = (base64: string, mimeType: string) => {
        if (!resolved) {
          resolved = true;
          resolve({ base64, mimeType });
        }
      };

      // In JSDOM or environments without full image rendering, resolve with rawDataUrl after a short delay
      const timer = setTimeout(() => {
        finish(rawDataUrl, file.type || 'image/jpeg');
      }, 100);

      img.onerror = () => {
        clearTimeout(timer);
        finish(rawDataUrl, file.type || 'image/jpeg');
      };

      img.onload = () => {
        clearTimeout(timer);
        try {
          let { width, height } = img;
          if (!width || !height) {
            finish(rawDataUrl, file.type || 'image/jpeg');
            return;
          }

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx || typeof canvas.toDataURL !== 'function') {
            finish(rawDataUrl, file.type || 'image/jpeg');
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = 'image/jpeg';
          const base64 = canvas.toDataURL(mimeType, quality);
          finish(base64, mimeType);
        } catch {
          finish(rawDataUrl, file.type || 'image/jpeg');
        }
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

interface PhotoMealModalProps {
  isOpen: boolean;
  windowKey: MealWindow;
  onClose: () => void;
  onAddFood: (window: MealWindow, item: LoggedFood) => void;
  token?: string;
  userId?: string;
}

export const PhotoMealModal: React.FC<PhotoMealModalProps> = ({
  isOpen,
  windowKey,
  onClose,
  onAddFood,
  token: propsToken,
  userId: propsUserId,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<string>('image/jpeg');
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<AnalyzedItem[]>([]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (JPEG, PNG ou WebP).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('A imagem selecionada é muito grande. O limite máximo é 20MB.');
      return;
    }

    setSelectedFile(file);
    try {
      const { base64, mimeType } = await resizeAndCompressImage(file, 1280, 0.85);
      setImagePreview(base64);
      setSelectedMimeType(mimeType);
    } catch {
      if (typeof FileReader !== 'undefined') {
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreview(reader.result as string);
          setSelectedMimeType(file.type || 'image/jpeg');
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleAnalyzePhoto = async () => {
    if (!imagePreview && !selectedFile) {
      setErrorMessage('Selecione ou tire uma foto do prato para prosseguir com a análise.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      let token = propsToken || '';
      let userId = propsUserId || '';
      if (!token || !userId) {
        try {
          const stored = localStorage.getItem('macrometrics_auth_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (!token) token = parsed.sessionToken || (parsed.id ? `mock-google-id-token-${parsed.id}` : '');
            if (!userId) userId = parsed.id || '';
          }
        } catch {
          // fallback
        }
      }

      if (!token) {
        token = localStorage.getItem('auth_token') || '';
      }

      const response = await fetch('/api/v1/meals/analyze-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({
          imageBase64: imagePreview || '',
          mimeType: selectedMimeType || selectedFile?.type || 'image/jpeg',
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao processar imagem no servidor.');
      }

      const data = await response.json();

      if (!data.isFoodIdentified || !Array.isArray(data.items) || data.items.length === 0) {
        setErrorMessage(
          data.feedbackMessage ||
            'Nenhum alimento detectado na foto. Por favor, envie uma foto nítida do seu prato.'
        );
        return;
      }

      const mappedItems: AnalyzedItem[] = data.items.map((it: any, index: number) => ({
        id: `photo_item_${Date.now()}_${index}`,
        name: it.name || 'Alimento',
        estimatedGrams: Number(it.estimatedGrams) || 100,
        currentGrams: Number(it.estimatedGrams) || 100,
        confidence: it.confidence || 'medium',
        clarificationNote: it.clarificationNote,
        per100g: {
          calories: Number(it.per100g?.calories) || 0,
          protein: Number(it.per100g?.protein) || 0,
          carbs: Number(it.per100g?.carbs) || 0,
          fat: Number(it.per100g?.fat) || 0,
          fiber: Number(it.per100g?.fiber) || 0,
        },
      }));

      setItems(mappedItems);
      setStep(2);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Falha ao analisar a foto da refeição. Verifique sua conexão e tente novamente.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePortionChange = (itemId: string, newGrams: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, currentGrams: Math.max(0, newGrams) }
          : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const calculateItemTotals = (item: AnalyzedItem) => {
    const ratio = item.currentGrams / 100;
    return {
      calories: Math.max(0, Math.round(item.per100g.calories * ratio)),
      protein: Math.max(0, Math.round(item.per100g.protein * ratio * 10) / 10),
      carbs: Math.max(0, Math.round(item.per100g.carbs * ratio * 10) / 10),
      fat: Math.max(0, Math.round(item.per100g.fat * ratio * 10) / 10),
      fiber: Math.max(0, Math.round(item.per100g.fiber * ratio * 10) / 10),
    };
  };

  const totalPlateMacros = items.reduce(
    (acc, item) => {
      const itemTotals = calculateItemTotals(item);
      return {
        calories: acc.calories + itemTotals.calories,
        protein: acc.protein + itemTotals.protein,
        carbs: acc.carbs + itemTotals.carbs,
        fat: acc.fat + itemTotals.fat,
        fiber: acc.fiber + itemTotals.fiber,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const handleConfirmAndAdd = () => {
    if (items.length === 0) return;

    items.forEach((item) => {
      const totals = calculateItemTotals(item);
      const loggedItem: LoggedFood = {
        id: `item_photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        foodId: `photo_ai_${item.name.toLowerCase().replace(/\s+/g, '_').slice(0, 30)}`,
        name: item.name,
        grams: item.currentGrams,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        fiber: totals.fiber,
      };
      onAddFood(windowKey, loggedItem);
    });

    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setSelectedFile(null);
    setImagePreview(null);
    setSelectedMimeType('image/jpeg');
    setDescription('');
    setErrorMessage(null);
    setItems([]);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-meal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-m3-surface-container border border-m3-outline-variant/60 rounded-3xl shadow-2xl p-4 sm:p-6 text-m3-on-surface overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header do Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-m3-outline-variant/40 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-1 rounded-full text-m3-outline hover:text-m3-on-surface hover:bg-m3-surface-container-high transition-colors shrink-0"
                title="Voltar para a Foto"
                aria-label="Voltar para a Foto"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="photo-meal-modal-title" className="text-base font-semibold text-m3-on-surface truncate">
                {step === 1 ? 'Foto da Refeição (IA)' : 'Revisão dos Itens Identificados'}
              </h2>
              <p className="text-xs text-m3-outline truncate">
                {step === 1
                  ? 'Envie a foto do seu prato para estimativa precisa'
                  : 'Ajuste as porções em gramas e confirme o lançamento'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-m3-outline hover:text-m3-on-surface hover:bg-m3-surface-container-high transition-colors shrink-0"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          {step === 1 ? (
            /* ETAPA 1: CAPTURA DE FOTO E DESCRIÇÃO */
            <div className="space-y-4">
              {/* Inputs Ocultos de Câmera e Galeria */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-m3-outline-variant/60 bg-black/40 group max-h-56 flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Prato selecionado"
                    className="w-full h-auto object-contain max-h-56"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-m3-surface-container-high/90 hover:bg-m3-surface-container border border-m3-outline-variant text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow"
                    >
                      <Camera className="w-3.5 h-3.5 text-sky-400" />
                      Tirar Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-m3-surface-container-high/90 hover:bg-m3-surface-container border border-m3-outline-variant text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow"
                    >
                      <Upload className="w-3.5 h-3.5 text-sky-400" />
                      Escolher da Galeria
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-6 px-4 rounded-2xl border-2 border-dashed border-m3-outline-variant/60 hover:border-sky-500/50 bg-m3-surface-container-high/50 hover:bg-m3-surface-container-high transition-all flex flex-col items-center justify-center gap-2 text-m3-outline hover:text-m3-on-surface group"
                  >
                    <div className="w-11 h-11 rounded-full bg-m3-surface-variant flex items-center justify-center group-hover:scale-105 transition-transform text-sky-400">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-semibold block text-m3-on-surface">
                        Tirar Foto
                      </span>
                      <span className="text-[11px] text-m3-outline">
                        Câmera instantânea
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="py-6 px-4 rounded-2xl border-2 border-dashed border-m3-outline-variant/60 hover:border-indigo-500/50 bg-m3-surface-container-high/50 hover:bg-m3-surface-container-high transition-all flex flex-col items-center justify-center gap-2 text-m3-outline hover:text-m3-on-surface group"
                  >
                    <div className="w-11 h-11 rounded-full bg-m3-surface-variant flex items-center justify-center group-hover:scale-105 transition-transform text-indigo-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-semibold block text-m3-on-surface">
                        Escolher da Galeria
                      </span>
                      <span className="text-[11px] text-m3-outline">
                        JPEG, PNG ou WebP
                      </span>
                    </div>
                  </button>
                </div>
              )}

              {/* Descrição Opcional do Prato */}
              <div className="space-y-1.5">
                <label
                  htmlFor="photo-dish-description"
                  className="block text-xs font-medium text-m3-on-surface"
                >
                  Descrição do Prato (opcional)
                </label>
                <textarea
                  id="photo-dish-description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Arroz branco, feijão preto, peito de frango grelhado no azeite e salada de tomate."
                  className="w-full bg-m3-surface-container-high border border-m3-outline-variant/60 rounded-xl px-3 py-2 text-xs text-m3-on-surface placeholder:text-m3-outline/60 focus:outline-none focus:border-sky-500/80 resize-none transition-colors"
                />
                <p className="text-[11px] text-m3-outline flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  Detalhes de preparo ajudam o modelo a calibrar gorduras e cortes.
                </p>
              </div>
            </div>
          ) : (
            /* ETAPA 2: REVISÃO DE ITENS, PORÇÕES E MACROS */
            <div className="space-y-3">
              {/* Resumo Consolidado dos Macros do Prato */}
              <div className="p-3 bg-m3-surface-container-high border border-m3-outline-variant/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div>
                  <span className="text-xs font-mono text-m3-outline uppercase block">
                    Total Estimado do Prato:
                  </span>
                  <span className="font-semibold text-sky-400 text-sm sm:text-base">
                    {totalPlateMacros.calories} kcal
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    {Math.round(totalPlateMacros.protein)}g P
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    {Math.round(totalPlateMacros.carbs)}g C
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/20">
                    {Math.round(totalPlateMacros.fat)}g G
                  </span>
                </div>
              </div>

              {/* Lista dos Itens Identificados */}
              <div className="space-y-2.5">
                {items.map((item) => {
                  const itemTotals = calculateItemTotals(item);
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-m3-surface-container-high/60 border border-m3-outline-variant/50 rounded-2xl space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-m3-on-surface truncate">
                            {item.name}
                          </h4>
                          <span className="text-[10px] text-m3-outline font-mono block">
                            {item.per100g.calories} kcal / 100g • {item.per100g.protein}g P • {item.per100g.carbs}g C • {item.per100g.fat}g G
                          </span>
                        </div>

                        {/* Campo de Porção em Gramas (com auto-select no foco) */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-m3-surface-container px-2 py-1 rounded-xl border border-m3-outline-variant/60">
                            <label
                              htmlFor={`portion-input-${item.id}`}
                              className="sr-only"
                            >
                              {`Porção de ${item.name}`}
                            </label>
                            <input
                              id={`portion-input-${item.id}`}
                              type="number"
                              min={0}
                              max={2000}
                              value={item.currentGrams}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) =>
                                handlePortionChange(item.id, Number(e.target.value) || 0)
                              }
                              className="w-14 bg-transparent text-right font-mono font-semibold text-xs text-m3-on-surface focus:outline-none"
                            />
                            <span className="text-[10px] text-m3-outline font-mono">g</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 rounded-lg text-m3-outline hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            aria-label={`Remover ${item.name}`}
                            title={`Remover ${item.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Macros Calculados em Tempo Real para este Item */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-m3-outline-variant/30">
                        <span className="text-m3-outline">
                          Subtotal ({item.currentGrams}g):
                        </span>
                        <div className="font-mono text-m3-on-surface flex items-center gap-2">
                          <span className="text-sky-300 font-semibold">
                            {itemTotals.calories} kcal
                          </span>
                          <span>•</span>
                          <span className="text-emerald-400">{itemTotals.protein}g P</span>
                          <span>•</span>
                          <span className="text-amber-400">{itemTotals.carbs}g C</span>
                          <span>•</span>
                          <span className="text-rose-400">{itemTotals.fat}g G</span>
                        </div>
                      </div>

                      {/* Alerta de Incerteza (Clarification Note do Gemini) */}
                      {item.clarificationNote && (
                        <div className="flex items-start gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300/90">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                          <p>{item.clarificationNote}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="pt-4 border-t border-m3-outline-variant/40 flex items-center justify-between gap-3 shrink-0">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl border border-m3-outline-variant text-xs font-medium text-m3-outline hover:text-m3-on-surface hover:bg-m3-surface-container-high transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAnalyzePhoto}
                disabled={isAnalyzing || (!selectedFile && !imagePreview)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analisando Prato com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analisar Foto com IA</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl border border-m3-outline-variant text-xs font-medium text-m3-outline hover:text-m3-on-surface hover:bg-m3-surface-container-high transition-colors"
              >
                Tentar Outra Foto
              </button>
              <button
                type="button"
                onClick={handleConfirmAndAdd}
                disabled={items.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span>Confirmar e Lançar na Refeição</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
