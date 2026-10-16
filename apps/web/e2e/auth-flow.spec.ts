import { test, expect } from '@playwright/test';

test.describe('Fluxo de Autenticação & Usabilidade M3', () => {
  test.beforeEach(async ({ page }) => {
    // Limpa localStorage antes de cada teste
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('deve bloquear acesso ao diário e exibir LoginPage para visitante anônimo', async ({ page }) => {
    await page.goto('/');

    // Verifica presença da LoginPage
    await expect(page.getByText('MacroMetrics Pro')).toBeVisible();
    await expect(page.getByText('Engenharia Reversa de Macronutrientes • Auditoria Matemática')).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar com Google/i })).toBeVisible();

    // Diário e construtor não devem estar acessíveis
    await expect(page.getByText('Café da Manhã / Pré-Treino')).not.toBeVisible();
    await expect(page.getByText('Orçamento Limpo Restante')).not.toBeVisible();
  });

  test('deve autenticar com sucesso e carregar dashboard do usuário', async ({ page }) => {
    await page.goto('/');

    const loginButton = page.getByRole('button', { name: /Entrar com Google/i });
    await loginButton.click();

    // Verifica que o dashboard carregou com sucesso
    await expect(page.getByRole('button', { name: /Controlar Macros/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Conta & LGPD/i })).toBeVisible();
    await expect(page.getByText('Fibras')).toBeVisible();

    // Verifica o botão de Sair e logout
    const logoutBtn = page.getByRole('button', { name: /Sair/i });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Retorna para a LoginPage
    await expect(page.getByRole('button', { name: /Entrar com Google/i })).toBeVisible();
  });
});
