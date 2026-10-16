# Módulo 6: Privacidade, LGPD e Painel de Administração

O MacroMetrics Pro foi desenhado sob o princípio de **Privacy by Design**, em conformidade rigorosa com a **Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD)**.

---

## 🛡️ Técnicas de Criptografia e Anonimização

### 1. Blind Indexing (HMAC-SHA256 com Pepper)
Dados identificadores pessoais (como o Google Subject ID e e-mail) nunca são armazenados ou pesquisados em texto claro no Firestore:
- Uma função criptográfica unidirecional com HMAC-SHA256 e uma chave secreta do servidor (*Pepper*) gera um índice determinístico cego.
- O banco de dados pode indexar e buscar o usuário sem nunca conhecer sua identidade original.

### 2. Criptografia em Repouso com AES-256-GCM
Todos os registros de biometria (peso, altura, idade, histórico de refeições) são criptografados com o padrão militar **AES-256-GCM**, garantindo confidencialidade e integridade dos dados de saúde.

---

## 🗑️ Autoatendimento de Exclusão de Conta (Art. 18 e 19 da LGPD)

Em respeito irrestrito aos direitos do titular de dados:
1. O usuário tem um botão explícito de autoatendimento no aplicativo (**"Excluir Minha Conta Permanentemente"**).
2. O sistema notifica claramente que, em conformidade com o prazo legal do Art. 19 da LGPD, a conta, todos os registros biométricos, históricos alimentares e índices cegos serão eliminados de forma definitiva e irreversível no prazo de até **15 (quinze) dias**.
3. Há também um canal administrativo seguro para que o administrador realize exclusões imediatas sob demanda.
