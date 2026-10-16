# Módulo 7: Observabilidade, Self-Healing & Bot do Telegram

O MacroMetrics Pro possui um pipeline resiliente de observabilidade e auto-correção (*Self-Healing*), integrando o Google Cloud Pub/Sub, o bot oficial do Telegram e o Antigravity CLI (`agy`).

---

## 📡 Roteamento Estruturado de Erros

Quando qualquer erro de execução ocorre na API ou no aplicativo cliente:
1. O erro é capturado acompanhado dos **últimos 10 eventos de contexto da sessão** (rotas navegadas, presets selecionados, inputs submetidos).
2. O Google Cloud Logging direciona o log estruturado para o tópico do Google Cloud Pub/Sub (`dieta-ai-errors-dev`).
3. O serviço `error-healer` consome o evento e formata uma notificação analítica imediata no Telegram para o administrador técnico.

---

## 🤖 Bot do Telegram & Comandos Operacionais

O `TelegramService` do serviço `error-healer` opera com escuta contínua (*long-polling*):

### Alertas Automáticos
- **🚨 Alerta de Erro em Tempo de Execução:** Envia a stack trace, ID do erro, horário e os 10 eventos de contexto.
- **🛠️ PR de Auto-Cura Criado:** Informa que o agente autônomo gerou o teste de regressão BDD e abriu o PR para correção.
- **🚀 Notificação de Iteração Concluída:** Notifica que uma nova iteração foi testada, aprovada pelo Revisor de PR e está pronta para merge na branch `main`.

### Comandos Interativos
- **/deploy-dev:** Permite ao administrador solicitar o deploy sob demanda da branch `develop` no ambiente de desenvolvimento do Google Cloud Run:
  1. O bot valida a autorização do `chat_id`.
  2. Dispara o workflow do GitHub Actions via API (`ci-dev.yml`).
  3. Responde na conversa do Telegram com o link de acompanhamento da execução.
