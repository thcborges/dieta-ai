import { test, expect } from '@playwright/test';

test.describe('Controle Individual de Macros & Fibras por Idade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Realiza login para liberar acesso
    const loginButton = page.getByRole('button', { name: /Entrar com Google/i });
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click();
    }
    await expect(page.getByRole('button', { name: /Controlar Macros/i })).toBeVisible();
  });

  test('deve abrir modal de controle de macros e recalcular fibra recomendada ao alterar idade', async ({ page }) => {
    await page.getByRole('button', { name: /Controlar Macros/i }).click();

    await expect(page.getByText('Controle de Macronutrientes')).toBeVisible();

    // Localiza input de idade e altera para 55
    const ageInput = page.getByLabel(/Idade/i);
    await ageInput.fill('55');

    // Clica no atalho para aplicar a recomendação oficial DRI
    const applyFiberDriBtn = page.getByRole('button', { name: /Usar recomendação/i });
    if (await applyFiberDriBtn.isVisible()) {
      await applyFiberDriBtn.click();
      const fiberInput = page.getByLabel(/Meta de Fibras/i);
      await expect(fiberInput).toHaveValue('30');
    }

    // Altera idade para 30 anos
    await ageInput.fill('30');
    if (await applyFiberDriBtn.isVisible()) {
      await applyFiberDriBtn.click();
      const fiberInput = page.getByLabel(/Meta de Fibras/i);
      await expect(fiberInput).toHaveValue('38');
    }

    // Salva as alterações
    await page.getByRole('button', { name: /Salvar Metas/i }).click();

    // Modal deve fechar e MacroSummary deve exibir o card de Fibras atualizado
    await expect(page.getByText('Controle de Macronutrientes')).not.toBeVisible();
    await expect(page.getByText('Fibras')).toBeVisible();
  });
});
