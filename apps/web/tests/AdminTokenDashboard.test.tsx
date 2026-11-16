import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminTokenDashboard } from '../src/components/AdminTokenDashboard.js';
import type { AdminTokenUsageResponse } from '@dieta-ai/core';

const mockResponse: AdminTokenUsageResponse = {
  summary: {
    totalTokens: 125000,
    promptTokens: 100000,
    candidatesTokens: 25000,
    estimatedCostUsd: 0.015,
    avgTokensPhotoMeal: 1200,
    avgTokensFoodEstimate: 350,
    projectedMonthlyTokensPerUser: 45000,
    totalRequests: 80,
    totalPhotoRequests: 50,
    totalFoodEstimateRequests: 30,
  },
  dailySeries: [
    {
      date: '2026-11-15',
      totalTokens: 60000,
      photoTokens: 40000,
      foodEstimateTokens: 20000,
      costUsd: 0.007,
      requestsCount: 40,
    },
    {
      date: '2026-11-16',
      totalTokens: 65000,
      photoTokens: 45000,
      foodEstimateTokens: 20000,
      costUsd: 0.008,
      requestsCount: 40,
    },
  ],
  userList: ['User_9a4fe1', 'User_3b8ca2'],
  startDate: '2026-11-01',
  endDate: '2026-11-16',
};

describe('AdminTokenDashboard Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve renderizar tela de bloqueio 403 se o usuário não for administrador', () => {
    const onBack = vi.fn();
    render(
      <AdminTokenDashboard
        isAdmin={false}
        onBack={onBack}
        sessionToken="common-user-token"
      />
    );

    expect(screen.getByText(/Acesso Negado/i)).toBeInTheDocument();
    expect(screen.getByText(/Apenas o administrador \(thcborges@gmail.com\) tem permissão/i)).toBeInTheDocument();

    const backBtn = screen.getByRole('button', { name: /Voltar ao MacroMetrics/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });

  it('deve carregar dados e exibir cards de métricas analíticas e custo em USD para o admin', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const onBack = vi.fn();
    render(
      <AdminTokenDashboard
        isAdmin={true}
        onBack={onBack}
        sessionToken="admin-token-123"
      />
    );

    // Indicador de carregamento inicial
    expect(screen.getByText(/Carregando telemetria de tokens/i)).toBeInTheDocument();

    // Aguarda exibição das métricas
    await waitFor(() => {
      expect(screen.getByText(/125\.000/i)).toBeInTheDocument(); // total tokens
    });

    expect(screen.getByText(/\$0\.0150/i)).toBeInTheDocument(); // custo USD
    expect(screen.getByText(/1\.200/i)).toBeInTheDocument(); // média foto
    expect(screen.getByText(/350/i)).toBeInTheDocument(); // média alimento
    expect(screen.getByText(/45\.000/i)).toBeInTheDocument(); // projeção mensal

    // Verifica que o seletor de usuários anônimos foi preenchido
    expect(screen.getByText(/Todos os Usuários/i)).toBeInTheDocument();
    expect(screen.getByText(/User_9a4fe1/i)).toBeInTheDocument();
    expect(screen.getByText(/User_3b8ca2/i)).toBeInTheDocument();

    // Botão de voltar funciona
    const backBtn = screen.getByRole('button', { name: /Voltar ao MacroMetrics/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/admin/token-usage'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token-123',
        }),
      })
    );
  });

  it('deve refazer a busca ao alterar o filtro de usuário anônimo ou datas De/Até', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    render(
      <AdminTokenDashboard
        isAdmin={true}
        onBack={vi.fn()}
        sessionToken="admin-token-123"
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue(/Todos os Usuários/i)).toBeInTheDocument();
    });

    // Altera o seletor de usuário
    const userSelect = screen.getByDisplayValue(/Todos os Usuários/i);
    fireEvent.change(userSelect, { target: { value: 'User_9a4fe1' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('userHash=User_9a4fe1'),
        expect.anything()
      );
    });

    // Altera a data de início
    const startDateInput = screen.getByLabelText(/De:/i);
    fireEvent.change(startDateInput, { target: { value: '2026-11-10' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2026-11-10'),
        expect.anything()
      );
    });
  });
});
