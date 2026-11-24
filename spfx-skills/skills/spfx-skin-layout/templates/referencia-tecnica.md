# Referência técnica — spfx-skin-layout

Valores que a extensão deve replicar exatamente. Seletores nativos não são API pública: atualizar a data da validação a cada conferência no tenant (diagnóstico `?skinDebug=1`).

## 1. Medidas
### 1.1 Layout (fonte única em TypeScript)
| Constante | Valor | Variável CSS no `<body>` |
|---|---|---|
| Altura da barra superior | 80 px (72 px em tela estreita) | `--m365-skin-bar-height` |
| Altura da faixa do menu superior | 52 px | `--m365-skin-topnav-height` |
| Largura do menu lateral | 242 px | `--m365-skin-sidenav-width` |
| Menu recolhido | sem trilho: deslocamento lateral 0 | — |
| Deslocamento da área de conteúdo | calculado (seção 10 da skill) | `--m365-skin-offset-top`, `--m365-skin-offset-left` |
| Tela estreita | `(max-width: 800px)` | — |

Constantes de forma no SCSS global: `--m365-skin-gap: 12px`, `--m365-skin-radius: 8px`.
Fonte: `"Aptos", "Segoe UI", Arial, sans-serif`, 14px, entrelinha 1.5.

### 1.2 Componentes (SCSS do módulo)
| Elemento | Medidas |
|---|---|
| Barra superior | Preenchimento horizontal 36px (18px estreita); distância entre blocos 24px (12px estreita); borda inferior 1px |
| Logo | Altura 54px, largura máxima 180px, `object-fit: contain` |
| Divisor logo/nome | 1px × 40px, cor `--m365-skin-border`, distância 18px |
| Nome do site | 18px, peso 650, entrelinha 1.2, uma linha com reticências (16px em tela estreita) |
| Legenda | 7.5px, caixa alta, `letter-spacing` 1.5px, margem superior 5px |
| Avatar | 36px, círculo, fundo `--m365-skin-primary-soft`, iniciais 11px peso 600 na cor primária |
| Nome e papel do usuário | Nome 11px peso 600 (máx. 190px, reticências); papel 9px na cor secundária |
| Botões de ícone (☰, engrenagem) | 34×34px, preenchimento 7px, raio 8px; hover: cor primária sobre `--m365-skin-primary-soft` |
| Lateral | Preenchimento vertical `8px 18px`; menu com preenchimento horizontal 12px; altura máxima `calc(100dvh - barra)` com rolagem própria |
| Item da árvore | Altura mínima 40px, preenchimento `9px 12px`, 13.5px peso 500 (nível 0); 13px peso 400 e preenchimento vertical 8px (níveis 1–2); rótulo-botão peso 600 |
| Botão de seta da árvore | 32×32px, ícone 16px |
| Recuo de subníveis | Margem `2px 0 6px 20px`, preenchimento à esquerda 8px, borda esquerda de 1px (`--m365-skin-border`) |
| Indicador do ativo | Barra de 3px à esquerda, inset vertical 8px, raio 3px, cor primária |
| Filtro | Altura 36px, raio 8px, margem `4px 16px 12px`, preenchimento `0 10px`, fundo `--m365-skin-bg`, texto 12.5px, ícone 15px; foco: borda primária + sombra de 3px `--m365-skin-primary-soft` |
| Rodapé da lateral | Margem `auto 24px 0`, preenchimento superior 14px, borda superior 1px; ações 11.5px com ícone 14px |
| Esqueleto | Linhas de 12px, raio 6px, largura 78% (62% a cada terceira), distância 16px |
| Faixa superior | Preenchimento horizontal 28px, distância 12px, borda inferior 1px |
| Item de topo | Altura 36px, preenchimento `0 12px` (6px à direita quando dividido), 13.5px peso 500, distância 6px, seta 16px |
| Seta do item dividido | 24×36px, ícone 15px |
| Sublinhado do ativo | 3px, `inset-inline: 10px`, colado na base da faixa, raio `3px 3px 0 0` |
| Painel em cascata | Largura 240–340px, preenchimento 8px, raio 12px, topo em `calc(100% - 2px)`, sombra `--m365-skin-shadow-panel` |
| Link de painel | Preenchimento `9px 12px`, raio 8px, 13px; netos recuados `2px 0 4px 14px` + guia de 1px + 8px |
| Rótulo sem link em painel | 11px peso 600, caixa alta, `letter-spacing` .6px, preenchimento `10px 12px 4px` |
| Megamenu | Largura da faixa, preenchimento `22px 28px 26px`, raio `0 0 14px 14px`; colunas `repeat(auto-fill, minmax(210px, 1fr))`, distância `14px 32px`, largura máxima 1240px |
| Título de coluna | 13.5px peso 650, cor primária, preenchimento `6px 12px 10px`, borda inferior 1px |
| "Ir para <título>" | Margem superior 18px, peso 600, cor primária |
| Editar (faixa superior) | Altura 32px, preenchimento `0 11px`, borda 1px, raio 8px, 12px, ícone de lápis 14px |
| Gaveta | Abaixo da barra, largura do menu lateral, sombra `--m365-skin-shadow-drawer`, fundo escurecido `--m365-skin-overlay` |
| Link em nova janela | Ícone externo 13px na cor secundária |
| Modal da engrenagem | `min(440px, 92vw)` |

### 1.3 Tempos e limites
| Item | Valor |
|---|---|
| Animação de abrir ramo da árvore | 180ms |
| Animação de abrir painel | 160ms |
| Animação de recolher/expandir | 220ms; classe `m365-skin-animando` por ~320ms, só no clique |
| Abrir painel ao passar o mouse | 140ms |
| Fechar painel ao sair com o mouse | 220ms |
| Clique que confirma após abrir por mouse | até 450ms |
| Reserva para "Mais" | ~92px |
| Filtro da lateral | a partir de 8 links |
| Ramos abertos guardados | no máximo 50 |

## 2. Cores (tokens com prefixo próprio)
| Token | Padrão (SCSS global) | Com "Herdar tema" |
|---|---|---|
| `--m365-skin-primary` | `#164b78` | `palette.themePrimary` |
| `--m365-skin-primary-soft` | `#edf4fa` | `palette.themeLighterAlt` |
| `--m365-skin-hover` | `#f0f4f8` | `palette.neutralLighter` |
| `--m365-skin-bg` | `#f5f7fa` | `semanticColors.bodyStandoutBackground` ou `palette.neutralLighterAlt` |
| `--m365-skin-surface` | `#ffffff` | `semanticColors.bodyBackground` ou `palette.white` |
| `--m365-skin-border` | `#e5eaf0` | `palette.neutralLight` |
| `--m365-skin-text` | `#25374b` | `semanticColors.bodyText` ou `palette.neutralPrimary` |
| `--m365-skin-text-secondary` | `#718093` | `semanticColors.bodySubtext` ou `palette.neutralSecondary` |
| `--m365-skin-focus` | `#58a8d8` | — |
| `--m365-skin-overlay` | `rgb(15 30 45 / 25%)` | — |
| `--m365-skin-shadow-panel` | `0 18px 44px rgb(15 30 45 / 14%), 0 2px 6px rgb(15 30 45 / 6%)` | — |
| `--m365-skin-shadow-drawer` | `0 18px 44px rgb(15 30 45 / 18%)` | — |

Uso: item ativo e ações em `--m365-skin-primary`; fundo do ativo e hover de ações em `--m365-skin-primary-soft`; hover dos itens do menu em `--m365-skin-hover`. Com "Herdar tema", conferir o contraste do texto primário sobre `--m365-skin-primary-soft` e do contorno de foco.

## 3. Identificadores fixos
| Item | Valor |
|---|---|
| Host da skin | `div#m365-skin-host` (filho direto do `<body>`) |
| Marca de instância única | `window.__m365SkinInstance` (presente enquanto uma instância estiver montada) |
| Classe de ativação no `<body>` | `m365-skin-ativa` |
| Classes de modo no `<body>` | `m365-skin-lateral`, `m365-skin-superior`, `m365-skin-sem-menu`, `m365-skin-colapsado`, `m365-skin-gaveta` (gaveta aberta) |
| Animação do recolher | `m365-skin-animando` |
| Elemento nativo oculto | `m365-skin-oculto` |
| Área de conteúdo reposicionada | `m365-skin-area` |
| Camadas (`z-index`) | barra 1000; gaveta 970; fundo da gaveta 965; painel do menu superior 960; menu nativo em edição (`m365-skin-nav-edicao`) 950; menu da skin 900 |
| Preferência do menu recolhido | `localStorage['m365-skin-sidenav-collapsed']` = `'1'` ou `'0'` |
| Ramos abertos | `sessionStorage['m365-skin-nav-expanded:<id do web>']` (JSON, no máximo 50 chaves) |
| Orientação lembrada | `sessionStorage['m365-skin-nav-mode:<id do web>']` = `lateral`, `superior` ou `sem-menu` |
| Prefixo de log | `[m365-skin]` |
| Parâmetro de diagnóstico | `skinDebug=1` (ou `true`) |
| Rótulo sem link do SharePoint | `http://linkless.header/` |
| Chaves de menu (`menuNodeKey`) | `1025` (Início Rápido), `1002` (barra superior) |
| Template de site de comunicação | `SITEPAGEPUBLISHING` |
| Lixeira | caminho contendo `/_layouts/15/recyclebin.aspx`, sem diferenciar caixa |

## 4. Seletores nativos candidatos (o primeiro existente vence)
Última validação no tenant: preencher ao conferir.

| Grupo | Ação | Candidatos, em ordem |
|---|---|---|
| `suiteBar` | ocultar | `#SuiteNavWrapper`, `#SuiteNavPlaceHolder`, `#O365_NavHeader`, `#suiteBarTop`, `div[data-automationid="SuiteNavWrapper"]` |
| `siteHeader` | ocultar | `#spSiteHeader`, `div[data-automationid="SiteHeader"]`, `div[data-sp-feature-tag="Site header host"]` |
| `leftNav` | ocultar (exibir durante a edição da navegação) | `#spLeftNav`, `div[data-automationid="SPLeftNav"]`, `div[data-automation-id="sp-left-nav"]` |
| `appBar` | ocultar | `#sp-appBar`, `div[data-automationid="sp-appBar"]` |
| `pageCommandBar` | ocultar | `div[data-automation-id="pageCommandBar"]`, `div[data-automationid="pageCommandBar"]`, `#spPageCommandBar`, `div[data-automation-id="CanvasCommandBar"]`, `#spCommandBar` |
| `contentArea` | reposicionar | `#spPageChromeAppDiv`, `div[data-automation-id="contentScrollRegion"]` |
| `sectionContainer` | largura máxima 100% (todos os encontrados, por CSS direto) | `[data-automation-id="CanvasZone-SectionContainer"]`, `[class~="CanvasZoneSectionContainer"]` |

Regra das seções, no SCSS global (nunca com classes de hash, como `s_B_tBg_y298L`):

```scss
body.m365-skin-ativa [data-automation-id="CanvasZone-SectionContainer"],
body.m365-skin-ativa [class~="CanvasZoneSectionContainer"] {
  max-width: 100% !important;
}
```

**Botão "Editar" do menu nativo** (dentro do elemento de `leftNav`): primeiro `[data-automation-id="EditNavLink"]`, `[data-automationid="EditNavLink"]`, `[data-automation-id="navEditLink"]`; se nenhum existir, o primeiro `button`, `a` ou `[role="button"]` cujo texto, sem espaços nas pontas e em minúsculas, seja exatamente `editar` ou `edit`.

## 5. Ícones: regras de texto (só com `navIcons = true`; em ordem, a primeira que casar vale)
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

## 6. Ícones: regras de URL (só com `navIcons = true`, se o texto não decidiu; nunca para rótulos sem link)
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

## 7. Ícones: estrutura, padrão e interface
| Condição | Ícone |
|---|---|
| Rótulo sem link ou item com filhos (só com `navIcons`) | `apps` (grade de apps) |
| Link externo (`IsExternal`) (só com `navIcons`) | `external` (link externo) |
| Nenhuma regra (só com `navIcons`) | `generic` (seta em círculo) |
| Link "Editar" da navegação | `edit` (lápis) |

Ícones de interface (sempre presentes, com ou sem `navIcons`). Se o conjunto do menu já tiver o mesmo desenho, use um só:

| Ícone | Uso | `path` (24×24) |
|---|---|---|
| `menu` | ☰ | `M4 6h16M4 12h16M4 18h16` |
| `search` | busca e filtro | `M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm5.5 12 4 4` |
| `chevronDown` | setas da árvore (−90° fechada) e da faixa (180° aberta) | `m6 9 6 6 6-6` |
| `external` | link em nova janela (13px) | `M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5` |
| `edit` | Editar navegação | `M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4` |
| `refresh` | Tentar novamente | `M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7` |
| `settings` | engrenagem | `m10 3-.6 2.1-2 .8L5.5 5 3 9l1.6 1.5v3L3 15l2.5 4 1.9-.9 2 .8L10 21h4l.6-2.1 2-.8 1.9.9 2.5-4-1.6-1.5v-3L21 9l-2.5-4-1.9.9-2-.8L14 3zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z` |

Desenho: SVG 24×24, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.65"`, pontas e junções arredondadas, `aria-hidden="true"`, `focusable="false"`. Cor: `--m365-skin-text-secondary`; item ativo: `--m365-skin-primary`.

## 8. Diagnóstico (`?skinDebug=1`)
Grupo `[m365-skin] diagnóstico`, depois que a navegação carrega:
1. `Modo de navegação:` objeto com `mode`, `source` (`auto` ou override), valores lidos do web (`WebTemplate`, `QuickLaunchEnabled`, `HorizontalQuickLaunch`, `MegaMenuEnabled`, `NavAudienceTargetingEnabled`) e orientação lembrada × resolvida.
2. `Origem dos itens:` `MenuState` ou REST (com a chave ou coleção).
3. `Segmentação por público:` ligada ou não; quantidade de nós ocultos por público e por falha de verificação.
4. `Itens de navegação:` quantidade e árvore (com os removidos por Lixeira ou por URL rejeitada).
5. `Ícones do menu (texto → url → estrutura → padrão):` `console.table` com `item` (recuo de 2 espaços por nível), `icone`, `origem` (`texto`, `url`, `estrutura`, `padrao`) e `regra`. Só com `navIcons = true`.
6. `Permissões (Low/High):` máscara efetiva e papel resolvido (Proprietário, Editor, Visitante).
7. `Elementos nativos encontrados:` `console.table` com `grupo`, `seletor`, `encontrados`, mais a linha `Editar (botão do menu nativo)` (1 ou 0).
8. `Instância:` aviso quando uma segunda instância foi descartada.

## 9. Consultas e permissões
| Finalidade | Requisição | Frequência |
|---|---|---|
| Modo | `GET _api/web?$select=NavAudienceTargetingEnabled,HorizontalQuickLaunch,MegaMenuEnabled,QuickLaunchEnabled,WebTemplate` | uma vez por site |
| Modo (recusa da anterior) | `GET _api/web?$select=NavAudienceTargetingEnabled` + orientação lembrada | só na recusa |
| Itens | `GET _api/navigation/MenuState?menuNodeKey='1025'` (ou `'1002'`) | uma vez por site, com cache |
| Itens (alternativa, só sem segmentação) | `GET _api/web/navigation/QuickLaunch?$expand=Children/Children` (ou `TopNavigationBar`); recusa → `$expand=Children` | só na falha do `MenuState` |
| Permissões | `GET _api/web/effectiveBasePermissions` | uma vez por site, com cache |
| Pertencimento a grupos (segmentação) | a definir (seção 17 da skill) | uma vez por sessão, só com segmentação ligada e nós com público |
| Foto | `/_layouts/15/userphoto.aspx` | imagem |
| Busca | `/_layouts/15/search.aspx?q=<termo>` | navegação |

| Permissão | Libera |
|---|---|
| `ManageWeb` | Papel Proprietário; Editar navegação; Navegação e aparência; Configurações do site |
| `EditListItems` | Papel Editor (quem edita); engrenagem; Editar esta página |
| `ManageLists` | Lixeira, na engrenagem e no menu (nível Editar ou superior; Colaborar tem `EditListItems`, mas não `ManageLists`) |
| `ManagePermissions` | Permissões do site |
| `ViewPages` | Conteúdo do site |

## 10. Pacote: `ClientSideInstance.xml` e `package-solution.json`
`config/package-solution.json` (trecho):

```json
"solution": {
  "includeClientSideAssets": true,
  "skipFeatureDeployment": true,
  "features": [
    {
      "title": "<nome da extensão>",
      "id": "<guid da feature>",
      "version": "1.0.0.0",
      "assets": { "elementManifests": ["ClientSideInstance.xml"] }
    }
  ]
}
```

`sharepoint/assets/ClientSideInstance.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Elements xmlns="http://schemas.microsoft.com/sharepoint/">
  <ClientSideComponentInstance
    Title="m365-skin-layout"
    Location="ClientSideExtension.ApplicationCustomizer"
    ComponentId="<id do manifesto da extensão>"
    Properties="{&quot;activationParam&quot;:&quot;env&quot;,&quot;activationValue&quot;:&quot;webview&quot;,&quot;navigationMode&quot;:&quot;auto&quot;,&quot;navIcons&quot;:false,&quot;inheritTheme&quot;:true}" />
</Elements>
```

Atributos opcionais aceitos: `WebTemplateId` (tipo de site), `ListTemplateId`, `Sequence` e `HostProperties`. Use `WebTemplateId` só se o escopo limitar o tipo de site.
