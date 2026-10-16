#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const webDir = resolve(__dirname, '..');
const repoRoot = resolve(webDir, '../..');
const androidDir = resolve(webDir, 'android');
const apkOutputDir = resolve(androidDir, 'app/build/outputs/apk/debug');
const apkFile = resolve(apkOutputDir, 'app-debug.apk');

console.log('====================================================');
console.log('  MacroMetrics Pro — Mobile Android Build Engine');
console.log('====================================================\n');

// 1. Verificar se pasta nativa android existe
if (!existsSync(androidDir)) {
  console.log('[1/4] Inicializando plataforma nativa Android via Capacitor...');
  execSync('npx cap add android', { cwd: webDir, stdio: 'inherit' });
} else {
  console.log('[1/4] Plataforma Android detectada em:', androidDir);
}

// 2. Sincronizar assets estáticos do PWA
console.log('\n[2/4] Sincronizando web assets para o projeto Android nativo...');
execSync('npx cap sync android', { cwd: webDir, stdio: 'inherit' });

// 3. Executar o build do Gradle (Local ou Containerizado)
console.log('\n[3/4] Compilando APK nativo com Gradle...');

function hasCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const hasLocalAndroidSdk = Boolean(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT);
const hasJava = hasCommand('javac');
const hasDocker = hasCommand('docker');

if (hasLocalAndroidSdk && hasJava) {
  console.log('-> Utilizando ambiente local do Android SDK e JDK...');
  execSync('./gradlew assembleDebug --no-daemon', {
    cwd: androidDir,
    stdio: 'inherit',
  });
} else if (hasDocker) {
  console.log('-> Ambiente local do Android SDK não detectado.');
  console.log('-> Executando build hermético no container Docker (ghcr.io/cirruslabs/android-sdk:34)...');

  const uid = typeof process.getuid === 'function' ? process.getuid() : 1000;
  const gid = typeof process.getgid === 'function' ? process.getgid() : 1000;

  const buildInsideContainer = [
    './gradlew assembleDebug --no-daemon',
    `chown -R ${uid}:${gid} /workspace/apps/web/android/app/build /workspace/apps/web/android/.gradle /workspace/apps/web/android/capacitor-cordova-android-plugins 2>/dev/null || true`,
  ].join(' && ');

  const dockerCmd = [
    'docker run --rm',
    `-v "${repoRoot}:/workspace"`,
    '-w /workspace/apps/web/android',
    'ghcr.io/cirruslabs/android-sdk:34',
    `bash -c "${buildInsideContainer}"`,
  ].join(' ');

  execSync(dockerCmd, { cwd: repoRoot, stdio: 'inherit' });
} else {
  console.error('\n[ERRO CRÍTICO] Nem o Android SDK/JDK local nem o Docker estão disponíveis no sistema.');
  console.error('Instale o Android Studio / SDK ou inicie o serviço do Docker para compilar o APK.');
  process.exit(1);
}

// 4. Validar artefato gerado
console.log('\n[4/4] Validando artefato final...');
if (existsSync(apkFile)) {
  const stats = statSync(apkFile);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log('\n✔ Build Android concluído com sucesso!');
  console.log(`  Arquivo: ${apkFile}`);
  console.log(`  Tamanho: ${sizeMb} MB`);
  console.log('  Tipo: Android Debug APK (instalável via adb install)');
} else {
  console.error('\n[ERRO] O build terminou mas o APK esperado não foi encontrado em:', apkFile);
  process.exit(1);
}
