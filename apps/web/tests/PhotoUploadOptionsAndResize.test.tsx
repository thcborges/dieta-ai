import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PhotoMealModal } from '../src/components/PhotoMealModal.js';

describe('PhotoMealModal (Opções de Foto e Galeria + Auth Headers)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_test_123',
        email: 'user@example.com',
        name: 'Test User',
        sessionToken: 'jwt_mock_token_abc',
      })
    );
  });

  it('deve disponibilizar botões dedicados para Tirar Foto (Câmera) e Escolher da Galeria (Arquivos)', () => {
    const { container } = render(
      <PhotoMealModal
        isOpen={true}
        windowKey="lunch"
        onClose={vi.fn()}
        onAddFood={vi.fn()}
      />
    );

    // Deve haver opção para Tirar Foto
    const cameraBtn = screen.getByRole('button', { name: /Tirar Foto/i });
    expect(cameraBtn).toBeInTheDocument();

    // Deve haver opção para Escolher da Galeria
    const galleryBtn = screen.getByRole('button', { name: /Galeria|Escolher da Galeria|Carregar da Galeria/i });
    expect(galleryBtn).toBeInTheDocument();

    // Deve haver input de câmera com capture="environment"
    const cameraInput = container.querySelector('input[type="file"][capture="environment"]');
    expect(cameraInput).toBeInTheDocument();

    // Deve haver input de galeria SEM o atributo capture
    const galleryInputs = container.querySelectorAll('input[type="file"]:not([capture])');
    expect(galleryInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('deve enviar token de sessão ou x-user-id no cabeçalho da requisição ao analisar a foto', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        isFoodIdentified: true,
        items: [
          {
            id: 'item_1',
            name: 'Peito de Frango',
            estimatedGrams: 100,
            confidence: 'high',
            per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
          },
        ],
        totalMealMacros: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
      }),
    } as Response);

    const { container } = render(
      <PhotoMealModal
        isOpen={true}
        windowKey="lunch"
        onClose={vi.fn()}
        onAddFood={vi.fn()}
      />
    );

    // Simula seleção de arquivo
    const galleryInput = container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    expect(galleryInput).toBeInTheDocument();

    const file = new File(['dummy-image-bytes'], 'prato.jpg', { type: 'image/jpeg' });
    fireEvent.change(galleryInput, { target: { files: [file] } });

    // Espera que o preview apareça e clica em Analisar Foto
    const analyzeBtn = await screen.findByRole('button', { name: /Analisar Foto com IA/i });
    fireEvent.click(analyzeBtn);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/meals/analyze-photo',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt_mock_token_abc',
          'x-user-id': 'usr_test_123',
        }),
      })
    );
  });
});
