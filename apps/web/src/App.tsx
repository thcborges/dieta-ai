import { useState, useEffect } from 'react';
import {
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
import { LoginPage, type AuthUser } from './components/LoginPage.js';
import { MacroSettingsModal, type UserMacroSettings } from './components/MacroSettingsModal.js';
import { User, Sliders, LogOut } from 'lucide-react';

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
      fiber: 0,
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
      fiber: 0,
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
      fiber: 3.0,
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
      fiber: 0,
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
      fiber: 8.5,
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
      fiber: 4.5,
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
      fiber: 0,
    },
  ],
  dinner_event: [],
};

const DEFAULT_SETTINGS: UserMacroSettings = {
  ageYears: 40,
  gender: 'male',
  weightKg: 95,
  activityLevel: 'moderate',
  dailyDeficitKcal: 500,
  calories: 2400,
  proteinGrams: 220,
  carbGrams: 180,
  fatGrams: 75,
  fiberGrams: 38,
};

export default function App() {
  // Estado de Autenticação (Obrigatório para lançar alimentos)
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('macrometrics_auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Configurações de Macros controladas por usuário
  const [macroSettings, setMacroSettings] = useState<UserMacroSettings>(() => {
    try {
      const savedUser = localStorage.getItem('macrometrics_auth_user');
      const userId = savedUser ? (JSON.parse(savedUser) as AuthUser).id : 'default';
      const savedProfile = localStorage.getItem(`macrometrics_profile_${userId}`);
      return savedProfile ? JSON.parse(savedProfile) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Refeições isoladas por usuário
  const [meals, setMeals] = useState<MealMap>(() => {
    try {
      const savedUser = localStorage.getItem('macrometrics_auth_user');
      const userId = savedUser ? (JSON.parse(savedUser) as AuthUser).id : 'default';
      const saved = localStorage.getItem(`macrometrics_meals_${userId}`);
      return saved ? JSON.parse(saved) : INITIAL_MEALS;
    } catch {
      return INITIAL_MEALS;
    }
  });

  // Modais
  const [isMacroModalOpen, setIsMacroModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAdmin] = useState(true);

  // Evento Social Alocado (Buffer Reverso)
  const [activeEvent, setActiveEvent] = useState<EventBufferInput | null>(null);

  // Sincroniza persistência de perfil e refeições ao trocar usuário
  useEffect(() => {
    if (user) {
      try {
        const savedProfile = localStorage.getItem(`macrometrics_profile_${user.id}`);
        if (savedProfile) {
          setMacroSettings(JSON.parse(savedProfile));
        } else {
          setMacroSettings(DEFAULT_SETTINGS);
        }

        const savedMeals = localStorage.getItem(`macrometrics_meals_${user.id}`);
        if (savedMeals) {
          setMeals(JSON.parse(savedMeals));
        } else {
          setMeals(INITIAL_MEALS);
        }
      } catch {
        // Ignora erro de storage
      }
    }
  }, [user]);

  // Persiste refeições do usuário logado
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(`macrometrics_meals_${user.id}`, JSON.stringify(meals));
      } catch {
        // Ignora erro de storage
      }
    }
  }, [meals, user]);

  // Persiste metas de macros do usuário logado
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(`macrometrics_profile_${user.id}`, JSON.stringify(macroSettings));
      } catch {
        // Ignora erro de storage
      }
    }
  }, [macroSettings, user]);

  const handleLogin = (loggedUser: AuthUser) => {
    setUser(loggedUser);
    try {
      localStorage.setItem('macrometrics_auth_user', JSON.stringify(loggedUser));
    } catch {
      // Ignora erro de storage
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('macrometrics_auth_user');
    } catch {
      // Ignora erro de storage
    }
  };

  // Se o usuário NÃO estiver logado, exibe a Página Principal de Login
  // Nenhum alimento pode ser lançado sem autenticação
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const targetMacros = {
    calories: macroSettings.calories,
    proteinGrams: macroSettings.proteinGrams,
    carbGrams: macroSettings.carbGrams,
    fatGrams: macroSettings.fatGrams,
    fiberGrams: macroSettings.fiberGrams,
  };

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
    fiberGrams:
      Math.round(
        (allFoods.reduce((acc, f) => acc + (f.fiber || 0), 0) +
          (activeEvent?.fiberGrams ?? 0)) *
          10
      ) / 10,
  };

  // Auditoria Lógica em tempo real
  const auditReport = auditDailyIntake({
    weightKg: macroSettings.weightKg,
    plannedDailyDeficitKcal: macroSettings.dailyDeficitKcal,
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
      fiber: 0,
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
            {/* Botão de Controle de Macros */}
            <button
              type="button"
              onClick={() => setIsMacroModalOpen(true)}
              className="flex items-center gap-1.5 bg-m3-surface-container-high hover:bg-m3-surface-variant border border-m3-outline-variant text-xs text-m3-on-surface px-3 py-1.5 rounded-xl transition-colors font-medium"
            >
              <Sliders className="w-3.5 h-3.5 text-m3-metric-protein" />
              <span>Controlar Macros</span>
            </button>

            {/* Modal de Conta e LGPD */}
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              className="flex items-center gap-1.5 bg-m3-surface-container-high hover:bg-m3-surface-variant border border-m3-outline-variant text-xs text-m3-on-surface px-3 py-1.5 rounded-xl transition-colors"
            >
              <User className="w-3.5 h-3.5 text-m3-primary" />
              <span>Conta & LGPD</span>
            </button>

            {/* Botão de Logout */}
            <button
              type="button"
              onClick={handleLogout}
              title="Sair da Conta"
              className="flex items-center gap-1.5 bg-m3-surface-container-high hover:bg-red-950/40 hover:text-red-400 border border-m3-outline-variant text-xs text-m3-outline px-2.5 py-1.5 rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
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
          weeklyBankKcal={450}
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

      {/* Modal de Controle de Macros */}
      <MacroSettingsModal
        isOpen={isMacroModalOpen}
        onClose={() => setIsMacroModalOpen(false)}
        currentSettings={macroSettings}
        onSave={newSettings => setMacroSettings(newSettings)}
      />

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
