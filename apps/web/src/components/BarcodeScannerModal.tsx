import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { X, Camera, Scan, AlertCircle, ArrowRight } from 'lucide-react';

export interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);

  const stopCamera = () => {
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {
        // Ignora erro ao parar controls
      }
      zxingControlsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCameraError(null);
      setManualCode('');
      return;
    }

    let isMounted = true;

    async function initCameraScanner() {
      setCameraError(null);
      setIsScanning(true);

      // 1. Tenta inicializar BarcodeDetector nativo ou ZXing
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Câmera não suportada neste dispositivo/navegador.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Verifica se BarcodeDetector nativo existe no navegador
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as unknown as {
            BarcodeDetector: new (opts?: { formats: string[] }) => {
              detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
            };
          }).BarcodeDetector({
            formats: ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
          });

          let active = true;
          const detectLoop = async () => {
            if (!active || !isMounted || !videoRef.current) return;
            try {
              if (videoRef.current.readyState >= 2) {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0 && barcodes[0]?.rawValue) {
                  active = false;
                  stopCamera();
                  onScan(barcodes[0].rawValue);
                  onClose();
                  return;
                }
              }
            } catch {
              // Continua loop
            }
            if (active && isMounted) {
              requestAnimationFrame(detectLoop);
            }
          };

          requestAnimationFrame(detectLoop);
          zxingControlsRef.current = {
            stop: () => {
              active = false;
            },
          };
        } else {
          // Fallback ZXing
          const reader = new BrowserMultiFormatReader();
          if (videoRef.current) {
            const controls = await reader.decodeFromVideoElement(videoRef.current, (result, error) => {
              if (result && isMounted) {
                const text = result.getText();
                if (text) {
                  stopCamera();
                  onScan(text);
                  onClose();
                }
              }
              if (error && error.name !== 'NotFoundException') {
                // Erro transitório de decodificação de frame
              }
            });
            zxingControlsRef.current = controls;
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Não foi possível acessar a câmera para escanear.';
        setCameraError(msg);
        setIsScanning(false);
      }
    }

    initCameraScanner();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    stopCamera();
    onScan(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-m3-surface-container rounded-3xl max-w-md w-full border border-m3-outline-variant shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Material Design 3 */}
        <div className="px-5 py-4 border-b border-m3-outline-variant/60 flex items-center justify-between bg-m3-surface-container-high">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-m3-primary/10 text-m3-primary border border-m3-primary/20">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-m3-on-surface">
                Leitor de Código de Barras / QR Code
              </h3>
              <p className="text-[11px] text-m3-outline">
                Aponte a câmera para o código de barras ou QR Code
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Scanner"
            className="p-1.5 rounded-full hover:bg-m3-surface-variant text-m3-outline hover:text-m3-on-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder da Câmera */}
        <div className="p-4 space-y-4">
          <div className="relative aspect-video sm:aspect-square max-h-64 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-m3-outline-variant">
            {cameraError ? (
              <div className="p-4 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs text-amber-200">
                  {cameraError}
                </p>
                <p className="text-[11px] text-m3-outline">
                  Utilize o campo abaixo para inserir o código manualmente.
                </p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Retícula de Enquadramento M3 */}
                <div className="absolute inset-8 border-2 border-dashed border-m3-primary/80 rounded-2xl pointer-events-none flex items-center justify-center">
                  <div className="w-full h-0.5 bg-m3-primary/70 animate-pulse" />
                </div>
              </>
            )}
          </div>

          {/* Fallback de Digitação / Código Manual */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label
              htmlFor="manual-barcode-input"
              className="block text-[11px] font-mono text-m3-outline uppercase"
            >
              Ou digite/cole o código aqui:
            </label>
            <div className="flex gap-2">
              <input
                id="manual-barcode-input"
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Digite ou cole o código (ex: 7891000100010)"
                className="flex-1 bg-m3-surface-container-low border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono text-m3-on-surface focus:outline-none focus:border-m3-primary"
              />
              <button
                type="submit"
                className="flex items-center gap-1 bg-m3-primary text-m3-on-primary text-xs font-semibold px-3 py-2 rounded-xl hover:bg-m3-primary/90 transition-all shadow"
              >
                <span>Validar Código</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
