import { test, expect } from '@playwright/test';

test.describe('Lançamento Rápido por Macros e Cópia Customizada de Refeição', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    try {
      await page.getByRole('button', { name: /Entrar com Google/i }).click({ timeout: 4000 });
    } catch {
      // Usuário já autenticado na sessão
    }
    await expect(page.getByRole('heading', { name: 'Café da Manhã / Pré-Treino' })).toBeVisible({ timeout: 20000 });
  });

  test('deve permitir realizar lançamento rápido de macros totais via modal de raio (Zap)', async ({ page }) => {
    // 1. Localiza o botão de raio na janela de almoço
    const quickMacroButtons = page.getByRole('button', { name: 'Lançamento Rápido de Macros' });
    await expect(quickMacroButtons.first()).toBeVisible();
    // Clica no botão da janela de Almoço (segunda janela)
    await quickMacroButtons.nth(1).click();

    // 2. Verifica a abertura do modal M3
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Lançamento Rápido de Macros')).toBeVisible();

    // 3. Preenche os campos do formulário
    await dialog.getByLabel(/Descrição/i).fill('Prato Feito Foto Gemini');
    await dialog.getByLabel(/Proteínas/i).fill('45');
    await dialog.getByLabel(/Carboidratos/i).fill('70');
    await dialog.getByLabel(/Gorduras/i).fill('18');
    await dialog.getByLabel(/Fibras/i).fill('6');

    // 4. Utiliza o botão de cálculo automático de calorias (45*4 + 70*4 + 18*9 = 180 + 280 + 162 = 622 kcal)
    const autoCalcBtn = dialog.getByRole('button', { name: /Calcular Calorias pelos Macros/i });
    await autoCalcBtn.click();

    const caloriesInput = dialog.getByLabel(/Calorias/i);
    await expect(caloriesInput).toHaveValue('622');

    // 5. Salva o lançamento rápido
    await dialog.getByRole('button', { name: /Lançar na Refeição/i }).click();

    // 6. Modal fecha e o item é exibido no diário da refeição
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Prato Feito Foto Gemini')).toBeVisible();
    await expect(page.getByText(/622 kcal • 45g P • 70g C • 18g G/i).first()).toBeVisible();
  });

  test('deve permitir abrir modal de cópia de refeição, ajustar porção e replicar para outra janela', async ({ page }) => {
    // 1. Garante que há ao menos um alimento no almoço fazendo lançamento rápido
    const quickMacroButtons = page.getByRole('button', { name: 'Lançamento Rápido de Macros' });
    await quickMacroButtons.nth(1).click();
    const quickDialog = page.getByRole('dialog');
    await quickDialog.getByLabel(/Descrição/i).fill('Sassami Grelhado com Arroz');
    await quickDialog.getByLabel(/Calorias/i).fill('400');
    await quickDialog.getByLabel(/Proteínas/i).fill('40');
    await quickDialog.getByLabel(/Carboidratos/i).fill('45');
    await quickDialog.getByLabel(/Gorduras/i).fill('5');
    await quickDialog.getByRole('button', { name: /Lançar na Refeição/i }).click();
    await expect(quickDialog).not.toBeVisible();
    await expect(page.getByText('Sassami Grelhado com Arroz')).toBeVisible();

    // 2. Abre o modal de copiar refeição do Almoço
    const copyMealButtons = page.getByRole('button', { name: 'Copiar Refeição' });
    await copyMealButtons.nth(1).click();

    const copyDialog = page.getByRole('dialog');
    await expect(copyDialog).toBeVisible();
    await expect(copyDialog.getByText('Sassami Grelhado com Arroz')).toBeVisible();

    // 3. Altera a porção para 150g (de 100g base)
    const portionInput = copyDialog.getByLabel(/Porção de Sassami Grelhado com Arroz/i);
    await portionInput.fill('150');

    // Total de calorias e proteínas deve ser recalculado proporcionalmente no modal (400 * 1.5 = 600 kcal, 40 * 1.5 = 60g P)
    await expect(copyDialog.getByText('Total: 600 kcal • 60g P')).toBeVisible();

    // 4. Seleciona destino: Jantar / Evento
    const targetSelect = copyDialog.getByLabel(/Refeição de Destino/i);
    await targetSelect.selectOption('dinner_event');

    // 5. Confirma a cópia
    await copyDialog.getByRole('button', { name: /Confirmar Cópia/i }).click();
    await expect(copyDialog).not.toBeVisible();

    // 6. O item deve agora constar na listagem do diário com 600 kcal
    await expect(page.getByText(/600 kcal • 60g P • 67\.5g C • 7\.5g G/i).first()).toBeVisible();
  });
});
