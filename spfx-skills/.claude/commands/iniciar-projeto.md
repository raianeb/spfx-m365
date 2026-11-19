---
description: Inicia um projeto novo — skin padrão (spfx-skin-layout) ou descoberta (brainstorming guiado ou descrição livre) com escopo para aprovação
argument-hint: <nome-do-projeto>
---

Você vai iniciar o projeto **$ARGUMENTS** dentro do framework spfx-skills.

## Local
O projeto fica na raiz do repositório (a pasta que contém `spfx-skills`), na pasta `$ARGUMENTS/`. Não crie o projeto dentro de `spfx-skills`.

## Passo 0 — Validar o nome
- Se `$ARGUMENTS` estiver vazio, pergunte o nome do projeto e pare.
- Use nome em minúsculas, com hífens, sem acentos (ex.: `painel-vagas`). Se o nome não estiver nesse formato, proponha uma versão e confirme com o usuário.
- Se `$ARGUMENTS/escopo.md` já existir, informe e pergunte se é para revisar o escopo existente ou criar outro nome.

## Passo S — Skin padrão
Antes de qualquer outra pergunta, pergunte ao usuário (use `AskUserQuestion` quando disponível):

> **Deseja gerar a skin padrão?**
> - **Sim** — gero a extensão de skin de layout pela skill `spfx-skin-layout`, sem brainstorming.
> - **Não** — sigo o fluxo normal de descoberta e escopo.

Aguarde a resposta. Não avance nem presuma.

### Resposta "Sim"
1. Carregue **somente** `spfx-skills/skills/spfx-skin-layout/SKILL.md` e as skills que ela indica em "Quando usar" (`spfx-extensoes-padroes`, `spfx-tema-marca`, `spfx-design-base`, `spfx-acessibilidade-conteudo`, `spfx-codigo-performance`). Não carregue outras skills nem o roteiro de brainstorming. Este conjunto é a rota de skin definida em `spfx-hub-ux`, então o roteamento do hub já está atendido.
2. Pergunte, em uma única rodada, os valores da seção "Configuração" da skill. Todos são opcionais; o que não for informado usa o padrão da skill.
3. Mostre um resumo curto da configuração e peça confirmação.
4. Após a confirmação, crie `$ARGUMENTS/escopo.md` simplificado com: tipo `Skin padrão (spfx-skin-layout)`, configuração escolhida, pontos "Em aberto" da skill (ex.: validação do modo de navegação no tenant) e status `Aprovado`.
5. Gere a extensão em `$ARGUMENTS/`, seguindo a skill. Ao final, informe o que foi gerado e o checklist de validação da skill.
6. Encerre aqui: os Passos 1 a 3 não se aplicam.

### Resposta "Não"
Siga para o Passo 1.

## Passo 1 — Escolher o modo de descoberta
Antes de qualquer pergunta do roteiro, pergunte ao usuário (use `AskUserQuestion` quando disponível):

> **Deseja realizar o brainstorming guiado?**
> - **Sim** — conduzo as perguntas do roteiro, uma etapa por vez.
> - **Não** — você envia uma mensagem geral do projeto (escopo, requisitos, usuários, dados, prazos etc.) e eu extraio o escopo a partir dela.

Aguarde a resposta. Não avance nem presuma o modo.

## Passo 1A — Brainstorming guiado (resposta "Sim")
Leia `spfx-skills/docs/01-brainstorming.md` e conduza as perguntas **uma etapa por vez**, na ordem definida no arquivo. Para cada resposta:
- registre o que o usuário disse, sem completar com suposições;
- quando faltar informação essencial, pergunte antes de avançar;
- quando houver opções, apresente-as com prós, contras e trade-offs em poucas linhas.

Ao final do brainstorming, faça um resumo curto dos pontos decididos e dos pontos em aberto, e peça confirmação.

## Passo 1B — Descrição livre (resposta "Não")
1. Peça ao usuário que envie, em uma única mensagem (texto livre, tópicos ou documento colado/anexado), a visão geral do projeto. Sugira, sem exigir, o que costuma ajudar:
   - problema e resultado esperado;
   - usuários e perfis;
   - funcionalidades da primeira entrega e o que fica fora;
   - dados, integrações e dados sensíveis (LGPD);
   - plataforma (SharePoint Online, 2013/2019 on-premises, Teams) e solução pretendida;
   - prazo, ambientes (HML/PROD), manutenção e riscos.
2. Leia `spfx-skills/docs/01-brainstorming.md` e mapeie o conteúdo recebido para as etapas do roteiro:
   - registre apenas o que foi dito, sem completar com suposições;
   - identifique o que ficou sem resposta.
3. Apresente uma tabela curta com a cobertura por etapa (`Coberto`, `Parcial`, `Não informado`).
4. Pergunte **somente** o que for essencial e estiver faltando ou ambíguo, agrupado em uma única rodada (no máximo 5 perguntas). Itens não essenciais vão para "Em aberto" no escopo, com a forma de validar. Quando houver opções (ex.: SPFx × Power Automate × solução mista), apresente prós, contras e trade-offs em poucas linhas.
5. Se o usuário preferir não responder algum ponto, registre-o como "Em aberto".
6. Faça um resumo curto dos pontos decididos e dos pontos em aberto, e peça confirmação.

Se, em qualquer momento, o usuário pedir para mudar de modo, siga o novo modo aproveitando o que já foi registrado, sem repetir perguntas já respondidas.

## Passo 2 — Escopo
Após confirmação, crie `$ARGUMENTS/escopo.md` seguindo `spfx-skills/docs/02-escopo.md`:
- preencha apenas com o que foi decidido;
- liste em "Em aberto" o que ainda depende de decisão ou validação, com a forma de validar;
- marque o status como `Aguardando aprovação`.

## Passo 3 — Parar
Não gere código, scaffold, pastas de implementação nem scripts. Informe ao usuário onde está o escopo e peça a aprovação. Quando o usuário aprovar, ele muda o status para `Aprovado` e pode rodar `/provisionar-estrutura $ARGUMENTS`.
