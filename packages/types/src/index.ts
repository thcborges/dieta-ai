/**
 * Shared Type Definitions & DTOs: MacroMetrics Pro (dieta-ai)
 */

export type Environment = 'development' | 'production' | 'test';

export interface SessionContextEvent {
  type: string;
  timestamp: string;
  path?: string;
  payload?: Record<string, unknown>;
}

export interface TelemetryErrorEvent {
  errorId: string;
  timestamp: string;
  environment: Environment;
  message: string;
  stack?: string;
  userId?: string;
  sessionId?: string;
  recentEvents: SessionContextEvent[];
}

export interface TelegramAlertPayload {
  chatId: string;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
}

export interface HealerJob {
  errorId: string;
  errorMessage: string;
  errorStack?: string;
  recentEvents: SessionContextEvent[];
  environment: Environment;
  branchName: string;
}

export interface HealerJobResult {
  errorId: string;
  branchName: string;
  pullRequestUrl?: string;
  success: boolean;
  message: string;
}

export type DietGoal = 'weight_loss' | 'maintenance' | 'muscle_gain';
export type BmrSource = 'mifflin_st_jeor' | 'manual_bioimpedance';

export interface UserBiometrics {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  isMale: boolean;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
  proteinTargetGPerKg?: number;
  fixedProteinTargetG?: number;
  bmrSource?: BmrSource;
  manualBmr?: number;
  goal?: DietGoal;
}

export interface MacroBreakdown {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  fiberGrams?: number;
}

export interface FoodItemDto {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  fiberPer100g?: number;
  servingUnit: string;
  defaultServingGrams: number;
  isSocialEventFood?: boolean;
}

export type MealWindow = 'breakfast' | 'lunch' | 'afternoon_snack' | 'dinner';

export interface LoggedFoodItemDto {
  foodId: string;
  name: string;
  servingGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  fiberGrams?: number;
}

export interface UserMacroTargetsDto {
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  fiberGrams: number;
}

export interface UserProfileDto {
  id: string;
  email: string;
  name: string;
  picture?: string;
  biometrics?: UserBiometrics;
  customMacros?: UserMacroTargetsDto;
}

export interface LgpdDeletionRequestDto {
  userId: string;
  pseudonymId: string;
  requestedAt: string;
  scheduledPurgeAt: string;
  status: 'PENDING_15_DAYS' | 'COMPLETED' | 'CANCELLED';
}

export type DietGoal = 'weight_loss' | 'weight_gain' | 'muscle_gain' | 'maintenance';

export type WeeklyThermometerStatus =
  | 'optimal'
  | 'warning'
  | 'blown'
  | 'critical_deficit'
  | 'surplus_drift';

export interface RollingDayLog {
  date: string;
  calories: number;
  proteinGrams?: number;
}

export interface WeeklyThermometerInput {
  goal: DietGoal;
  dailyTargetCalories: number;
  tdee: number;
  weightKg: number;
  dailyDeficitKcal?: number;
  dailySurplusKcal?: number;
  tolerancePercent?: number; // default: 3 (%)
  days: RollingDayLog[]; // Up to 7 days
}

export interface WeeklyThermometerAlert {
  code:
    | 'BLOWN_BUDGET'
    | 'WARNING_BUDGET'
    | 'CRITICAL_WEIGHT_LOSS'
    | 'WARNING_LOW_CALORIES'
    | 'MAINTENANCE_DRIFT_HIGH'
    | 'MAINTENANCE_DRIFT_LOW';
  severity: 'INFO' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
}

export interface WeeklyThermometerReport {
  goal: DietGoal;
  daysCount: number;
  totalTargetCalories: number;
  totalActualCalories: number;
  weeklySlipKcal: number;
  thermalRatioPercent: number;
  adherenceScorePercent: number;
  status: WeeklyThermometerStatus;
  projectedWeightDeltaKg: number;
  neutralizedDeficitDays?: number;
  alerts: WeeklyThermometerAlert[];
}

