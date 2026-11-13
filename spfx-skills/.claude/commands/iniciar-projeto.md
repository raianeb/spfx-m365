---
description: Inicia um projeto novo com brainstorming objetivo e gera o escopo para aprovação
argument-hint: <nome-do-projeto>
---

Você vai iniciar o projeto **$ARGUMENTS** dentro do framework spfx-skills.

## Local
O projeto fica na raiz do repositório (a pasta que contém `spfx-skills`), na pasta `$ARGUMENTS/`. Não crie o projeto dentro de `spfx-skills`.

## Passo 0 — Validar o nome
- Se `$ARGUMENTS` estiver vazio, pergunte o nome do projeto e pare.
- Use nome em minúsculas, com hífens, sem acentos (ex.: `painel-vagas`). Se o nome não estiver nesse formato, proponha uma versão e confirme com o usuário.
- Se `$ARGUMENTS/escopo.md` já existir, informe e pergunte se é para revisar o escopo existente ou criar outro nome.

## Passo 1 — Brainstorming
Leia `spfx-skills/docs/01-brainstorming.md` e conduza as perguntas **uma etapa por vez**, na ordem definida no arquivo. Para cada resposta:
- registre o que o usuário disse, sem completar com suposições;
- quando faltar informação essencial, pergunte antes de avançar;
- quando houver opções, apresente-as com prós, contras e trade-offs em poucas linhas.

Ao final do brainstorming, faça um resumo curto dos pontos decididos e dos pontos em aberto, e peça confirmação.

## Passo 2 — Escopo
Após confirmação, crie `$ARGUMENTS/escopo.md` seguindo `spfx-skills/docs/02-escopo.md`:
- preencha apenas com o que foi decidido;
- liste em "Em aberto" o que ainda depende de decisão ou validação, com a forma de validar;
- marque o status como `Aguardando aprovação`.

## Passo 3 — Parar
Não gere código, scaffold, pastas de implementação nem scripts. Informe ao usuário onde está o escopo e peça a aprovação. Quando o usuário aprovar, ele muda o status para `Aprovado` e pode rodar `/provisionar-estrutura $ARGUMENTS`.
