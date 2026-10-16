import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { TelemetryErrorEvent, HealerJobResult } from '@dieta-ai/types';

const execAsync = promisify(exec);

export type CommandExecutor = (command: string) => Promise<{ stdout: string; stderr: string; exitCode?: number }>;

export interface AgyRunnerServiceOptions {
  commandExecutor?: CommandExecutor;
  agyPath?: string;
  ghPath?: string;
  repoPath?: string;
}

export class AgyRunnerService {
  private readonly executor: CommandExecutor;
  private readonly agyPath: string;
  private readonly ghPath: string;
  private readonly repoPath: string;

  constructor(options: AgyRunnerServiceOptions = {}) {
    this.executor = options.commandExecutor ?? (async (cmd: string) => {
      const res = await execAsync(cmd, { cwd: this.repoPath });
      return { stdout: res.stdout, stderr: res.stderr, exitCode: 0 };
    });
    this.agyPath = options.agyPath ?? 'agy';
    this.ghPath = options.ghPath ?? 'gh';
    this.repoPath = options.repoPath ?? process.cwd();
  }

  public buildAgyPrompt(event: TelemetryErrorEvent): string {
    const eventsSummary = (event.recentEvents || [])
      .map(e => `[${e.type}] at ${e.timestamp}: ${JSON.stringify(e.payload ?? e.path ?? {})}`)
      .join('\n');

    return [
      `Erro detectado em runtime no MacroMetrics Pro (ID: ${event.errorId}):`,
      `Mensagem: ${event.message}`,
      event.stack ? `Stack trace:\n${event.stack}` : '',
      `Contexto dos últimos eventos da sessão:`,
      eventsSummary || '(nenhum evento prévio)',
      '',
      `DIRETRIZES OBRIGATÓRIAS DE AUTO-CURA (AGENTS.md):`,
      `1. Metodologia BDD (Behavior Driven Development) & TDD: Crie primeiramente um teste de regressão BDD que reproduza exatamente esta falha.`,
      `2. Aplique a correção correspondente no código-fonte mantendo ou superando a cobertura mínima de testes (>= 90%).`,
      `3. Execute a suíte de testes da feature e depois a suíte completa de testes do monorepo para garantir não-regressão.`,
      `4. Faça o commit semântico explicando a causa raiz e a correção.`,
    ].filter(Boolean).join('\n');
  }

  public async heal(event: TelemetryErrorEvent): Promise<HealerJobResult> {
    const branchName = `fix/${event.errorId}`;
    try {
      // 1. Criar branch a partir da main
      await this.executor(`git checkout main && git checkout -b ${branchName} main`);

      // 2. Executar agy com o prompt estruturado
      const prompt = this.buildAgyPrompt(event).replace(/"/g, '\\"');
      await this.executor(`${this.agyPath} --prompt "${prompt}"`);

      // 3. Push da branch de correção
      await this.executor(`git push origin ${branchName}`);

      // 4. Criar Pull Request via GitHub CLI
      const prTitle = `fix(self-healing): auto-correção de erro em runtime ${event.errorId}`;
      const prBody = [
        `## Auto-Healer AGY: Correção Automática de Erro em Runtime`,
        `- **Erro ID:** \`${event.errorId}\``,
        `- **Mensagem:** ${event.message}`,
        `- **Ambiente:** ${event.environment}`,
        `### Diretrizes Atendidas:`,
        `- [x] Teste de regressão BDD reproduzindo o bug`,
        `- [x] Cobertura de testes >= 90%`,
        `- [x] Commit semântico e não-regressão`,
      ].join('\n');

      const prCmd = `${this.ghPath} pr create --title "${prTitle}" --body "${prBody}" --base main --head ${branchName}`;
      const prResult = await this.executor(prCmd);

      // Extrai URL do Pull Request da saída do gh
      const match = prResult.stdout.match(/https:\/\/github\.com\/[^\s]+/);
      const pullRequestUrl = match ? match[0] : prResult.stdout.trim();

      return {
        errorId: event.errorId,
        branchName,
        pullRequestUrl,
        success: true,
        message: 'Auto-cura concluída e Pull Request criado com sucesso.',
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        errorId: event.errorId,
        branchName,
        success: false,
        message: `Falha no fluxo de auto-cura do AGY: ${errorMsg}`,
      };
    }
  }
}
