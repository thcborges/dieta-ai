import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA Manifest & Static Assets Integrity Suite', () => {
  const rootDir = path.resolve(__dirname, '..');
  const publicDir = path.resolve(rootDir, 'public');

  function getPngDimensions(filePath: string): { width: number; height: number; isValid: boolean } {
    if (!fs.existsSync(filePath)) {
      return { width: 0, height: 0, isValid: false };
    }
    const buf = fs.readFileSync(filePath);
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (!buf.subarray(0, 8).equals(pngSignature)) {
      return { width: 0, height: 0, isValid: false };
    }
    // IHDR chunk: width at 16, height at 20
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height, isValid: true };
  }

  it('deve garantir que o diretório apps/web/public existe', () => {
    expect(fs.existsSync(publicDir)).toBe(true);
  });

  it('deve garantir que pwa-192x192.png existe e é um PNG válido com 192x192', () => {
    const iconPath = path.join(publicDir, 'pwa-192x192.png');
    expect(fs.existsSync(iconPath)).toBe(true);

    const dims = getPngDimensions(iconPath);
    expect(dims.isValid).toBe(true);
    expect(dims.width).toBe(192);
    expect(dims.height).toBe(192);
  });

  it('deve garantir que pwa-512x512.png existe e é um PNG válido com 512x512', () => {
    const iconPath = path.join(publicDir, 'pwa-512x512.png');
    expect(fs.existsSync(iconPath)).toBe(true);

    const dims = getPngDimensions(iconPath);
    expect(dims.isValid).toBe(true);
    expect(dims.width).toBe(512);
    expect(dims.height).toBe(512);
  });

  it('deve garantir que apple-touch-icon.png existe e é um PNG válido com 180x180', () => {
    const iconPath = path.join(publicDir, 'apple-touch-icon.png');
    expect(fs.existsSync(iconPath)).toBe(true);

    const dims = getPngDimensions(iconPath);
    expect(dims.isValid).toBe(true);
    expect(dims.width).toBe(180);
    expect(dims.height).toBe(180);
  });

  it('deve garantir a existência de favicon.ico e ícones vetoriais SVG (vite.svg e favicon.svg)', () => {
    const viteSvgPath = path.join(publicDir, 'vite.svg');
    const faviconSvgPath = path.join(publicDir, 'favicon.svg');
    const faviconIcoPath = path.join(publicDir, 'favicon.ico');

    expect(fs.existsSync(viteSvgPath)).toBe(true);
    expect(fs.existsSync(faviconSvgPath)).toBe(true);
    expect(fs.existsSync(faviconIcoPath)).toBe(true);

    const svgContent = fs.readFileSync(viteSvgPath, 'utf-8');
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('</svg>');
  });

  it('deve validar referências de ícone no index.html', () => {
    const indexHtmlPath = path.join(rootDir, 'index.html');
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

    expect(indexHtml).toContain('rel="icon"');
    expect(indexHtml).toContain('rel="apple-touch-icon"');
  });

  it('deve validar que vite.config.ts define os ícones do manifest com propósito maskable', () => {
    const viteConfigPath = path.join(rootDir, 'vite.config.ts');
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');

    expect(viteConfig).toContain('/pwa-192x192.png');
    expect(viteConfig).toContain('/pwa-512x512.png');
    expect(viteConfig).toContain('any maskable');
  });
});
