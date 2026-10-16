import { test, expect } from '@playwright/test';

test.describe('Scanner Óptico de Código de Barras e QR Code (Módulo 3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Realiza login se necessário
    const loginButton = page.getByRole('button', { name: /Entrar com Google/i });
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click();
    }
    await expect(page.getByText('Lançamento Rápido de Alimentos')).toBeVisible();
  });

  test('deve abrir o modal de scanner, exibir viewfinder e permitir busca por código com sucesso', async ({ page }) => {
    // 1. Clica no botão "Escanear Código"
    const scanButton = page.getByRole('button', { name: /Escanear Código/i });
    await expect(scanButton).toBeVisible();
    await scanButton.click();

    // 2. Modal do scanner deve estar visível com título e instruções M3
    await expect(page.getByText('Leitor de Código de Barras / QR Code')).toBeVisible();
    await expect(page.getByPlaceholder(/Digite ou cole o código/i)).toBeVisible();

    // 3. Testa fechamento pelo botão X
    const closeBtn = page.getByLabel('Fechar Scanner');
    await closeBtn.click();
    await expect(page.getByText('Leitor de Código de Barras / QR Code')).not.toBeVisible();

    // 4. Reabre e valida código pelo input fallback
    await scanButton.click();
    const barcodeInput = page.getByPlaceholder(/Digite ou cole o código/i);
    await barcodeInput.fill('feijao_preto');
    await page.getByRole('button', { name: /Validar Código/i }).click();

    // Modal fecha automaticamente após scan
    await expect(page.getByText('Leitor de Código de Barras / QR Code')).not.toBeVisible();

    // Feedback de alimento encontrado no banco local
    await expect(page.getByText(/Alimento encontrado no banco local/i)).toBeVisible();
    const foodSelect = page.getByLabel('Alimento Selecionado');
    await expect(foodSelect).toHaveValue('feijao_preto');
  });
});
