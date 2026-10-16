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

  test('deve isolar diário entre contas diferentes impedindo que usuário B veja refeições do usuário A', async ({ page }) => {
    await page.goto('/');

    // 1. Usuário A faz login com a conta padrão thcborges
    await page.getByRole('button', { name: /Entrar com Google/i }).click();
    await expect(page.getByRole('button', { name: /Controlar Macros/i })).toBeVisible();

    // 2. Usuário A adiciona Feijão Preto ao almoço
    const feijaoChip = page.getByRole('button', { name: /\+ Feijão/i });
    await feijaoChip.click();
    await expect(page.locator('div.font-medium').filter({ hasText: 'Feijão Preto Cozido' })).toBeVisible();

    // 3. Usuário A faz logout
    await page.getByRole('button', { name: /Sair/i }).click();
    await expect(page.getByRole('button', { name: /Entrar com Google/i })).toBeVisible();

    // 4. Usuário B seleciona a conta outro.usuario e faz login
    await page.getByRole('button', { name: /outro\.usuario/i }).click();
    await page.getByRole('button', { name: /Entrar com Google/i }).click();
    await expect(page.getByRole('button', { name: /Controlar Macros/i })).toBeVisible();

    // 5. REGRESSÃO: Usuário B NÃO PODE ver o alimento lançado pelo Usuário A!
    await expect(page.locator('div.font-medium').filter({ hasText: 'Feijão Preto Cozido' })).not.toBeVisible();

    // 6. Usuário B adiciona Ovos ao café da manhã
    const ovosChip = page.getByRole('button', { name: /\+ Ovo\b/i }).first();
    await ovosChip.click();
    await expect(page.locator('div.font-medium').filter({ hasText: 'Ovo de Galinha Inteiro' })).toBeVisible();

    // 7. Usuário B faz logout
    await page.getByRole('button', { name: /Sair/i }).click();
    await expect(page.getByRole('button', { name: /Entrar com Google/i })).toBeVisible();

    // 8. Usuário A retorna à sua conta
    await page.getByRole('button', { name: /thcborges/i }).click();
    await page.getByRole('button', { name: /Entrar com Google/i }).click();
    await expect(page.getByRole('button', { name: /Controlar Macros/i })).toBeVisible();

    // 9. Usuário A deve ver seu Feijão e NÃO o Ovo do Usuário B
    await expect(page.locator('div.font-medium').filter({ hasText: 'Feijão Preto Cozido' })).toBeVisible();
    await expect(page.locator('div.font-medium').filter({ hasText: 'Ovo de Galinha Inteiro' })).not.toBeVisible();
  });
});
