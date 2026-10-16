import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import capacitorConfig from '../capacitor.config';

describe('Capacitor Mobile (Android) Configuration & Artifact Suite', () => {
  const rootDir = resolve(__dirname, '..');
  const androidDir = resolve(rootDir, 'android');

  it('deve validar a configuração do Capacitor para MacroMetrics Pro', () => {
    expect(capacitorConfig.appId).toBe('com.thcborges.dietaai');
    expect(capacitorConfig.appName).toBe('MacroMetrics Pro');
    expect(capacitorConfig.webDir).toBe('dist');
    expect(capacitorConfig.server?.androidScheme).toBe('https');
  });

  it('deve garantir a existência da pasta nativa android e seus descritores essenciais', () => {
    expect(existsSync(androidDir)).toBe(true);
    expect(existsSync(resolve(androidDir, 'build.gradle'))).toBe(true);
    expect(existsSync(resolve(androidDir, 'app/build.gradle'))).toBe(true);
    expect(existsSync(resolve(androidDir, 'app/src/main/AndroidManifest.xml'))).toBe(true);
  });

  it('deve validar que AndroidManifest e strings.xml definem MacroMetrics Pro e com.thcborges.dietaai', () => {
    const stringsXmlPath = resolve(androidDir, 'app/src/main/res/values/strings.xml');
    const stringsContent = readFileSync(stringsXmlPath, 'utf-8');

    expect(stringsContent).toContain('<string name="app_name">MacroMetrics Pro</string>');
    expect(stringsContent).toContain('<string name="package_name">com.thcborges.dietaai</string>');

    const manifestPath = resolve(androidDir, 'app/src/main/AndroidManifest.xml');
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    expect(manifestContent).toContain('android.permission.INTERNET');
  });

  it('deve validar que as variáveis de SDK atendem à API 34 conforme diretrizes modernas do Android', () => {
    const variablesPath = resolve(androidDir, 'variables.gradle');
    const variablesContent = readFileSync(variablesPath, 'utf-8');

    expect(variablesContent).toMatch(/compileSdkVersion\s*=\s*34/);
    expect(variablesContent).toMatch(/targetSdkVersion\s*=\s*34/);
  });

  it('deve garantir a presença do script build-android.js e scripts no package.json', () => {
    const scriptPath = resolve(rootDir, 'scripts/build-android.js');
    expect(existsSync(scriptPath)).toBe(true);

    const pkgPath = resolve(rootDir, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    expect(pkg.scripts['android:build']).toBeDefined();
    expect(pkg.dependencies['@capacitor/android']).toBeDefined();
    expect(pkg.dependencies['@capacitor/core']).toBeDefined();
  });
});
