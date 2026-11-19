---
name: "spfx-extensoes-padroes"
description: "Padrões para extensões SPFx (Application Customizer, Field Customizer e Command Set): diálogos seguros, descoberta de comandos e respeito ao contexto da página host."
---

# Extensões

## Quando usar
Ao criar Application Customizers, Field Customizers ou Command Sets.

## Regras-base
- Não sequestre a experiência da página host.
- Diálogos devem ser usados com moderação e com saída clara.
- Comandos devem ser descobertos pelo usuário e respeitar o contexto da página.
- Se a extensão ler ou gravar em lista ou biblioteca, aplique também `sharepoint-dados-listas` para consultas, índices e paginação.

## Padrões internos da equipe
### Application Customizer
- Placeholders oficiais são apenas `Top` e `Bottom`. Qualquer alteração fora deles depende de DOM não público: isole em um único arquivo, documente o risco e mantenha falha segura (layout nativo visível em caso de erro).
- Verifique se a extensão já injetou seu conteúdo antes de injetar de novo (uma instância por página).
- Reaja à navegação sem recarregar a página por `navigatedEvent`: atualize o que mudou, sem recriar componentes nem repetir consultas.
- Configuração por `ClientSideComponentProperties`, com valores padrão no código e validação de tipo. Sem URL, tenant, site ou grupo fixo.
- Ativação condicional (query string, propriedade ou permissão) é avaliada antes de qualquer requisição.
- `onDispose` remove listeners, observers, nós injetados e classes adicionadas ao `body`.
- Skins de layout completas seguem `spfx-skin-layout`.
