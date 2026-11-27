---
description: Inicia um projeto novo — skin de layout (extensão padrão ou nova extensão, spfx-skin-layout) ou descoberta (brainstorming guiado ou descrição livre) com escopo para aprovação
argument-hint: <nome-do-projeto>
---

Você vai iniciar o projeto **$ARGUMENTS** dentro do framework spfx-skills.

## Local
O projeto fica na raiz do repositório (a pasta que contém `spfx-skills`), na pasta `$ARGUMENTS/`. Não crie o projeto dentro de `spfx-skills`.

## Passo A — Verificar o ambiente
Antes de qualquer pergunta:
1. Leia `spfx-skills/docs/versoes-referencia.md` (versões que todo projeto novo usa).
2. Rode, a partir de `spfx-skills`:
   `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verificar-ambiente.ps1 -Json`
3. Mostre ao usuário uma tabela curta: item, versão encontrada, esperada e status.
4. Interprete o resultado:
   - **Código 0** (todos `OK`, `ACEITA` ou `AVISO`): cite os avisos em uma linha e siga para o Passo 0.
   - **Código 1** (algum `AUSENTE`, `DIVERGENTE` ou `ERRO`): para cada item bloqueante, mostre o passo a passo da seção indicada em `guia` (arquivo `spfx-skills/docs/configurar-ambiente.md`), na ordem Node.js → Git → Yeoman e gerador → Heft.
     - **Não execute comandos de instalação.** O usuário executa.
     - Quando o usuário disser que concluiu, peça para reabrir o terminal se a seção pedir, e rode a verificação de novo.
   - **Código 2** (erro na referência): informe a mensagem e pare. O arquivo de referência precisa ser corrigido por PR.
5. Bloqueio por caminho:
   - **Skin com extensão padrão:** não bloqueia, porque só copia um pacote pronto (nada é compilado).
   - **Skin com nova extensão:** não gera nada enquanto o código for diferente de 0.
   - **Brainstorming e descrição livre:** podem seguir com a pendência registrada, porque não geram código. Repita a verificação antes de qualquer geração de código do projeto.
6. Se o PowerShell não estiver disponível (fora do Windows sem `pwsh`), informe e peça ao usuário para conferir manualmente as versões de `versoes-referencia.md`.

## Passo 0 — Validar o nome
- Se `$ARGUMENTS` estiver vazio, pergunte o nome do projeto e pare.
- Use nome em minúsculas, com hífens, sem acentos (ex.: `painel-vagas`). Se o nome não estiver nesse formato, proponha uma versão e confirme com o usuário.
- Se `$ARGUMENTS/escopo.md` já existir, informe e pergunte se é para revisar o escopo existente ou criar outro nome.

## Passo S — Skin de layout
Antes de qualquer outra pergunta, pergunte ao usuário (use `AskUserQuestion` quando disponível):

> **O projeto é a skin de layout (barra superior e menu da página, montados pela navegação do site)?**
> - **Sim** — sigo a skill `spfx-skin-layout`, sem brainstorming.
> - **Não** — sigo o fluxo normal de descoberta e escopo.

Aguarde a resposta. Não avance nem presuma.

### Resposta "Sim"
Carregue **somente** `spfx-skills/skills/spfx-skin-layout/SKILL.md`. Não carregue o roteiro de brainstorming. Em seguida, faça a pergunta da seção 0 da skill:

> **Utilizar a extensão padrão?**
> - **Sim** — copio o pacote pronto `ex-layout-sharepoint.sppkg` para a pasta do projeto. Menu sem ícones.
> - **Não** — gero uma nova extensão seguindo a skill.

Aguarde a resposta. Não presuma.

#### S1 — Extensão padrão (resposta "Sim")
1. Siga a seção 0.1 da skill: confira `spfx-skills/skills/spfx-skin-layout/pacote/ex-layout-sharepoint.sppkg` e o SHA-256 de `pacote/README.md`. Arquivo ausente ou SHA-256 diferente: informe e pare.
2. Copie o pacote para `$ARGUMENTS/ex-layout-sharepoint.sppkg`, sem renomear e sem gerar código, scaffold ou build. A cópia não é versionada (`*.sppkg` no `.gitignore`).
3. Crie `$ARGUMENTS/escopo.md` simplificado com: tipo `Skin — extensão padrão (ex-layout-sharepoint)`, versão e SHA-256 do pacote copiado, propriedades a configurar na lista Tenant Wide Extensions (se houver), pontos "Em aberto" da skill (seção 17) e status `Aprovado`.
4. Mostre a orientação de implantação da seção 13.1 da skill: no catálogo, envio **sem** marcar "adicionar a todos os sites" (mesma versão já implantada → não enviar de novo); em cada site, executar no Console o `spfx-skills/skills/spfx-skin-layout/script/ativar-extensao-padrao.console.js`. Depois, o checklist da seção 16 que se aplica.
5. Encerre aqui: os Passos 1 a 3 não se aplicam.

#### S2 — Nova extensão (resposta "Não")
1. Carregue também as skills indicadas em "Quando usar" da skill (`spfx-extensoes-padroes`, `spfx-tema-marca`, `spfx-design-base`, `spfx-acessibilidade-conteudo`, `spfx-codigo-performance`). Não carregue outras skills. Este conjunto é a rota de skin definida em `spfx-hub-ux`, então o roteamento do hub já está atendido.
2. Pergunte, em uma única rodada, os valores da seção "Configuração" da skill (inclusive `navIcons`). Todos são opcionais; o que não for informado usa o padrão da skill.
3. Mostre um resumo curto da configuração e peça confirmação.
4. Após a confirmação, crie `$ARGUMENTS/escopo.md` simplificado com: tipo `Skin — nova extensão (spfx-skin-layout)`, configuração escolhida, pontos "Em aberto" da skill (seção 17) e status `Aprovado`.
5. Confirme que a verificação do Passo A terminou com código 0. Gere a extensão em `$ARGUMENTS/`, seguindo a skill e usando as versões de `docs/versoes-referencia.md` (SPFx, React, TypeScript, Node em `engines`). Ao final, informe o que foi gerado e o checklist de validação da skill.
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
