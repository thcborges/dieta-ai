# MacroMetrics Pro (`dieta-ai`)

> **Motor de decisão, auditoria matemática implacável e planejamento alimentar por engenharia reversa de macronutrientes.**

[![CI/CD Develop](https://github.com/thcborges/dieta-ai/actions/workflows/ci-dev.yml/badge.svg)](https://github.com/thcborges/dieta-ai/actions/workflows/ci-dev.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Documentation](https://img.shields.io/badge/Docs-GitHub%20Pages-informational)](https://thcborges.github.io/dieta-ai/)

---

## 1. Visão do Produto

O **MacroMetrics Pro** difere-se radicalmente de diários passivos de calorias (como MyFitnessPal ou FatSecret): é um **motor analítico proativo**. Em vez de apenas registrar o que já foi consumido, ele antecipa eventos sociais hipercalóricos (rodízios, churrascos, festas) e recalcula matematicamente o orçamento limpo restante para blindar a massa magra e o déficit calórico semanal.

### Perfil de Usuário & Filosofia de UX
- **Interface Analítica Escura (*Dark Dashboard*):** Alinhada integralmente ao Material Design 3 (M3) com superfícies tonais de alto contraste.
- **Métricas Exatas:** Zero mensagens motivacionais ou emocionais. Apenas matemática implacável, alertas lógicos de risco e solvers determinísticos de macronutrientes.

---

## 2. Funcionalidades Centrais

### Módulo 1: Motor Biométrico & Metas Dinâmicas
- Cálculo automático da Taxa Metabólica Basal via equação **Mifflin-St Jeor** e Gasto Energético Total (GET/TDEE).
- Metas parametrizáveis por `g/kg` ou valores absolutos, suportando tetos proteicos agressivos (de 2.0 a 2.5 g/kg de peso corporal).

### Módulo 2: Simulador de Buffer de Evento Social (Engenharia Reversa)
- Alocação prévia de eventos (*Noite da Pizza*, *Churrasco*, *Festa Infantil* ou *Customizado*).
- Dedução automática do orçamento total e cálculo do **Orçamento Limpo Restante** e do **Índice de Densidade Proteica Exigida** (`g de proteína / 100 kcal`).

### Módulo 3: Construtor de Refeições & Banco de Alimentos
- Janelas práticas: *Café da Manhã / Pré-Treino*, *Almoço*, *Lanche da Tarde*, *Jantar / Evento*.
- **Solver "Auto-Completar Proteína":** Algoritmo determinístico que calcula a gramatura exata de fontes magras (Sassami, Whey Protein) para zerar o déficit proteico sem ultrapassar gorduras e calorias.
- **Cópia Rápida de Refeições:** Duplicação ágil de refeições entre janelas ou entre dias.
- **Módulo de Receitas:** Composição com porções customizadas, rendimento total e lançamento fracionado.

### Módulo 4: Análise Multimodal de Fotos de Prato (Google Vertex AI)
- Reconhecimento visual de refeições integrado à API **Google Vertex AI** com modelo Gemini Flash.
- **Zero Tolerância para Suposições Ocultas:** Havendo incerteza no preparo (grelhado vs frito, azeites ocultos), o modelo marca flags de incerteza e notas explicativas.
- Validação no modal M3 com seleção automática do campo para edição instantânea das gramaturas estimadas.

### Módulo 5: Auditoria Lógica Implacável (Conselheiro Sênior)
- **Alerta de Inviabilidade Matemática:** Disparado quando a proteína necessária exige mais calorias do que o orçamento restante ($P_{restante} \times 4 > Kcal_{restantes}$).
- **Alerta de Diluição Proteica:** Disparado quando a ingestão proteica projetada fica abaixo do piso de segurança (< 1.8 g/kg).
- **Alerta de Quebra de Déficit:** Quantificação exata de quantos dias de déficit foram neutralizados por um superávit.

### Módulo 6: Termômetro & Banco de Calorias Semanal
- Consolidação do balanço energético semanal de 7 dias, permitindo poupar calorias em dias específicos para gastar em eventos sociais.

### Módulo 7: Privacidade, LGPD & Painel Admin
- **Blind Indexing (HMAC-SHA256 com Pepper seguro):** Consultas determinísticas para identidade do usuário sem expor dados em texto claro.
- **Criptografia AES-256-GCM:** Proteção de dados biométricos e diários.
- **Direito ao Esquecimento:** Solicitação de exclusão definitiva da conta no app dentro do prazo legal de 15 dias (Art. 18 e 19 da LGPD).

### Módulo 8: Observabilidade, Self-Healing & Telemetria
- Captura estruturada de erros em tempo de execução com os 10 últimos eventos de contexto da sessão.
- Roteamento via Cloud Logging Sink para tópicos do Google Cloud Pub/Sub.
- Worker de auto-recuperação (`error-healer`) integrado a Bot do Telegram com suporte a disparo sob demanda (`/deploy-dev`).

---

## 3. Arquitetura e Stack Tecnológica

O projeto é estruturado como um monorepo TypeScript gerenciado com `pnpm`:

```
dieta-ai/
├── apps/
│   ├── web/               # Frontend React 19 + Vite (PWA) + Capacitor 6 + Playwright E2E
│   ├── api/               # Backend Fastify + TypeScript (Google Cloud Run em us-central1)
│   └── error-healer/      # Consumer Pub/Sub para auto-cura AGY e bot do Telegram
├── packages/
│   ├── core/              # Regras puras de domínio: fórmulas, biometria, auditor, solvers
│   └── types/             # Tipagens TypeScript e DTOs compartilhados entre cliente e servidor
├── docs/                  # Documentação oficial VitePress publicada no GitHub Pages
├── infra/
│   └── terraform/         # Infraestrutura como Código (us-central1, dev e prd)
├── docker-compose.emulator.yml # Firestore Emulator local hermético
└── .github/
    └── workflows/         # CI/CD (GitHub Actions + Trivy + HuskyCI + GitHub Pages)
```

### Stack Principal
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Material Design 3 (M3), Lucide React.
- **Multiplataforma:** Progressive Web App (PWA) com Service Worker / Manifest e Capacitor 6 (Android).
- **Backend:** Fastify 5, Node.js 22 LTS, TypeScript, Google Cloud Run (`us-central1`).
- **Banco de Dados:** Google Cloud Firestore (Modo Nativo) com persistência offline-first via IndexedDB (Dexie).
- **Inteligência Artificial:** Google Cloud Vertex AI (Gemini Flash).
- **Infraestrutura como Código (IaC):** HashiCorp Terraform 1.16+ provisionando recursos na região `us-central1` (elegível ao Free Tier contínuo da GCP).
- **Testes:** Vitest (BDD/TDD com cobertura $\ge 90\%$) e Playwright E2E.

---

## 4. Começando (Guia Rápido de Instalação)

### Pré-requisitos
- **Node.js:** versão `>= 22.0.0`
- **pnpm:** versão `12.11.2` (ou compatível instalável via `corepack enable pnpm`)
- **Terraform:** versão `>= 1.5.0` (para validação de IaC)

### 1. Clonar o Repositório
```bash
git clone git@github.com:thcborges/dieta-ai.git
cd dieta-ai
```

### 2. Instalar Dependências
```bash
pnpm install
```

### 3. Build Global dos Pacotes
```bash
pnpm build
```

### 4. Executar os Ambientes de Desenvolvimento
```bash
# Executar a aplicação Web (Vite PWA na porta 5173)
pnpm dev

# Executar a API Fastify (Backend na porta 8080)
pnpm dev:api

# Executar o worker de auto-recuperação (Error Healer)
pnpm dev:healer
```

### 5. Executar os Testes Automatizados
```bash
# Suíte completa com relatório de cobertura (cobertura obrigatória >= 90%)
pnpm test:coverage

# Testes de integração de infraestrutura Terraform
pnpm --filter @dieta-ai/infra test
```

### 6. Documentação VitePress
```bash
# Executar servidor local de documentação
pnpm docs:dev

# Build da documentação
pnpm docs:build
```

---

## 5. Diretrizes de Segurança Zero-Trust

- **Validação no Servidor:** O cliente web/mobile é considerado ambiente não confiável. Todas as metas, cálculos de macronutrientes e regras de negócio são recalculados e auditados estritamente na API Fastify no Cloud Run.
- **Isolamento de Identidade:** Autenticação exclusiva via tokens criptográficos assinados pelo Google Identity Services, com extração segura do Subject ID (`sub`) e blind indexing com pepper HMAC-SHA256 no backend.
- **Segredos Segregados:** Nenhuma chave privada ou segredo é exposto em bundles web (`VITE_*`).

---

## 6. Licença

Este projeto é distribuído sob a licença **GNU General Public License v3.0** (GPL-3.0). Consulte o arquivo [LICENSE](LICENSE) para obter o texto integral da licença e suas condições de cópia, redistribuição e modificação com preservação de código aberto.
