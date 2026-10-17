import { test, expect } from '@playwright/test';

test.describe('Controle Individual de Macros & Fibras por Idade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Realiza login para liberar acesso
    const loginButton = page.getByRole('button', { name: /Entrar com Google/i });
    if (await loginButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginButton.click();
    }
    await expect(page.getByRole('button', { name: /Controlar Macros/i })).toBeVisible({ timeout: 10000 });
  });

  test('deve abrir modal de controle de macros e recalcular fibra recomendada ao alterar idade', async ({ page }) => {
    await page.getByRole('button', { name: /Controlar Macros/i }).click();

    await expect(page.getByText('Controle de Macronutrientes')).toBeVisible();

    // Localiza input de idade e altera para 55
    const ageInput = page.getByLabel(/^Idade$/i);
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

  test('deve calcular calorias ao alterar macros e ajustar apenas carboidrato ao alterar calorias alvo', async ({ page }) => {
    await page.getByRole('button', { name: /Controlar Macros/i }).click();

    await expect(page.getByText('Controle de Macronutrientes')).toBeVisible();
    await expect(page.getByText(/3\. Metas de Macros Diárias/i)).toBeVisible();

    const protInput = page.getByLabel(/^Proteínas/i);
    const carbInput = page.getByLabel(/^Carboidratos/i);
    const fatInput = page.getByLabel(/^Gorduras/i);
    const calInput = page.getByLabel(/^Calorias Alvo/i);

    // Altera proteína para 200g, carboidrato para 200g, gordura para 50g
    // Calorias deve ser: 200*4 + 200*4 + 50*9 = 800 + 800 + 450 = 2050 kcal
    await protInput.fill('200');
    await carbInput.fill('200');
    await fatInput.fill('50');

    await expect(calInput).toHaveValue('2050');

    // Ao alterar Calorias Alvo para 2250 (+200 kcal), deve alterar apenas carboidrato (+50g -> 250g)
    await calInput.fill('2250');
    await expect(carbInput).toHaveValue('250');
    await expect(protInput).toHaveValue('200');
    await expect(fatInput).toHaveValue('50');

    // Ao alterar Calorias Alvo para 1850 (-400 kcal), deve alterar apenas carboidrato (-100g -> 150g)
    await calInput.fill('1850');
    await expect(carbInput).toHaveValue('150');
    await expect(protInput).toHaveValue('200');
    await expect(fatInput).toHaveValue('50');

    // Salva as alterações
    await page.getByRole('button', { name: /Salvar Metas/i }).click();
    await expect(page.getByText('Controle de Macronutrientes')).not.toBeVisible();
  });
});

