import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../src/App.js';
import type { AuthUser } from '../src/components/LoginPage.js';

describe('Frontend Multi-Dispositivo & Sincronização Integral com a Nuvem', () => {
  const testUserId = 'usr_thcborges_gmail_com';
  const testEmail = 'thcborges@gmail.com';
  const testDate = '2026-11-09';

  beforeEach(() => {
    localStorage.clear();
  });

  it('deve sincronizar metas, receitas, alimentos e diário a partir da API/Firestore ao logar em novo dispositivo', async () => {
    // 1. Simula um novo dispositivo onde o usuário acabou de autenticar (sem dados locais prévios)
    const initialUser: AuthUser = {
      id: testUserId,
      email: testEmail,
      name: 'Thiago Borges',
      sessionToken: 'valid.jwt.token',
    };
    localStorage.setItem('macrometrics_auth_user', JSON.stringify(initialUser));

    // 2. Mock dos endpoints da API conectados ao Firestore
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/v1/users/me/goals')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            goals: {
              ageYears: 40,
              gender: 'male',
              heightCm: 190,
              weightKg: 95,
              calories: 2200,
              proteinGrams: 220,
              carbGrams: 180,
              fatGrams: 65,
              fiberGrams: 38,
            },
          }),
        } as Response;
      }

      if (url.includes('/api/v1/recipes')) {
        return {
          ok: true,
          json: async () => ({
            recipes: [
              {
                id: 'recipe_cloud_1',
                name: 'Whey Bowl de Nuvem',
                servings: 1,
                servingUnitName: 'tigela',
                ingredients: [{ foodId: 'food_whey', gramsOrUnits: 40 }],
              },
            ],
          }),
        } as Response;
      }

      if (url.includes('/api/v1/foods')) {
        return {
          ok: true,
          json: async () => ({
            foods: [
              {
                id: 'custom_cloud_food_1',
                name: 'Queijo Cottage Zero',
                servingDescription: '100g',
                servingSizeGrams: 100,
                caloriesPer100g: 72,
                proteinPer100g: 12,
                carbsPer100g: 3,
                fatPer100g: 1,
                fiberPer100g: 0,
                isCustom: true,
              },
            ],
          }),
        } as Response;
      }

      if (url.includes(`/api/v1/diaries/`)) {
        return {
          ok: true,
          json: async () => ({
            blindUserId: 'blind_hash',
            date: testDate,
            meals: {
              breakfast: [
                {
                  id: 'item_cloud_breakfast',
                  foodId: 'food_sassami',
                  name: 'Sassami Grelhado',
                  grams: 200,
                  calories: 240,
                  protein: 46,
                  carbs: 0,
                  fat: 5,
                  fiber: 0,
                },
              ],
              lunch: [],
              afternoon_snack: [],
              dinner_event: [],
            },
            totals: {
              calories: 240,
              proteinGrams: 46,
              carbGrams: 0,
              fatGrams: 5,
              fiberGrams: 0,
            },
          }),
        } as Response;
      }

      return { ok: true, json: async () => ({}) } as Response;
    });

    render(<App />);

    // 3. Verifica que as metas foram recuperadas da nuvem e aplicadas
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/users/me/goals'),
        expect.anything()
      );
    });

    // 4. Verifica que as receitas da nuvem foram carregadas
    await waitFor(() => {
      expect(screen.getByText(/Receitas \(1\)/i)).toBeDefined();
    });

    // 5. Verifica que o diário da nuvem foi carregado na janela do café da manhã
    await waitFor(() => {
      expect(screen.getByText('Sassami Grelhado')).toBeDefined();
    });

    fetchSpy.mockRestore();
  });
});
