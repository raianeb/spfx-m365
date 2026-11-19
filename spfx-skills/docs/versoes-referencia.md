# Versões de referência

**Vigente desde:** 2026-11-19
**Responsável pela atualização:** liderança técnica M365

Todo projeto novo do repositório usa estas versões. Projetos existentes ficam como estão até um upgrade aprovado.

Antes de iniciar um projeto, verifique a máquina com `scripts/verificar-ambiente.ps1` (ver `docs/configurar-ambiente.md`).

## Plataforma
| Item | Versão | Observação |
|---|---|---|
| SharePoint Framework | 1.24.1 | Instalar o gerador com a versão fixa, nunca `@latest` |
| Node.js | 26 LTS (recomendado) | Aceitos: 22.14.0+ na linha 22, 24.x, 26.x |
| React / React DOM | 18.3.1 | Padrão do SPFx 1.24 |
| TypeScript | ~5.8.0 | Conforme o scaffold do SPFx 1.24.1 |
| Heft | 1.3.2 (no projeto) | Build com `heft start --clean` e `heft package-solution`; CLI global recomendada |
| Fluent UI | @fluentui/react ^8.106.4 | Usar só o necessário (ver `spfx-codigo-performance`) |
| Alvo | SharePoint Online | On-premises fora deste padrão |

## Instalação
Passo a passo completo em `docs/configurar-ambiente.md`. Resumo:

    node -v
    npm install @rushstack/heft yo @microsoft/generator-sharepoint@1.24.1 --global

## Conferência de um projeto
- `.yo-rc.json` → `version` igual ao SPFx de referência.
- `package.json` → `@microsoft/sp-*` e `@microsoft/spfx-web-build-rig` na mesma versão, sem `^` ou `~`.
- `package.json` → `engines.node` conforme a tabela.

## Regra de atualização
1. Nova versão do SPFx é avaliada em um projeto de teste, nunca direto num projeto em produção.
2. Validação: build, `heft start` no site de teste, pacote instalado no catálogo de HML.
3. Atualização deste arquivo por PR, com as notas de versão da Microsoft citadas. Atualize a tabela acima **e** o bloco de dados abaixo no mesmo PR, e rode os testes do script.
4. Projetos existentes migram por PR próprio, um projeto por vez.
5. Exceção (projeto em versão diferente) é registrada no `escopo.md` do projeto, com o motivo.

## Dados para verificação automática
Lido por `scripts/verificar-ambiente.ps1`. Não edite fora de um PR de atualização de versões.

- `node.recomendada`: linha principal recomendada; `node.linhas`: linhas aceitas e a versão mínima de cada uma.
- `ferramentas`: comandos verificados por presença e, se houver, versão mínima (`minima`). `obrigatorio: false` só gera aviso.
- `pacotesGlobais`: pacotes npm globais com versão exata (`exata`).
- `guia`: âncora da seção de `docs/configurar-ambiente.md` que resolve a falha.

```json
{
  "spfx": "1.24.1",
  "node": {
    "recomendada": 26,
    "linhas": [
      { "major": 22, "minima": "22.14.0" },
      { "major": 24, "minima": "24.0.0" },
      { "major": 26, "minima": "26.0.0" }
    ]
  },
  "ferramentas": [
    { "item": "npm", "comando": "npm", "argumentos": ["--version"], "minima": null, "obrigatorio": true, "guia": "node" },
    { "item": "Git", "comando": "git", "argumentos": ["--version"], "minima": "2.35.2", "obrigatorio": true, "guia": "git" },
    { "item": "Yeoman (yo)", "comando": "yo", "argumentos": ["--version", "--no-insight"], "minima": null, "obrigatorio": true, "guia": "yo" },
    { "item": "Heft CLI (global)", "comando": "heft", "argumentos": ["--version"], "minima": null, "obrigatorio": false, "guia": "heft" }
  ],
  "pacotesGlobais": [
    { "item": "Gerador SPFx", "pacote": "@microsoft/generator-sharepoint", "exata": "1.24.1", "obrigatorio": true, "guia": "gerador" }
  ]
}
```

## Fontes
- [Notas de versão do SPFx 1.24.1](https://learn.microsoft.com/sharepoint/dev/spfx/release-1.24.1)
- [Notas de versão do SPFx 1.24.0](https://learn.microsoft.com/sharepoint/dev/spfx/release-1.24.0)
- [Configurar o ambiente de desenvolvimento do SPFx](https://learn.microsoft.com/sharepoint/dev/spfx/set-up-your-development-environment)
- [Tabela de compatibilidade do SPFx](https://learn.microsoft.com/sharepoint/dev/spfx/compatibility)

## Histórico
| Data | Mudança | PR |
|---|---|---|
| 2026-11-19 | Versão inicial: SPFx 1.24.1, Node 26 LTS, React 18.3.1, verificação automática do ambiente | — |
