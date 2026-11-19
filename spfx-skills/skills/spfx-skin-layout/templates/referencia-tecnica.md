# Referência técnica — spfx-skin-layout

Valores que a extensão deve replicar exatamente. Seletores nativos não são API pública: atualizar a data da validação a cada conferência no tenant (diagnóstico `?skinDebug=1`).

## 1. Medidas (fonte única em TypeScript)
| Constante | Valor | Variável CSS no `<body>` |
|---|---|---|
| Altura da barra superior | 68 px | `--m365-skin-bar-height` |
| Altura da faixa do menu superior | 44 px | `--m365-skin-topnav-height` |
| Largura do menu lateral | 248 px | `--m365-skin-sidenav-width` |
| Largura do menu recolhido | 64 px | `--m365-skin-sidenav-width-collapsed` |
| Deslocamento da área de conteúdo | calculado (seção 10 da skill) | `--m365-skin-offset-top`, `--m365-skin-offset-left` |
| Tela estreita | `(max-width: 768px)` | — |

Constantes de forma no SCSS global: `--m365-skin-gap: 12px`, `--m365-skin-radius: 16px`.

## 2. Cores (tokens com prefixo próprio)
| Token | Padrão (SCSS global) | Com "Herdar tema" |
|---|---|---|
| `--m365-skin-primary` | `#0f6cbd` | `palette.themePrimary` |
| `--m365-skin-primary-soft` | `#ebf3fc` | `palette.themeLighterAlt` |
| `--m365-skin-bg` | `#f5f5f5` | `semanticColors.bodyStandoutBackground` ou `palette.neutralLighterAlt` |
| `--m365-skin-surface` | `#ffffff` | `semanticColors.bodyBackground` ou `palette.white` |
| `--m365-skin-border` | `#e0e0e0` | `palette.neutralLight` |
| `--m365-skin-text` | `#242424` | `semanticColors.bodyText` ou `palette.neutralPrimary` |
| `--m365-skin-text-secondary` | `#616161` | `semanticColors.bodySubtext` ou `palette.neutralSecondary` |
| `--m365-skin-overlay` | `rgba(0, 0, 0, 0.35)` | — |

## 3. Identificadores fixos
| Item | Valor |
|---|---|
| Host da skin | `div#m365-skin-host` (filho direto do `<body>`) |
| Classe de ativação no `<body>` | `m365-skin-ativa` |
| Classes de modo no `<body>` | `m365-skin-lateral`, `m365-skin-superior`, `m365-skin-colapsado` |
| Elemento nativo oculto | `m365-skin-oculto` |
| Área de conteúdo reposicionada | `m365-skin-area` |
| Menu nativo em edição sobre a skin | `m365-skin-nav-edicao` (z-index 950; menu da skin 900; lista suspensa 960; barra 1000) |
| Preferência do menu recolhido | `localStorage['m365-skin-sidenav-collapsed']` = `'1'` ou `'0'` |
| Prefixo de log | `[m365-skin]` |
| Parâmetro de diagnóstico | `skinDebug=1` (ou `true`) |
| Rótulo sem link do SharePoint | `http://linkless.header/` |

## 4. Seletores nativos candidatos (o primeiro existente vence)
Última validação no tenant: preencher ao conferir.

| Grupo | Ação | Candidatos, em ordem |
|---|---|---|
| `suiteBar` | ocultar | `#SuiteNavWrapper`, `#SuiteNavPlaceHolder`, `#O365_NavHeader`, `#suiteBarTop`, `div[data-automationid="SuiteNavWrapper"]` |
| `siteHeader` | ocultar | `#spSiteHeader`, `div[data-automationid="SiteHeader"]`, `div[data-sp-feature-tag="Site header host"]` |
| `leftNav` | ocultar (exibir durante a edição da navegação) | `#spLeftNav`, `div[data-automationid="SPLeftNav"]`, `div[data-automation-id="sp-left-nav"]` |
| `appBar` | ocultar | `#sp-appBar`, `div[data-automationid="sp-appBar"]` |
| `pageCommandBar` | ocultar | `div[data-automation-id="pageCommandBar"]`, `div[data-automationid="pageCommandBar"]`, `#spPageCommandBar`, `div[data-automation-id="CanvasCommandBar"]` |
| `contentArea` | reposicionar | `#spPageChromeAppDiv`, `div[data-automation-id="contentScrollRegion"]` |

**Botão "Editar" do menu nativo** (dentro do elemento de `leftNav`): primeiro `[data-automation-id="EditNavLink"]`, `[data-automationid="EditNavLink"]`, `[data-automation-id="navEditLink"]`; se nenhum existir, o primeiro `button`, `a` ou `[role="button"]` cujo texto, sem espaços nas pontas e em minúsculas, seja exatamente `editar` ou `edit`.

## 5. Ícones: regras de texto (em ordem; a primeira que casar vale)
Texto normalizado: sem acentos (NFD), minúsculas, espaços únicos. "Início de palavra": o termo começa no início do texto ou após caractere que não seja `a-z0-9`. "Palavra inteira": também termina em fronteira.

| # | Ícone | Casamento | Termos |
|---|---|---|---|
| 1 | `home` (casa) | texto inteiro | `pagina inicial`, `inicio`, `home`, `principal` |
| 2 | `support` (atendimento (headset)) | início de palavra | `fale com`, `fale conosco`, `atendimento`, `suporte`, `coordenador`, `coordenacao`, `secretaria`, `ouvidoria`, `central de` |
| 3 | `survey` (pesquisa (prancheta com check)) | palavra inteira | `nps`, `csat`, `enquete`, `enquetes` |
| 4 | `survey` (pesquisa (prancheta com check)) | início de palavra | `pesquisa de`, `avaliac`, `satisfac`, `questionario`, `feedback`, `opiniao` |
| 5 | `apps` (grade de apps) | início de palavra | `sistema`, `aplicativo`, `aplicacao`, `ferramenta`, `servicos`, `acessos`, `acesso rapido` |
| 6 | `apps` (grade de apps) | palavra inteira | `apps`, `app` |
| 7 | `chat` (balão de conversa) | início de palavra | `conversa`, `discuss`, `chat`, `forum`, `mensage`, `comunidade` |
| 8 | `form` (formulário) | início de palavra | `formulario`, `inscric`, `cadastro`, `solicitac`, `requerimento`, `requisic`, `matricula` |
| 9 | `career` (maleta) | início de palavra | `carreira`, `vaga`, `emprego`, `estagio`, `oportunidade`, `recrutamento` |
| 10 | `certificate` (medalha/certificado) | início de palavra | `certificad`, `diploma`, `declarac`, `historico escolar` |
| 11 | `school` (capelo) | início de palavra | `curso`, `aula`, `turma`, `disciplina`, `aluno`, `ensino`, `graduac`, `pos-graduac`, `especializ`, `capacitac`, `treinamento`, `academic`, `professor`, `docente` |
| 12 | `book` (livro) | início de palavra | `regulamento`, `norma`, `politica`, `manual`, `edital`, `editais`, `guia`, `procedimento`, `biblioteca virtual` |
| 13 | `money` (dinheiro) | início de palavra | `financeiro`, `pagamento`, `boleto`, `mensalidade`, `bolsa`, `orcamento`, `custo`, `reembolso` |
| 14 | `calendar` (calendário) | início de palavra | `calendario`, `agenda`, `evento`, `cronograma`, `prazo` |
| 15 | `news` (jornal) | início de palavra | `noticia`, `news`, `anuncio`, `comunicado`, `aviso`, `informativo`, `novidade` |
| 16 | `tasks` (lista de tarefas) | início de palavra | `tarefa`, `planejamento`, `projeto`, `pendenc`, `checklist`, `acompanhamento` |
| 17 | `chart` (gráfico de barras) | início de palavra | `relatorio`, `analise`, `painel`, `dashboard`, `indicador`, `metrica`, `estatistic`, `resultado` |
| 18 | `chart` (gráfico de barras) | palavra inteira | `bi`, `kpi`, `kpis` |
| 19 | `folder` (pasta) | início de palavra | `documento`, `arquivo`, `biblioteca`, `pasta`, `repositorio` |
| 20 | `notebook` (caderno) | início de palavra | `anotac`, `bloco de notas`, `onenote`, `caderno` |
| 21 | `download` (download) | início de palavra | `download`, `baixar`, `material`, `modelos`, `templates` |
| 22 | `people` (pessoas) | início de palavra | `contato`, `pessoa`, `equipe`, `colaborador`, `quem e quem`, `organograma`, `membro` |
| 23 | `people` (pessoas) | palavra inteira | `time`, `rh` |
| 24 | `user` (pessoa) | início de palavra | `perfil`, `minha conta`, `meus dados`, `meu cadastro` |
| 25 | `mail` (envelope) | início de palavra | `e-mail`, `email`, `correio`, `webmail`, `outlook` |
| 26 | `phone` (telefone) | início de palavra | `telefone`, `ramal`, `ramais`, `whatsapp` |
| 27 | `location` (pino de mapa) | início de palavra | `endereco`, `localizac`, `mapa`, `como chegar`, `unidade`, `campus` |
| 28 | `shield` (escudo) | início de palavra | `seguranca`, `privacidade`, `lgpd`, `compliance`, `etica` |
| 29 | `image` (imagem) | início de palavra | `imagem`, `imagens`, `foto`, `galeria`, `midia` |
| 30 | `video` (câmera de vídeo) | início de palavra | `video`, `webinar`, `live`, `gravac`, `stream` |
| 31 | `help` (interrogação) | início de palavra | `ajuda`, `faq`, `duvida`, `perguntas frequentes`, `tutorial` |
| 32 | `info` (informação) | início de palavra | `sobre`, `institucional`, `quem somos`, `apresentac`, `missao`, `historia` |
| 33 | `search` (lupa) | início de palavra | `busca`, `pesquisar`, `consulta` |
| 34 | `settings` (engrenagem) | início de palavra | `configurac`, `ajuste`, `administrac`, `preferencia` |
| 35 | `list` (lista) | início de palavra | `conteudo do site`, `conteudo`, `lista`, `itens`, `catalogo`, `registro` |
| 36 | `page` (página) | início de palavra | `pagina`, `paginas`, `site pages` |
| 37 | `link` (corrente (link)) | início de palavra | `links`, `link`, `portal`, `site externo` |

## 6. Ícones: regras de URL (só se o texto não decidiu; nunca para rótulos sem link)
URL normalizada: `decodeURIComponent` (se falhar, a original), sem acentos, minúsculas.

| # | Ícone | Expressão (literal no código) |
|---|---|---|
| 1 | `mail` (envelope) | `/^mailto:/` |
| 2 | `phone` (telefone) | `/^tel:/` |
| 3 | `chat` (balão de conversa) | `/teams\.microsoft\.com\|teams\.live\.com\|\/_layouts\/15\/teamslogon/` |
| 4 | `form` (formulário) | `/forms\.office\.com\|forms\.microsoft\.com\|forms\.cloud\.microsoft\|\/forms\/design/` |
| 5 | `chart` (gráfico de barras) | `/app\.powerbi\.com\|powerbi\.microsoft\.com/` |
| 6 | `mail` (envelope) | `/outlook\.office\|outlook\.live\.com/` |
| 7 | `video` (câmera de vídeo) | `/youtube\.com\|youtu\.be\|vimeo\.com\|stream\.aspx\|microsoftstream\.com/` |
| 8 | `notebook` (caderno) | `/onenote\|\.one(\?\|#\|$)/` |
| 9 | `file` (arquivo) | `/\.(pdf\|docx?\|xlsx?\|pptx?\|csv\|txt)(\?\|#\|$)/` |
| 10 | `image` (imagem) | `/\.(png\|jpe?g\|gif\|svg\|webp)(\?\|#\|$)/` |
| 11 | `list` (lista) | `/\/_layouts\/15\/viewlsts\.aspx\|\/lists\//` |
| 12 | `folder` (pasta) | `/\/forms\/allitems\.aspx\|\/shared documents\|\/documentos compartilhados\|\/documents(\/\|$)/` |
| 13 | `calendar` (calendário) | `/calendar\|calendario/` |
| 14 | `page` (página) | `/\/sitepages\/\|\/paginas\//` |

## 7. Ícones: estrutura e padrão
| Condição | Ícone |
|---|---|
| Rótulo sem link ou item com filhos | `apps` (grade de apps) |
| Link externo (`IsExternal`) | `external` (link externo) |
| Nenhuma regra | `generic` (seta em círculo) |
| Link "Editar" da navegação | `edit` (lápis) |

Desenho: SVG 24×24, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.6"`, pontas e junções arredondadas, `aria-hidden="true"`, `focusable="false"`. Cor: `--m365-skin-text-secondary`; item ativo: `--m365-skin-primary`.

## 8. Diagnóstico (`?skinDebug=1`)
Grupo `[m365-skin] diagnóstico`, depois que a navegação carrega:
1. `Modo de navegação:` objeto com `mode`, `source` e valores lidos do web.
2. `Itens de navegação:` quantidade e árvore.
3. `Ícones do menu (texto → url → estrutura → padrão):` `console.table` com `item` (recuo de 2 espaços por nível), `icone`, `origem` (`texto`, `url`, `estrutura`, `padrao`) e `regra`.
4. `Permissões (Low/High):` máscara efetiva.
5. `Elementos nativos encontrados:` `console.table` com `grupo`, `seletor`, `encontrados`, mais a linha `Editar (botão do menu nativo)` (1 ou 0).
