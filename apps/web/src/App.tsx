import { useState, useEffect } from 'react';
import {
  calculateBMR,
  calculateTDEE,
  calculateMacroTargets,
  auditDailyIntake,
  solveProteinDeficit,
  type EventBufferInput,
  type MealWindow,
} from '@dieta-ai/core';
import { MacroSummary } from './components/MacroSummary.js';
import { AuditorBanner } from './components/AuditorBanner.js';
import { ReverseBufferCard } from './components/ReverseBufferCard.js';
import { MealBuilder, type LoggedFood, type MealMap } from './components/MealBuilder.js';
import { AccountManagementModal } from './components/AccountManagementModal.js';
import { User } from 'lucide-react';

const INITIAL_MEALS: MealMap = {
  breakfast: [
    {
      id: 'init_1',
      foodId: 'ovos_inteiros',
      name: 'Ovo de Galinha Inteiro',
      grams: 100,
      calories: 143,
      protein: 13,
      carbs: 1,
      fat: 10,
    },
    {
      id: 'init_2',
      foodId: 'claras_pasteurizadas',
      name: 'Clara de Ovo Pasteurizada',
      grams: 150,
      calories: 78,
      protein: 16.5,
      carbs: 1,
      fat: 0.3,
    },
    {
      id: 'init_3',
      foodId: 'pao_integral',
      name: 'Pão Integral 100%',
      grams: 50,
      calories: 120,
      protein: 4.5,
      carbs: 21.5,
      fat: 1.8,
    },
  ],
  lunch: [
    {
      id: 'init_4',
      foodId: 'sassami',
      name: 'Filé de Sassami Desfiado Cozido',
      grams: 200,
      calories: 330,
      protein: 62,
      carbs: 0,
      fat: 7.2,
    },
    {
      id: 'init_5',
      foodId: 'feijao_preto',
      name: 'Feijão Preto Cozido',
      grams: 100,
      calories: 77,
      protein: 4.5,
      carbs: 14,
      fat: 0.5,
    },
    {
      id: 'init_6',
      foodId: 'batata_doce',
      name: 'Batata-Doce Cozida',
      grams: 150,
      calories: 129,
      protein: 2.4,
      carbs: 30.1,
      fat: 0.2,
    },
  ],
  afternoon_snack: [
    {
      id: 'init_7',
      foodId: 'whey_growth_30g',
      name: 'Whey Protein Concentrado 80% (Growth)',
      grams: 30,
      calories: 124,
      protein: 24,
      carbs: 3,
      fat: 1.8,
    },
  ],
  dinner_event: [],
};

export default function App() {
  // Biometria do Usuário-Alvo (190cm, 40 anos, 95kg)
  const [weightKg] = useState(95);
  const [dailyDeficit] = useState(500);

  // Metas calculadas via Core Mifflin-St Jeor
  const bmr = calculateBMR({ gender: 'male', age: 40, heightCm: 190, weightKg });
  const tdee = calculateTDEE(bmr, 'moderate');
  const targetMacros = calculateMacroTargets({
    tdee,
    weightKg,
    deficitKcal: dailyDeficit,
    proteinStrategy: { type: 'fixed', grams: 220 },
    fatPerKg: 0.8,
  });

  // Estado das refeições persistido em localStorage
  const [meals, setMeals] = useState<MealMap>(() => {
    try {
      const saved = localStorage.getItem('macrometrics_meals');
      return saved ? JSON.parse(saved) : INITIAL_MEALS;
    } catch {
      return INITIAL_MEALS;
    }
  });

  // Evento Social Alocado (Buffer Reverso)
  const [activeEvent, setActiveEvent] = useState<EventBufferInput | null>(null);

  // Modal de Conta e LGPD
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAdmin] = useState(true); // Capacidade de admin

  useEffect(() => {
    try {
      localStorage.setItem('macrometrics_meals', JSON.stringify(meals));
    } catch {
      // Ignora erro de cota de storage
    }
  }, [meals]);

  // Totais consumidos no dia
  const allFoods = Object.values(meals).flat();
  const currentTotals = {
    calories:
      allFoods.reduce((acc, f) => acc + f.calories, 0) + (activeEvent ? activeEvent.calories : 0),
    proteinGrams:
      Math.round(
        (allFoods.reduce((acc, f) => acc + f.protein, 0) +
          (activeEvent ? activeEvent.proteinGrams : 0)) *
          10
      ) / 10,
    carbGrams:
      Math.round(
        (allFoods.reduce((acc, f) => acc + f.carbs, 0) +
          (activeEvent ? activeEvent.carbGrams : 0)) *
          10
      ) / 10,
    fatGrams:
      Math.round(
        (allFoods.reduce((acc, f) => acc + f.fat, 0) + (activeEvent ? activeEvent.fatGrams : 0)) *
          10
      ) / 10,
  };

  // Auditoria Lógica em tempo real
  const auditReport = auditDailyIntake({
    weightKg,
    plannedDailyDeficitKcal: dailyDeficit,
    targetCalories: targetMacros.calories,
    targetProteinGrams: targetMacros.proteinGrams,
    currentCalories: currentTotals.calories,
    currentProteinGrams: currentTotals.proteinGrams,
  });

  const missingProtein = Math.max(0, targetMacros.proteinGrams - currentTotals.proteinGrams);
  const remainingCalories = targetMacros.calories - currentTotals.calories;

  // Handlers do MealBuilder
  const handleAddFood = (window: MealWindow, item: LoggedFood) => {
    setMeals(prev => ({
      ...prev,
      [window]: [...prev[window], item],
    }));
  };

  const handleRemoveFood = (window: MealWindow, itemId: string) => {
    setMeals(prev => ({
      ...prev,
      [window]: prev[window].filter(item => item.id !== itemId),
    }));
  };

  const handleCopyMeal = (fromWindow: MealWindow, toWindow: MealWindow) => {
    const cloned = meals[fromWindow].map(item => ({
      ...item,
      id: `${item.foodId}_copy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    }));
    setMeals(prev => ({
      ...prev,
      [toWindow]: [...prev[toWindow], ...cloned],
    }));
  };

  const handleAutoCompleteProtein = (source: 'sassami' | 'whey_growth') => {
    if (missingProtein <= 0) return;

    const solution = solveProteinDeficit({
      missingProteinGrams: missingProtein,
      remainingCalories,
      preferredSource: source,
    });

    const targetWindow: MealWindow = 'dinner_event';
    const newFood: LoggedFood = {
      id: `autocomplete_${Date.now()}`,
      foodId: source,
      name: `${solution.sourceName} (Auto-Completar)`,
      grams: solution.gramsNeeded,
      calories: solution.caloriesAdded,
      protein: solution.proteinProvided,
      carbs: solution.carbsAdded,
      fat: solution.fatAdded,
    };

    handleAddFood(targetWindow, newFood);
  };

  return (
    <div className="min-h-screen bg-m3-background text-m3-on-surface">
      {/* Top App Bar Material Design 3 */}
      <header className="sticky top-0 z-40 bg-m3-surface-container-low/95 backdrop-blur-md border-b border-m3-outline-variant/60 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-m3-primary text-m3-on-primary flex items-center justify-center font-black font-mono shadow-md">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-sm text-m3-on-surface">
                  MacroMetrics Pro
                </span>
                <span className="text-[10px] font-mono bg-m3-surface-container-highest text-m3-tertiary px-1.5 py-0.5 rounded border border-m3-outline-variant/50">
                  v0.1.0-dev
                </span>
              </div>
              <p className="text-[11px] text-m3-outline font-mono">
                Engenharia Reversa • Auditoria Matemática
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              className="flex items-center gap-1.5 bg-m3-surface-container-high hover:bg-m3-surface-variant border border-m3-outline-variant text-xs text-m3-on-surface px-3 py-1.5 rounded-xl transition-colors"
            >
              <User className="w-3.5 h-3.5 text-m3-primary" />
              <span>Conta & LGPD</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do Dashboard */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Auditoria Lógica Implacável */}
        <AuditorBanner report={auditReport} />

        {/* Dashboard de Macronutrientes e Metas */}
        <MacroSummary
          target={targetMacros}
          current={currentTotals}
          weeklyBankKcal={450} // Exemplo de saldo semanal acumulado
        />

        {/* Simulador de Buffer de Evento Social (Engenharia Reversa) */}
        <ReverseBufferCard
          dailyTarget={targetMacros}
          activeEvent={activeEvent}
          onSelectEvent={setActiveEvent}
        />

        {/* Construtor de Refeições com UX Cronometer */}
        <MealBuilder
          meals={meals}
          onAddFood={handleAddFood}
          onRemoveFood={handleRemoveFood}
          onCopyMeal={handleCopyMeal}
          onAutoCompleteProtein={handleAutoCompleteProtein}
          missingProtein={missingProtein}
          remainingCalories={remainingCalories}
        />
      </main>

      {/* Modal de Gestão de Conta e LGPD */}
      <AccountManagementModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        isAdmin={isAdmin}
        onRequestDeletion={() => {
          console.log('Solicitação de exclusão de conta enviada.');
        }}
        onAdminPurge={id => {
          console.log(`Admin expurgou usuário ${id}`);
        }}
      />
    </div>
  );
}
