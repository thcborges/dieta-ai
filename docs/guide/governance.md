# Governança de Código & Agente Revisor de PR

A governança do repositório adota um fluxo rígido de branches isoladas, auditoria de vulnerabilidades com Trivy e verificação profunda de UI com um Agente Revisor autônomo.

---

## 🌿 Ciclo de Branches por Iteração

A partir de cada nova interação com o assistente ou desenvolvedor:

1. **Criação de Branch Isolada:**  
   Se nenhuma worktree dedicada for criada pelo usuário, uma nova branch **SEMPRE** é criada a partir da branch `main` (`feat/<nome>` ou `fix/<nome>`).
2. **Desenvolvimento Orientado a Testes (BDD/TDD):**  
   Nenhum código de produção é escrito sem um teste prévio que falhe. Cobertura mínima $\ge 90\%$.
3. **Push e Validação Remota com Trivy:**  
   Ao finalizar os testes locais, a branch é enviada ao repositório remoto (`git push origin <branch>`), e um Pull Request para a branch `develop` é aberto.
4. **Verificação de CI & Segurança:**  
   A esteira do GitHub Actions executa o scanner de vulnerabilidades e segredos do **Trivy** e a suíte completa de testes.
5. **Merge em `develop`:**  
   Com os checks de segurança e testes 100% aprovados, a branch é mesclada em `develop` para publicação no ambiente de desenvolvimento.

---

## 🕵️‍♂️ Agente Revisor de Pull Request (`pr-ui-reviewer`)

Após a integração em `develop`, entra em ação o **Agente Revisor de Pull Request**:

- **Missão:** Testar e estressar exaustivamente a interface de usuário (UI) em busca de bugs, quebras de layout, regressões e fricções de usabilidade.
- **Ferramentas:** Utiliza o **Playwright E2E** executando contra o servidor local do Vite e conectando-se ao **Firestore Emulator** local para validar a persistência hermética sem custos de nuvem.
- **Aprovação e Abertura de PR para `main`:**  
  Quando todos os testes de usabilidade e estresse passarem com êxito:
  1. Cria o Pull Request da branch para a branch de produção `main`.
  2. O corpo do PR deve conter o detalhamento completo de tudo o que foi desenvolvido na iteração.
  3. Despacha mensagem estruturada para o **Telegram** informando a conclusão da iteração, contendo a mesma descrição e o link direto do Pull Request pronto para merge.
