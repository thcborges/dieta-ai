import { Firestore } from '@google-cloud/firestore';
import { canonicalizeUserId } from '@dieta-ai/core';

export interface UserDoc {
  id: string; // ID canônico (ex.: usr_thcborges_gmail_com)
  user_id?: string; // Alias explícito para interoperabilidade
  email: string;
  name: string;
  picture?: string;
  googleSub?: string;
  blindUserId: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface UpsertUserInput {
  id?: string;
  email: string;
  name?: string;
  picture?: string;
  googleSub?: string;
  blindUserId: string;
  isAdmin?: boolean;
}

async function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  promise.catch(() => {});
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Firestore operation timed out (${ms}ms)`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export class UserRepositoryService {
  private firestore: Firestore | null = null;
  private inMemoryFallback: Map<string, UserDoc> = new Map();

  constructor(options?: { firestore?: Firestore }) {
    if (options?.firestore) {
      this.firestore = options.firestore;
    }
  }

  public getFirestore(): Firestore | null {
    if (!this.firestore) {
      const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
      const projectId =
        process.env.FIRESTORE_PROJECT_ID || process.env.GCP_PROJECT_ID || 'thcborges-dieta-ai-dev';

      const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
      const hasExplicitCreds = Boolean(
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.K_SERVICE ||
        process.env.GAE_ENV
      );

      try {
        if (emulatorHost) {
          this.firestore = new Firestore({ projectId });
        } else if (isTestEnv && !hasExplicitCreds) {
          return null;
        } else if (!hasExplicitCreds && !process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCP_PROJECT_ID) {
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

  public async upsertUser(input: UpsertUserInput): Promise<UserDoc> {
    const rawId = input.id || input.email;
    const canonicalId = canonicalizeUserId(rawId);
    const normalizedEmail = input.email.toLowerCase().trim();
    const existing = await this.getUserById(canonicalId);

    const now = new Date().toISOString();
    const createdAt = existing?.createdAt || now;

    const userDoc: UserDoc = {
      id: canonicalId,
      user_id: canonicalId,
      email: normalizedEmail,
      name: input.name || existing?.name || normalizedEmail.split('@')[0],
      picture: input.picture || existing?.picture,
      googleSub: input.googleSub || existing?.googleSub,
      blindUserId: input.blindUserId,
      isAdmin: input.isAdmin !== undefined ? input.isAdmin : (existing?.isAdmin ?? false),
      createdAt,
      updatedAt: now,
      lastLoginAt: now,
    };

    const db = this.getFirestore();
    if (db) {
      try {
        const docRef = db.collection('users').doc(canonicalId);
        await withTimeout(docRef.set(userDoc, { merge: true }));
      } catch {
        // Fallback para memória se o Firestore estiver indisponível
      }
    }

    this.inMemoryFallback.set(canonicalId, userDoc);
    return userDoc;
  }

  public async getUserById(userId: string): Promise<UserDoc | null> {
    const canonicalId = canonicalizeUserId(userId);
    const db = this.getFirestore();

    if (db) {
      try {
        const docRef = db.collection('users').doc(canonicalId);
        const snapshot = await withTimeout(docRef.get());
        if (snapshot.exists) {
          const data = snapshot.data() as UserDoc;
          this.inMemoryFallback.set(canonicalId, data);
          return data;
        }
      } catch {
        // Fallback em memória
      }
    }

    return this.inMemoryFallback.get(canonicalId) || null;
  }

  public async getUserByEmail(email: string): Promise<UserDoc | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const canonicalId = canonicalizeUserId(normalizedEmail);
    const byId = await this.getUserById(canonicalId);
    if (byId) return byId;

    const db = this.getFirestore();
    if (db) {
      try {
        const snapshot = await withTimeout(
          db.collection('users').where('email', '==', normalizedEmail).limit(1).get()
        );
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data() as UserDoc;
          this.inMemoryFallback.set(data.id, data);
          return data;
        }
      } catch {
        // Fallback em memória
      }
    }

    for (const user of this.inMemoryFallback.values()) {
      if (user.email === normalizedEmail) {
        return user;
      }
    }

    return null;
  }

  public async listUsers(): Promise<UserDoc[]> {
    const db = this.getFirestore();
    if (db) {
      try {
        const snapshot = await withTimeout(db.collection('users').get());
        for (const doc of snapshot.docs) {
          const user = doc.data() as UserDoc;
          this.inMemoryFallback.set(user.id, user);
        }
      } catch {
        // Fallback
      }
    }

    return Array.from(this.inMemoryFallback.values());
  }

  public async deleteUser(userId: string): Promise<boolean> {
    const canonicalId = canonicalizeUserId(userId);
    this.inMemoryFallback.delete(canonicalId);

    const db = this.getFirestore();
    if (db) {
      try {
        const docRef = db.collection('users').doc(canonicalId);
        await withTimeout(docRef.delete());
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }
}

export const userRepository = new UserRepositoryService();
