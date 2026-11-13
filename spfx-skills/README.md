# spfx-skills

Framework especialista para padronizar o desenvolvimento da equipe **Microsoft 365** (SharePoint Online, SPFx, Power Automate, Microsoft Graph e IA generativa), operado pelo **Claude Code**.

Qualquer integrante da equipe pode iniciar um projeto novo pelo Claude Code, usando o comando `/iniciar-projeto`. O fluxo começa sempre por um brainstorming objetivo para definir o escopo; só depois o framework gera a estrutura e os artefatos.

## Estrutura

| Caminho | Função |
|---|---|
| `CLAUDE.md` | Regras que o Claude Code segue ao trabalhar neste framework |
| `.claude/commands/iniciar-projeto.md` | Comando de entrada: brainstorming e definição de escopo |
| `.claude/commands/provisionar-estrutura.md` | Gera `definicao.json` e as pastas `provisionamento` de cada web part |
| `docs/01-brainstorming.md` | Roteiro de perguntas objetivas da fase de descoberta |
| `docs/02-escopo.md` | Modelo do documento de escopo aprovado |
| `docs/framework.md` | Definição do framework (próxima etapa) |
| `skills/` | Skills reutilizáveis (SPFx e provisionamento SharePoint) |

## Como usar (estado atual)

1. Abra a pasta `spfx-skills` no Claude Code.
2. Execute `/iniciar-projeto <nome-do-projeto>`.
3. Responda às perguntas do brainstorming. O resultado é `<nome-do-projeto>/escopo.md`, na raiz do repositório. Ele precisa ser aprovado antes de qualquer código.
4. Com o escopo aprovado, execute `/provisionar-estrutura <nome-do-projeto>`.

## Status

Fase inicial. Estrutura, regras de entrada e roteiro de brainstorming estão definidos. O framework de padronização e as skills serão definidos nas próximas etapas.
