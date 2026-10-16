# Testes E2E com Playwright & Firestore Emulator Local

Para eliminar custos desnecessários em nuvem durante o ciclo de desenvolvimento, o MacroMetrics Pro utiliza uma infraestrutura de testes hermética, ágil e 100% local.

---

## ⚡ Google Cloud Firestore Emulator Local

O Firestore Emulator oficial da Google permite emular 100% da API e persistência de dados em memória localmente:

### Inicialização via Docker Compose
Um arquivo leve `docker-compose.emulator.yml` na raiz do projeto sobe a instância do emulador:

```bash
docker compose -f docker-compose.emulator.yml up -d
```

### Configuração Automática no SDK
Quando a variável de ambiente `FIRESTORE_EMULATOR_HOST="localhost:8080"` está definida, a API Fastify conecta-se automaticamente ao emulador local em vez de fazer chamadas à rede do GCP.

---

## 🎭 Playwright E2E & Estresse de UI

O Playwright foi configurado em `apps/web` para simular cenários realistas e estressar o comportamento da aplicação em diferentes viewports (Desktop e Mobile):

```bash
# Executar suíte E2E automatizada
pnpm --filter @dieta-ai/web test:e2e
```

### Cenários Cobertos:
1. **Bloqueio de Não Autenticados:** Garante que visitantes anônimos não consigam registrar alimentos ou acessar o diário.
2. **Autenticação e Inicialização de Sessão:** Simula o login Google, verifica a persistência de perfil e armazenamento isolado por usuário.
3. **Cálculo Dinâmico de Fibras:** Testa a alteração da idade e o preenchimento automático das metas da DRI.
4. **Buffer Reverso & Solver:** Aloca eventos de Pizza ou Churrasco e executa o botão "Auto-Completar Proteína" garantindo a convergência dos macronutrientes.
5. **Responsividade & Usabilidade:** Testa elementos em telas mobile (390px) e desktop (1280px), verificando contraste M3 e ausência de overflow horizontal.
