import { test, expect } from '@playwright/test';

test.describe('Módulo de Receitas Compostas (Módulo 3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    try {
      await page.getByRole('button', { name: /Entrar com Google/i }).click({ timeout: 4000 });
    } catch {
      // Usuário já autenticado na sessão
    }
    await expect(page.getByRole('heading', { name: 'Café da Manhã / Pré-Treino' })).toBeVisible({ timeout: 20000 });
  });

  test('deve permitir criar receita composta, salvar e lançar porção/fração no diário', async ({ page }) => {
    // 1. Clica no botão de Gerenciar Receitas no topo do Cronometer UX
    const recipesBtn = page.getByRole('button', { name: /Minhas Receitas/i });
    await expect(recipesBtn).toBeVisible();
    await recipesBtn.click();

    // 2. Verifica abertura do modal de lista de receitas
    const listModal = page.getByRole('heading', { name: 'Minhas Receitas' });
    await expect(listModal).toBeVisible();

    // 3. Clica para criar nova receita
    const newRecipeBtn = page.getByRole('button', { name: /Nova Receita|Criar Primeira Receita/i });
    await newRecipeBtn.first().click();

    // 4. Modal de criação de receita
    const createHeader = page.getByRole('heading', { name: 'Criar Nova Receita' });
    await expect(createHeader).toBeVisible();

    // Preenche nome, porções e unidade
    await page.locator('#recipe-name').fill('Panqueca Proteica de Claras e Whey');
    await page.locator('#recipe-servings').fill('2');
    await page.locator('#recipe-unit-name').fill('panqueca');

    // Adiciona Sassami (200g) como ingrediente de teste
    await page.locator('#select-food-ingredient').selectOption({ label: /Filé de Sassami/i });
    await page.locator('#ingredient-grams-input').fill('200');
    await page.getByRole('button', { name: /^Adicionar$/i }).click();

    // Verifica que o ingrediente aparece na lista e o resumo nutricional calculou macros
    await expect(page.getByText('200g').first()).toBeVisible();
    await expect(page.getByText(/330 kcal/i).first()).toBeVisible();

    // Salva a receita
    await page.getByRole('button', { name: /Salvar Receita/i }).click();

    // 5. A receita deve constar no modal de receitas
    await expect(page.getByText('Panqueca Proteica de Claras e Whey')).toBeVisible();
    await expect(page.getByText(/2 panquecas/i)).toBeVisible();

    // 6. Clica em lançar a receita no diário
    const launchRecipeBtn = page.getByRole('button', { name: /Lançar/i }).first();
    await launchRecipeBtn.click();

    // 7. Modal de lançamento abre com opções de porção/fração
    await expect(page.getByText('Lançar Receita no Diário')).toBeVisible();
    await page.locator('#meal-window-select').selectOption('breakfast');

    // Confirma adição ao diário
    await page.getByRole('button', { name: /Adicionar ao Diário/i }).click();

    // 8. O item deve ser exibido na janela do Café da Manhã
    await expect(page.getByText(/Panqueca Proteica de Claras e Whey/i).first()).toBeVisible();
    await expect(page.getByText(/1 panqueca/i).first()).toBeVisible();
  });
});
