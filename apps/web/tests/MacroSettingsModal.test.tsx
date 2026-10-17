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

  it('deve permitir editar inputs individuais de calorias, proteínas, carbos e gorduras e usar recomendação de fibra', () => {
    const onSave = vi.fn();
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={onSave}
      />
    );

    const calInput = screen.getByDisplayValue('2400');
    fireEvent.change(calInput, { target: { value: '2500' } });

    const protInput = screen.getByDisplayValue('220');
    fireEvent.change(protInput, { target: { value: '230' } });

    const carbInput = screen.getByDisplayValue('180');
    fireEvent.change(carbInput, { target: { value: '190' } });

    const fatInput = screen.getByDisplayValue('75');
    fireEvent.change(fatInput, { target: { value: '80' } });

    const useRecBtn = screen.getByRole('button', { name: /Usar recomendação/i });
    fireEvent.click(useRecBtn);

    const saveButton = screen.getByRole('button', { name: /Salvar Metas/i });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        calories: 2500,
        proteinGrams: 230,
        carbGrams: 190,
        fatGrams: 80,
        fiberGrams: 38,
      })
    );
  });

  it('deve permitir fornecer TMB via exame de bioimpedância, selecionar objetivo e calcular macros recomendados', () => {
    const onSave = vi.fn();
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={onSave}
      />
    );

    // Seleciona a opção de fornecer TMB manual (Bioimpedância)
    const bioRadio = screen.getByLabelText(/Fornecer TMB \(Bioimpedância\)/i);
    fireEvent.click(bioRadio);

    // Deve exibir o campo de TMB manual
    const bmrInput = screen.getByLabelText(/TMB do Exame/i);
    fireEvent.change(bmrInput, { target: { value: '1850' } });

    // Seleciona Nível de Atividade Física (Moderado)
    const activitySelect = screen.getByLabelText(/Nível de Atividade Física/i);
    fireEvent.change(activitySelect, { target: { value: 'moderate' } });

    // Seleciona Objetivo (Emagrecer)
    const goalSelect = screen.getByLabelText(/Objetivo Nutricional/i);
    fireEvent.change(goalSelect, { target: { value: 'weight_loss' } });

    // Clica no botão para calcular metas pelo objetivo
    const calcGoalBtn = screen.getByRole('button', { name: /Calcular Metas para este Objetivo/i });
    fireEvent.click(calcGoalBtn);

    const calInput = screen.getByLabelText(/Calorias Alvo/i);
    expect(calInput).toHaveValue(2368);

    const protInput = screen.getByLabelText(/Proteínas/i);
    expect(protInput).toHaveValue(209);

    const fatInput = screen.getByLabelText(/Gorduras/i);
    expect(fatInput).toHaveValue(76);

    const carbInput = screen.getByLabelText(/Carboidratos/i);
    expect(carbInput).toHaveValue(212);

    // Salva as metas
    const saveButton = screen.getByRole('button', { name: /Salvar Metas/i });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        bmrSource: 'manual_bioimpedance',
        manualBmr: 1850,
        activityLevel: 'moderate',
        goal: 'weight_loss',
        calories: 2368,
        proteinGrams: 209,
        fatGrams: 76,
        carbGrams: 212,
      })
    );
  });

  it('deve calcular metas para Ganho de Peso e Manutenção com proporções recomendadas', () => {
    const onSave = vi.fn();
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={onSave}
      />
    );

    // Seleciona Bioimpedância
    const bioRadio = screen.getByLabelText(/Fornecer TMB \(Bioimpedância\)/i);
    fireEvent.click(bioRadio);

    const bmrInput = screen.getByLabelText(/TMB do Exame/i);
    fireEvent.change(bmrInput, { target: { value: '2000' } });

    // Seleciona Atividade Leve (1.375) -> TDEE = 2750
    const activitySelect = screen.getByLabelText(/Nível de Atividade Física/i);
    fireEvent.change(activitySelect, { target: { value: 'light' } });

    // Seleciona Objetivo Ganho de Peso
    const goalSelect = screen.getByLabelText(/Objetivo Nutricional/i);
    fireEvent.change(goalSelect, { target: { value: 'muscle_gain' } });

    const calcGoalBtn = screen.getByRole('button', { name: /Calcular Metas para este Objetivo/i });
    fireEvent.click(calcGoalBtn);

    const calInput = screen.getByLabelText(/Calorias Alvo/i);
    expect(calInput).toHaveValue(3100);

    const protInput = screen.getByLabelText(/Proteínas/i);
    expect(protInput).toHaveValue(190);
  });

  it('deve permitir alterar o objetivo nutricional e customizar superávit/déficit', () => {
    const onSave = vi.fn();
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={onSave}
      />
    );

    const goalSelect = screen.getByLabelText(/Objetivo Nutricional/i);
    fireEvent.change(goalSelect, { target: { value: 'muscle_gain' } });

    const surplusInput = screen.getByLabelText(/Superávit Diário Alvo/i);
    fireEvent.change(surplusInput, { target: { value: '450' } });

    const saveButton = screen.getByRole('button', { name: /Salvar Metas/i });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        goal: 'muscle_gain',
        dailySurplusKcal: 450,
      })
    );
  });

  it('deve garantir alinhamento visual robusto dos campos biométricos e sem quebra indevida no GET/TDEE', () => {
    render(
      <MacroSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentSettings={initialSettings}
        onSave={vi.fn()}
      />
    );

    // Seleciona Bioimpedância para exibir os 4 campos na mesma linha
    const bioRadio = screen.getByLabelText(/Fornecer TMB \(Bioimpedância\)/i);
    fireEvent.click(bioRadio);

    const bmrInput = screen.getByLabelText(/TMB do Exame/i);
    const ageInput = screen.getByLabelText(/^Idade/i);
    const weightInput = screen.getByLabelText(/Peso Corporal/i);
    const genderSelect = screen.getByLabelText(/Sexo Biológico/i);

    // O container de TMB manual não deve ter col-span-2 que desalinha a grade de 4 colunas
    expect(bmrInput.parentElement?.className).not.toContain('col-span-2');

    // Cada campo deve possuir flex-col justify-between para alinhar os inputs na mesma linha horizontal
    expect(bmrInput.parentElement?.className).toContain('justify-between');
    expect(ageInput.parentElement?.className).toContain('justify-between');
    expect(weightInput.parentElement?.className).toContain('justify-between');
    expect(genderSelect.parentElement?.className).toContain('justify-between');

    // O indicador de GET / TDEE Projetado deve prevenir quebra feia da unidade kcal
    const tdeeElement = screen.getByText(/GET \/ TDEE Projetado/i).closest('div');
    expect(tdeeElement?.innerHTML).toContain('whitespace-nowrap');

    // O modal deve utilizar max-w-xl para evitar compressão visual dos campos no desktop
    const modalDialog = screen.getByText(/Controle de Macronutrientes/i).closest('.bg-m3-surface-container');
    expect(modalDialog?.className).toContain('max-w-xl');
  });
});

