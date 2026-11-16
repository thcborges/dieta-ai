export type AIFeatureType = 'photo_meal' | 'food_estimate';

export interface TokenUsageRecord {
  id: string;
  blindUserId: string;
  feature: AIFeatureType;
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO 8601
}

export interface TokenUsageDailyPoint {
  date: string;
  totalTokens: number;
  photoTokens: number;
  foodEstimateTokens: number;
  costUsd: number;
  requestsCount: number;
}

export interface TokenUsageMetrics {
  totalTokens: number;
  promptTokens: number;
  candidatesTokens: number;
  estimatedCostUsd: number;
  avgTokensPhotoMeal: number;
  avgTokensFoodEstimate: number;
  projectedMonthlyTokensPerUser: number;
  totalRequests: number;
  totalPhotoRequests: number;
  totalFoodEstimateRequests: number;
}

export interface AdminTokenUsageResponse {
  summary: TokenUsageMetrics;
  dailySeries: TokenUsageDailyPoint[];
  userList: string[]; // List of anonymized user hashes (e.g. 'User_9a4f...')
  startDate: string;
  endDate: string;
  selectedUserHash?: string;
}
