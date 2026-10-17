import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MacroSettingsModal, type UserMacroSettings } from '../src/components/MacroSettingsModal.js';

describe('MacroSettingsModal (Controle de Macros pelo Usuário)', () => {
  const initialSettings: UserMacroSettings = {
    ageYears: 40,
    gender: 'male',
    weightKg: 95,
    activityLevel: 'moderate',
    dailyDeficitKcal: 500,
    calories: 2400,
    proteinGrams: 220,
    carbGrams: 180,
    fatGrams: 75,
    fiberGrams: 38,
  };

  it('não deve renderizar quando isOpen for false', () => {
    render(
      <MacroSettingsModal
        isOpen={false}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={vi.fn()}
      />
    );

    expect(screen.queryByText(/Controle de Macronutrientes/i)).not.toBeInTheDocument();
  });

  it('deve renderizar os campos de controle de macros e recomendação de fibra por idade', () => {
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText(/Controle de Macronutrientes/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('40')).toBeInTheDocument(); // idade
    expect(screen.getByDisplayValue('95')).toBeInTheDocument(); // peso
    expect(screen.getByDisplayValue('220')).toBeInTheDocument(); // proteína
    expect(screen.getByDisplayValue('38')).toBeInTheDocument(); // fibra
    expect(screen.getByText(/Recomendado para sua idade/i)).toBeInTheDocument();
  });

  it('deve permitir alterar a meta de fibras e salvar os novos macros', () => {
    const onSave = vi.fn();
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={onSave}
      />
    );

    const fiberInput = screen.getByLabelText(/Meta de Fibras/i);
    fireEvent.change(fiberInput, { target: { value: '45' } });

    const saveButton = screen.getByRole('button', { name: /Salvar Metas/i });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        fiberGrams: 45,
      })
    );
  });

  it('deve fechar ao clicar no botão de cancelar', () => {
    const onClose = vi.fn();
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={onClose}
        currentSettings={initialSettings}
        onSave={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it('deve permitir alterar idade, peso, sexo e recalcular macros via Mifflin-St Jeor', () => {
    const onSave = vi.fn();
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={onSave}
      />
    );

    const ageInput = screen.getByDisplayValue('40');
    fireEvent.change(ageInput, { target: { value: '30' } });

    const weightInput = screen.getByDisplayValue('95');
    fireEvent.change(weightInput, { target: { value: '90' } });

    const genderSelect = screen.getByDisplayValue('Masculino');
    fireEvent.change(genderSelect, { target: { value: 'female' } });

    const recalBtn = screen.getByRole('button', { name: /Recalcular via Mifflin-St Jeor/i });
    fireEvent.click(recalBtn);

    const saveButton = screen.getByRole('button', { name: /Salvar Metas/i });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalled();
  });

  it('deve exibir a seção 3. Metas de Macros Diárias no modal', () => {
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText(/3\. Metas de Macros Diárias/i)).toBeInTheDocument();
  });

  it('deve calcular automaticamente calorias alvo quando proteína for alterada', () => {
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={vi.fn()}
      />
    );

    // Initial: 220g P, 180g C, 75g F -> 220*4 + 180*4 + 75*9 = 880 + 720 + 675 = 2275 kcal
    const protInput = screen.getByLabelText(/Proteínas/i);
    const calInput = screen.getByLabelText(/Calorias Alvo/i);

    // Altera proteína de 220 para 240g (+20g * 4 = +80 kcal -> 2275 + 80 = 2355 kcal)
    fireEvent.change(protInput, { target: { value: '240' } });

    expect(calInput).toHaveValue(2355);
  });

  it('deve calcular automaticamente calorias alvo quando carboidrato for alterado', () => {
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={vi.fn()}
      />
    );

    const carbInput = screen.getByLabelText(/Carboidratos/i);
    const calInput = screen.getByLabelText(/Calorias Alvo/i);

    // Altera carboidrato de 180 para 200g (+20g * 4 = +80 kcal -> 2275 + 80 = 2355 kcal)
    fireEvent.change(carbInput, { target: { value: '200' } });

    expect(calInput).toHaveValue(2355);
  });

  it('deve calcular automaticamente calorias alvo quando gordura for alterada', () => {
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={vi.fn()}
      />
    );

    const fatInput = screen.getByLabelText(/Gorduras/i);
    const calInput = screen.getByLabelText(/Calorias Alvo/i);

    // Altera gordura de 75 para 85g (+10g * 9 = +90 kcal -> 2275 + 90 = 2365 kcal)
    fireEvent.change(fatInput, { target: { value: '85' } });

    expect(calInput).toHaveValue(2365);
  });

  it('se Calorias Alvo for aumentada, deve aumentar apenas a quantidade de carboidratos', () => {
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={vi.fn()}
      />
    );

    // Base: 220g P (880 kcal) + 75g F (675 kcal) = 1555 kcal fixas.
    // 2400 kcal iniciais -> Carbs = (2400 - 1555) / 4 = 845 / 4 = 211g carbs
    const calInput = screen.getByLabelText(/Calorias Alvo/i);
    const carbInput = screen.getByLabelText(/Carboidratos/i);
    const protInput = screen.getByLabelText(/Proteínas/i);
    const fatInput = screen.getByLabelText(/Gorduras/i);

    // Aumenta calorias de 2400 para 2600 (+200 kcal -> +50g carbs)
    fireEvent.change(calInput, { target: { value: '2600' } });

    // Carboidratos deve aumentar para (2600 - 1555) / 4 = 1045 / 4 = 261g
    expect(carbInput).toHaveValue(261);
    // Proteína e Gordura devem permanecer idênticas
    expect(protInput).toHaveValue(220);
    expect(fatInput).toHaveValue(75);
  });

  it('se Calorias Alvo for reduzida, deve reduzir apenas a quantidade de carboidratos', () => {
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={vi.fn()}
      />
    );

    const calInput = screen.getByLabelText(/Calorias Alvo/i);
    const carbInput = screen.getByLabelText(/Carboidratos/i);
    const protInput = screen.getByLabelText(/Proteínas/i);
    const fatInput = screen.getByLabelText(/Gorduras/i);

    // Reduz calorias para 2000 kcal (-400 kcal -> -100g carbs)
    // Carbs = (2000 - 1555) / 4 = 445 / 4 = 111g
    fireEvent.change(calInput, { target: { value: '2000' } });

    expect(carbInput).toHaveValue(111);
    expect(protInput).toHaveValue(220);
    expect(fatInput).toHaveValue(75);
  });

  it('se Calorias Alvo for reduzida abaixo da soma de proteína e gordura, carboidratos deve ser 0', () => {
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={vi.fn()}
      />
    );

    const calInput = screen.getByLabelText(/Calorias Alvo/i);
    const carbInput = screen.getByLabelText(/Carboidratos/i);

    // 1200 kcal é menor que 1555 kcal (proteína + gordura)
    fireEvent.change(calInput, { target: { value: '1200' } });

    expect(carbInput).toHaveValue(0);
  });

  it('deve salvar as metas após edições de macros e recálculos automáticos', () => {
    const onSave = vi.fn();
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={onSave}
      />
    );

    const protInput = screen.getByLabelText(/Proteínas/i);
    fireEvent.change(protInput, { target: { value: '230' } });

    const carbInput = screen.getByLabelText(/Carboidratos/i);
    fireEvent.change(carbInput, { target: { value: '190' } });

    const fatInput = screen.getByLabelText(/Gorduras/i);
    fireEvent.change(fatInput, { target: { value: '80' } });

    // 230*4 + 190*4 + 80*9 = 920 + 760 + 720 = 2400 kcal
    const useRecBtn = screen.getByRole('button', { name: /Usar recomendação/i });
    fireEvent.click(useRecBtn);

    const saveButton = screen.getByRole('button', { name: /Salvar Metas/i });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        calories: 2400,
        proteinGrams: 230,
        carbGrams: 190,
        fatGrams: 80,
        fiberGrams: 38,
      })
    );
  });
});

