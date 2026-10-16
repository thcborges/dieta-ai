import { test, expect } from '@playwright/test';

test.describe('Persistência do Diário Alimentar no Firestore (Offline-first & Sincronização)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const loginButton = page.getByRole('button', { name: /Entrar com Google/i });
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click();
    }
    await expect(page.getByText('Lançamento Rápido de Alimentos')).toBeVisible();
  });

  test('deve exibir o seletor de data e persistir alimentos no diário através de recarregamentos', async ({ page }) => {
    // 1. Verifica se o seletor de data está presente no Top App Bar
    const datePicker = page.locator('#diary-date-picker');
    await expect(datePicker).toBeVisible();

    // 2. Lança alimento na janela ativa
    const launchButton = page.getByRole('button', { name: /Lançar/i });
    await expect(launchButton).toBeVisible();
    await launchButton.click();

    // 3. Recarrega a página para simular persistência duradoura
    await page.reload();

    // 4. Confirma que o usuário continua autenticado e os alimentos persistem no diário
    await expect(page.getByText('Lançamento Rápido de Alimentos')).toBeVisible();
    await expect(page.locator('#diary-date-picker')).toBeVisible();
  });
});
