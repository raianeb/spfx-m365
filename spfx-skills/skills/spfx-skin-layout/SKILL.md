---
name: "spfx-skin-layout"
description: "Skin de layout por Application Customizer SPFx no SharePoint Online, ativada só com ?env=webview: pergunta se usa a extensão padrão (ex-layout-sharepoint.sppkg) ou gera uma nova; barra superior fixa (☰, logo, nome, busca, usuário, engrenagem só para quem edita), menu lateral recolhível ou horizontal (cascata, megamenu e Mais) conforme a navegação nativa do site, segmentação por público, edição pelo editor nativo, exclusão de telas nativas, implantação em todos os sites e diagnóstico por ?skinDebug=1."
---

# Skin de layout (Application Customizer)

## Quando usar
Ao criar ou revisar uma extensão que substitui a moldura visual do site (cabeçalho e navegação) por um layout padronizado da equipe M365, montado a partir da **navegação nativa** do site.
Carregue também: `spfx-extensoes-padroes`, `spfx-tema-marca`, `spfx-design-base` (modal e barras), `spfx-acessibilidade-conteudo`, `spfx-codigo-performance`.
Detalhes que devem ser replicados exatamente (medidas, tokens, identificadores, seletores, consultas, ícones, diagnóstico): `templates/referencia-tecnica.md`. Pacote da extensão padrão: `pacote/`.

Web part com módulos e rotas próprias (navegação personalizada) não usa esta skill: o menu fica dentro da web part. Navegação que vem do site usa esta skill, nunca um menu recriado na web part.

## 0. Extensão padrão ou nova extensão
Antes de qualquer configuração ou geração, pergunte (use `AskUserQuestion` quando disponível):

> **Utilizar a extensão padrão?**
> - **Sim** — copio o pacote pronto `ex-layout-sharepoint.sppkg` para a pasta do projeto. Menu sem ícones.
> - **Não** — gero uma nova extensão seguindo esta skill.

Aguarde a resposta. Não presuma.

### 0.1 Resposta "Sim" (extensão padrão)
1. Confira `pacote/ex-layout-sharepoint.sppkg` e a tabela de versão de `pacote/README.md`. Se o arquivo não existir ou o SHA-256 não bater com a tabela, informe e pare. Não gere uma extensão nova no lugar sem nova confirmação.
2. Copie o arquivo para `<projeto>/ex-layout-sharepoint.sppkg`, sem renomear. A cópia do projeto não é versionada (`*.sppkg` está no `.gitignore`); a versionada é a de `pacote/`.
3. Registre no `escopo.md` a versão e o SHA-256 do pacote copiado.
4. Não gere código, scaffold nem build. A verificação de ambiente não bloqueia este caminho.
5. Oriente a implantação pela seção 13. Antes, confira no catálogo de aplicativos do tenant se a extensão padrão já está instalada:
   - mesma versão → não implante de novo: o aplicativo já atende todos os sites;
   - versão menor → atualize **sem** marcar "adicionar a todos os sites";
   - ausente → primeira implantação, marcando a opção.
6. O pacote é pronto: logo, nome e demais propriedades ficam na entrada da lista **Tenant Wide Extensions** (coluna *Component Properties*), não no código. Propriedades aceitas: `pacote/README.md`. Logo e nome vêm do próprio site por padrão, então normalmente não há configuração por site.
7. Ícones no menu: a extensão padrão não usa (seção 5.7).

### 0.2 Resposta "Não" (nova extensão)
Gere a extensão seguindo as seções 1 a 16. Pergunte, em uma única rodada, os valores da seção 12 (todos opcionais, inclusive `navIcons`).

## 1. Plataforma
- Somente **SharePoint Online**, em páginas modernas.
- A skin nunca é aplicada em telas nativas (seção 2.2).

## 2. Ativação
### 2.1 Query string
- A skin só é carregada quando a URL contém `env=webview` (ex.: `https://<tenant>.sharepoint.com/sites/<site>?env=webview`).
- Nome (`env`) e valor (`webview`) comparados sem diferenciar maiúsculas e minúsculas, configuráveis (seção 12).
- Sem o parâmetro, ou com outro valor: nenhuma requisição, nenhum nó injetado, nenhum CSS e nenhum módulo da skin carregado (seção 3). A página abre com a interface padrão.
- Ativação é **apresentação**, não segurança: as permissões continuam sendo do SharePoint.

### 2.2 Telas nativas: nunca recebem a skin e nunca levam o parâmetro
Compare o caminho **relativo ao web** (`pageContext.web.serverRelativeUrl` removido do início), por segmento e sem diferenciar maiúsculas. Assim um site ou subsite chamado `lists` ou `forms` (ex.: `/sites/forms/SitePages/Inicio.aspx`) continua recebendo a skin.

| Condição | Exemplo |
|---|---|
| Algum segmento é `_layouts` | `/sites/x/_layouts/15/settings.aspx` |
| O caminho relativo começa com o segmento `lists` (modos de exibição e formulários de lista) | `/sites/x/Lists/Tarefas/AllItems.aspx`, `/sites/x/Lists/Tarefas/DispForm.aspx?ID=1` |
| Algum segmento é `forms` (modos de exibição e formulários de biblioteca) | `/sites/x/Shared Documents/Forms/AllItems.aspx` |
| Query contém `Mode=Edit` (chave e valor sem diferenciar caixa) | `/sites/x?env=webview&Mode=Edit` |

- Se o caminho não começar pelo `serverRelativeUrl` do web, avalie o caminho inteiro pelas mesmas regras.
- Nessas URLs a skin não ativa, mesmo com `env=webview`.
- **Remoção do parâmetro:** se a URL atual é tela nativa e contém o parâmetro de ativação, removê-lo com `history.replaceState`, sem recarregar a página, preservando os demais parâmetros e o fragmento.
- Links gerados pela skin nunca acrescentam o parâmetro a URLs de telas nativas. Ao abrir uma lista ou biblioteca pelo menu, a pessoa sai do modo aplicação; Voltar retorna à página com a skin.
- A lógica recebe o `serverRelativeUrl` por parâmetro, para ser testável sem o SharePoint.

### 2.3 Reavaliação sem recarregar a página
A decisão (ativar, desativar, remover parâmetro) é reavaliada a cada troca de URL:
- `navigatedEvent` da aplicação;
- **Navigation API** (`window.navigation`, evento `currententrychange`) quando existir: capta toda troca de URL na mesma página, inclusive a do botão **Editar** do SharePoint, cujo roteador usa referências ao `history` guardadas antes da extensão carregar;
- sem Navigation API: interceptar `pushState`/`replaceState` e escutar `popstate`, restaurando os métodos originais no `onDispose`.
- Avisar só quando o endereço de fato mudou. **Proibido** verificar a URL por intervalo (timer/polling).

### 2.4 Propagação
- Links gerados pela skin (menu, busca, modal) preservam o parâmetro, só no mesmo domínio e nunca para telas nativas (2.2).
- Ao propagar, preservar os demais parâmetros e o fragmento (`#`).
- Links do conteúdo da página não são reescritos.

## 3. Carregamento, montagem e falha segura
- **Ponto de entrada mínimo:** a implantação em todos os sites (seção 13) carrega o ponto de entrada em todas as páginas do tenant. O `onInit` só lê a URL e decide (seção 2). React, componentes, estilos e serviços da skin ficam em um módulo carregado por `import()` dinâmico (chunk separado), somente quando a skin ativa.
- **Instância única global:** antes de montar, verificar e gravar uma marca em `window` (`referencia-tecnica.md`, seção 3). Se a marca já existir (entrada duplicada na lista Tenant Wide Extensions ou aplicativo também adicionado ao site), a segunda instância não faz nada e registra aviso no diagnóstico. O `onDispose` da instância dona remove a marca.
- **Host próprio:** um `div#m365-skin-host` filho direto do `<body>`, fora dos contêineres do SharePoint. Dentro do placeholder `Top`, os elementos fixos ficam presos ao layout nativo e somem junto com ele. É injeção fora dos placeholders oficiais: tratada como o risco da seção 9, com host único (remover um existente antes de criar) e removido no `onDispose` e ao desativar.
- Renderização com `createRoot` (React 18) dentro de um *error boundary*. Erro de renderização ou falha ao carregar o módulo: desmontar a skin e manter o layout nativo.
- **Ordem:** a skin renderiza primeiro; só depois da primeira renderização (callback `onReady`) a classe `m365-skin-ativa` entra no `<body>` e o layout nativo é ocultado. Se a skin não renderizar, nada nativo é ocultado.
- Classes de estado no `<body>`: `m365-skin-lateral`, `m365-skin-superior`, `m365-skin-sem-menu`, `m365-skin-colapsado`, `m365-skin-gaveta`, `m365-skin-animando`. Todas removidas ao desativar.

## 4. Estrutura da skin
- **Barra superior fixa**, em largura total. Ela **não se move** ao recolher, expandir ou trocar a orientação. Da esquerda para a direita:
  1. **☰**: só quando houver menu lateral no desktop ou gaveta (seção 5.4). `aria-controls` aponta para o menu, `aria-expanded` reflete o estado e o rótulo muda: "Recolher navegação"/"Expandir navegação" no desktop; "Abrir navegação"/"Fechar navegação" na gaveta.
  2. **Logo + divisor + nome**: um único link para a página inicial do site, com o parâmetro e `aria-label="<Nome> — página inicial"`; o logo usa `alt=""`. Logo da configuração; sem logo configurado, logo do site (`legacyPageContext.webLogoUrl`, que não é API pública: falha → sem logo). Sem logo: só o nome, sem divisor. O logo preserva a proporção (`object-fit: contain`). Nome do site (título do web ou override) em uma linha com reticências, com legenda opcional em caixa alta.
  3. **Busca** (seção 6).
  4. **Usuário**: avatar (foto ou iniciais), nome e, abaixo, o papel no site (seção 7). Sem papel carregado: placeholder.
  5. **Engrenagem** (ícone SVG de engrenagem): só para quem edita (seção 8).
- **Sem caminho de pão** (breadcrumb) e **sem bloco de contexto** na lateral ("Navegação do site", "Seu ambiente de trabalho" etc.). Marca e nome ficam só na barra.
- Até 1200px de largura, o texto do usuário some (fica o avatar). Em tela estreita (seção 10), somem logo, divisor, legenda e busca; o nome fica em 16px.
- **Menu**: lateral, horizontal ou nenhum (seção 5).
- **Conteúdo**: a área nativa da página, reposicionada abaixo da barra e ao lado do menu (seção 9).

## 5. Navegação
### 5.1 Modo e origem
- Override na configuração: `navigationMode: auto | lateral | superior` (padrão `auto`).
- `auto` lê o web uma vez: `_api/web?$select=NavAudienceTargetingEnabled,HorizontalQuickLaunch,MegaMenuEnabled,QuickLaunchEnabled,WebTemplate`. A primeira linha que se aplicar vale:

  | Valores do web | Modo | Menu (`menuNodeKey`) / coleção REST |
  |---|---|---|
  | `WebTemplate = SITEPAGEPUBLISHING` (site de comunicação) | superior | `1002` / `TopNavigationBar` |
  | `QuickLaunchEnabled = false` | sem menu (só a barra) | — |
  | `HorizontalQuickLaunch = true` | superior | `1025` / `QuickLaunch` |
  | demais casos | lateral | `1025` / `QuickLaunch` |

- `MegaMenuEnabled = true` → painéis em megamenu no modo superior; senão, cascata.
- Com override, o modo segue a configuração e a coleção continua a do tipo de site.
- Se a consulta ampliada for recusada, repetir com `$select=NavAudienceTargetingEnabled` e usar a orientação lembrada (5.8); sem lembrança, lateral.

### 5.2 Itens
- Vêm da navegação nativa do site. Nunca duplicar itens em código ou lista própria.
- **Consulta principal:** `_api/navigation/MenuState?menuNodeKey='<chave>'`, com os 3 níveis e os dados de público.
- **Alternativa**, só com a segmentação por público desligada: `_api/web/navigation/<coleção>?$expand=Children/Children`; se o servidor recusar a expansão aninhada, repetir com `$expand=Children`.
- **Segmentação por público** (`NavAudienceTargetingEnabled = true`). Não há garantia documentada de que a API filtre por público, então a skin filtra:
  - nó sem público definido → aparece para todos;
  - nó com público → aparece só se o pertencimento da pessoa a algum dos grupos for confirmado (uma consulta por sessão);
  - pertencimento não verificável (falha da consulta) → o nó com público fica oculto (falha fechada);
  - resposta sem o campo de público → não há como separar os nós: mostrar o estado de falha (5.4) em vez de um menu possivelmente errado.
- **Segmentação não é segurança:** link sem público aparece para todos, mesmo para quem não tem acesso ao destino. O SharePoint valida o acesso ao abrir.
- Descartar nós ocultos (`IsHidden = true` ou `IsVisible = false`). Limite de 3 níveis (item principal e dois subníveis).
- **Rótulo sem link:** URL vazia ou `http://linkless.header/` vira rótulo (não é link); só agrupa e expande subitens.
- **Nova janela** (quando a fonte informar): ícone de link externo (13px), texto oculto " (abre em nova janela)" e `rel="noopener noreferrer"`.
- **URLs aceitas:** `http(s)` do tenant ou externas explícitas, `mailto:` e `tel:`. Qualquer outro esquema (`javascript:`, `data:`, `vbscript:`…) transforma o nó em rótulo sem link. Títulos sempre como texto, nunca interpretados como HTML.
- **Lixeira:** nós cuja URL contenha `/_layouts/15/recyclebin.aspx` (sem diferenciar caixa) saem da árvore, em todos os níveis, para quem não tem `ManageLists`. É ocultação de interface: o SharePoint continua validando o acesso.
- Cache em memória por site e coleção durante a sessão, com função de invalidação (usada após editar a navegação, seção 5.6).
- Consultas de modo, itens, permissões e público em paralelo quando possível, uma vez por site; nunca a cada navegação.

### 5.3 Item ativo (um só)
- Compare origem (protocolo e host) e caminho sem barra final e sem diferenciar caixa. Link de outra origem nunca fica ativo.
- Fragmento: link com `#` igual ao da página atual vence o link da mesma página sem `#`; link com `#` diferente não fica ativo.
- Correspondência exata de caminho vence. Senão, o item de pasta ou site com o caminho mais longo que seja prefixo da página atual. Itens `.aspx` exigem correspondência exata (senão "Páginas" ficaria ativo em todas as páginas).
- Rótulos sem link e links externos nunca ficam ativos. A busca percorre todos os níveis.
- **Ramo ativo:** os ancestrais do item ativo ficam destacados (cor primária, peso 600) e abertos.

### 5.4 Modo lateral (padrão)
- Coluna branca abaixo da barra, à esquerda, com borda direita. O conteúdo do menu tem rolagem própria e o rodapé fica empurrado para baixo.
- **Todos os níveis** em árvore, com recuo por nível e linha-guia de 1px (medidas na referência técnica). Ícones só com `navIcons = true` (5.7).
- **Ativo:** `aria-current="page"`, fundo suave, texto na cor primária com peso 600 e barra de 3px à esquerda.
- Link com filhos: link + botão de seta separado (`aria-label="Subitens de <título>"`, `aria-expanded`, `aria-controls`). Rótulo sem link com filhos: o **próprio texto é o botão** que abre e fecha (sem um segundo botão). Rótulo sem link e sem filhos: texto simples. A seta gira −90° quando fechada.
- **Abertura:** o caminho até a página atual abre expandido. Ramos abertos pela pessoa ficam em `sessionStorage` por site (no máximo 50) e não fecham ao navegar. O item ativo é rolado para a área visível uma vez por carga.
- **Filtro** (com 8 links ou mais): ignora maiúsculas e acentos, mantém os ancestrais de cada resultado e abre os ramos só enquanto filtra, sem gravar. `Esc` limpa; `↓` entra na árvore; `↑` no primeiro item volta ao filtro. Sem resultado: "Nenhum item corresponde ao filtro."
- **Teclado:** `↑/↓` entre itens visíveis, `Home/End`, `→` abre o ramo (ou entra nele, se já aberto), `←` fecha o ramo (ou volta ao item pai). `Tab` continua passando por links e botões.
- **Estados:** carregando = 5 linhas de esqueleto com brilho; falha = "Não foi possível carregar a navegação." + **Tentar novamente** no rodapé (só na falha; não existe botão "Atualizar navegação"); vazio = "Nenhum item disponível na navegação."
- **Recolher (☰ no desktop):** a coluna desliza para a esquerda (`translateX(-100%)` + `visibility: hidden`) e o deslocamento lateral do conteúdo vai a 0; a barra não se move. Anima **só no clique** da pessoa (classe `m365-skin-animando` por ~320ms); carga, restauração do estado salvo e troca de orientação aplicam o estado sem animação. Estado em `localStorage` (com try/catch). Recolher não é uma orientação: o modo continua lateral.
- **Tela estreita** (seção 10): o menu vira **gaveta** sobre o conteúdo, abaixo da barra, com fundo escurecido. `Esc`, clique no fundo e clique em um link fecham.
- **Rodapé:** **Editar navegação** (seção 5.6).

### 5.5 Modo superior
- Faixa logo abaixo da barra, **sem ícones** e sem ☰ no desktop.
- **Itens de topo:** link sem filhos → link; link com filhos → **dividido** (o texto navega e uma seta de 24px abre o painel); rótulo sem link com filhos → o texto inteiro é o botão (texto + seta); rótulo sem link e sem filhos → texto.
- **Ramo ativo:** item de topo na cor primária, peso 600, com **sublinhado de 3px** colado na base da faixa. Vale também quando a página atual está num subnível.
- **Cascata (padrão):** painel com os filhos; netos aparecem recuados no mesmo painel, com guia de 1px. Sem submenus laterais.
- **Megamenu** (`MegaMenuEnabled`): painel na largura da faixa. Cada filho **com** subitens vira uma coluna com título (link ou texto) sublinhado por uma divisória; filhos **sem** subitens consecutivos são agrupados numa coluna sem título (nunca coluna com título vazio). Se o item de topo tiver link, o painel termina com "Ir para <título>".
- Rótulos sem link dentro de painéis: texto pequeno em caixa alta, cinza.
- **Abrir e fechar:** com mouse, abre após 140ms sobre o item e fecha 220ms depois de sair (se o foco não estiver dentro). Clique abre e fecha; um clique até 450ms depois de abrir por mouse **confirma** (não fecha). Aberto por clique, o painel fica até clique fora, foco fora ou `Esc`. Toque e teclado usam só o botão. Um painel aberto por vez. Navegar por um link fecha o painel.
- **Teclado:** `←/→` percorre os itens de topo (circular), `Home/End`, `↓` abre e foca o primeiro link do painel, `↑/↓` dentro do painel, `↑` no primeiro volta ao gatilho, `←/→` dentro do painel vai ao item de topo vizinho, `Esc` fecha e devolve o foco, `Tab` saindo do último link fecha.
- **Mais (priority+):** meça a largura de cada item uma vez; quando a soma não couber, reserve ~92px para **Mais** e mova os excedentes, do fim para o começo, para um painel em cascata. O primeiro item nunca sai. **Mais** recebe o sublinhado se o item ativo estiver dentro dele. A faixa usa `overflow: visible` para os painéis saírem dela, e nunca rola na horizontal: o que não cabe vai para **Mais**.
- **Direita da faixa:** "Tentar novamente" (só na falha) e **Editar** (lápis, borda de 1px) para quem pode editar (seção 5.6).
- **Tela estreita:** a faixa dá lugar à gaveta da seção 5.4, com a mesma árvore e o ☰. O modo configurado continua superior.

### 5.6 Editar a navegação (editor nativo, na própria página)
- **Editar navegação** (lateral) ou **Editar** (superior) visível só para quem tem `ManageWeb`. O `href` é a página atual sem o parâmetro (plano B).
- Ao clicar, sem sair da página com a skin:
  1. localizar o menu nativo e o botão **Editar** dele (`templates/referencia-tecnica.md`); não encontrou → seguir o `href` (plano B);
  2. exibir o menu nativo sobre o menu da skin (classe `m365-skin-nav-edicao`: fixo abaixo da barra, à esquerda, largura `max(largura do menu, 280px)`, acima do menu da skin) e acionar o **Editar** nativo;
  3. editor aberto = o botão **Editar** nativo some do menu;
  4. editor fechado (Salvar ou Cancelar) = o botão volta: ocultar o menu nativo de novo, invalidar o cache e recarregar os itens, sem recarregar a página.
- Detecção pelo mesmo `MutationObserver` da seção 9, sem timer.

### 5.7 Ícones do menu lateral (opcional)
- Só com `navIcons = true`. A extensão padrão não usa ícones e o padrão de uma nova extensão é `false`.
- Com ícones: todos os níveis, 20px no primeiro nível e 16px nos subníveis. Escolhidos só com os dados do item, sem consulta extra, em camadas (a primeira que decidir vale):

  | Camada | Critério |
  |---|---|
  | 1. Texto | Dicionário de termos, sem acento e sem caixa, casando **no início de uma palavra** ("curso" casa "Cursos", não "percurso"); siglas e palavras curtas casam só como palavra inteira |
  | 2. URL | Destino no SharePoint (lista, biblioteca, página, arquivo por extensão) ou serviço conhecido (Teams, Forms, Power BI, Outlook, YouTube/Stream, `mailto:`, `tel:`) |
  | 3. Estrutura | Rótulo sem link ou item com filhos → grade de apps; link externo → link externo |
  | 4. Padrão | Seta dentro de um círculo (destino de navegação; não parece marcador de lista) |

- Dicionário, ordem das regras e regras de URL: `templates/referencia-tecnica.md`. A ordem importa (termos compostos e específicos antes dos genéricos).
- Comparação sem `RegExp` montada em tempo de execução (regra de lint `no-unsafe-regexp`): termos comparados por texto; só expressões literais no código.
- Ícones de interface (☰, seta, busca, lápis, engrenagem, link externo) existem com ou sem `navIcons`. Todos são SVG inline de linha (seção 10), decorativos (`aria-hidden`); o texto continua sendo o nome acessível.

### 5.8 Orientação lembrada
- Guarde **só a orientação** resolvida (`lateral`, `superior`, `sem menu`) em `sessionStorage` por site. Na próxima página, aplique-a antes da resposta da API, para o layout não "pular"; a resposta corrige se mudou.

## 6. Busca
- Envia para a busca do site (`/_layouts/15/search.aspx?q=`), preservando o parâmetro.
- Enter envia; Escape limpa. Sem sugestões automáticas.
- Oculta em tela estreita.

## 7. Usuário e papel
- Nome e e-mail de `pageContext.user`; foto por `/_layouts/15/userphoto.aspx`, com fallback para as iniciais.
- Papel por `_api/web/effectiveBasePermissions` (bits de `SP.BasePermissions`): `ManageWeb` → "Proprietário do site"; `EditListItems` → "Editor do site"; demais → "Visitante". Rótulos configuráveis.
- **Quem edita** = papel Proprietário ou Editor. Essa regra decide a engrenagem (seção 8).
- Falha na consulta: máscara vazia (papel Visitante, sem engrenagem, sem Editar navegação e sem Lixeira). Uma consulta por site, com cache.

## 8. Engrenagem e modal
- A engrenagem aparece **só para quem edita** (seção 7). Visitante não vê a engrenagem.
- Casca de modal de `spfx-design-base`, compacta (`min(440px, 92vw)`), em portal, fechando com Esc e clique no fundo.
- Título "Configurações" e texto: "As ferramentas originais abrem no modo completo. As permissões continuam sendo verificadas pelo SharePoint."

  | Item | Destino | Permissão |
  |---|---|---|
  | Editar esta página | página atual sem o parâmetro, com `Mode=Edit` | EditListItems |
  | Navegação, aparência e demais opções | página atual sem o parâmetro | ManageWeb |
  | Conteúdo do site | `/_layouts/15/viewlsts.aspx` | ViewPages |
  | Configurações do site | `/_layouts/15/settings.aspx` | ManageWeb |
  | Permissões do site | `/_layouts/15/user.aspx` | ManagePermissions |
  | Lixeira | `/_layouts/15/RecycleBin.aspx` | ManageLists (nível Editar ou superior; Colaborar não vê) |

- Rodapé: "Abrir SharePoint completo ↗", página atual sem o parâmetro, em nova aba.
- Esconder item é conveniência; a segurança continua no SharePoint.

## 9. Layout nativo (ponto de risco)
- Os elementos nativos **não são API pública**. Seletores candidatos por grupo, todos num único módulo, com comentário de risco e data da última validação: `templates/referencia-tecnica.md`.
- Para cada grupo, vale o primeiro candidato que existir na página. Os elementos recebem só **classes próprias** (`m365-skin-oculto`, `m365-skin-area`); o CSS age sobre essas classes, sempre dentro de `body.m365-skin-ativa`. Nunca marcar o host da skin nem algo dentro dele.

  | Grupo | Ação com a skin ativa |
  |---|---|
  | Suite bar, cabeçalho do site, menu nativo, app bar | ocultar |
  | Barra de comandos da página (Novo, Detalhes da página, Visualização, Análises, status de publicação, Compartilhar, expandir, Editar, Publicar) | ocultar |
  | Área de conteúdo | reposicionar: `position: fixed`, abaixo da barra e ao lado do menu, com deslocamento por variáveis CSS |
  | Contêiner das seções da página | largura máxima de 100% (seções acompanham o menu aberto ou recolhido), em todas as orientações |

- A barra de comandos de listas e bibliotecas nunca é afetada: essas telas não recebem a skin (2.2).
- Seções em 100%: só pelos nomes estáveis (`referencia-tecnica.md`), **nunca** por classes com hash (mudam a cada versão do SharePoint).
- Seletores de elementos do SharePoint escritos em CSS Module usam atributo (`[id="spLeftNav"]`, `[class~="ms-Nav"]`), para o build não renomeá-los.
- A edição continua intacta porque `Mode=Edit` desativa a skin (2.2). Nunca ocultar painéis nativos, caixa de ferramentas, avisos e banners do sistema.
- `MutationObserver` no `<body>` reaplica as classes quando o SharePoint redesenha, agrupado por `requestAnimationFrame`.
- Ao desativar: remover todas as classes marcadas e parar o observer.

## 10. Tema e medidas
- **Fonte única de medidas** em TypeScript (barra, faixa superior, menu, ponto de tela estreita), escritas como variáveis CSS no `<body>`. Não repetir números no SCSS. Valores: `templates/referencia-tecnica.md`.
- **Tela estreita:** largura de até 800px. Nela a barra fica mais baixa e qualquer orientação usa a gaveta.
- Deslocamento da área de conteúdo calculado pelo modo: lateral → largura do menu (0 se recolhido); superior → barra + faixa; sem menu e tela estreita → só a barra.
- Cores por tokens com prefixo próprio `--m365-skin-*`, com os valores padrão do padrão visual da equipe (referência técnica). **Nunca** sobrescrever variáveis do SharePoint (`--themePrimary`, `--white` etc.): as web parts da página dependem delas.
- `inheritTheme = true`: os tokens recebem o tema do site (inline no `<body>`); senão valem os padrões do SCSS global.
- Fonte: `"Aptos", "Segoe UI", Arial, sans-serif`, base de 14px. Foco visível com contorno de 3px no token de foco, afastamento de 3px (-2px dentro do menu e dos painéis).
- Dois arquivos de estilo: global (`nativeOverrides.scss`: tokens padrão e regras das classes próprias) e módulo (componentes, só com variáveis, sem literais de cor).
- Ícones SVG 24×24, sem preenchimento, traço `currentColor` de 1.65 com pontas e junções arredondadas. Monocromáticos; cor de destaque só para ativo, foco e ações.
- Animações curtas (árvore, painel e recolher); `prefers-reduced-motion` desliga animações e transições. Em `forced-colors`, o item ativo recebe contorno `Highlight`.

## 11. Diagnóstico (`?skinDebug=1`)
Com a skin ativa, `console.group('[m365-skin] diagnóstico')` com: modo de navegação (valores lidos do web, `WebTemplate`, megamenu, orientação lembrada e resolvida), origem dos itens (`MenuState` ou REST), segmentação (ligada ou não, nós ocultos por público), itens (quantidade e árvore), permissões e papel, tabela de ícones (só com `navIcons`), tabela dos elementos nativos (grupo, seletor, encontrados), incluindo a linha "Editar (botão do menu nativo)", e aviso de instância duplicada, se houver. É assim que seletores e regras são validados no tenant.

## 12. Configuração (`ClientSideComponentProperties`)
| Propriedade | Tipo | Padrão |
|---|---|---|
| `activationParam` / `activationValue` | string | `env` / `webview` |
| `logoUrl` | string | logo do site |
| `siteTitleOverride` / `subtitle` | string | título do web / vazio |
| `navigationMode` | `auto \| lateral \| superior` | `auto` |
| `navIcons` | boolean | false |
| `searchPlaceholder` | string | "O que você precisa acessar?" |
| `roleLabels` | objeto | seção 7 |
| `inheritTheme` | boolean | true |

- Nada de URL, tenant, site ou grupo fixo no código.
- Em produção, as propriedades ficam na coluna *Component Properties* da entrada da lista Tenant Wide Extensions (seção 13). Alterá-las ali não exige novo pacote.

## 13. Empacotamento e implantação ("Adicionado a todos os sites")
- `config/package-solution.json` com `"skipFeatureDeployment": true`, uma única vez. Isso habilita, no catálogo de aplicativos do tenant, a opção *Habilitar este aplicativo e adicioná-lo a todos os sites* (coluna **Adicionado a todos os sites** = Sim).
- Nesse modo, definições de feature são ignoradas: o `elements.xml` com `CustomAction` **não** ativa a extensão. O registro vem de `sharepoint/assets/ClientSideInstance.xml`, referenciado em `"assets": { "elementManifests": ["ClientSideInstance.xml"] }` da feature. Modelo: `templates/referencia-tecnica.md`, seção 10.
  - `Title`, `Location="ClientSideExtension.ApplicationCustomizer"`, `ComponentId` = id do manifesto e `Properties` (JSON escapado com `&quot;`; obrigatório no XML, pode ser vazio).
  - Opcional: `WebTemplateId` para limitar o tipo de site (ex.: `GROUP#0`, `SITEPAGEPUBLISHING#0`, `STS#3`), se o escopo pedir.
- **Primeira implantação:** enviar ao catálogo do tenant e marcar *adicionar a todos os sites*. A entrada aparece na lista **Tenant Wide Extensions** do catálogo.
- **Atualizações:** enviar a nova versão **sem** marcar a opção. Marcar de novo duplica a entrada na lista e coloca duas instâncias na página (a guarda da seção 3 evita a disputa, mas a entrada duplicada deve ser removida).
- Soluções implantadas em todos os sites não aparecem em *Adicionar um aplicativo* do site: não há ativação por site.
- **Toda nova geração de pacote incrementa a versão** da solução e da feature (ex.: `1.0.0.7` → `1.0.0.8`).
- Teste após atualizar: Ctrl+F5 ou aba anônima (cache do navegador e extensões podem manter a versão anterior).

## 14. Código e testes
- Lógica pura (ativação, telas nativas, item ativo, modo, segmentação, filtro de URL, Lixeira, filtro do menu, cálculo do Mais, colunas do megamenu, medidas, ícones, observação de URL, layout nativo, guarda de instância) em módulos **sem** `@microsoft/sp-http`, testáveis com Jest (jsdom); o `sp-http` não carrega fora do SharePoint.
- Alvo de compilação do SPFx: sem `Promise.finally` (usar `then`/`catch`).
- Testes unitários mínimos:
  - ativação e exclusões (2.2), incluindo maiúsculas, `Lists`, `Forms`, `_layouts`, subsite e site chamados `lists` ou `forms`;
  - propagação e observação de URL (com e sem Navigation API);
  - modo pela tabela 5.1 (comunicação, sem menu, horizontal, lateral, recusa da consulta ampliada);
  - segmentação: nó sem público, com público confirmado, não verificável, resposta sem o campo;
  - URLs rejeitadas (`javascript:`, `data:`) e Lixeira por permissão;
  - item ativo em 3 níveis, com origem e fragmento; rótulo sem link;
  - filtro sem acento preservando ancestrais; Mais (o primeiro nunca sai); megamenu sem coluna de título vazio;
  - deslocamentos por modo; ícones por camada e sem falso positivo (com `navIcons`);
  - marcação e limpeza do layout nativo; fluxo do editor de navegação (abrir, fechar, plano B); segunda instância inerte.
- Build sem avisos de lint.

## 15. Ciclo de vida e performance
- Verificar a seção 2 antes de qualquer consulta e antes de carregar o módulo da skin.
- Uma instância por página (seção 3). Navegação sem recarregar: atualizar item ativo sem recriar a barra nem refazer consultas.
- Trocar a orientação ou recolher o menu é só apresentação: não refaz consultas.
- Bundle enxuto: ponto de entrada mínimo, módulo da skin por `import()` dinâmico, sem bibliotecas de UI completas, ícones SVG inline.
- `onDispose`: remover listeners (`navigatedEvent`, tema, URL, teclado, ponteiro), restaurar `history`, desconectar observers, cancelar temporizadores de abertura e fechamento, remover host, classes do `body` e a marca de instância.

## 16. Validação
- [ ] Extensão padrão: pacote conferido pelo SHA-256 e copiado para o projeto; versão registrada no `escopo.md`; nada compilado.
- [ ] Sem `env=webview`: interface padrão, nenhuma requisição, nenhum CSS, módulo da skin não carregado (aba Rede).
- [ ] Com `env=webview`: skin aplicada; menu e busca mantêm o parâmetro.
- [ ] Clicar em **Editar** da página: o parâmetro sai da URL **sem recarregar** e a edição nativa fica intacta.
- [ ] `/_layouts/`, `/Lists/`, `/Forms/` e `Mode=Edit` (qualquer caixa): sem skin e sem o parâmetro; site chamado `forms` recebe a skin.
- [ ] Barra de comandos da página oculta com a skin; seções ocupam 100% com o menu aberto e recolhido.
- [ ] Barra superior parada ao recolher, expandir e trocar orientação; sem caminho de pão.
- [ ] Modo detectado em site de comunicação (horizontal), de equipe (lateral), de equipe com horizontal e com navegação desligada (sem menu).
- [ ] Menu com 3 níveis: todos exibidos; caminho ativo expandido e destacado; rótulos sem link expandem; um único item ativo.
- [ ] Segmentação ligada: item segmentado some para quem está fora do público.
- [ ] Horizontal: cascata e megamenu conforme o site; **Mais** sem rolagem horizontal; hover, clique, toque e teclado.
- [ ] Filtro com 8 links ou mais; teclado completo na árvore.
- [ ] Carregando, falha (com Tentar novamente), vazio e filtro sem resultado distintos.
- [ ] **Editar** da navegação abre o editor nativo na própria página; após Salvar, o menu da skin mostra a nova ordem.
- [ ] Engrenagem só para quem edita; Lixeira só com nível Editar ou superior (Proprietário, Membro, Colaborar, Visitante).
- [ ] ☰ só com menu lateral ou gaveta; estado recolhido mantido entre páginas; anima só no clique.
- [ ] Tela estreita (≤ 800px): gaveta nas duas orientações; teclado, leitor de tela, alto contraste e movimento reduzido.
- [ ] Entrada única na lista Tenant Wide Extensions; nenhuma instância duplicada no diagnóstico.
- [ ] Tabela de elementos nativos do diagnóstico sem grupos com 0 encontrados.
- [ ] Diferenciar o que foi validado no código do que depende de teste no tenant.

## 17. Em aberto (validar no tenant)
Registre estes pontos no `escopo.md` do projeto até a validação, com o diagnóstico `?skinDebug=1`:
- `MenuState` traz os 3 níveis, o público (`AudienceIds`) e a abertura em nova janela nos sites de comunicação e de equipe.
- Forma e permissão de API da consulta de pertencimento a grupos usada na segmentação por público.
- Comportamento em site de comunicação com a navegação desligada (`QuickLaunchEnabled`).
- Localização do botão **Editar** nativo no modo superior (cabeçalho do site); sem ele, vale o plano B.
- Seletores nativos e data da última validação (referência técnica, seção 4).

## Padrões internos da equipe
Consolidados nesta skill. Origem: padrão de navegação da GTI aplicado no `ex-layout-sharepoint` (extensão padrão, `pacote/`).
