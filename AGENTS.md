# AGENTS.md — Base de Conhecimento e Diretrizes Centrais: MacroMetrics Pro

> **Aviso Obrigatório para Agentes de IA:**
> Todo prompt de entrada DEVE obrigatoriamente ler e analisar este arquivo antes de executar qualquer tarefa, verificando se há contradições com as regras, restrições e definições arquiteturais aqui documentadas.
> Em caso de conflito, as regras deste arquivo prevalecem.

---

## 1. Identidade e Visão do Produto
* **Nome do Produto:** MacroMetrics Pro (`dieta-ai`)
* **Repositório Remoto:** `git@github.com:thcborges/dieta-ai.git`
* **Projetos GCP:**
  * Desenvolvimento: `thcborges-dieta-ai-dev`
  * Produção: `thcborges-dieta-ai-prd`
  * **Região Única Obrigatória:** `us-central1` (garante elegibilidade ao Free Tier contínuo do Firestore, Cloud Run e Pub/Sub).
* **Missão:** Motor de decisão, auditoria matemática implacável e planejamento alimentar por engenharia reversa de macronutrientes. Diferencia-se de diários passivos (como MyFitnessPal) por ser proativo, antecipando eventos sociais hipercalóricos e recalculando o orçamento calórico/proteico restante para blindar o déficit calórico semanal e a massa magra.
* **Usuário-Alvo:** Líder técnico em Engenharia de Dados, 40 anos, 190 cm, rotina de musculação 4x/semana + cardio moderado (mínimo 10 km/semana, FC ~140 bpm). Valoriza interfaces analíticas escuras (*Dark Dashboard*), métricas exatas, alertas de risco lógicos e zero mensagens motivacionais/emocionais.

---

## 2. Meta-Regras Inquebráveis de Desenvolvimento

### 2.1. Versionamento Git e Commits
1. O repositório git está configurado localmente.
2. **Todo resultado de prompt DEVE ser commitado** com uma mensagem clara, semântica e objetiva resumindo exatamente o que foi adicionado ou modificado.
3. Fluxo de branches:
   * `develop`: Ambiente de desenvolvimento (aciona CI/CD para deploy em `thcborges-dieta-ai-dev`).
   * `main`: Ambiente de produção (aciona CI/CD para deploy em `thcborges-dieta-ai-prd`).
   * Branches de feature/fix: `feat/<nome>` ou `fix/<nome>` integradas via Pull Request.

### 2.2. Metodologia BDD (Behavior Driven Development) & TDD (Test Driven Development)
1. **Nenhum código de produção deve ser escrito sem um teste prévio que falhe.**
2. **Cobertura Mínima de Testes:** **≥ 90%** em todos os pacotes e módulos de código.
3. **Tratamento de Bugs e Erros:** Qualquer correção de erro DEVE incluir um **teste de regressão** reproduzindo o bug antes da correção, garantindo que o erro nunca volte a ocorrer.
4. **Ordem Estrita de Execução de Testes:**
   * **Passo 1:** Ao desenvolver uma nova feature, execute *apenas* os testes da respectiva feature.
   * **Passo 2:** Somente após os testes da feature passarem com 100% de sucesso, execute a **suíte completa de testes** do projeto para atestar a não-regressão.

---

## 3. Arquitetura do Sistema e Stack Tecnológica

O projeto é estruturado como um **Monorepo TypeScript** gerenciado com `pnpm`:

```
dieta-ai/
├── apps/
│   ├── web/               # Frontend: React 19 + Vite (PWA) + Capacitor 6 + Tailwind M3
│   ├── api/               # Backend: Fastify + TypeScript (Google Cloud Run)
│   └── error-healer/      # Consumer Pub/Sub para acionamento do AGY e Telegram
├── packages/
│   ├── core/              # Regras puras de domínio: fórmulas, auditor, solvers (100% test coverage)
│   └── types/             # Tipagens e DTOs compartilhados entre cliente e servidor
├── infra/
│   └── terraform/         # Infraestrutura como Código (us-central1, dev e prd)
└── .github/
    └── workflows/         # CI/CD (GitHub Actions + Trivy + HuskyCI)
```

### 3.1. Frontend & Multiplataforma
* **Framework:** React 19 + Vite + TypeScript.
* **Instalação Multiplataforma:**
  * **Desktop (Windows, Linux, macOS) & Web:** Progressive Web App (PWA) instalável via Service Worker e Web App Manifest.
  * **Mobile (Android e iOS):** Capacitor 6 encapsulando o PWA, desbloqueando acesso às APIs nativas de hardware.
* **Design System:** Conformidade integral com o **Material Design 3 (M3)** (`https://m3.material.io/`). Paleta de cores tonal com tema escuro analítico (*Dark Theme*), elevações tonais, superfícies semânticas e componentes no estilo Google M3.
* **Persistência Offline-First:** Uso de IndexedDB (via Dexie.js / localStorage) para garantir operação completa e instantânea mesmo sem conexão com a internet.

### 3.2. Backend & Nuvem (GCP Free Tier)
* **API:** Fastify em TypeScript conteinerizado no **Google Cloud Run** (`us-central1`). Instâncias leves (128–256 MB, escala para 0) garantindo consumo dentro da cota gratuita de 2 milhões de requisições/mês.
* **Banco de Dados:** **Google Cloud Firestore (Native Mode)** na região `us-central1`.
* **Autenticação:** Exclusivamente **Google Auth** (Google Identity Services / Firebase Auth), sem suporte a senhas locais.

### 3.3. Integrações Externas
* **Open Food Facts API:** Firestore atua como cache global de primeiro nível para alimentos consultados.
* **Scanner de Código de Barras (Câmera):**
  * Mobile: Google ML Kit via plugin Capacitor Barcode Scanner (detecção ultrarrápida a 60fps).
  * Web/Desktop: Barcode Detection API nativa do navegador com fallback universal para `@zxing/browser` / `html5-qrcode`.
  * Fluxo: Escaneamento -> Consulta Cache Local -> Consulta Firestore -> Consulta Open Food Facts -> Se não cadastrado, abre formulário rápido M3 para inclusão imediata.
* **Google Health Connect:**
  * Sincronização de atividades físicas, passos e calorias gastas via `androidx.health.connect.client` no Android (Capacitor Bridge).
  * Permite ao usuário abater ou compensar calorias gastas no orçamento diário.

---

## 4. Requisitos Funcionais de Negócio (MacroMetrics Pro)

### Módulo 1: Motor Biométrico & Metas Dinâmicas
* Cálculo automático de Taxa Metabólica Basal via equação **Mifflin-St Jeor** e Gasto Energético Total (GET/TDEE) parametrizado para o usuário (190 cm, 40 anos, homem, musculação 4x/semana + cardio moderado).
* Metas parametrizáveis por `g/kg` ou valores absolutos, suportando tetos proteicos agressivos (de 2.0 a 2.5g/kg de peso corporal, ou trava fixa de até 240g de proteína/dia).

### Módulo 2: Simulador de Buffer de Evento Social (Engenharia Reversa)
* Alocação prévia do evento social antes do planejamento das refeições diárias:
  * Presets: *Noite da Pizza (3-4 fatias)*, *Festa Infantil (Salgadinhos/Doces)*, *Churrasco/Almoço de Família*, ou *Input Customizado*.
* O sistema abate as calorias e macronutrientes do orçamento total e calcula:
  * **Orçamento Limpo Restante** (Kcal, Proteínas, Carboidratos e Gorduras livres para o restante do dia).
  * **Índice de Densidade Proteica Exigida (`g de proteína / 100 kcal`):** Indicador crítico que alerta quando o dia exigirá fontes puras de proteína magra.

### Módulo 3: Construtor de Refeições & Banco de Alimentos Realista
* Janelas práticas de consumo: *Café da Manhã / Pré-Treino*, *Almoço*, *Lanche da Tarde*, *Jantar / Evento*.
* Banco de alimentos pré-populado com a dieta real: Sassami desfiado, feijão preto, batata-doce cozida, ovos inteiros, claras de ovo, Whey Protein Growth (30g), receita bolo/cappuccino de whey, arroz branco, pão integral, e alimentos de eventos sociais (pizzas, salgados, bolos).
* **Botão "Auto-Completar Proteína":** Solver que calcula a gramatura exata de Sassami ou Whey Protein para zerar o déficit proteico sem ultrapassar gorduras e calorias restantes.
* **UX Estilo Cronometer:** Campo de porção e peso sempre no topo para edição ágil e sem fricção.
* **Cópia de Refeições:** Capacidade de duplicar refeições entre dias ou entre horários (ex: almoço de ontem para hoje, ou almoço para o jantar).
* **Sugestões Contextuais por Refeição:** Alimentos sugeridos priorizam a frequência de consumo específica de cada janela (alimentos do café não poluem o almoço).
* **Módulo de Receitas:** Criação de receitas compostas por ingredientes com porções customizadas, salvando o rendimento total e permitindo lançar no diário por frações ou porções consumidas.

### Módulo 4: Auditoria Lógica Implacável (Conselheiro Sênior)
* **Alerta de Inviabilidade Matemática:** Disparado quando a proteína necessária exige mais calorias do que o orçamento restante ($P_{restante} \times 4 > Kcal_{restantes}$).
* **Alerta de Diluição Proteica:** Disparado quando a ingestão proteica média projetada fica abaixo do piso de segurança (< 1.8g/kg).
* **Alerta de Quebra de Déficit:** Quantificação matemática exata de quantos dias de déficit foram neutralizados pelo superávit do dia.

### Módulo 5: Banco de Calorias e Macros Diário/Semanal
* Controle do balanço energético semanal consolidado, permitindo poupar calorias em dias específicos para gastar em dias de eventos sociais sem comprometer a média semanal planejada.

### Módulo 6: Privacidade, LGPD e Painel de Administração
* **Conformidade Estrita com a LGPD (Lei 13.709/2018):**
  * Dados pessoais de saúde e biometria são pseudo-anonimizados.
  * O Google Subject ID e e-mail utilizam **Blind Indexing (HMAC-SHA256 com Pepper seguro)** para consultas determinísticas sem expor a identidade em texto plano.
  * Dados biométricos e registros diários são criptografados com **AES-256-GCM** com chaves seguras.
* **Autoatendimento de Exclusão de Conta:**
  * O usuário tem o direito e a opção explícita no app de solicitar a remoção completa e irreversível da sua conta.
  * O sistema notifica claramente o usuário de que, conforme os prazos legais da LGPD (Art. 18 e 19), a conta e todos os dados associados serão eliminados permanentemente no prazo legal de até **15 (quinze) dias**.
* **Painel Administrativo:**
  * Acesso restrito a administradores autenticados para gestão e exclusão imediata e irreversível de qualquer conta ou dados solicitados.

---

## 5. Observabilidade, Self-Healing & Pipeline de Auto-Correção

Todo erro em tempo de execução (cliente ou backend) é capturado estruturadamente com os **10 últimos eventos de contexto da sessão**:

1. **Roteamento de Erros:** O Google Cloud Logging captura os logs e um *Log Sink* envia ocorrências para um tópico no **Google Cloud Pub/Sub** (`dieta-ai-errors-dev`).
2. **Worker de Auto-Cura (Ambiente Dev):**
   * Uma *subscription* no Pub/Sub recebe o evento de erro estruturado.
   * Dispara notificação imediata via **Telegram Bot** para o usuário configurado informando o erro e o contexto da sessão.
   * Aciona automaticamente o **Antigravity CLI (`agy`)** criando uma branch a partir da `main` (`fix/<erro-id>`).
   * O agente gera primeiramente o **teste de regressão BDD** reproduzindo o bug, aplica a correção no código-fonte, executa a suíte de testes garantindo ≥ 90% de cobertura, realiza o commit e envia o push para o GitHub.
   * Abre o Pull Request através da CLI do GitHub (`gh pr create`).
   * Envia o link do Pull Request finalizado para o mesmo chat do Telegram para revisão e aprovação humana.

---

## 6. Pipeline de CI/CD e Segurança (GitHub Actions)

* **Esteira da Branch `develop`:**
  1. Execução de testes de lint, tipo e suíte BDD/TDD.
  2. Validação da cobertura mínima de 90%.
  3. Scan de vulnerabilidades de dependências, contêiner e segredos com **Trivy**.
  4. Análise estática de segurança de código com **HuskyCI / SAST**.
  5. Planejamento e aplicação do Terraform no projeto GCP `thcborges-dieta-ai-dev`.
* **Esteira da Branch `main`:**
  1. Todas as checagens anteriores.
  2. Execução de testes de integração de infraestrutura.
  3. Aplicação do Terraform no projeto GCP `thcborges-dieta-ai-prd`.
  4. Deploy da nova versão no Google Cloud Run e publicação dos artefatos.

---

## 7. Critérios de Aceite para Cada Entrega
* [ ] Arquivo `AGENTS.md` verificado e sem contradições com a solicitação.
* [ ] Testes unitários/BDD escritos previamente e com 100% de sucesso na feature desenvolvida.
* [ ] Suíte completa de testes executada e íntegra.
* [ ] Cobertura de testes aferida ≥ 90%.
* [ ] Commits realizados com mensagens semânticas no repositório git local.
