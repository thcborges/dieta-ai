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

export interface UserBiometrics {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  isMale: boolean;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
  proteinTargetGPerKg?: number;
  fixedProteinTargetG?: number;
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

