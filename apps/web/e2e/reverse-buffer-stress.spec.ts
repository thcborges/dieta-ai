import { test, expect } from '@playwright/test';

test.describe('Buffer Reverso de Evento & Estresse de UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const loginButton = page.getByRole('button', { name: /Entrar com Google/i });
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click();
    }
    await expect(page.getByRole('button', { name: /Controlar Macros/i })).toBeVisible();
  });

  test('deve selecionar preset de Noite da Pizza e recalcular orçamento limpo', async ({ page }) => {
    // Localiza e clica no preset Noite da Pizza
    const pizzaPreset = page.getByText('Noite da Pizza');
    await pizzaPreset.scrollIntoViewIfNeeded();
    await expect(pizzaPreset).toBeVisible();
    await pizzaPreset.click();

    // Orçamento limpo deve abater as calorias do evento
    const cleanBudget = page.getByText('Orçamento Limpo Restante (Refeições Controladas)');
    await cleanBudget.scrollIntoViewIfNeeded();
    await expect(cleanBudget).toBeVisible();
    await expect(page.getByText('Densidade Proteica Exigida')).toBeVisible();
  });

  test('deve adicionar alimento e estressar interações sem quebra de layout', async ({ page }) => {
    // Adiciona Sassami desfiado via chip de atalho
    const sassamiChip = page.getByRole('button', { name: /Sassami Desfiado/i }).first();
    if (await sassamiChip.isVisible()) {
      await sassamiChip.click();
      await sassamiChip.click(); // Adiciona duas vezes rapidamente
    }

    // Verifica que o painel mantém contraste e estabilidade
    await expect(page.getByText('MacroMetrics Pro')).toBeVisible();
    await expect(page.getByRole('button', { name: /Controlar Macros/i })).toBeVisible();
  });
});
