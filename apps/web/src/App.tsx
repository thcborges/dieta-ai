import { useState, useEffect, useRef, useMemo } from 'react';
import {
  auditDailyIntake,
  calculateBMR,
  calculateTDEE,
  PREPOPULATED_FOODS,
  getLocalDateString,
  getRollingDays,
  canonicalizeUserId,
  type EventBufferInput,
  type MealWindow,
  type FoodItem,
  type RecipeInput,
  recipeToFoodItem,
  calculateRecipeMacros,
  imputeMissingWeeklyDays,
} from '@dieta-ai/core';
import { MacroSummary } from './components/MacroSummary.js';
import { AuditorBanner } from './components/AuditorBanner.js';
import { WeeklyThermometerCard } from './components/WeeklyThermometerCard.js';
import { ReverseBufferCard } from './components/ReverseBufferCard.js';
import { MealBuilder, type LoggedFood, type MealMap } from './components/MealBuilder.js';
import { AccountManagementModal } from './components/AccountManagementModal.js';
import { LoginPage, type AuthUser } from './components/LoginPage.js';
import { MacroSettingsModal, type UserMacroSettings } from './components/MacroSettingsModal.js';
import { User, Sliders, LogOut, Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

function stepDate(dateStr: string, offset: number): string {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const d = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr) + offset, 0, 0, 0, 0);
  return getLocalDateString(d);
}

const EMPTY_MEALS: MealMap = {
  breakfast: [],
  lunch: [],
  afternoon_snack: [],
  dinner_event: [],
};

function normalizeMeals(raw: unknown): MealMap {
  if (!raw || typeof raw !== 'object') {
    return {
      breakfast: [],
      lunch: [],
      afternoon_snack: [],
      dinner_event: [],
    };
  }
  const r = raw as Record<string, unknown>;
  return {
    breakfast: Array.isArray(r.breakfast) ? (r.breakfast as LoggedFood[]) : [],
    lunch: Array.isArray(r.lunch) ? (r.lunch as LoggedFood[]) : [],
    afternoon_snack: Array.isArray(r.afternoon_snack) ? (r.afternoon_snack as LoggedFood[]) : [],
    dinner_event: Array.isArray(r.dinner_event) ? (r.dinner_event as LoggedFood[]) : [],
  };
}

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

function getInitialUserFromStorage(): AuthUser | null {
  try {
    const savedUser = localStorage.getItem('macrometrics_auth_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser) as AuthUser;
      if (parsed.id && !parsed.id.startsWith('usr_')) {
        const canonical = parsed.email
          ? canonicalizeUserId(parsed.email)
          : canonicalizeUserId(parsed.id);
        if (canonical && parsed.id !== canonical) {
          parsed.id = canonical;
          try {
            localStorage.setItem('macrometrics_auth_user', JSON.stringify(parsed));
          } catch {
            // Ignora erro de storage
          }
        }
      }
      return parsed;
    }
  } catch {
    // fallback
  }
  return null;
}

export default function App() {
  const activeUserRef = useRef<string | null>(null);

  // Estado de Autenticação (Obrigatório para lançar alimentos)
  const [user, setUser] = useState<AuthUser | null>(() => {
    const parsedUser = getInitialUserFromStorage();
    if (parsedUser) {
      activeUserRef.current = parsedUser.id;
      return parsedUser;
    }
    return null;
  });

  // Configurações de Macros controladas por usuário
  const [macroSettings, setMacroSettings] = useState<UserMacroSettings>(() => {
    try {
      const parsedUser = getInitialUserFromStorage();
      const userId = parsedUser ? parsedUser.id : 'default';
      const savedProfile = localStorage.getItem(`macrometrics_profile_${userId}`);
      return savedProfile ? JSON.parse(savedProfile) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Data ativa do diário (padrão: hoje no fuso local do usuário YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return getLocalDateString();
  });
  const selectedDateRef = useRef<string>(selectedDate);
  selectedDateRef.current = selectedDate;

  // Refeições isoladas por usuário (inicia vazio para novos usuários ou carrega do storage da conta)
  const [meals, setMeals] = useState<MealMap>(() => {
    try {
      const parsedUser = getInitialUserFromStorage();
      if (parsedUser) {
        const today = getLocalDateString();
        const savedByDate = localStorage.getItem(`macrometrics_meals_${parsedUser.id}_${today}`);
        if (savedByDate) return normalizeMeals(JSON.parse(savedByDate));
        const saved = localStorage.getItem(`macrometrics_meals_${parsedUser.id}`);
        return saved ? normalizeMeals(JSON.parse(saved)) : EMPTY_MEALS;
      }
      return EMPTY_MEALS;
    } catch {
      return EMPTY_MEALS;
    }
  });

  // Banco de Alimentos do usuário (Cache offline-first + pré-populado)
  const [availableFoods, setAvailableFoods] = useState<FoodItem[]>(() => {
    try {
      const parsedUser = getInitialUserFromStorage();
      const userId = parsedUser ? parsedUser.id : 'default';
      const savedFoods = localStorage.getItem(`macrometrics_custom_foods_${userId}`);
      if (savedFoods) {
        const parsed = JSON.parse(savedFoods) as FoodItem[];
        const map = new Map<string, FoodItem>();
        for (const f of PREPOPULATED_FOODS) map.set(f.id, f);
        for (const f of parsed) {
          // Preserva itens customizados do usuário e novos itens consultados
          if (f.isCustom || !map.has(f.id)) {
            map.set(f.id, f);
          }
        }
        return Array.from(map.values());
      }
      return PREPOPULATED_FOODS;
    } catch {
      return PREPOPULATED_FOODS;
    }
  });

  // Receitas compostas do usuário (Módulo 3)
  const [recipes, setRecipes] = useState<RecipeInput[]>(() => {
    try {
      const parsedUser = getInitialUserFromStorage();
      if (!parsedUser) return [];
      const savedRecipes = localStorage.getItem(`macrometrics_recipes_${parsedUser.id}`);
      return savedRecipes ? (JSON.parse(savedRecipes) as RecipeInput[]) : [];
    } catch {
      return [];
    }
  });

  // Modais
  const [isMacroModalOpen, setIsMacroModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const isAdmin = Boolean(user?.isAdmin);

  // Evento Social Alocado (Buffer Reverso)
  const [activeEvent, setActiveEvent] = useState<EventBufferInput | null>(null);

  // Histórico de datas preenchidas e resumo semanal vindo do Firestore
  const [recordedDates, setRecordedDates] = useState<string[]>([]);
  const [weeklyHistoryMap, setWeeklyHistoryMap] = useState<Record<string, { calories: number; proteinGrams: number }>>({});
  const [isLoadingMeals, setIsLoadingMeals] = useState<boolean>(false);

  // Auto-seleção do conteúdo em inputs e textareas no primeiro foco/clique (substituição rápida)
  useEffect(() => {
    let justFocusedElement: HTMLElement | null = null;

    const handleFocus = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (target.dataset.noAutoSelect) return;
        const type = (target as HTMLInputElement).type || '';
        if (['text', 'number', 'email', 'search', 'tel', 'url', 'password', ''].includes(type)) {
          justFocusedElement = target;
          try {
            target.select();
          } catch {
            // Ignora erro em tipos não suportados
          }
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (justFocusedElement && e.target === justFocusedElement) {
        justFocusedElement = null;
        e.preventDefault();
      }
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Função para persistir refeições de uma data específica sem poluir outras datas
  const persistMeals = (mealsToSave: MealMap, date: string) => {
    if (!user || activeUserRef.current !== user.id) return;
    try {
      localStorage.setItem(`macrometrics_meals_${user.id}_${date}`, JSON.stringify(mealsToSave));
      localStorage.setItem(`macrometrics_meals_${user.id}`, JSON.stringify(mealsToSave));

      fetch('/api/v1/diary', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          ...(user.sessionToken ? { authorization: `Bearer ${user.sessionToken}` } : {}),
        },
        body: JSON.stringify({ meals: mealsToSave }),
      }).catch(() => {
        // Ignora erro em modo offline-first
      });
    } catch {
      // Ignora erro de storage
    }

    fetch(`/api/v1/diaries/${date}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
        ...(user.sessionToken ? { authorization: `Bearer ${user.sessionToken}` } : {}),
      },
      body: JSON.stringify({ meals: mealsToSave }),
    }).catch(() => {
      // Modo offline-first resiliente
    });
  };

  // Troca de data segura e atômica: atualiza a data e carrega as refeições do dia sem copiar
  const handleDateChange = (newDate: string) => {
    if (!newDate || newDate === selectedDate) return;
    selectedDateRef.current = newDate;
    setSelectedDate(newDate);

    // Carrega imediatamente do localStorage da data selecionada
    let nextMeals: MealMap = EMPTY_MEALS;
    if (user) {
      try {
        const savedMealsByDate = localStorage.getItem(`macrometrics_meals_${user.id}_${newDate}`);
        if (savedMealsByDate) {
          nextMeals = normalizeMeals(JSON.parse(savedMealsByDate));
        }
      } catch {
        nextMeals = EMPTY_MEALS;
      }
    }
    setMeals(nextMeals);
  };

  // Sincroniza persistência de perfil e alimentos customizados ao trocar usuário
  useEffect(() => {
    if (user) {
      activeUserRef.current = user.id;

      // Auto-upgrade transparente da sessão local/legada para JWT assinado pela API
      if (!user.sessionToken || user.sessionToken.startsWith('offline_session_') || user.sessionToken.startsWith('mock-google-id-token')) {
        fetch('/api/v1/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            googleIdToken: `mock-google-id-token-${user.id}`,
            email: user.email,
            name: user.name,
          }),
        })
          .then(res => (res.ok ? res.json() : null))
          .then(data => {
            if (data && data.sessionToken) {
              const upgradedUser: AuthUser = {
                ...user,
                blindUserId: data.user?.blindUserId || data.blindIndex || user.blindUserId,
                sessionToken: data.sessionToken,
              };
              setUser(upgradedUser);
              try {
                localStorage.setItem('macrometrics_auth_user', JSON.stringify(upgradedUser));
              } catch {
                // Ignora erro de storage
              }
            }
          })
          .catch(() => {
            // Mantém sessão local offline
          });
      }

      try {
        const savedProfile = localStorage.getItem(`macrometrics_profile_${user.id}`);
        setMacroSettings(savedProfile ? JSON.parse(savedProfile) : DEFAULT_SETTINGS);

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

        // Sincroniza Metas Biométricas da nuvem (Firestore)
        fetch('/api/v1/users/me/goals', {
          headers: {
            'x-user-id': user.id,
            ...(user.sessionToken ? { authorization: `Bearer ${user.sessionToken}` } : {}),
          },
        })
          .then(res => (res.ok ? res.json() : null))
          .then(data => {
            if (data?.goals && activeUserRef.current === user.id) {
              const cg = data.goals;
              setMacroSettings(prev => {
                const next: UserMacroSettings = {
                  ...prev,
                  ageYears: cg.ageYears ?? prev.ageYears,
                  gender: cg.gender ?? prev.gender,
                  heightCm: cg.heightCm ?? prev.heightCm,
                  weightKg: cg.weightKg ?? prev.weightKg,
                  activityLevel: cg.activityLevel ?? prev.activityLevel,
                  bmrSource: cg.bmrSource ?? prev.bmrSource,
                  manualBmr: cg.manualBmr ?? prev.manualBmr,
                  goal: cg.goal ?? prev.goal,
                  dailyDeficitKcal: cg.dailyDeficitKcal ?? prev.dailyDeficitKcal,
                  calories: cg.calories ?? prev.calories,
                  proteinGrams: cg.proteinGrams ?? prev.proteinGrams,
                  carbGrams: cg.carbGrams ?? prev.carbGrams,
                  fatGrams: cg.fatGrams ?? prev.fatGrams,
                  fiberGrams: cg.fiberGrams ?? prev.fiberGrams,
                };
                try {
                  localStorage.setItem(`macrometrics_profile_${user.id}`, JSON.stringify(next));
                } catch {
                  // Ignora erro de storage
                }
                return next;
              });
            }
          })
          .catch(() => {});

        // Sincroniza Alimentos customizados e de cache da nuvem (Firestore)
        fetch('/api/v1/foods', {
          headers: {
            'x-user-id': user.id,
            ...(user.sessionToken ? { authorization: `Bearer ${user.sessionToken}` } : {}),
          },
        })
          .then(res => (res.ok ? res.json() : null))
          .then(data => {
            const list = Array.isArray(data) ? data : data?.foods;
            if (Array.isArray(list) && list.length > 0 && activeUserRef.current === user.id) {
              setAvailableFoods(prev => {
                const map = new Map<string, FoodItem>();
                for (const f of PREPOPULATED_FOODS) map.set(f.id, f);
                for (const f of prev) map.set(f.id, f);
                for (const f of list) map.set(f.id, f);
                const merged = Array.from(map.values());
                try {
                  const customOnly = merged.filter(f => f.isCustom);
                  localStorage.setItem(`macrometrics_custom_foods_${user.id}`, JSON.stringify(customOnly));
                } catch {
                  // Ignora erro de storage
                }
                return merged;
              });
            }
          })
          .catch(() => {});

        // Sincroniza receitas do usuário da nuvem (Firestore)
        const savedRecipes = localStorage.getItem(`macrometrics_recipes_${user.id}`);
        if (savedRecipes) {
          setRecipes(JSON.parse(savedRecipes));
        } else {
          setRecipes([]);
        }

        fetch('/api/v1/recipes', {
          headers: {
            'x-user-id': user.id,
            ...(user.sessionToken ? { authorization: `Bearer ${user.sessionToken}` } : {}),
          },
        })
          .then(res => (res.ok ? res.json() : null))
          .then(data => {
            const list = Array.isArray(data) ? data : data?.recipes;
            if (Array.isArray(list) && activeUserRef.current === user.id) {
              setRecipes(list);
              try {
                localStorage.setItem(`macrometrics_recipes_${user.id}`, JSON.stringify(list));
              } catch {
                // Ignora erro de storage
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
  }, [user]);

  // Consulta diário no Firestore para a data selecionada (Offline-first & Nuvem)
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    // Carrega do localStorage para a data ativa (garante que dias vazios fiquem vazios)
    try {
      const savedMealsByDate = localStorage.getItem(`macrometrics_meals_${user.id}_${selectedDate}`);
      if (savedMealsByDate) {
        setMeals(normalizeMeals(JSON.parse(savedMealsByDate)));
      } else {
        setMeals(EMPTY_MEALS);
      }
    } catch {
      setMeals(EMPTY_MEALS);
    }

    setIsLoadingMeals(true);
    fetch(`/api/v1/diaries/${selectedDate}`, {
      headers: {
        'x-user-id': user.id,
        ...(user.sessionToken ? { authorization: `Bearer ${user.sessionToken}` } : {}),
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
            const normalized = normalizeMeals(data.meals);
            setMeals(normalized);
            try {
              localStorage.setItem(`macrometrics_meals_${user.id}_${selectedDate}`, JSON.stringify(normalized));
            } catch {
              // Ignora erro de storage
            }
          }
        }
      })
      .catch(() => {
        // Offline-first: mantém dados locais
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingMeals(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user, selectedDate]);

  // Busca datas com refeições salvas para descoberta e atalhos rápidos
  useEffect(() => {
    if (!user) {
      setRecordedDates([]);
      return;
    }

    let isCancelled = false;
    fetch('/api/v1/diaries/dates', {
      headers: {
        'x-user-id': user.id,
        ...(user.sessionToken ? { authorization: `Bearer ${user.sessionToken}` } : {}),
      },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!isCancelled && data && Array.isArray(data.dates)) {
          setRecordedDates(data.dates);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [user, selectedDate]);

  // Hidrata a janela móvel de 7 dias do Termômetro Semanal diretamente do Firestore
  useEffect(() => {
    if (!user) {
      setWeeklyHistoryMap({});
      return;
    }

    let isCancelled = false;
    fetch(`/api/v1/diaries/history?days=7&endDate=${selectedDate}`, {
      headers: {
        'x-user-id': user.id,
        ...(user.sessionToken ? { authorization: `Bearer ${user.sessionToken}` } : {}),
      },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!isCancelled && data && Array.isArray(data.history)) {
          const map: Record<string, { calories: number; proteinGrams: number }> = {};
          for (const item of data.history) {
            map[item.date] = {
              calories: item.calories || 0,
              proteinGrams: item.proteinGrams || 0,
            };
          }
          setWeeklyHistoryMap(map);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [user, selectedDate]);

  // Monitora a virada do dia (meia-noite 00:00:00) no fuso local do usuário
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleMidnightCheck = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        50
      );
      const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());

      timeoutId = setTimeout(() => {
        const newToday = getLocalDateString();
        const currentActive = selectedDateRef.current;
        const previousToday = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
        if (currentActive === previousToday) {
          handleDateChange(newToday);
        }
        scheduleMidnightCheck();
      }, msUntilMidnight);
    };

    scheduleMidnightCheck();

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

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
    const foodWithUser: FoodItem = {
      ...newFood,
      userId: newFood.userId || user?.id,
      isValidated: newFood.isValidated ?? false,
    };

    setAvailableFoods(prev => {
      if (prev.some(f => f.id === foodWithUser.id)) return prev;
      return [foodWithUser, ...prev];
    });

    if (foodWithUser.isCustom) {
      try {
        await fetch('/api/v1/foods/custom', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.id ? { 'x-user-id': user.id } : {}),
          },
          body: JSON.stringify({
            name: foodWithUser.name,
            servingSizeGrams: foodWithUser.servingSizeGrams,
            caloriesPer100g: foodWithUser.caloriesPer100g,
            proteinPer100g: foodWithUser.proteinPer100g,
            carbsPer100g: foodWithUser.carbsPer100g,
            fatPer100g: foodWithUser.fatPer100g,
            fiberPer100g: foodWithUser.fiberPer100g,
            barcode: (foodWithUser as { barcode?: string }).barcode,
            userId: user?.id,
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
      const today = selectedDateRef.current;
      const savedMealsByDate = localStorage.getItem(`macrometrics_meals_${loggedUser.id}_${today}`);
      const savedMeals = localStorage.getItem(`macrometrics_meals_${loggedUser.id}`);
      if (savedMealsByDate) {
        setMeals(normalizeMeals(JSON.parse(savedMealsByDate)));
      } else if (savedMeals) {
        setMeals(normalizeMeals(JSON.parse(savedMeals)));
      } else {
        setMeals(EMPTY_MEALS);
      }
    } catch {
      setMeals(EMPTY_MEALS);
    }
  };

  const handleLogout = () => {
    activeUserRef.current = null;
    setUser(null);
    setMeals(EMPTY_MEALS);
    setRecipes([]);
    try {
      localStorage.removeItem('macrometrics_auth_user');
    } catch {
      // Ignora erro de storage
    }
  };

  const handleSaveRecipe = async (newOrUpdatedRecipe: RecipeInput) => {
    const isNew = !newOrUpdatedRecipe.id;
    const recipeId = newOrUpdatedRecipe.id || `recipe_${Date.now()}`;
    const recipeWithId: RecipeInput = { ...newOrUpdatedRecipe, id: recipeId };

    setRecipes(prev => {
      const exists = prev.some(r => r.id === recipeId);
      const next = exists
        ? prev.map(r => (r.id === recipeId ? recipeWithId : r))
        : [recipeWithId, ...prev];

      if (user) {
        try {
          localStorage.setItem(`macrometrics_recipes_${user.id}`, JSON.stringify(next));
        } catch {
          // Ignora erro de storage
        }
      }
      return next;
    });

    if (user) {
      try {
        const url = isNew ? '/api/v1/recipes' : `/api/v1/recipes/${recipeId}`;
        const method = isNew ? 'POST' : 'PUT';
        await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id,
            ...(user.sessionToken ? { authorization: `Bearer ${user.sessionToken}` } : {}),
          },
          body: JSON.stringify(recipeWithId),
        });
      } catch {
        // Modo offline-first resiliente
      }
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    setRecipes(prev => {
      const next = prev.filter(r => r.id !== recipeId);
      if (user) {
        try {
          localStorage.setItem(`macrometrics_recipes_${user.id}`, JSON.stringify(next));
        } catch {
          // Ignora erro de storage
        }
      }
      return next;
    });

    if (user) {
      try {
        await fetch(`/api/v1/recipes/${recipeId}`, {
          method: 'DELETE',
          headers: {
            'x-user-id': user.id,
            ...(user.sessionToken ? { authorization: `Bearer ${user.sessionToken}` } : {}),
          },
        });
      } catch {
        // Modo offline-first resiliente
      }
    }
  };

  const combinedAvailableFoods = useMemo(() => {
    const recipeFoods = recipes.map(recipe => {
      const calc = calculateRecipeMacros(recipe, availableFoods);
      return recipeToFoodItem(recipe, calc, user?.id);
    });

    const map = new Map<string, FoodItem>();
    for (const f of availableFoods) {
      if (!f.isRecipe) map.set(f.id, f);
    }
    for (const rf of recipeFoods) {
      map.set(rf.id, rf);
    }
    return Array.from(map.values());
  }, [recipes, availableFoods, user?.id]);

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

  // Janela móvel dos últimos 7 dias (terminando em selectedDate) no fuso local
  const rawRolling7Days = (() => {
    const daysList = getRollingDays(selectedDate, 7);
    const list: Array<{ date: string; calories: number; proteinGrams?: number; isFasting?: boolean }> = [];

    for (const dateStr of daysList) {
      if (dateStr === selectedDate) {
        list.push({
          date: dateStr,
          calories: currentTotals.calories,
          proteinGrams: currentTotals.proteinGrams,
        });
      } else if (weeklyHistoryMap[dateStr]) {
        list.push({
          date: dateStr,
          calories: weeklyHistoryMap[dateStr].calories,
          proteinGrams: weeklyHistoryMap[dateStr].proteinGrams,
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

  // Preenche dias não registrados com a média aritmética dos dias registrados
  const { days: rolling7Days } = imputeMissingWeeklyDays(rawRolling7Days);

  const weeklySlipKcal =
    rolling7Days.reduce((acc, d) => acc + d.calories, 0) -
    rolling7Days.length * targetMacros.calories;
  const weeklyBankDisplay = -weeklySlipKcal;

  // Handlers do MealBuilder
  const handleAddFood = (window: MealWindow, item: LoggedFood) => {
    setMeals(prev => {
      const current = prev[window] || [];
      const updated: MealMap = {
        ...prev,
        [window]: [...current, item],
      };
      persistMeals(updated, selectedDateRef.current);
      return updated;
    });
  };

  const handleRemoveFood = (window: MealWindow, itemId: string) => {
    setMeals(prev => {
      const current = prev[window] || [];
      const updated: MealMap = {
        ...prev,
        [window]: current.filter(item => item.id !== itemId),
      };
      persistMeals(updated, selectedDateRef.current);
      return updated;
    });
  };

  const handleUpdateFood = (window: MealWindow, updatedItem: LoggedFood) => {
    setMeals(prev => {
      const current = prev[window] || [];
      const updated: MealMap = {
        ...prev,
        [window]: current.map(item => (item.id === updatedItem.id ? updatedItem : item)),
      };
      persistMeals(updated, selectedDateRef.current);
      return updated;
    });
  };

  const handleCopyMeal = (
    fromWindow: MealWindow,
    toWindow: MealWindow,
    copiedItems?: LoggedFood[]
  ) => {
    setMeals(prev => {
      const toList = prev[toWindow] || [];
      const itemsToDuplicate =
        copiedItems && copiedItems.length > 0
          ? copiedItems
          : prev[fromWindow] || [];

      const cloned = itemsToDuplicate.map((item, index) => ({
        ...item,
        id: `${item.foodId}_copy_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      }));

      const updated: MealMap = {
        ...prev,
        [toWindow]: [...toList, ...cloned],
      };
      persistMeals(updated, selectedDateRef.current);
      return updated;
    });
  };

  const handleLoadMealsForDate = async (dateStr: string): Promise<MealMap> => {
    if (dateStr === selectedDate) {
      return meals;
    }

    if (user) {
      try {
        const savedStr = localStorage.getItem(`macrometrics_meals_${user.id}_${dateStr}`);
        if (savedStr) {
          return JSON.parse(savedStr) as MealMap;
        }
      } catch {
        // segue para consulta remota
      }

      try {
        const res = await fetch(`/api/v1/diaries/${dateStr}`, {
          headers: {
            'x-user-id': user.id,
            ...(user.sessionToken ? { authorization: `Bearer ${user.sessionToken}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.meals) {
            try {
              localStorage.setItem(
                `macrometrics_meals_${user.id}_${dateStr}`,
                JSON.stringify(data.meals)
              );
            } catch {
              // ignora erro de storage
            }
            return data.meals as MealMap;
          }
        }
      } catch {
        // modo offline-first
      }
    }

    return EMPTY_MEALS;
  };

  const handleAutoCompleteProtein = (_source: 'sassami' | 'whey_growth') => {
    // Inserção realizada exclusivamente via onConfirm do ProteinAutocompleteModal através de onAddFood
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
              <span className="font-bold tracking-tight text-sm sm:text-base text-m3-on-surface whitespace-nowrap">
                MacroMetrics Pro
              </span>
            </div>
          </div>

          {/* Ações / Botões do Cabeçalho (Posicionados à direita na linha superior no mobile, e à direita da data no desktop) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 order-2 md:order-3">
            {/* Indicador da Conta Ativa com Foto / Avatar */}
            {user && (
              <div
                className="flex items-center gap-2 bg-m3-surface-container-high border border-m3-outline-variant/60 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-mono text-m3-on-surface shrink-0"
                title={`Conectado como: ${user.name || user.email} (${user.email})`}
              >
                {user.avatarUrl || (user as any).picture ? (
                  <img
                    src={user.avatarUrl || (user as any).picture}
                    alt={`Avatar de ${user.name || user.email}`}
                    className="w-6 h-6 rounded-full object-cover border border-m3-outline-variant/80 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    data-testid="user-avatar-fallback"
                    className="w-6 h-6 rounded-full bg-m3-primary/20 text-m3-primary font-bold flex items-center justify-center text-xs border border-m3-primary/40 shrink-0"
                  >
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              </div>
            )}

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

          {/* Seletor de Data do Diário com Navegação Rápida (Dia Anterior, Hoje, Próximo Dia) e Atalhos de Histórico */}
          <div className="w-full md:w-auto order-3 md:order-2 flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 bg-m3-surface-container-high border border-m3-outline-variant/60 px-2 py-1 rounded-xl text-xs text-m3-on-surface">
              <button
                type="button"
                aria-label="Dia Anterior"
                onClick={() => handleDateChange(stepDate(selectedDate, -1))}
                className="p-1 rounded-lg hover:bg-m3-surface-variant text-m3-outline hover:text-m3-on-surface transition-colors"
                title="Dia Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                aria-label="Hoje"
                onClick={() => handleDateChange(getLocalDateString(new Date()))}
                className={`text-[11px] font-mono px-2 py-0.5 rounded-md transition-colors ${
                  selectedDate === getLocalDateString(new Date())
                    ? 'bg-m3-primary text-m3-on-primary font-bold'
                    : 'text-m3-outline hover:text-m3-on-surface hover:bg-m3-surface-variant'
                }`}
                title="Voltar para Hoje"
              >
                Hoje
              </button>

              <button
                type="button"
                aria-label="Próximo Dia"
                onClick={() => handleDateChange(stepDate(selectedDate, 1))}
                className="p-1 rounded-lg hover:bg-m3-surface-variant text-m3-outline hover:text-m3-on-surface transition-colors"
                title="Próximo Dia"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <div className="h-3.5 w-px bg-m3-outline-variant/40 mx-0.5" />

              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-m3-primary shrink-0" />
                <label htmlFor="diary-date-picker" className="sr-only">
                  Data do Diário
                </label>
                <input
                  id="diary-date-picker"
                  type="date"
                  value={selectedDate}
                  onChange={e => {
                    if (e.target.value) {
                      handleDateChange(e.target.value);
                    }
                  }}
                  className="bg-transparent text-m3-on-surface text-xs focus:outline-none cursor-pointer font-mono"
                />
              </div>

              {isLoadingMeals && (
                <Loader2 className="w-3.5 h-3.5 text-m3-primary animate-spin shrink-0 ml-0.5" />
              )}
            </div>

            {/* Atalhos Rápidos para Datas Anteriores com Refeições Gravadas */}
            {recordedDates
              .filter(d => d !== selectedDate)
              .slice(0, 3)
              .map(dateStr => {
                const [, m, d] = dateStr.split('-');
                return (
                  <button
                    key={dateStr}
                    type="button"
                    aria-label={`${d}/${m}`}
                    onClick={() => handleDateChange(dateStr)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono bg-m3-surface-container border border-m3-outline-variant/50 text-m3-outline hover:text-m3-primary hover:border-m3-primary/60 px-2 py-1 rounded-lg transition-colors"
                    title={`Ir para diário de ${dateStr}`}
                  >
                    <Calendar className="w-3 h-3 text-m3-primary/70" />
                    <span>{d}/{m}</span>
                  </button>
                );
              })}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do Dashboard */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
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
          availableFoods={combinedAvailableFoods}
          recipes={recipes}
          onAddFood={handleAddFood}
          onRemoveFood={handleRemoveFood}
          onUpdateFood={handleUpdateFood}
          onCopyMeal={handleCopyMeal}
          onAutoCompleteProtein={handleAutoCompleteProtein}
          onRegisterFood={handleRegisterFood}
          onSaveRecipe={handleSaveRecipe}
          onDeleteRecipe={handleDeleteRecipe}
          missingProtein={missingProtein}
          remainingCalories={remainingCalories}
          currentUser={user}
          selectedDate={selectedDate}
          onLoadMealsForDate={handleLoadMealsForDate}
          availableHistoryDates={recordedDates}
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
            });
          } catch {
            // offline-first resiliente
          }
        }}
      />
    </div>
  );
}
