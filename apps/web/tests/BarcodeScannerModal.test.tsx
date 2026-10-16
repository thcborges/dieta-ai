import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BarcodeScannerModal } from '../src/components/BarcodeScannerModal.js';

describe('BarcodeScannerModal (Leitor Óptico de Código de Barras / QR Code M3)', () => {
  it('não deve renderizar quando isOpen for falso', () => {
    render(
      <BarcodeScannerModal
        isOpen={false}
        onClose={vi.fn()}
        onScan={vi.fn()}
      />
    );

    expect(screen.queryByText(/Leitor de Código de Barras/i)).not.toBeInTheDocument();
  });

  it('deve renderizar viewfinder da câmera e opções quando isOpen for verdadeiro', () => {
    render(
      <BarcodeScannerModal
        isOpen={true}
        onClose={vi.fn()}
        onScan={vi.fn()}
      />
    );

    expect(screen.getByText(/Leitor de Código de Barras \/ QR Code/i)).toBeInTheDocument();
    expect(screen.getByText(/Aponte a câmera para o código de barras ou QR Code/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Digite ou cole o código/i)).toBeInTheDocument();
  });

  it('deve permitir validação de código manual pelo fallback de input', () => {
    const onScan = vi.fn();
    const onClose = vi.fn();

    render(
      <BarcodeScannerModal
        isOpen={true}
        onClose={onClose}
        onScan={onScan}
      />
    );

    const input = screen.getByPlaceholderText(/Digite ou cole o código/i);
    fireEvent.change(input, { target: { value: '7891000100010' } });

    const validateBtn = screen.getByRole('button', { name: /Validar Código/i });
    fireEvent.click(validateBtn);

    expect(onScan).toHaveBeenCalledWith('7891000100010');
    expect(onClose).toHaveBeenCalled();
  });

  it('deve chamar onClose ao clicar no botão fechar', () => {
    const onClose = vi.fn();

    render(
      <BarcodeScannerModal
        isOpen={true}
        onClose={onClose}
        onScan={vi.fn()}
      />
    );

    const closeBtn = screen.getByLabelText(/Fechar Scanner/i);
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it('não deve acionar onScan se o código manual estiver vazio', () => {
    const onScan = vi.fn();
    const onClose = vi.fn();

    render(
      <BarcodeScannerModal
        isOpen={true}
        onClose={onClose}
        onScan={onScan}
      />
    );

    const validateBtn = screen.getByRole('button', { name: /Validar Código/i });
    fireEvent.click(validateBtn);

    expect(onScan).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('deve exibir mensagem de erro quando getUserMedia falhar', async () => {
    const originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('Permissão de câmera negada')),
      },
      writable: true,
      configurable: true,
    });

    render(
      <BarcodeScannerModal
        isOpen={true}
        onClose={vi.fn()}
        onScan={vi.fn()}
      />
    );

    expect(await screen.findByText(/Permissão de câmera negada/i)).toBeInTheDocument();

    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      writable: true,
      configurable: true,
    });
  });

  it('deve usar BarcodeDetector nativo quando disponível e acionar onScan ao detectar código', async () => {
    const onScan = vi.fn();
    const onClose = vi.fn();
    const mockStop = vi.fn();

    const originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: mockStop }],
        }),
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      get: () => 4,
      configurable: true,
    });
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);

    // Mock BarcodeDetector
    class MockBarcodeDetector {
      detect = vi.fn().mockResolvedValue([{ rawValue: '7898912345678' }]);
    }
    (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = MockBarcodeDetector;

    render(
      <BarcodeScannerModal
        isOpen={true}
        onClose={onClose}
        onScan={onScan}
      />
    );

    // Give time for detect loop to trigger
    await vi.waitFor(() => {
      expect(onScan).toHaveBeenCalledWith('7898912345678');
      expect(onClose).toHaveBeenCalled();
    });

    delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      writable: true,
      configurable: true,
    });
  });
});
