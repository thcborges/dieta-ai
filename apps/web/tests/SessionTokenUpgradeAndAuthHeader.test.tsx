import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../src/App.js';

describe('Frontend Session Token Auto-Upgrade & Resilient Header Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('deve atualizar automaticamente a sessão no localStorage para um JWT assinado ao iniciar com sessão offline ou legada', async () => {
    // Usuário legado ou com offline_session_
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_thcborges_gmail_com',
        email: 'thcborges@gmail.com',
        name: 'Thiago Borges',
        sessionToken: 'offline_session_usr_thcborges_gmail_com',
      })
    );

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/auth/google')) {
        return {
          ok: true,
          json: async () => ({
            sessionToken: 'jwt_valid_upgraded_session_token_123',
            user: { id: 'usr_thcborges_gmail_com', email: 'thcborges@gmail.com' },
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ meals: {} }),
      } as Response;
    });

    render(<App />);

    await waitFor(() => {
      const stored = localStorage.getItem('macrometrics_auth_user');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored || '{}');
      expect(parsed.sessionToken).toBe('jwt_valid_upgraded_session_token_123');
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/auth/google',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});
