# Arquitetura do Sistema

O **MacroMetrics Pro** é construído como um monorepo moderno TypeScript gerenciado com `pnpm`, projetado para alta performance, consumo estrito dentro do **GCP Free Tier** contínuo e confiabilidade offline-first.

```
dieta-ai/
├── apps/
│   ├── web/               # Frontend: React 19 + Vite (PWA) + Capacitor 6 + Tailwind M3
│   ├── api/               # Backend: Fastify + TypeScript (Google Cloud Run em us-central1)
│   └── error-healer/      # Consumer Pub/Sub para auto-cura via AGY e bot do Telegram
├── packages/
│   ├── core/              # Regras de domínio: fórmulas Mifflin-St Jeor, buffers, solvers
│   └── types/             # Tipagens e DTOs compartilhados entre cliente e servidor
├── docs/                  # Documentação técnica em VitePress publicada no GitHub Pages
└── infra/
    └── terraform/         # Infraestrutura como Código (Terraform em us-central1)
```

---

## 🛠️ Stack Tecnológica

### Frontend Multiplataforma (`apps/web`)
- **React 19 & Vite:** Renderização reativa de alta performance com tipagem estrita em TypeScript.
- **Material Design 3 (M3):** Paleta tonal analítica escura (*Dark Dashboard*), elevações semânticas e componentes no padrão Google M3.
- **Capacitor 6:** Bridge nativa para Android e iOS.
- **Offline-First:** Persistência em IndexedDB / LocalStorage escopada por usuário autenticado.

### Backend & Cloud Run (`apps/api`)
- **Fastify:** Framework HTTP leve de altíssimo throughput.
- **Google Cloud Run (`us-central1`):** Conteinerizado, instâncias com escala para zero e limites de memória leves (128–256 MB), permanecendo na cota gratuita contínua de 2 milhões de requisições/mês.
- **Google Cloud Firestore (Native Mode):** Persistência de documentos e cache global de primeiro nível de alimentos.

### Observabilidade & Auto-Cura (`apps/error-healer`)
- **Google Cloud Pub/Sub (`dieta-ai-errors-dev`):** Captura de erros com os 10 últimos eventos de contexto da sessão.
- **Bot do Telegram:** Alertas imediatos para o desenvolvedor e execução do comando `/deploy-dev`.
- **Antigravity CLI (`agy`):** Geração de testes de regressão BDD e correção autônoma de falhas em ambiente de desenvolvimento.
