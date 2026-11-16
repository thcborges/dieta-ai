import { Firestore } from '@google-cloud/firestore';
import type {
  AIFeatureType,
  TokenUsageRecord,
  TokenUsageMetrics,
  TokenUsageDailyPoint,
  AdminTokenUsageResponse,
} from '@dieta-ai/core';

// Pricing for Gemini 2.5 Flash (USD per 1M tokens)
const GEMINI_FLASH_INPUT_COST_PER_MILLION = 0.075;
const GEMINI_FLASH_OUTPUT_COST_PER_MILLION = 0.30;

export interface RecordTokenUsageInput {
  blindUserId?: string;
  feature: AIFeatureType;
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  date?: string;
  timestamp?: string;
}

export interface GetUsageStatsParams {
  startDate?: string;
  endDate?: string;
  userHash?: string;
}

export class TokenUsageService {
  private firestore: Firestore | null = null;
  private inMemoryFallback: Map<string, TokenUsageRecord> = new Map();

  constructor(options?: { firestore?: Firestore }) {
    if (options?.firestore) {
      this.firestore = options.firestore;
    }
  }

  public setDb(db: Firestore): void {
    this.firestore = db;
  }

  public getFirestore(): Firestore | null {
    if (!this.firestore) {
      const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
      const projectId =
        process.env.FIRESTORE_PROJECT_ID || process.env.GCP_PROJECT_ID || 'thcborges-dieta-ai-dev';

      try {
        if (emulatorHost) {
          this.firestore = new Firestore({ projectId });
        } else if (process.env.NODE_ENV === 'test' && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          return null;
        } else {
          this.firestore = new Firestore({ projectId });
        }
      } catch {
        this.firestore = null;
      }
    }
    return this.firestore;
  }

  public getAnonymousUserHash(blindUserId: string): string {
    if (!blindUserId || blindUserId === 'purged_user') {
      return 'User_anonymized';
    }
    const clean = blindUserId.replace(/^(blind_usr_|buser_|blind_hash_|blind_|usr_)/, '');
    const prefix = clean.substring(0, 6);
    return `User_${prefix}`;
  }

  public calculateCostUsd(promptTokens: number, candidatesTokens: number): number {
    const inputCost = (promptTokens * GEMINI_FLASH_INPUT_COST_PER_MILLION) / 1_000_000;
    const outputCost = (candidatesTokens * GEMINI_FLASH_OUTPUT_COST_PER_MILLION) / 1_000_000;
    return Math.round((inputCost + outputCost) * 100_000) / 100_000;
  }

  public async recordUsage(input: RecordTokenUsageInput): Promise<TokenUsageRecord> {
    const id = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date();
    const timestamp = input.timestamp || now.toISOString();
    const date = input.date || timestamp.split('T')[0];
    const blindUserId = input.blindUserId || 'anonymous_user';

    const record: TokenUsageRecord = {
      id,
      blindUserId,
      feature: input.feature,
      model: input.model,
      promptTokens: Math.max(0, Math.round(input.promptTokens || 0)),
      candidatesTokens: Math.max(0, Math.round(input.candidatesTokens || 0)),
      totalTokens: Math.max(
        0,
        Math.round(input.totalTokens || input.promptTokens + input.candidatesTokens || 0)
      ),
      date,
      timestamp,
    };

    const db = this.getFirestore();
    if (db) {
      try {
        await db.collection('ai_token_usage').doc(id).set(record);
      } catch {
        this.inMemoryFallback.set(id, record);
      }
    } else {
      this.inMemoryFallback.set(id, record);
    }

    return record;
  }

  public async getUsageStats(params: GetUsageStatsParams = {}): Promise<AdminTokenUsageResponse> {
    const db = this.getFirestore();
    let records: TokenUsageRecord[] = [];

    if (db) {
      try {
        const snapshot = await db.collection('ai_token_usage').get();
        records = snapshot.docs.map(doc => doc.data() as TokenUsageRecord);
      } catch {
        records = Array.from(this.inMemoryFallback.values());
      }
    } else {
      records = Array.from(this.inMemoryFallback.values());
    }

    // Ordenação cronológica por timestamp
    records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Coleta todos os hashes de usuários disponíveis antes do filtro
    const allUserHashes = Array.from(
      new Set(records.map(r => this.getAnonymousUserHash(r.blindUserId)))
    ).sort();

    // Filtro por data
    if (params.startDate) {
      records = records.filter(r => r.date >= params.startDate!);
    }
    if (params.endDate) {
      records = records.filter(r => r.date <= params.endDate!);
    }

    // Filtro por usuário anônimo
    if (params.userHash && params.userHash !== 'all') {
      records = records.filter(r => this.getAnonymousUserHash(r.blindUserId) === params.userHash);
    }

    // Agrupamento diário
    const dailyMap = new Map<
      string,
      { totalTokens: number; photoTokens: number; foodEstimateTokens: number; promptTokens: number; candidatesTokens: number; count: number }
    >();

    let totalTokens = 0;
    let promptTokens = 0;
    let candidatesTokens = 0;
    let totalPhotoTokens = 0;
    let totalPhotoRequests = 0;
    let totalFoodEstimateTokens = 0;
    let totalFoodEstimateRequests = 0;

    const distinctUsersInPeriod = new Set<string>();

    for (const r of records) {
      totalTokens += r.totalTokens;
      promptTokens += r.promptTokens;
      candidatesTokens += r.candidatesTokens;
      distinctUsersInPeriod.add(r.blindUserId);

      if (r.feature === 'photo_meal') {
        totalPhotoTokens += r.totalTokens;
        totalPhotoRequests += 1;
      } else if (r.feature === 'food_estimate') {
        totalFoodEstimateTokens += r.totalTokens;
        totalFoodEstimateRequests += 1;
      }

      const currentDay = dailyMap.get(r.date) || {
        totalTokens: 0,
        photoTokens: 0,
        foodEstimateTokens: 0,
        promptTokens: 0,
        candidatesTokens: 0,
        count: 0,
      };

      currentDay.totalTokens += r.totalTokens;
      currentDay.promptTokens += r.promptTokens;
      currentDay.candidatesTokens += r.candidatesTokens;
      currentDay.count += 1;

      if (r.feature === 'photo_meal') {
        currentDay.photoTokens += r.totalTokens;
      } else if (r.feature === 'food_estimate') {
        currentDay.foodEstimateTokens += r.totalTokens;
      }

      dailyMap.set(r.date, currentDay);
    }

    const dailySeries: TokenUsageDailyPoint[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        totalTokens: data.totalTokens,
        photoTokens: data.photoTokens,
        foodEstimateTokens: data.foodEstimateTokens,
        costUsd: this.calculateCostUsd(data.promptTokens, data.candidatesTokens),
        requestsCount: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalRequests = records.length;
    const avgTokensPhotoMeal =
      totalPhotoRequests > 0 ? Math.round(totalPhotoTokens / totalPhotoRequests) : 0;
    const avgTokensFoodEstimate =
      totalFoodEstimateRequests > 0 ? Math.round(totalFoodEstimateTokens / totalFoodEstimateRequests) : 0;

    // Cálculo da projeção mensal individual
    const distinctDays = Math.max(1, dailySeries.length);
    const activeUsers = Math.max(1, distinctUsersInPeriod.size);
    // Consumo médio diário por usuário multiplicado por 30 dias
    const projectedMonthlyTokensPerUser = Math.round((totalTokens / distinctDays / activeUsers) * 30);

    const estimatedCostUsd = this.calculateCostUsd(promptTokens, candidatesTokens);

    const summary: TokenUsageMetrics = {
      totalTokens,
      promptTokens,
      candidatesTokens,
      estimatedCostUsd,
      avgTokensPhotoMeal,
      avgTokensFoodEstimate,
      projectedMonthlyTokensPerUser,
      totalRequests,
      totalPhotoRequests,
      totalFoodEstimateRequests,
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const defaultStartDate = records.length > 0 ? records[0].date : todayStr;
    const defaultEndDate = records.length > 0 ? records[records.length - 1].date : todayStr;

    return {
      summary,
      dailySeries,
      userList: allUserHashes,
      startDate: params.startDate || defaultStartDate,
      endDate: params.endDate || defaultEndDate,
      selectedUserHash: params.userHash,
    };
  }

  public async anonymizeUserUsage(blindUserId: string): Promise<number> {
    const db = this.getFirestore();
    let anonymizedCount = 0;

    if (db) {
      try {
        const snapshot = await db
          .collection('ai_token_usage')
          .where('blindUserId', '==', blindUserId)
          .get();

        for (const doc of snapshot.docs) {
          await doc.ref.update({
            blindUserId: 'purged_user',
            anonymizedAt: new Date().toISOString(),
          });
          anonymizedCount += 1;
        }
      } catch {
        // Fallback in-memory
        for (const [id, rec] of this.inMemoryFallback.entries()) {
          if (rec.blindUserId === blindUserId) {
            this.inMemoryFallback.set(id, { ...rec, blindUserId: 'purged_user' });
            anonymizedCount += 1;
          }
        }
      }
    } else {
      for (const [id, rec] of this.inMemoryFallback.entries()) {
        if (rec.blindUserId === blindUserId) {
          this.inMemoryFallback.set(id, { ...rec, blindUserId: 'purged_user' });
          anonymizedCount += 1;
        }
      }
    }

    return anonymizedCount;
  }
}

export const tokenUsageService = new TokenUsageService();
