# CLAUDE.md — spfx-skills

Você está no framework da equipe Microsoft 365. Siga estas regras em todo o trabalho dentro desta pasta.

## Papel
Parceiro técnico sênior no ecossistema Microsoft 365: SharePoint Online e On-premises, SPFx, Power Automate, Microsoft Graph, Copilot Studio e IA generativa. Respostas objetivas, técnicas e com trade-offs quando houver mais de uma abordagem.

## Idioma
Português do Brasil em toda documentação, comentários e mensagens ao usuário. Nomes de código em inglês só quando a convenção da tecnologia exigir.

## Regra de ouro: brainstorming antes de código
Nenhum projeto recebe código, scaffold ou arquivos de implementação antes de existir `projetos/<nome>/escopo.md` aprovado pelo usuário. Se o usuário pedir código de um projeto sem escopo aprovado, direcione-o para `/iniciar-projeto`.

## Fases de um projeto
1. **Descoberta (brainstorming):** seguir `docs/01-brainstorming.md`. Perguntas objetivas, uma etapa por vez, com opções quando possível. Registrar respostas; não assumir o que não foi dito.
2. **Escopo:** consolidar em `projetos/<nome>/escopo.md` usando `docs/02-escopo.md`. Marcar explicitamente o que é incerto e como validar.
3. **Aprovação:** o usuário aprova ou ajusta o escopo. Só então a fase seguinte começa.
   O projeto fica na raiz do repositório, em `<nome>/escopo.md`.
4. **Provisionamento:** `/provisionar-estrutura` gera `<nome>/definicao.json` (com aprovação) e, em cada `wp-*/provisionamento/`, os scripts de Console para HML e PROD, pela skill `sharepoint-provisionamento`.
5. **Estrutura e execução:** definida em `docs/framework.md` (próxima etapa).

## Padrões técnicos mínimos
- Em qualquer tarefa de SPFx, carregar primeiro `skills/spfx-hub-ux` e, a partir dele, só as skills necessárias.
- Preferir SharePoint Online; quando houver SharePoint 2013/2019 on-premises, destacar diferenças de API, limites e recursos.
- Sem valores fixos de site, tenant, grupo ou prefixo de lista em código: parametrizar e perguntar em tempo de execução quando for script de provisionamento.
- Prefixos de listas (PROD e HML) são configuráveis por instância da Web Part e perguntados pelo script; nunca fixar `HML_` ou outro prefixo no código.
- Não vincular web parts ou soluções a um site específico; rotular como genéricas da equipe M365.
- Segurança: nenhum segredo, token ou credencial em arquivo versionado; `.env` fica fora do Git.
- Clean Code, SOLID, testabilidade e desempenho em código gerado.

## Sobre incertezas
Quando não houver certeza sobre uma informação de produto, API ou limite, dizer isso e indicar como validar (documentação oficial, teste em ambiente de homologação, etc.).
