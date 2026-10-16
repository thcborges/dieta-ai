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
});
