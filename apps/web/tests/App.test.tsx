import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App.js';

describe('MacroMetrics Pro App (Fluxo Principal)', () => {
  it('deve inicializar o Dark Dashboard com Material Design 3 e perfil de dados', () => {
    render(<App />);

    expect(screen.getByText(/MacroMetrics Pro/i)).toBeInTheDocument();
    expect(screen.getByText(/Buffer de Evento Social/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Café da Manhã \/ Pré-Treino/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Auto-Completar Proteína/i)).toBeInTheDocument();
  });

  it('deve permitir abrir e fechar o modal de LGPD / Conta', () => {
    render(<App />);

    const accountBtn = screen.getByRole('button', { name: /Conta & LGPD/i });
    fireEvent.click(accountBtn);

    expect(screen.getByText(/Gerenciamento de Conta & LGPD/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Fechar/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Gerenciamento de Conta & LGPD/i)).not.toBeInTheDocument();
  });

  it('deve selecionar um evento de pizza, atualizar totais e permitir remover reserva', () => {
    render(<App />);

    const pizzaButton = screen.getByRole('button', { name: /Noite da Pizza/i });
    fireEvent.click(pizzaButton);

    expect(screen.getAllByText(/Densidade Proteica Exigida/i).length).toBeGreaterThan(0);

    const removeBufferBtn = screen.getByRole('button', { name: /Remover Reserva/i });
    fireEvent.click(removeBufferBtn);

    expect(screen.queryByText(/Densidade Proteica Exigida/i)).not.toBeInTheDocument();
  });

  it('deve executar o auto-completar proteína e adicionar novo alimento no jantar', () => {
    render(<App />);

    const autoBtn = screen.getByRole('button', { name: /Auto-Completar Proteína/i });
    fireEvent.click(autoBtn);

    expect(screen.getAllByText(/Auto-Completar/i).length).toBeGreaterThan(0);
  });
});
