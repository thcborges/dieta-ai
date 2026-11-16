import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Calendar,
  UserCheck,
  DollarSign,
  Camera,
  Utensils,
  TrendingUp,
  Loader2,
  Layers,
} from 'lucide-react';
import type { AdminTokenUsageResponse } from '@dieta-ai/core';

interface AdminTokenDashboardProps {
  isAdmin: boolean;
  onBack: () => void;
  sessionToken?: string;
  adminEmail?: string;
}

export const AdminTokenDashboard: React.FC<AdminTokenDashboardProps> = ({
  isAdmin,
  onBack,
  sessionToken,
  adminEmail = 'thcborges@gmail.com',
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminTokenUsageResponse | null>(null);

  // Filtros
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(thirtyDaysAgo);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedUserHash, setSelectedUserHash] = useState<string>('all');

  const fetchTokenUsage = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (selectedUserHash && selectedUserHash !== 'all') {
        params.set('userHash', selectedUserHash);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const res = await fetch(`/api/v1/admin/token-usage?${params.toString()}`, {
        headers,
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Acesso negado: Somente administradores autorizados têm acesso a este painel.');
        }
        throw new Error(`Falha ao obter telemetria de tokens: ${res.statusText}`);
      }

      const json = (await res.json()) as AdminTokenUsageResponse;
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao consultar uso de tokens.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, sessionToken, startDate, endDate, selectedUserHash]);

  useEffect(() => {
    fetchTokenUsage();
  }, [fetchTokenUsage]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-m3-surface p-4 sm:p-6 text-m3-on-surface flex items-center justify-center">
        <div className="bg-m3-surface-container-high border border-m3-error rounded-3xl max-w-md w-full p-6 text-center shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-m3-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-m3-error mb-2">Acesso Negado</h2>
          <p className="text-xs text-m3-on-surface-variant mb-6">
            Apenas o administrador (thcborges@gmail.com) tem permissão para visualizar o controle e
            auditoria de tokens de IA.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="w-full bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors"
          >
            Voltar ao MacroMetrics
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const dailySeries = data?.dailySeries || [];
  const maxDailyTokens = Math.max(1, ...dailySeries.map(d => d.totalTokens));

  return (
    <div className="min-h-screen bg-m3-surface text-m3-on-surface p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-m3-surface-container-high p-5 rounded-3xl border border-m3-outline/40 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-2xl bg-m3-surface-container hover:bg-m3-surface-container-highest border border-m3-outline/40 text-m3-on-surface transition-colors"
              aria-label="Voltar ao MacroMetrics"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-m3-primary" />
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                  Auditoria de Tokens IA (Vertex AI / Gemini)
                </h1>
                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-m3-outline mt-0.5">
                Monitoramento de volumetria, médias de consumo e projeção individual mensal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono text-m3-outline bg-m3-surface-container-lowest px-3 py-1.5 rounded-xl border border-m3-outline/20">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{adminEmail}</span>
          </div>
        </div>

        {/* Filtros: De/Até e Usuário Anônimo */}
        <div className="bg-m3-surface-container p-4 rounded-2xl border border-m3-outline/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-m3-primary shrink-0" />
              <label htmlFor="token-start-date" className="text-xs font-medium text-m3-outline">
                De:
              </label>
              <input
                id="token-start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-m3-surface-container-high border border-m3-outline/40 rounded-xl px-2.5 py-1.5 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="token-end-date" className="text-xs font-medium text-m3-outline">
                Até:
              </label>
              <input
                id="token-end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-m3-surface-container-high border border-m3-outline/40 rounded-xl px-2.5 py-1.5 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-m3-secondary shrink-0" />
              <label htmlFor="token-user-filter" className="text-xs font-medium text-m3-outline">
                Usuário:
              </label>
              <select
                id="token-user-filter"
                value={selectedUserHash}
                onChange={e => setSelectedUserHash(e.target.value)}
                className="bg-m3-surface-container-high border border-m3-outline/40 rounded-xl px-3 py-1.5 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary"
              >
                <option value="all">Todos os Usuários</option>
                {data?.userList?.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchTokenUsage}
            disabled={loading}
            className="flex items-center gap-1.5 bg-m3-surface-container-highest hover:bg-m3-primary hover:text-m3-on-primary border border-m3-outline/40 text-xs px-3.5 py-1.5 rounded-xl font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Estado de Erro */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Estado de Carregamento */}
        {loading && !data && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-m3-outline">
            <Loader2 className="w-8 h-8 animate-spin text-m3-primary" />
            <p className="text-xs">Carregando telemetria de tokens...</p>
          </div>
        )}

        {/* Grade de Métricas Analíticas */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Consumo Total */}
            <div className="bg-m3-surface-container p-4 rounded-2xl border border-m3-outline/30 space-y-1">
              <div className="flex items-center justify-between text-xs text-m3-outline">
                <span>Tokens Totais</span>
                <Layers className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold tracking-tight text-m3-primary">
                {summary.totalTokens.toLocaleString('pt-BR')}
              </div>
              <div className="text-[10px] text-m3-outline font-mono">
                P: {summary.promptTokens.toLocaleString('pt-BR')} | R:{' '}
                {summary.candidatesTokens.toLocaleString('pt-BR')}
              </div>
            </div>

            {/* Card 2: Custo Estimado */}
            <div className="bg-m3-surface-container p-4 rounded-2xl border border-m3-outline/30 space-y-1">
              <div className="flex items-center justify-between text-xs text-m3-outline">
                <span>Custo Estimado</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold tracking-tight text-emerald-400">
                ${summary.estimatedCostUsd.toFixed(4)} USD
              </div>
              <div className="text-[10px] text-m3-outline font-mono">
                Gemini 2.5 Flash
              </div>
            </div>

            {/* Card 3: Média Foto */}
            <div className="bg-m3-surface-container p-4 rounded-2xl border border-m3-outline/30 space-y-1">
              <div className="flex items-center justify-between text-xs text-m3-outline">
                <span>Média / Foto</span>
                <Camera className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold tracking-tight text-purple-300">
                {summary.avgTokensPhotoMeal.toLocaleString('pt-BR')}
              </div>
              <div className="text-[10px] text-m3-outline">
                {summary.totalPhotoRequests} refeições analisadas
              </div>
            </div>

            {/* Card 4: Média Alimento IA */}
            <div className="bg-m3-surface-container p-4 rounded-2xl border border-m3-outline/30 space-y-1">
              <div className="flex items-center justify-between text-xs text-m3-outline">
                <span>Média / Alimento IA</span>
                <Utensils className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold tracking-tight text-amber-300">
                {summary.avgTokensFoodEstimate.toLocaleString('pt-BR')}
              </div>
              <div className="text-[10px] text-m3-outline">
                {summary.totalFoodEstimateRequests} alimentos estimados
              </div>
            </div>

            {/* Card 5: Projeção Mensal */}
            <div className="bg-m3-surface-container p-4 rounded-2xl border border-m3-outline/30 space-y-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-xs text-m3-outline">
                <span>Projeção Mensal</span>
                <TrendingUp className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="text-xl font-bold tracking-tight text-m3-secondary">
                {summary.projectedMonthlyTokensPerUser.toLocaleString('pt-BR')}
              </div>
              <div className="text-[10px] text-m3-outline">
                tokens/mês por usuário
              </div>
            </div>
          </div>
        )}

        {/* Gráfico de Barras Temporais */}
        <div className="bg-m3-surface-container p-5 rounded-3xl border border-m3-outline/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-m3-primary" />
                Histórico Diário de Consumo de Tokens
              </h2>
              <p className="text-xs text-m3-outline">
                Evolução cronológica de tokens consumidos no período selecionado.
              </p>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-m3-outline">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-purple-500 inline-block" />
                <span>Foto Refeição</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
                <span>Alimento IA</span>
              </div>
            </div>
          </div>

          {dailySeries.length === 0 ? (
            <div className="py-14 text-center text-xs text-m3-outline">
              Nenhuma atividade de IA registrada para o período ou filtro selecionado.
            </div>
          ) : (
            <div className="pt-6 pb-2 overflow-x-auto">
              <div className="min-w-[500px] flex items-end gap-3 h-52 px-2 border-b border-m3-outline/30">
                {dailySeries.map(day => {
                  const barHeightPct = Math.max(8, Math.round((day.totalTokens / maxDailyTokens) * 100));
                  const photoPct = day.totalTokens > 0 ? (day.photoTokens / day.totalTokens) * 100 : 0;
                  const foodPct = day.totalTokens > 0 ? (day.foodEstimateTokens / day.totalTokens) * 100 : 0;

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    >
                      {/* Tooltip Hover */}
                      <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-m3-surface-container-highest border border-m3-outline/50 p-2 rounded-xl text-[10px] whitespace-nowrap shadow-xl z-10 text-center font-mono">
                        <div className="font-bold text-m3-primary">{day.date}</div>
                        <div>Total: {day.totalTokens.toLocaleString('pt-BR')} tokens</div>
                        <div className="text-emerald-400">${day.costUsd.toFixed(4)} USD</div>
                      </div>

                      {/* Barra Segmentada */}
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className="w-full max-w-[42px] rounded-t-lg overflow-hidden flex flex-col justify-end bg-m3-surface-container-high transition-all group-hover:brightness-110"
                      >
                        {photoPct > 0 && (
                          <div
                            style={{ height: `${photoPct}%` }}
                            className="w-full bg-purple-500/80"
                            title={`Foto: ${day.photoTokens} tokens`}
                          />
                        )}
                        {foodPct > 0 && (
                          <div
                            style={{ height: `${foodPct}%` }}
                            className="w-full bg-amber-500/80"
                            title={`Alimento: ${day.foodEstimateTokens} tokens`}
                          />
                        )}
                      </div>

                      {/* Rótulo da Data */}
                      <span className="text-[10px] font-mono text-m3-outline mt-2 whitespace-nowrap">
                        {day.date.split('-').slice(1).join('/')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
