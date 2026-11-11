import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App.js';

describe('BDD: Limpeza do Header, Avatar do Usuário e Auto-Seleção de Inputs', () => {
  const mockUserWithPhoto = {
    id: 'usr_thcborges_gmail_com',
    email: 'thcborges@gmail.com',
    name: 'Thiago Borges',
    avatarUrl: 'https://lh3.googleusercontent.com/a/custom-photo.jpg',
    picture: 'https://lh3.googleusercontent.com/a/custom-photo.jpg',
    isAdmin: false,
    sessionToken: 'sess_valid_token_123',
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('macrometrics_auth_user', JSON.stringify(mockUserWithPhoto));
    vi.restoreAllMocks();
  });

  describe('Cenário 1: Limpeza do Cabeçalho (Header)', () => {
    it('NÃO deve conter a tag span com "v0.1.0-dev" no cabeçalho', () => {
      render(<App />);
      expect(screen.queryByText(/v0\.1\.0-dev/i)).toBeNull();
    });

    it('NÃO deve conter o parágrafo "Engenharia Reversa • Auditoria Matemática" no cabeçalho', () => {
      const { container } = render(<App />);
      const header = container.querySelector('header');
      expect(header).not.toBeNull();
      expect(header?.textContent).not.toContain('Engenharia Reversa • Auditoria Matemática');
    });
  });

  describe('Cenário 2: Exibição da Foto do Payload no Lugar do E-mail', () => {
    it('deve exibir a foto de perfil do usuário no indicador de conta do cabeçalho', () => {
      const { container } = render(<App />);
      const header = container.querySelector('header');
      const avatarImg = header?.querySelector('img[alt="Avatar de Thiago Borges"]') as HTMLImageElement;

      expect(avatarImg).not.toBeNull();
      expect(avatarImg?.src).toContain('custom-photo.jpg');

      // O texto cru do e-mail não deve ficar exposto como texto solto no cabeçalho
      const emailSpan = header?.querySelector('span.truncate');
      expect(emailSpan).toBeNull();
    });

    it('deve exibir fallback com inicial ou ícone elegante caso o usuário não possua foto', () => {
      localStorage.setItem(
        'macrometrics_auth_user',
        JSON.stringify({
          id: 'usr_no_photo',
          email: 'nophoto@example.com',
          name: 'No Photo User',
          sessionToken: 'sess_123',
        })
      );

      const { container } = render(<App />);
      const header = container.querySelector('header');
      const avatarFallback = header?.querySelector('[data-testid="user-avatar-fallback"]');

      expect(avatarFallback).not.toBeNull();
      expect(avatarFallback?.textContent).toContain('N');
    });
  });

  describe('Cenário 3: Seleção Automática do Conteúdo de Inputs no Primeiro Foco/Clique', () => {
    it('deve selecionar todo o conteúdo de um input de texto ou número ao receber foco/clique pela primeira vez', () => {
      render(<App />);

      // Cria um input de teste para validar o listener global da aplicação
      const testInput = document.createElement('input');
      testInput.type = 'number';
      testInput.value = '150';
      document.body.appendChild(testInput);

      const selectSpy = vi.spyOn(testInput, 'select');
      fireEvent.focusIn(testInput);

      expect(selectSpy).toHaveBeenCalledTimes(1);

      document.body.removeChild(testInput);
    });
  });
});
