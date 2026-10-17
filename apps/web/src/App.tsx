import { useState, useEffect, useRef } from 'react';
import {
  auditDailyIntake,
  solveProteinDeficit,
  calculateBMR,
  calculateTDEE,
  PREPOPULATED_FOODS,
  type EventBufferInput,
  type MealWindow,
  type FoodItem,
} from '@dieta-ai/core';
import { MacroSummary } from './components/MacroSummary.js';
import { AuditorBanner } from './components/AuditorBanner.js';
import { WeeklyThermometerCard } from './components/WeeklyThermometerCard.js';
import { ReverseBufferCard } from './components/ReverseBufferCard.js';
import { MealBuilder, type LoggedFood, type MealMap } from './components/MealBuilder.js';
import { AccountManagementModal } from './components/AccountManagementModal.js';
import { LoginPage, type AuthUser } from './components/LoginPage.js';
import { MacroSettingsModal, type UserMacroSettings } from './components/MacroSettingsModal.js';
import { User, Sliders, LogOut, Calendar } from 'lucide-react';

const EMPTY_MEALS: MealMap = {
  breakfast: [],
  lunch: [],
  afternoon_snack: [],
  dinner_event: [],
};

const DEFAULT_SETTINGS: UserMacroSettings = {
  ageYears: 40,
  gender: 'male',
  heightCm: 190,
  weightKg: 95,
  activityLevel: 'moderate',
  bmrSource: 'mifflin_st_jeor',
  manualBmr: 1943,
  goal: 'weight_loss',
  dailyDeficitKcal: 500,
  dailySurplusKcal: 400,
  tolerancePercent: 3,
  calories: 2400,
  proteinGrams: 220,
  carbGrams: 180,
  fatGrams: 75,
  fiberGrams: 38,
};

export default function App() {
  const activeUserRef = useRef<string | null>(null);

  // Estado de Autenticação (Obrigatório para lançar alimentos)
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('macrometrics_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as AuthUser;
        activeUserRef.current = parsed.id;
        return parsed;
      }
      return null;
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

  // Data ativa do diário (padrão: hoje YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Refeições isoladas por usuário (inicia vazio para novos usuários ou carrega do storage da conta)
  const [meals, setMeals] = useState<MealMap>(() => {
    try {
      const savedUser = localStorage.getItem('macrometrics_auth_user');
      if (savedUser) {
        const userId = (JSON.parse(savedUser) as AuthUser).id;
        const today = new Date().toISOString().slice(0, 10);
        const savedByDate = localStorage.getItem(`macrometrics_meals_${userId}_${today}`);
        if (savedByDate) return JSON.parse(savedByDate);
        const saved = localStorage.getItem(`macrometrics_meals_${userId}`);
        return saved ? JSON.parse(saved) : EMPTY_MEALS;
      }
      return EMPTY_MEALS;
    } catch {
      return EMPTY_MEALS;
    }
  });

  // Banco de Alimentos do usuário (Cache offline-first + pré-populado)
  const [availableFoods, setAvailableFoods] = useState<FoodItem[]>(() => {
    try {
      const savedUser = localStorage.getItem('macrometrics_auth_user');
      const userId = savedUser ? (JSON.parse(savedUser) as AuthUser).id : 'default';
      const savedFoods = localStorage.getItem(`macrometrics_custom_foods_${userId}`);
      if (savedFoods) {
        const parsed = JSON.parse(savedFoods) as FoodItem[];
        const map = new Map<string, FoodItem>();
        for (const f of PREPOPULATED_FOODS) map.set(f.id, f);
        for (const f of parsed) map.set(f.id, f);
        return Array.from(map.values());
      }
      return PREPOPULATED_FOODS;
    } catch {
      return PREPOPULATED_FOODS;
    }
  });

  // Modais
  const [isMacroModalOpen, setIsMacroModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAdmin] = useState(true);

  // Evento Social Alocado (Buffer Reverso)
  const [activeEvent, setActiveEvent] = useState<EventBufferInput | null>(null);

  // Sincroniza persistência de perfil, refeições e alimentos ao trocar usuário ou data
  useEffect(() => {
    if (user) {
      activeUserRef.current = user.id;
      try {
        const savedProfile = localStorage.getItem(`macrometrics_profile_${user.id}`);
        setMacroSettings(savedProfile ? JSON.parse(savedProfile) : DEFAULT_SETTINGS);

        const savedMealsByDate = localStorage.getItem(`macrometrics_meals_${user.id}_${selectedDate}`);
        const savedMeals = localStorage.getItem(`macrometrics_meals_${user.id}`);
        if (savedMealsByDate) {
          setMeals(JSON.parse(savedMealsByDate));
        } else if (savedMeals) {
          setMeals(JSON.parse(savedMeals));
        } else {
          setMeals(EMPTY_MEALS);
        }

        const savedFoods = localStorage.getItem(`macrometrics_custom_foods_${user.id}`);
        if (savedFoods) {
          const parsed = JSON.parse(savedFoods) as FoodItem[];
          const map = new Map<string, FoodItem>();
          for (const f of PREPOPULATED_FOODS) map.set(f.id, f);
          for (const f of parsed) map.set(f.id, f);
          setAvailableFoods(Array.from(map.values()));
        } else {
          setAvailableFoods(PREPOPULATED_FOODS);
        }

        // Sincroniza refeições com a API de diário da conta
        fetch('/api/v1/diary', {
          headers: {
            'x-user-id': user.id,
          },
        })
          .then(res => (res.ok ? res.json() : null))
          .then(data => {
            if (data?.meals && activeUserRef.current === user.id) {
              const hasRemoteMeals = Object.values(data.meals).some(
                (arr: unknown) => Array.isArray(arr) && arr.length > 0
              );
              if (hasRemoteMeals || !savedMeals) {
                setMeals(data.meals);
                localStorage.setItem(`macrometrics_meals_${user.id}`, JSON.stringify(data.meals));
              }
            }
          })
          .catch(() => {
            // Mantém funcionamento offline-first
          });
      } catch {
        // Ignora erro de storage
      }
    } else {
      activeUserRef.current = null;
      setMeals(EMPTY_MEALS);
    }
  }, [user, selectedDate]);

  // Consulta diário no Firestore (Sincronização em Nuvem resiliente / Offline-first)
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    fetch(`/api/v1/diaries/${selectedDate}`, {
      headers: {
        'x-user-id': user.id,
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Falha ao obter diário do Firestore');
        return res.json();
      })
      .then(data => {
        if (isCancelled || activeUserRef.current !== user.id) return;
        if (data && data.meals) {
          const hasLoggedMeals = Object.values(data.meals).some(
            items => Array.isArray(items) && items.length > 0
          );
          if (hasLoggedMeals) {
            setMeals(data.meals);
            try {
              localStorage.setItem(`macrometrics_meals_${user.id}_${selectedDate}`, JSON.stringify(data.meals));
            } catch {
              // Ignora erro de storage
            }
          }
        }
      })
      .catch(() => {
        // Offline-first: mantém dados locais
      });

    return () => {
      isCancelled = true;
    };
  }, [user, selectedDate]);

  // Persiste refeições do usuário logado localmente e no Firestore
  useEffect(() => {
    if (user && activeUserRef.current === user.id) {
      try {
        localStorage.setItem(`macrometrics_meals_${user.id}_${selectedDate}`, JSON.stringify(meals));
        localStorage.setItem(`macrometrics_meals_${user.id}`, JSON.stringify(meals));

        fetch('/api/v1/diary', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id,
          },
          body: JSON.stringify({ meals }),
        }).catch(() => {
          // Ignora erro em modo offline-first
        });
      } catch {
        // Ignora erro de storage
      }

      fetch(`/api/v1/diaries/${selectedDate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ meals }),
      }).catch(() => {
        // Modo offline-first resiliente
      });
    }
  }, [meals, user, selectedDate]);

  // Persiste alimentos customizados do usuário logado
  useEffect(() => {
    if (user && activeUserRef.current === user.id) {
      try {
        const customOnly = availableFoods.filter(
          f => f.isCustom || f.id.startsWith('off_') || f.id.startsWith('custom_')
        );
        localStorage.setItem(`macrometrics_custom_foods_${user.id}`, JSON.stringify(customOnly));
      } catch {
        // Ignora erro de storage
      }
    }
  }, [availableFoods, user]);

  // Persiste metas de macros do usuário logado
  useEffect(() => {
    if (user && activeUserRef.current === user.id) {
      try {
        localStorage.setItem(`macrometrics_profile_${user.id}`, JSON.stringify(macroSettings));
      } catch {
        // Ignora erro de storage
      }
    }
  }, [macroSettings, user]);

  const handleRegisterFood = async (newFood: FoodItem) => {
    setAvailableFoods(prev => {
      if (prev.some(f => f.id === newFood.id)) return prev;
      return [newFood, ...prev];
    });

    if (newFood.isCustom) {
      try {
        await fetch('/api/v1/foods/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newFood.name,
            servingSizeGrams: newFood.servingSizeGrams,
            caloriesPer100g: newFood.caloriesPer100g,
            proteinPer100g: newFood.proteinPer100g,
            carbsPer100g: newFood.carbsPer100g,
            fatPer100g: newFood.fatPer100g,
            fiberPer100g: newFood.fiberPer100g,
            barcode: (newFood as { barcode?: string }).barcode,
          }),
        });
      } catch {
        // Ignora erro offline-first
      }
    }
  };

  const handleLogin = (loggedUser: AuthUser) => {
    activeUserRef.current = loggedUser.id;
    setUser(loggedUser);
    try {
      localStorage.setItem('macrometrics_auth_user', JSON.stringify(loggedUser));
      const savedMeals = localStorage.getItem(`macrometrics_meals_${loggedUser.id}`);
      setMeals(savedMeals ? JSON.parse(savedMeals) : EMPTY_MEALS);
    } catch {
      setMeals(EMPTY_MEALS);
    }
  };

  const handleLogout = () => {
    activeUserRef.current = null;
    setUser(null);
    setMeals(EMPTY_MEALS);
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

  // Perfil e TDEE para o cálculo do termômetro
  const userBmr = calculateBMR({
    gender: macroSettings.gender,
    age: macroSettings.ageYears,
    heightCm: 190,
    weightKg: macroSettings.weightKg,
  });
  const userTdee = calculateTDEE(userBmr, macroSettings.activityLevel);

  // Janela móvel dos últimos 7 dias (terminando em selectedDate)
  const rolling7Days = (() => {
    const list: Array<{ date: string; calories: number; proteinGrams?: number }> = [];
    const baseDate = new Date(selectedDate);
    const validDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(validDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);

      if (dateStr === selectedDate) {
        list.push({
          date: dateStr,
          calories: currentTotals.calories,
          proteinGrams: currentTotals.proteinGrams,
        });
      } else if (user) {
        try {
          const savedMealsStr = localStorage.getItem(`macrometrics_meals_${user.id}_${dateStr}`);
          if (savedMealsStr) {
            const savedMeals = JSON.parse(savedMealsStr) as MealMap;
            const foods = Object.values(savedMeals).flat();
            const cals = foods.reduce((acc, f) => acc + (f.calories || 0), 0);
            const prot = foods.reduce((acc, f) => acc + (f.protein || 0), 0);
            list.push({ date: dateStr, calories: cals, proteinGrams: prot });
          } else {
            list.push({ date: dateStr, calories: 0, proteinGrams: 0 });
          }
        } catch {
          list.push({ date: dateStr, calories: 0, proteinGrams: 0 });
        }
      } else {
        list.push({ date: dateStr, calories: 0, proteinGrams: 0 });
      }
    }
    return list;
  })();

  const weeklySlipKcal =
    rolling7Days.reduce((acc, d) => acc + d.calories, 0) -
    rolling7Days.length * targetMacros.calories;
  const weeklyBankDisplay = -weeklySlipKcal;

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
    <div className="min-h-screen bg-m3-background text-m3-on-surface overflow-x-hidden">
      {/* Top App Bar Material Design 3 */}
      <header className="sticky top-0 z-40 bg-m3-surface-container-low/95 backdrop-blur-md border-b border-m3-outline-variant/60 px-4 py-2.5 md:py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap md:flex-nowrap items-center justify-between gap-y-2.5 gap-x-3">
          {/* Brand & Identidade */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-m3-primary text-m3-on-primary flex items-center justify-center font-black font-mono shadow-md shrink-0">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-sm text-m3-on-surface whitespace-nowrap">
                  MacroMetrics Pro
                </span>
                <span className="text-[10px] font-mono bg-m3-surface-container-highest text-m3-tertiary px-1.5 py-0.5 rounded border border-m3-outline-variant/50 shrink-0">
                  v0.1.0-dev
                </span>
              </div>
              <p className="text-[11px] text-m3-outline font-mono hidden sm:block">
                Engenharia Reversa • Auditoria Matemática
              </p>
            </div>
          </div>

          {/* Ações / Botões do Cabeçalho (Posicionados à direita na linha superior no mobile, e à direita da data no desktop) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 order-2 md:order-3">
            {/* Botão de Controle de Macros */}
            <button
              type="button"
              onClick={() => setIsMacroModalOpen(true)}
              title="Controlar Macros"
              aria-label="Controlar Macros"
              className="flex items-center gap-1.5 bg-m3-surface-container-high hover:bg-m3-surface-variant border border-m3-outline-variant text-xs text-m3-on-surface px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-xl transition-colors font-medium shrink-0"
            >
              <Sliders className="w-3.5 h-3.5 text-m3-metric-protein shrink-0" />
              <span className="hidden md:inline">Controlar Macros</span>
            </button>

            {/* Modal de Conta e LGPD */}
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              title="Conta & LGPD"
              aria-label="Conta & LGPD"
              className="flex items-center gap-1.5 bg-m3-surface-container-high hover:bg-m3-surface-variant border border-m3-outline-variant text-xs text-m3-on-surface px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-xl transition-colors shrink-0"
            >
              <User className="w-3.5 h-3.5 text-m3-primary shrink-0" />
              <span className="hidden md:inline">Conta & LGPD</span>
            </button>

            {/* Botão de Logout */}
            <button
              type="button"
              onClick={handleLogout}
              title="Sair da Conta"
              aria-label="Sair"
              className="flex items-center gap-1.5 bg-m3-surface-container-high hover:bg-red-950/40 hover:text-red-400 border border-m3-outline-variant text-xs text-m3-outline px-2.5 py-1.5 rounded-xl transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Sair</span>
            </button>
          </div>

          {/* Seletor de Data do Diário (Ocupa linha dedicada no mobile e alinha-se no desktop) */}
          <div className="w-full md:w-auto order-3 md:order-2 flex items-center">
            <div className="flex items-center justify-between md:justify-start gap-1.5 bg-m3-surface-container-high border border-m3-outline-variant/60 px-2.5 py-1 rounded-xl text-xs text-m3-on-surface w-full md:w-auto">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-m3-primary shrink-0" />
                <span className="text-[11px] text-m3-outline font-mono md:hidden">Data do Diário:</span>
              </div>
              <label htmlFor="diary-date-picker" className="sr-only">
                Data do Diário
              </label>
              <input
                id="diary-date-picker"
                type="date"
                value={selectedDate}
                onChange={e => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="bg-transparent text-m3-on-surface text-xs focus:outline-none cursor-pointer font-mono"
              />
            </div>
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
          weeklyBankKcal={weeklyBankDisplay}
        />

        {/* Termômetro do Banco Semanal com Janela Móvel */}
        <WeeklyThermometerCard
          goal={macroSettings.goal ?? 'weight_loss'}
          dailyTargetCalories={targetMacros.calories}
          tdee={userTdee}
          weightKg={macroSettings.weightKg}
          dailyDeficitKcal={macroSettings.dailyDeficitKcal}
          dailySurplusKcal={macroSettings.dailySurplusKcal}
          tolerancePercent={macroSettings.tolerancePercent ?? 3}
          days={rolling7Days}
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
          availableFoods={availableFoods}
          onAddFood={handleAddFood}
          onRemoveFood={handleRemoveFood}
          onCopyMeal={handleCopyMeal}
          onAutoCompleteProtein={handleAutoCompleteProtein}
          onRegisterFood={handleRegisterFood}
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
        onRequestDeletion={async () => {
          if (user) {
            try {
              await fetch(`/api/v1/users/${user.id}/deletion-request`, {
                method: 'POST',
              });
            } catch {
              // offline-first resiliente
            }
          }
        }}
        onAdminPurge={async id => {
          try {
            await fetch(`/api/v1/admin/users/${id}`, {
              method: 'DELETE',
              headers: { 'x-admin-token': 'admin-secret-token-key-us-central1' },
            });
          } catch {
            // offline-first resiliente
          }
        }}
      />
    </div>
  );
}
