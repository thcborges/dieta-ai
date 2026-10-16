import React from 'react';
import { ShieldCheck, Activity, Target, Lock } from 'lucide-react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const handleGoogleLogin = () => {
    // Simula autenticação Google bem-sucedida (Google Identity Services / Firebase Auth)
    const user: AuthUser = {
      id: 'usr_thcborges',
      email: 'thcborges@example.com',
      name: 'Líder Técnico em Engenharia de Dados',
    };
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-m3-background text-m3-on-surface flex flex-col justify-center items-center px-4 py-8">
      <div className="max-w-md w-full bg-m3-surface-container rounded-3xl p-6 sm:p-8 border border-m3-outline-variant shadow-2xl space-y-6">
        {/* Header & Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-m3-primary text-m3-on-primary flex items-center justify-center font-black font-mono text-2xl shadow-lg shadow-m3-primary/20">
            M
          </div>
          <h1 className="text-2xl font-black tracking-tight text-m3-on-surface">
            MacroMetrics Pro
          </h1>
          <p className="text-xs text-m3-outline font-mono">
            Engenharia Reversa de Macronutrientes • Auditoria Matemática
          </p>
        </div>

        {/* Informações sobre autenticação obrigatória */}
        <div className="bg-m3-surface-container-low rounded-2xl p-4 border border-m3-outline-variant/60 space-y-3">
          <div className="flex items-center gap-2 text-m3-primary text-xs font-semibold">
            <Lock className="w-4 h-4" />
            <span>Acesso Restrito & Proteção de Dados</span>
          </div>
          <p className="text-xs text-m3-on-surface-variant leading-relaxed">
            Faça login com sua Conta Google para acessar o diário alimentar, planejar buffers de eventos sociais e ter controle exclusivo dos seus macronutrientes.
          </p>
        </div>

        {/* Destaques das Funcionalidades */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="bg-m3-surface-container-highest/40 p-3 rounded-xl border border-m3-outline-variant/40">
            <div className="flex items-center gap-1.5 text-m3-metric-protein text-xs font-semibold mb-1">
              <Target className="w-3.5 h-3.5" />
              <span>Metas Pessoais</span>
            </div>
            <p className="text-[11px] text-m3-outline">
              Controle customizado de calorias, proteínas, carbos, gorduras e fibras.
            </p>
          </div>

          <div className="bg-m3-surface-container-highest/40 p-3 rounded-xl border border-m3-outline-variant/40">
            <div className="flex items-center gap-1.5 text-m3-tertiary text-xs font-semibold mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Engenharia Reversa</span>
            </div>
            <p className="text-[11px] text-m3-outline">
              Simulador de buffer pré-evento para blindagem de déficit semanal.
            </p>
          </div>
        </div>

        {/* Botão de Login com Google Oficial */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-m3-surface-container-highest hover:bg-m3-surface-variant text-m3-on-surface border border-m3-outline-variant font-medium text-sm py-3 px-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-semibold">Entrar com Google</span>
          </button>
        </div>

        {/* Rodapé LGPD e Blind Indexing */}
        <div className="pt-2 border-t border-m3-outline-variant/40 flex items-center justify-center gap-1.5 text-[11px] text-m3-outline">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Conformidade Estrita LGPD • Blind Indexing HMAC-SHA256</span>
        </div>
      </div>
    </div>
  );
};
