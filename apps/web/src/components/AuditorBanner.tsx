import React from 'react';
import type { DailyAuditReport } from '@dieta-ai/core';
import { AlertTriangle, AlertOctagon, TrendingDown } from 'lucide-react';

interface AuditorBannerProps {
  report: DailyAuditReport;
}

export const AuditorBanner: React.FC<AuditorBannerProps> = ({ report }) => {
  if (report.alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {report.alerts.map((alert, idx) => {
        const isCritical = alert.severity === 'CRITICAL';
        const isHigh = alert.severity === 'HIGH';

        return (
          <div
            key={idx}
            className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
              isCritical
                ? 'bg-red-950/40 border-red-800 text-red-200'
                : isHigh
                ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                : 'bg-m3-surface-container-high border-m3-outline-variant text-m3-on-surface'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isCritical ? (
                <AlertOctagon className="w-5 h-5 text-red-400" />
              ) : alert.type === 'DEFICIT_BREACH' ? (
                <TrendingDown className="w-5 h-5 text-amber-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
            </div>

            <div className="flex-1 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold tracking-wide uppercase text-xs font-mono px-2 py-0.5 rounded bg-black/40">
                  {isCritical ? 'CRÍTICO' : 'ALERTA DE RISCO'}
                </span>
                {alert.neutralizedDays !== undefined && (
                  <span className="text-xs font-mono bg-red-900/60 text-red-200 px-2 py-0.5 rounded">
                    -{alert.neutralizedDays} dias de déficit
                  </span>
                )}
                {alert.currentGramsPerKg !== undefined && (
                  <span className="text-xs font-mono bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded">
                    {alert.currentGramsPerKg}g/kg
                  </span>
                )}
              </div>
              <p className="leading-relaxed font-sans">{alert.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
