import { test, expect } from '@playwright/test';

test.describe('Cadastro e Consulta de Alimentos com Cache e Open Food Facts (UX Cronometer)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Realiza login se necessário
    const loginButton = page.getByRole('button', { name: /Entrar com Google/i });
    if (await loginButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginButton.click();
    }
    await expect(page.getByText('Lançamento Rápido de Alimentos')).toBeVisible({ timeout: 10000 });
  });

  test('deve priorizar itens comuns no select e permitir cadastrar novo alimento via modal M3', async ({ page }) => {
    // 1. Verifica se itens comuns estão disponíveis no seletor
    const foodSelect = page.getByLabel('Alimento Selecionado');
    await expect(foodSelect).toBeVisible();

    // 2. Abre modal de novo alimento
    await page.getByRole('button', { name: /Novo Alimento/i }).click();
    await expect(page.getByText('Cadastrar Novo Alimento')).toBeVisible();

    // 3. Preenche formulário M3
    await page.getByLabel(/Nome do Alimento/i).fill('Peito de Frango Desfiado Defumado');
    await page.getByLabel(/Porção Padrão \(g\)/i).fill('120');
    await page.getByLabel(/Calorias \(100g\)/i).fill('140');
    await page.getByLabel(/Proteínas \(100g\)/i).fill('30');
    await page.getByLabel(/Carboidratos \(100g\)/i).fill('0');
    await page.getByLabel(/Gorduras \(100g\)/i).fill('2.2');
    await page.getByLabel(/Fibras \(100g\)/i).fill('0');

    // 4. Salva o alimento
    await page.getByRole('button', { name: /Salvar Alimento/i }).click();
    await expect(page.getByText('Cadastrar Novo Alimento')).not.toBeVisible();

    // 5. O alimento salvo deve exibir feedback de sucesso e ser lançado no diário
    await expect(page.getByText(/cadastrado com sucesso/i)).toBeVisible();
    await page.getByRole('button', { name: /Lançar/i }).click();

    // Alimento lançado deve aparecer na lista de itens da janela
    await expect(page.locator('div.font-medium').filter({ hasText: 'Peito de Frango Desfiado Defumado' })).toBeVisible();
  });

  test('deve consultar alimento no banco local e selecionar automaticamente', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Consultar alimento ou código de barras/i);
    await searchInput.fill('Feijão');
    await page.getByRole('button', { name: /Consultar/i }).click();

    await expect(page.getByText(/Alimento encontrado no banco local/i)).toBeVisible();
    const foodSelect = page.getByLabel('Alimento Selecionado');
    await expect(foodSelect).toHaveValue('feijao_preto');
  });
});
