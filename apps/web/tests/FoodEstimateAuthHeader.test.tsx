import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FoodRegistrationModal } from '../src/components/FoodRegistrationModal.js';

describe('FoodRegistrationModal (Envio Resiliente de Headers de Autenticação)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('deve enviar Authorization Bearer e x-user-id a partir do usuário autenticado no localStorage', async () => {
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_techlead_40',
        email: 'techlead@dataeng.io',
        name: 'Tech Lead',
        sessionToken: 'jwt_valid_session_token_xyz',
      })
    );

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        foodName: 'Iogurte Natural',
        servingSizeGrams: 150,
        caloriesPer100g: 60,
        proteinPer100g: 5.0,
        carbsPer100g: 6.0,
        fatPer100g: 3.0,
        fiberPer100g: 0,
        confidence: 'high',
      }),
    } as Response);

    render(
      <FoodRegistrationModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/Nome do Alimento/i);
    fireEvent.change(nameInput, { target: { value: 'Iogurte Natural' } });

    const estimateBtn = screen.getByRole('button', { name: /Estimar com IA/i });
    fireEvent.click(estimateBtn);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/foods/estimate-ai',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt_valid_session_token_xyz',
          'x-user-id': 'usr_techlead_40',
        }),
      })
    );
  });
});
