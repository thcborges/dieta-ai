import React, { useState, useEffect } from 'react';
import type { FoodItem } from '@dieta-ai/core';
import { X, PlusCircle, AlertCircle, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

export interface FoodRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (food: FoodItem) => void;
  initialName?: string;
  initialBarcode?: string;
}

export const FoodRegistrationModal: React.FC<FoodRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  initialBarcode = '',
}) => {
  const [name, setName] = useState(initialName);
  const [servingSizeGrams, setServingSizeGrams] = useState<number | ''>(100);
  const [caloriesPer100g, setCaloriesPer100g] = useState<string>('');
  const [proteinPer100g, setProteinPer100g] = useState<string>('');
  const [carbsPer100g, setCarbsPer100g] = useState<string>('');
  const [fatPer100g, setFatPer100g] = useState<string>('');
  const [fiberPer100g, setFiberPer100g] = useState<string>('');
  const [barcode, setBarcode] = useState<string>(initialBarcode);
  const [error, setError] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [estimateFeedback, setEstimateFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setBarcode(initialBarcode);
      setServingSizeGrams(100);
      setCaloriesPer100g('');
      setProteinPer100g('');
      setCarbsPer100g('');
      setFatPer100g('');
      setFiberPer100g('');
      setError(null);
      setIsEstimating(false);
      setEstimateFeedback(null);
    }
  }, [isOpen, initialName, initialBarcode]);

  if (!isOpen) return null;

  const handleEstimateAI = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Informe o nome do alimento antes de solicitar a estimativa por IA.');
      return;
    }

    setError(null);
    setIsEstimating(true);
    setEstimateFeedback(null);

    try {
      let token = '';
      let userId = '';
      try {
        const stored = localStorage.getItem('macrometrics_auth_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          token = parsed.sessionToken || (parsed.id ? `mock-google-id-token-${parsed.id}` : '');
          userId = parsed.id || '';
        }
      } catch {
        // fallback
      }

      if (!token) {
        token = localStorage.getItem('auth_token') || '';
      }

      const res = await fetch('/api/v1/foods/estimate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({
          foodName: trimmed,
          portionGrams: servingSizeGrams !== '' ? Number(servingSizeGrams) || 100 : 100,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Falha ao estimar macros.');
      }

      const data = await res.json();
      if (data.proteinPer100g !== undefined) {
        setProteinPer100g(String(data.proteinPer100g));
      }
      if (data.carbsPer100g !== undefined) {
        setCarbsPer100g(String(data.carbsPer100g));
      }
      if (data.fatPer100g !== undefined) {
        setFatPer100g(String(data.fatPer100g));
      }
      if (data.fiberPer100g !== undefined) {
        setFiberPer100g(String(data.fiberPer100g));
      }
      if (data.caloriesPer100g !== undefined) {
        setCaloriesPer100g(String(data.caloriesPer100g));
      }
      if (data.servingSizeGrams !== undefined) {
        setServingSizeGrams(Number(data.servingSizeGrams) || 100);
      }
      setEstimateFeedback('Valores nutricionais estimados com base nas referências da IA.');
    } catch (err: any) {
      setError(err.message || 'Não foi possível estimar os macronutrientes via IA no momento.');
    } finally {
      setIsEstimating(false);
    }
  };

  const updateCalories = (pStr: string, cStr: string, fStr: string) => {
    const p = pStr === '' ? 0 : Number(pStr) || 0;
    const c = cStr === '' ? 0 : Number(cStr) || 0;
    const f = fStr === '' ? 0 : Number(fStr) || 0;
    const totalCal = Math.round(p * 4 + c * 4 + f * 9);
    setCaloriesPer100g(totalCal > 0 ? String(totalCal) : '');
  };

  const handleProteinChange = (val: string) => {
    setProteinPer100g(val);
    updateCalories(val, carbsPer100g, fatPer100g);
  };

  const handleCarbsChange = (val: string) => {
    setCarbsPer100g(val);
    updateCalories(proteinPer100g, val, fatPer100g);
  };

  const handleFatChange = (val: string) => {
    setFatPer100g(val);
    updateCalories(proteinPer100g, carbsPer100g, val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('O nome do alimento é obrigatório.');
      return;
    }

    const p = Number(proteinPer100g) || 0;
    const c = Number(carbsPer100g) || 0;
    const f = Number(fatPer100g) || 0;
    const fib = Number(fiberPer100g) || 0;
    const calculatedCalories = Math.round(p * 4 + c * 4 + f * 9);
    const finalCalories = caloriesPer100g !== '' ? Number(caloriesPer100g) || 0 : calculatedCalories;

    const newFood: FoodItem = {
      id: barcode.trim()
        ? `custom_${barcode.trim()}`
        : `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      servingDescription: `${servingSizeGrams || 100}g`,
      servingSizeGrams: Number(servingSizeGrams) || 100,
      caloriesPer100g: Math.max(0, Math.round(finalCalories)),
      proteinPer100g: Math.max(0, Math.round(p * 10) / 10),
      carbsPer100g: Math.max(0, Math.round(c * 10) / 10),
      fatPer100g: Math.max(0, Math.round(f * 10) / 10),
      fiberPer100g: Math.max(0, Math.round(fib * 10) / 10),
      isCustom: true,
      isValidated: false,
    };

    onSave(newFood);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-m3-surface-container rounded-3xl max-w-lg w-full border border-m3-outline-variant shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Material Design 3 */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-m3-outline-variant/60 flex items-center justify-between bg-m3-surface-container-high">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-m3-primary/10 text-m3-primary border border-m3-primary/20 shrink-0">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base text-m3-on-surface truncate">Cadastrar Novo Alimento</h3>
              <p className="text-xs text-m3-outline truncate">Formulário rápido para inclusão no diário e banco</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-full hover:bg-m3-surface-variant text-m3-outline hover:text-m3-on-surface transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {estimateFeedback && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{estimateFeedback}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="food-name" className="text-xs font-medium text-m3-on-surface">
                Nome do Alimento *
              </label>
              <button
                type="button"
                onClick={handleEstimateAI}
                disabled={isEstimating}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-m3-primary/15 hover:bg-m3-primary/25 text-m3-primary border border-m3-primary/30 text-[11px] font-medium transition-all disabled:opacity-50"
                aria-label="Estimar com IA"
                title="Estimar calorias e macronutrientes deste alimento via inteligência artificial"
              >
                {isEstimating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Estimando macros com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Estimar com IA</span>
                  </>
                )}
              </button>
            </div>
            <input
              id="food-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Iogurte Grego Natural"
              className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3.5 py-2.5 text-xs text-m3-on-surface placeholder:text-m3-outline/50 focus:outline-none focus:border-m3-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="food-serving" className="block text-xs font-medium text-m3-on-surface mb-1">
                Porção Padrão (g)
              </label>
              <input
                id="food-serving"
                type="number"
                min="1"
                max="2000"
                value={servingSizeGrams}
                onChange={e => {
                  const val = e.target.value;
                  setServingSizeGrams(val === '' ? '' : Number(val) || 0);
                }}
                placeholder="100"
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>
            <div>
              <label htmlFor="food-barcode" className="block text-xs font-medium text-m3-on-surface mb-1">
                Código de Barras (opcional)
              </label>
              <input
                id="food-barcode"
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                placeholder="Ex: 7891000100010"
                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>
          </div>

          <div className="border-t border-m3-outline-variant/40 pt-3">
            <span className="text-[11px] font-mono text-m3-outline uppercase block mb-2">
              Macronutrientes por 100g de Alimento
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="food-protein" className="block text-[11px] text-m3-metric-protein mb-1 font-medium">
                  Proteínas (100g)
                </label>
                <input
                  id="food-protein"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={proteinPer100g}
                  onChange={e => handleProteinChange(e.target.value)}
                  placeholder="0"
                  className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-metric-protein"
                />
              </div>

              <div>
                <label htmlFor="food-carbs" className="block text-[11px] text-m3-metric-carbs mb-1 font-medium">
                  Carboidratos (100g)
                </label>
                <input
                  id="food-carbs"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={carbsPer100g}
                  onChange={e => handleCarbsChange(e.target.value)}
                  placeholder="0"
                  className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-metric-carbs"
                />
              </div>

              <div>
                <label htmlFor="food-fat" className="block text-[11px] text-m3-metric-fat mb-1 font-medium">
                  Gorduras (100g)
                </label>
                <input
                  id="food-fat"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={fatPer100g}
                  onChange={e => handleFatChange(e.target.value)}
                  placeholder="0"
                  className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-metric-fat"
                />
              </div>

              <div>
                <label htmlFor="food-fiber" className="block text-[11px] text-m3-metric-fiber mb-1 font-medium">
                  Fibras (100g)
                </label>
                <input
                  id="food-fiber"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={fiberPer100g}
                  onChange={e => setFiberPer100g(e.target.value)}
                  placeholder="0"
                  className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-metric-fiber"
                />
              </div>

              <div>
                <label htmlFor="food-calories" className="block text-[11px] text-m3-outline mb-1 font-medium">
                  Calorias (100g)
                </label>
                <input
                  id="food-calories"
                  type="number"
                  min="0"
                  max="1000"
                  value={caloriesPer100g}
                  onChange={e => setCaloriesPer100g(e.target.value)}
                  placeholder="0"
                  className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-m3-outline-variant/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-m3-outline hover:text-m3-on-surface transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-m3-primary text-m3-on-primary font-semibold text-xs px-5 py-2.5 rounded-xl hover:bg-m3-primary/90 transition-all shadow-md"
            >
              Salvar Alimento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
