import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditorBanner } from '../src/components/AuditorBanner.js';
import type { DailyAuditReport } from '@dieta-ai/core';

describe('AuditorBanner (Módulo 4: Auditoria Lógica Implacável)', () => {
  it('deve renderizar alerta crítico de Inviabilidade Matemática', () => {
    const report: DailyAuditReport = {
      hasMathematicalImpossibility: true,
      hasProteinDilution: false,
      deficitBreached: false,
      neutralizedDeficitDays: 0,
      currentGramsPerKg: 1.5,
      alerts: [
        {
          type: 'MATHEMATICAL_IMPOSSIBILITY',
          severity: 'CRITICAL',
          message: 'Inviabilidade Matemática: Faltam 80g de proteína, porém restam apenas 150 kcal.',
        },
      ],
    };

    render(<AuditorBanner report={report} />);

    expect(screen.getByText(/Inviabilidade Matemática/i)).toBeInTheDocument();
    expect(screen.getByText(/CRÍTICO/i)).toBeInTheDocument();
  });

  it('deve renderizar alerta de Quebra de Déficit com contagem de dias neutralizados', () => {
    const report: DailyAuditReport = {
      hasMathematicalImpossibility: false,
      hasProteinDilution: false,
      deficitBreached: true,
      neutralizedDeficitDays: 2.5,
      currentGramsPerKg: 2.2,
      alerts: [
        {
          type: 'DEFICIT_BREACH',
          severity: 'HIGH',
          neutralizedDays: 2.5,
          message: 'Quebra de Déficit Calórico: Superávit neutralizou 2.5 dias de progresso.',
        },
      ],
    };

    render(<AuditorBanner report={report} />);

    expect(screen.getByText(/Quebra de Déficit/i)).toBeInTheDocument();
    expect(screen.getAllByText(/2.5 dias/i).length).toBeGreaterThan(0);
  });

  it('não deve exibir alertas quando tudo estiver dentro do planejado', () => {
    const report: DailyAuditReport = {
      hasMathematicalImpossibility: false,
      hasProteinDilution: false,
      deficitBreached: false,
      neutralizedDeficitDays: 0,
      currentGramsPerKg: 2.3,
      alerts: [],
    };

    const { container } = render(<AuditorBanner report={report} />);
    expect(container.firstChild).toBeNull();
  });
});
