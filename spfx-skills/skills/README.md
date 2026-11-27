# Skills

Cada skill fica em sua própria pasta, com um `SKILL.md` (frontmatter com `name` e `description`, depois o conteúdo).

## Dados e provisionamento SharePoint (etapa 4)
| Skill | Conteúdo |
|---|---|
| `sharepoint-dados-listas` | Modelagem, índices, consultas e limites. Fonte de verdade das regras de dados |
| `sharepoint-provisionamento` | Scripts de Console para HML e PROD a partir de `definicao.json` |

## SPFx (etapa 1)
| Skill | Conteúdo |
|---|---|
| `spfx-hub-ux` | Ponto de entrada e roteamento |
| `spfx-configuracao-webpart` | Configurações obrigatórias: título, site, grupos, ambiente, tema e log |
| `spfx-design-base` | Design base de web parts |
| `spfx-acessibilidade-conteudo` | Acessibilidade e textos |
| `spfx-tema-marca` | Tema e marca |
| `spfx-css-estilos` | Estilos e SCSS |
| `spfx-glassmorphism` | Estilo em vidro (opcional) |
| `spfx-codigo-performance` | Código e performance |
| `spfx-implementacao-base` | Arquitetura de implementação |
| `spfx-property-pane-reatividade` | Painel de propriedades |
| `spfx-extensoes-padroes` | Application Customizer, Field Customizer e Command Set |
| `spfx-skin-layout` | Skin de layout por Application Customizer, ativada por `?env=webview`: extensão padrão (`pacote/ex-layout-sharepoint.sppkg`) ou nova extensão; barra superior fixa e menu lateral recolhível ou horizontal (cascata, megamenu, Mais) pela navegação nativa, com segmentação por público; sem skin em telas nativas (`_layouts`, `Lists`, `Forms`) e na edição; referência técnica em `templates/referencia-tecnica.md`. **Para usar a skin padrão:** implante o pacote no catálogo do tenant, em cada site que vai receber a skin, execute no Console do navegador o script `script/ativar-extensao-padrao.console.js` para ativar o aplicativo no site |
| `spfx-imagens-midia` | Imagens e mídia |
| `spfx-release-qualidade-pacote` | Release e qualidade do pacote |
| `spfx-heft-toolchain` | Ferramental Heft |
| `spfx-heft-webpack` | Customização do webpack |

## Regra de frontmatter
Os valores de `name` e `description` ficam entre aspas duplas. Sem aspas, um `:` dentro da descrição (por exemplo, "SPFx: tokens") quebra o YAML.
