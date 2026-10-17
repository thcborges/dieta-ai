import { test, expect } from '@playwright/test';

test.describe('Validação E2E: Layout Responsivo do Cabeçalho Mobile', () => {
  test('deve renderizar o cabeçalho no mobile sem overflow horizontal e sem colisão de elementos', async ({ page }) => {
    // Define viewport mobile estrita (390x844 - padrão iPhone / Pixel)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Faz login para exibir o dashboard com o cabeçalho completo
    const loginButton = page.getByRole('button', { name: /Entrar com Google/i });
    await loginButton.click();

    // 1. O título e a marca devem estar visíveis
    const title = page.getByText('MacroMetrics Pro');
    await expect(title).toBeVisible();

    // 2. Os botões de ação devem estar visíveis no mobile (como ícones acessíveis)
    const macrosBtn = page.getByRole('button', { name: /Controlar Macros/i });
    const accountBtn = page.getByRole('button', { name: /Conta & LGPD/i });
    const logoutBtn = page.getByRole('button', { name: /Sair/i });

    await expect(macrosBtn).toBeVisible();
    await expect(accountBtn).toBeVisible();
    await expect(logoutBtn).toBeVisible();

    // 3. O seletor de data deve estar visível
    const dateInput = page.locator('#diary-date-picker');
    await expect(dateInput).toBeVisible();

    // 4. Nenhum botão ou elemento do cabeçalho pode ultrapassar a largura da tela (overflow)
    const viewportWidth = 390;
    const header = page.locator('header');
    const headerBox = await header.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(headerBox!.width).toBeLessThanOrEqual(viewportWidth);

    // Valida que todos os botões estão contidos dentro da viewport
    for (const btn of [macrosBtn, accountBtn, logoutBtn]) {
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth);
    }

    // 5. O documento como um todo não deve possuir rolagem horizontal
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
