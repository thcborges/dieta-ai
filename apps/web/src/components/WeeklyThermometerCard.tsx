import React from 'react';
import {
  evaluateWeeklyThermometer,
  getLocalDateString,
  type DietGoal,
  type RollingDayLog,
} from '@dieta-ai/core';
import {
  Flame,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Activity,
  Gauge,
  Snowflake,
  ShieldAlert,
} from 'lucide-react';

export interface WeeklyThermometerCardProps {
  goal: DietGoal;
  dailyTargetCalories: number;
  tdee: number;
  weightKg: number;
  dailyDeficitKcal?: number;
  dailySurplusKcal?: number;
  tolerancePercent?: number;
  days: RollingDayLog[];
}

export const WeeklyThermometerCard: React.FC<WeeklyThermometerCardProps> = ({
  goal,
  dailyTargetCalories,
  tdee,
  weightKg,
  dailyDeficitKcal,
  dailySurplusKcal,
  tolerancePercent = 3,
  days,
}) => {
  // Se não houver nenhum dia registrado ainda, inicializa com 1 dia zerado
  const safeDays =
    days && days.length > 0
      ? days
      : [{ date: getLocalDateString(), calories: 0 }];

  const report = evaluateWeeklyThermometer({
    goal,
    dailyTargetCalories,
    tdee,
    weightKg,
    dailyDeficitKcal,
    dailySurplusKcal,
    tolerancePercent,
    days: safeDays,
  });

  const getStatusBadge = () => {
    switch (report.status) {
      case 'blown':
        return {
          label: 'ESTOURO DE TETO CALÓRICO',
          classes: 'bg-red-950/80 text-red-400 border-red-500 animate-pulse',
          icon: <Flame className="w-3.5 h-3.5 text-red-400" />,
        };
      case 'critical_deficit':
        if (goal === 'weight_gain') {
          return {
            label: 'RISCO CRÍTICO: PERDA PONDERAL',
            classes: 'bg-cyan-950/80 text-cyan-300 border-cyan-500',
            icon: <Snowflake className="w-3.5 h-3.5 text-cyan-300" />,
          };
        }
        return {
          label: 'DESVIO DE MANUTENÇÃO (DÉFICIT)',
          classes: 'bg-amber-950/80 text-amber-400 border-amber-500',
          icon: <TrendingDown className="w-3.5 h-3.5 text-amber-400" />,
        };
      case 'surplus_drift':
        return {
          label: 'DESVIO DE MANUTENÇÃO (SUPERÁVIT)',
          classes: 'bg-amber-950/80 text-amber-400 border-amber-500',
          icon: <TrendingUp className="w-3.5 h-3.5 text-amber-400" />,
        };
      case 'warning':
        return {
          label: 'ATENÇÃO: MARGEM ESTREITA',
          classes: 'bg-amber-950/80 text-amber-400 border-amber-500',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
        };
      case 'optimal':
      default:
        return {
          label:
            goal === 'maintenance'
              ? 'HOMEOSTASE / NÍVEL EQUILIBRADO'
              : 'ZONA ÓTIMA / ADERENTE',
          classes: 'bg-emerald-950/80 text-emerald-400 border-emerald-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        };
    }
  };

  const badge = getStatusBadge();

  // Cálculo da largura da barra térmica (clamp 0% a 100%)
  const gaugePercent = Math.min(100, Math.max(0, report.thermalRatioPercent));

  return (
    <div className="bg-m3-surface-container rounded-2xl p-5 border border-m3-outline-variant shadow-lg mb-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-m3-outline-variant/60 gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              report.status === 'blown'
                ? 'bg-red-950 text-red-400 border border-red-500/50'
                : report.status === 'critical_deficit' && goal === 'weight_gain'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                : 'bg-m3-primary-container text-m3-on-primary-container'
            }`}
          >
            {report.status === 'blown' ? (
              <Flame className="w-5 h-5" />
            ) : report.status === 'critical_deficit' && goal === 'weight_gain' ? (
              <Snowflake className="w-5 h-5" />
            ) : (
              <Gauge className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-m3-on-surface">
                Termômetro do Banco Semanal ({report.daysCount} dias)
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-m3-surface-container-high text-m3-outline border border-m3-outline-variant/50 uppercase">
                {goal === 'weight_loss'
                  ? 'Perda de Peso'
                  : goal === 'weight_gain'
                  ? 'Ganho de Peso'
                  : 'Manutenção'}
              </span>
            </div>
            <p className="text-xs text-m3-outline font-mono">
              Janela Móvel • Adesão Contínua & Blindagem Contra Deslizes Temporais
            </p>
          </div>
        </div>

        {/* Badge de Status Térmico */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold tracking-tight shadow-sm ${badge.classes}`}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Grid de Métricas Analíticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {/* Consumo Acumulado vs Alvo */}
        <div className="bg-m3-surface-container-low p-3 rounded-xl border border-m3-outline-variant/40">
          <span className="block text-[11px] font-mono text-m3-outline mb-1">
            Consumo Acumulado
          </span>
          <div className="text-lg font-bold font-mono text-m3-on-surface">
            {report.totalActualCalories}{' '}
            <span className="text-xs font-normal text-m3-outline">
              / {report.totalTargetCalories} kcal
            </span>
          </div>
        </div>

        {/* Índice Térmico */}
        <div className="bg-m3-surface-container-low p-3 rounded-xl border border-m3-outline-variant/40">
          <span className="block text-[11px] font-mono text-m3-outline mb-1">
            Índice Térmico
          </span>
          <div
            className={`text-lg font-bold font-mono ${
              report.status === 'blown'
                ? 'text-red-400'
                : report.status === 'critical_deficit'
                ? 'text-cyan-400'
                : report.status === 'warning' || report.status === 'surplus_drift'
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {report.thermalRatioPercent}%
          </div>
        </div>

        {/* Deslize Semanal Acumulado */}
        <div className="bg-m3-surface-container-low p-3 rounded-xl border border-m3-outline-variant/40">
          <span className="block text-[11px] font-mono text-m3-outline mb-1">
            Deslize Semanal
          </span>
          <div
            className={`text-lg font-bold font-mono ${
              report.weeklySlipKcal > 0
                ? 'text-red-400'
                : report.weeklySlipKcal < 0
                ? 'text-emerald-400'
                : 'text-m3-on-surface'
            }`}
          >
            {report.weeklySlipKcal > 0 ? `+${report.weeklySlipKcal}` : report.weeklySlipKcal} kcal
          </div>
        </div>

        {/* Pontuação de Adesão */}
        <div className="bg-m3-surface-container-low p-3 rounded-xl border border-m3-outline-variant/40">
          <span className="block text-[11px] font-mono text-m3-outline mb-1">
            Adesão à Dieta
          </span>
          <div className="text-lg font-bold font-mono text-m3-primary">
            {report.adherenceScorePercent}%
          </div>
        </div>
      </div>

      {/* Barra Gauge do Termômetro */}
      <div className="mt-4 bg-m3-surface-container-low p-3.5 rounded-xl border border-m3-outline-variant/40">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="font-semibold text-m3-on-surface flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-m3-tertiary" />
            Pressão Térmica Semanal
          </span>
          <span className="font-mono text-xs text-m3-outline">
            {goal === 'weight_loss' ? (
              report.status === 'blown' ? (
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> ESTOURO DE TETO ({report.thermalRatioPercent}%)
                </span>
              ) : (
                <span>Teto: 100% (Margem máx 105%)</span>
              )
            ) : goal === 'weight_gain' ? (
              report.status === 'critical_deficit' ? (
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <Snowflake className="w-3.5 h-3.5" /> SUB-CONSUMO ({report.thermalRatioPercent}%)
                </span>
              ) : (
                <span>Alvo anabólico: ≥ 98%</span>
              )
            ) : (
              <span>Nível equilibrado (±{tolerancePercent}%)</span>
            )}
          </span>
        </div>

        {/* Gauge Horizontal */}
        <div className="w-full bg-m3-surface-container-highest h-3 rounded-full overflow-hidden relative border border-m3-outline-variant/40">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              report.status === 'blown'
                ? 'bg-gradient-to-r from-amber-500 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                : report.status === 'critical_deficit' && goal === 'weight_gain'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-400'
                : report.status === 'warning' || report.status === 'surplus_drift'
                ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
            }`}
            style={{ width: `${gaugePercent}%` }}
          />
        </div>
      </div>

      {/* Alertas de Risco Lógicos Implacáveis */}
      {report.alerts.length > 0 && (
        <div className="mt-4 space-y-2">
          {report.alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                alert.severity === 'CRITICAL'
                  ? 'bg-red-950/30 border-red-500/60 text-red-200'
                  : alert.severity === 'HIGH'
                  ? 'bg-amber-950/30 border-amber-500/60 text-amber-200'
                  : 'bg-yellow-950/30 border-yellow-500/60 text-yellow-200'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {alert.severity === 'CRITICAL' ? (
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 border border-white/10 uppercase">
                    {alert.code}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-m3-outline uppercase">
                    Severidade: {alert.severity}
                  </span>
                </div>
                <p className="text-xs font-mono leading-relaxed">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
