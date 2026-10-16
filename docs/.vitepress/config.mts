import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'MacroMetrics Pro',
  description: 'Motor de Decisão, Auditoria Matemática e Engenharia Reversa de Macronutrientes',
  base: '/dieta-ai/',
  lang: 'pt-BR',
  appearance: 'force-dark',
  lastUpdated: true,
  markdown: {
    lineNumbers: true,
  },
  themeConfig: {
    siteTitle: 'MacroMetrics Pro',
    nav: [
      { text: 'Visão Geral', link: '/' },
      { text: 'Guia Rápido', link: '/guide/getting-started' },
      { text: 'Módulos do Sistema', link: '/guide/biometrics' },
      { text: 'Arquitetura & Engenharia', link: '/guide/architecture' },
      { text: 'Governança & QA', link: '/guide/governance' },
    ],
    sidebar: [
      {
        text: '📖 Visão Geral (Nível 1)',
        items: [
          { text: 'Apresentação do Produto', link: '/' },
          { text: 'Primeiros Passos & Login', link: '/guide/getting-started' },
          { text: 'Arquitetura do Sistema', link: '/guide/architecture' },
        ],
      },
      {
        text: '⚙️ Mecânicas & Módulos (Nível 2 - Detalhes)',
        collapsed: false,
        items: [
          { text: '1. Motor Biométrico & Fibras', link: '/guide/biometrics' },
          { text: '2. Buffer Reverso & Eventos', link: '/guide/reverse-buffer' },
          { text: '3. Construtor & Solver de Proteína', link: '/guide/meal-builder' },
          { text: '4. Auditor Lógico Implacável', link: '/guide/logic-auditor' },
          { text: '5. Banco de Calorias Semanal', link: '/guide/calorie-bank' },
          { text: '6. Privacidade & LGPD', link: '/guide/privacy-lgpd' },
          { text: '7. Observabilidade & Bot Telegram', link: '/guide/observability' },
        ],
      },
      {
        text: '🛡️ Governança & Qualidade',
        collapsed: false,
        items: [
          { text: 'Ciclo de Branches & PR Reviewer', link: '/guide/governance' },
          { text: 'Playwright E2E & Firestore Emulator', link: '/guide/e2e-testing' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/thcborges/dieta-ai' },
    ],
    footer: {
      message: 'MacroMetrics Pro — Engenharia reversa e blindagem metabólica.',
      copyright: 'Copyright © 2026 Thiago Borges (@thcborges)',
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Pesquisar na documentação...' },
          modal: { displayDetails: 'Exibir detalhes' },
        },
      },
    },
  },
});
