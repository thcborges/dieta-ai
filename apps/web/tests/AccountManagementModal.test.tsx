import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountManagementModal } from '../src/components/AccountManagementModal.js';

describe('AccountManagementModal (Módulo 6: LGPD & Painel Admin)', () => {
  it('deve exibir notificação legal do prazo de 15 dias da LGPD ao solicitar exclusão', () => {
    const onClose = vi.fn();
    const onRequestDeletion = vi.fn();
    const onAdminPurge = vi.fn();

    render(
      <AccountManagementModal
        isOpen={true}
        onClose={onClose}
        isAdmin={false}
        onRequestDeletion={onRequestDeletion}
        onAdminPurge={onAdminPurge}
      />
    );

    expect(screen.getByText(/Gerenciamento de Conta & LGPD/i)).toBeInTheDocument();
    expect(screen.getByText(/15 \(quinze\) dias/i)).toBeInTheDocument();

    const requestButton = screen.getByRole('button', { name: /Solicitar Exclusão da Conta/i });
    fireEvent.click(requestButton);
    expect(onRequestDeletion).toHaveBeenCalled();
  });

  it('deve exibir controles restritos de Admin quando o usuário for administrador', () => {
    const onAdminPurge = vi.fn();

    render(
      <AccountManagementModal
        isOpen={true}
        onClose={vi.fn()}
        isAdmin={true}
        onRequestDeletion={vi.fn()}
        onAdminPurge={onAdminPurge}
      />
    );

    expect(screen.getByText(/Painel de Administração \(Acesso Restrito\)/i)).toBeInTheDocument();
    const purgeButton = screen.getByRole('button', { name: /Exclusão Imediata e Irreversível/i });
    expect(purgeButton).toBeInTheDocument();

    fireEvent.click(purgeButton);
    expect(onAdminPurge).toHaveBeenCalled();
  });
});
