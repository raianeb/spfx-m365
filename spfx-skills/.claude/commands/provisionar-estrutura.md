---
description: Gera definicao.json e as pastas provisionamento de cada web part, com scripts de Console para HML e PROD
argument-hint: <nome-do-projeto>
---

Você vai gerar a estrutura de listas do projeto **$ARGUMENTS**. Siga a skill `skills/sharepoint-provisionamento`.

## Pré-requisito
- O arquivo `$ARGUMENTS/escopo.md` precisa existir na raiz do repositório (a pasta que contém `spfx-skills`) e estar com status `Aprovado`. Se não estiver, pare e informe o que falta.

## Etapa 1: definicao.json
1. Leia o escopo, a seção de dados e integrações, e o plano de listas.
2. Monte `$ARGUMENTS/definicao.json` seguindo `skills/sharepoint-provisionamento/templates/definicao.exemplo.json`.
   - Um nome base por lista, sem prefixo. Os prefixos são perguntados na execução do script.
   - Nome interno técnico em `nome`, sem acento e sem espaço. Rótulo amigável em `rotulo`.
   - `indexado: true` em colunas usadas para filtro, ordenação ou busca.
   - Texto longo com `formatacao: true` quando o escopo pedir formatação. Não indexar texto longo.
3. Valide as regras da skill: tipos permitidos, nomes internos válidos, sem repetição.
4. Mostre um resumo das listas e campos e **pare para aprovação**. Não gere scripts antes disso.

## Etapa 2: scripts por web part (somente após aprovação da definição)
1. Para cada pasta `wp-*` do projeto, crie `wp-*/provisionamento/` com:
   - `definicao.json`: somente as listas que aquela web part usa.
   - `criar-estrutura.console.js`: gerado a partir de `templates/criar-estrutura.template.js`, trocando `@PROJETO@` e o catálogo pelo subconjunto de listas.
   - `INSTRUCOES.md`: como rodar no Console. Preencha o passo a passo com a URL do site perguntada uma vez e os dois prefixos.
   - `arquitetura-aprovada.md`: tabela das listas, campos e índices, copiada da definição.
2. Rode `node --check` em cada script gerado e corrija erros antes de informar.
3. Não execute scripts em site algum. Quem roda é o responsável, no Console, primeiro em `plan` e depois em `apply`.

## Regras
- Mesmo site para HML e PROD. Só o prefixo muda.
- Nenhuma URL, prefixo, grupo ou permissão fixa no script.
- Não crie grupos nem conceda permissões.
- Se a web part ainda não existir, pare na etapa 2 e informe que a pasta `wp-*` precisa ser criada antes.
