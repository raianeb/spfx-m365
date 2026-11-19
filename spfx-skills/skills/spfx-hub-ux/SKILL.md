---
name: "spfx-hub-ux"
description: "Ponto de entrada para qualquer trabalho com SPFx. Identifica o tipo de tarefa e carrega apenas as skills necessárias (design, tema, código, property pane, mídia, release)."
---

# Hub SPFx

Use esta skill primeiro em qualquer tarefa de SPFx: web parts, extensions, layout, tema, código, property pane, imagens ou empacotamento.

## Como funcionar
0. Se a tarefa cria um projeto, gera código pela primeira vez na sessão ou faz upgrade: leia `docs/versoes-referencia.md` e rode `scripts/verificar-ambiente.ps1 -Json`. Com itens bloqueantes, oriente pelo `docs/configurar-ambiente.md` e não gere código até a verificação passar.
1. Classifique a tarefa pelo tipo (design, tema, código, property pane, extensões, mídia, release, build).
2. Carregue somente as skills relacionadas à tarefa, para manter o contexto enxuto.
3. Cite as skills aplicadas nos comentários de código, nas descrições de PR e no plano de execução.

## Tabela de roteamento
| Tipo de tarefa | Skills |
|---|---|
| Layout, estados, comandos da web part | spfx-design-base, spfx-acessibilidade-conteudo |
| Configuração da web part (título, site, grupos, ambiente, tema, log) | spfx-configuracao-webpart |
| Cores, fontes, modo escuro e alto contraste | spfx-tema-marca, spfx-css-estilos |
| Efeitos visuais de vidro (opcional) | spfx-glassmorphism |
| Dados, serviços, tipos, performance | spfx-codigo-performance, spfx-implementacao-base, sharepoint-dados-listas |
| Modelagem de listas, índices e consultas SharePoint | sharepoint-dados-listas |
| Provisionamento de listas por Console | sharepoint-provisionamento |
| Painel de propriedades | spfx-property-pane-reatividade |
| Application Customizer, Field Customizer, Command Set | spfx-extensoes-padroes, sharepoint-dados-listas (se houver consulta a lista) |
| Skin ou layout da página (barra superior, menu lateral ou superior) | spfx-skin-layout, spfx-extensoes-padroes, spfx-tema-marca, spfx-design-base, spfx-acessibilidade-conteudo |
| Imagens e mídia | spfx-imagens-midia |
| Versões de ferramentas, ambiente local e upgrade de SPFx | docs/versoes-referencia.md, docs/configurar-ambiente.md, spfx-heft-toolchain |
| Versão, pacote e publicação | spfx-release-qualidade-pacote |
| Build, Heft e webpack | spfx-heft-toolchain, spfx-heft-webpack |

## Padrões internos da equipe
A definir nas próximas etapas. Os padrões de configuração de Web Parts estão em `spfx-configuracao-webpart`.
