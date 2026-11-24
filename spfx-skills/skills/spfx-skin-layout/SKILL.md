---
name: "spfx-skin-layout"
description: "Skin de layout por Application Customizer SPFx no SharePoint Online, ativada só com ?env=webview: barra superior fixa (logo, nome do site, busca, usuário e papel, engrenagem com modal), menu lateral recolhível ou menu superior conforme a navegação nativa (até 3 níveis, ícones por regra), edição da navegação pelo editor nativo, exclusão de telas nativas e diagnóstico por ?skinDebug=1."
---

# Skin de layout (Application Customizer)

## Quando usar
Ao criar ou revisar uma extensão que substitui a moldura visual do site (cabeçalho e navegação) por um layout padronizado da equipe M365.
Carregue também: `spfx-extensoes-padroes`, `spfx-tema-marca`, `spfx-design-base` (modal e barras), `spfx-acessibilidade-conteudo`, `spfx-codigo-performance`.
Detalhes que devem ser replicados exatamente (ícones, seletores, tokens, classes, diagnóstico): `templates/referencia-tecnica.md`.

## 1. Plataforma
- Somente **SharePoint Online**, em páginas modernas.
- A skin nunca é aplicada em telas nativas (seção 2.2).

## 2. Ativação
### 2.1 Query string
- A skin só é carregada quando a URL contém `env=webview` (ex.: `https://<tenant>.sharepoint.com/sites/<site>?env=webview`).
- Nome (`env`) e valor (`webview`) comparados sem diferenciar maiúsculas e minúsculas, configuráveis (seção 12).
- Sem o parâmetro, ou com outro valor: nenhuma requisição, nenhum nó injetado, nenhum CSS. A página abre com a interface padrão.
- Ativação é **apresentação**, não segurança: as permissões continuam sendo do SharePoint.

### 2.2 Telas nativas: nunca recebem a skin e nunca levam o parâmetro
| Condição (sem diferenciar maiúsculas) | Exemplo |
|---|---|
| Caminho contém `/_layouts/` | `/sites/x/_layouts/15/settings.aspx` |
| Caminho contém `/forms/` | `/sites/x/Shared Documents/Forms/AllItems.aspx` |
| Query contém `Mode=Edit` (chave e valor sem diferenciar caixa) | `/sites/x?env=webview&Mode=Edit` |

- Nessas URLs a skin não ativa, mesmo com `env=webview`.
- **Remoção do parâmetro:** se a URL atual é tela nativa e contém o parâmetro de ativação, removê-lo com `history.replaceState`, sem recarregar a página, preservando os demais parâmetros e o fragmento.
- Links gerados pela skin nunca acrescentam o parâmetro a URLs de telas nativas.

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

## 3. Montagem e falha segura
- **Host próprio:** um `div#m365-skin-host` filho direto do `<body>`, fora dos contêineres do SharePoint. Dentro do placeholder `Top`, os elementos fixos ficam presos ao layout nativo e somem junto com ele. É injeção fora dos placeholders oficiais: tratada como o risco da seção 9, com host único (remover um existente antes de criar) e removido no `onDispose` e ao desativar.
- Renderização com `createRoot` (React 18) dentro de um *error boundary*. Erro de renderização: desmontar a skin e manter o layout nativo.
- **Ordem:** a skin renderiza primeiro; só depois da primeira renderização (callback `onReady`) a classe `m365-skin-ativa` entra no `<body>` e o layout nativo é ocultado. Se a skin não renderizar, nada nativo é ocultado.
- Classes de estado no `<body>`: `m365-skin-lateral`, `m365-skin-superior`, `m365-skin-colapsado`. Todas removidas ao desativar.

## 4. Estrutura da skin
- **Barra superior fixa**, da esquerda para a direita:
  1. Botão hambúrguer: só no modo lateral.
  2. Logo: da configuração; sem logo configurado, logo do site (`legacyPageContext.webLogoUrl`, que não é API pública: falha → sem logo).
  3. Divisor vertical e nome do site (título do web ou override), com subtítulo opcional. O bloco é link para a página inicial do site, com o parâmetro.
  4. Campo de busca (seção 6).
  5. Usuário: avatar (foto ou iniciais), nome e, abaixo, o papel no site (seção 7). Sem papel carregado: placeholder.
  6. Engrenagem (ícone SVG de engrenagem, não um círculo): abre a modal (seção 8).
- **Menu**: lateral ou superior (seção 5).
- **Conteúdo**: a área nativa da página, reposicionada abaixo da barra e ao lado do menu (seção 9).

## 5. Navegação
### 5.1 Modo
- Override na configuração: `auto | lateral | superior` (padrão `auto`).
- `auto` lê o web uma vez: `_api/web?$select=QuickLaunchEnabled,HorizontalQuickLaunch`. Se falhar (propriedade inexistente em algum tipo de site), repetir só com `QuickLaunchEnabled`.

  | Valores do web | Modo | Coleção de nós |
  |---|---|---|
  | `QuickLaunchEnabled = false` | superior | `topnavigationbar` |
  | `HorizontalQuickLaunch = true` | superior | `quicklaunch` |
  | demais casos (inclusive falha) | lateral | `quicklaunch` |

### 5.2 Itens
- Vêm da navegação nativa do site, já filtrada por público e permissão. Nunca duplicar itens em código ou lista própria.
- **Uma única consulta com os 3 níveis** da navegação moderna: `_api/web/navigation/<coleção>?$expand=Children/Children`. Se o servidor recusar a expansão aninhada, repetir com `$expand=Children`.
- Descartar nós com `IsVisible = false`. Limite de 3 níveis (item principal e dois subníveis).
- **Rótulo sem link:** URL vazia ou `http://linkless.header/` vira rótulo (não é link); só agrupa e expande subitens.
- Cache em memória por site e coleção durante a sessão, com função de invalidação (usada após editar a navegação, seção 5.6).
- Consultas de modo, itens e permissões em paralelo, uma vez por site; nunca a cada navegação.

### 5.3 Item ativo (um só)
- Correspondência exata de caminho vence.
- Senão, o item de pasta ou site com o caminho mais longo que seja prefixo da página atual. Itens `.aspx` exigem correspondência exata (senão "Páginas" ficaria ativo em todas as páginas).
- Rótulos sem link e links externos nunca ficam ativos. A busca percorre todos os níveis.

### 5.4 Modo lateral
- Menu fixo à esquerda; item ativo com marcador vertical na cor primária e fundo suave.
- **Todos os níveis** exibidos em árvore, com recuo crescente por nível e **ícone em todos os níveis** (seção 5.7): 20 px no primeiro nível, 16 px nos subníveis.
- Item com filhos: link + botão de seta separado (`aria-expanded`, rótulo "Expandir/Recolher <título>"). Rótulo sem link: a linha inteira é um botão que expande ou recolhe.
- O caminho até a página atual abre expandido; o que o usuário abriu não é fechado ao navegar.
- Hambúrguer recolhe e expande; estado salvo em `localStorage` (com try/catch). Recolhido: só o primeiro nível, só ícones, nome em texto oculto para leitor de tela.
- Tela estreita (≤ 768 px): o menu vira gaveta sobre o conteúdo, com fundo escurecido que fecha ao clicar.
- Rodapé com **Editar** (seção 5.6).

### 5.5 Modo superior
- Itens na faixa abaixo da barra, **sem ícones** e sem hambúrguer.
- Item com filhos: link + botão de seta que abre lista suspensa com o 2º e o 3º nível (3º nível recuado). Abre ao passar o mouse e pela seta; fecha com Esc ou clique fora.
- Item principal destacado também quando a página atual está num subnível dele.
- Trade-off aceito: a faixa usa `overflow: visible` para a lista suspensa sair dela, então não rola na horizontal.
- **Editar** no fim da faixa, alinhado à direita (seção 5.6).

### 5.6 Editar a navegação (editor nativo, na própria página)
- Link **Editar** visível só para quem tem `ManageWeb`. O `href` é a página atual sem o parâmetro (plano B).
- Ao clicar, sem sair da página com a skin:
  1. localizar o menu nativo e o botão **Editar** dele (`templates/referencia-tecnica.md`); não encontrou → seguir o `href` (plano B);
  2. exibir o menu nativo sobre o menu da skin (classe `m365-skin-nav-edicao`: fixo abaixo da barra, à esquerda, largura `max(largura do menu, 280px)`, acima do menu da skin) e acionar o **Editar** nativo;
  3. editor aberto = o botão **Editar** nativo some do menu;
  4. editor fechado (Salvar ou Cancelar) = o botão volta: ocultar o menu nativo de novo, invalidar o cache e recarregar os itens, sem recarregar a página.
- Detecção pelo mesmo `MutationObserver` da seção 9, sem timer.

### 5.7 Ícones do menu lateral
Escolhidos só com os dados do item, sem consulta extra, em camadas (a primeira que decidir vale):

| Camada | Critério |
|---|---|
| 1. Texto | Dicionário de termos, sem acento e sem caixa, casando **no início de uma palavra** ("curso" casa "Cursos", não "percurso"); siglas e palavras curtas casam só como palavra inteira |
| 2. URL | Destino no SharePoint (lista, biblioteca, página, arquivo por extensão) ou serviço conhecido (Teams, Forms, Power BI, Outlook, YouTube/Stream, `mailto:`, `tel:`) |
| 3. Estrutura | Rótulo sem link ou item com filhos → grade de apps; link externo → link externo |
| 4. Padrão | Seta dentro de um círculo (destino de navegação; não parece marcador de lista) |

- Dicionário, ordem das regras e regras de URL: `templates/referencia-tecnica.md`. A ordem importa (termos compostos e específicos antes dos genéricos).
- Comparação sem `RegExp` montada em tempo de execução (regra de lint `no-unsafe-regexp`): termos comparados por texto; só expressões literais no código.
- Ícones SVG inline de linha (24×24, traço `currentColor`, espessura 1.6), decorativos (`aria-hidden`); o texto continua sendo o nome acessível.

## 6. Busca
- Envia para a busca do site (`/_layouts/15/search.aspx?q=`), preservando o parâmetro.
- Enter envia; Escape limpa. Sem sugestões automáticas.

## 7. Usuário e papel
- Nome e e-mail de `pageContext.user`; foto por `/_layouts/15/userphoto.aspx`, com fallback para as iniciais.
- Papel por `_api/web/effectiveBasePermissions` (bits de `SP.BasePermissions`): `ManageWeb` → "Proprietário do site"; `EditListItems` → "Editor do site"; demais → "Visitante". Rótulos configuráveis.
- Falha na consulta: máscara vazia (papel Visitante, engrenagem sem itens). Uma consulta por site, com cache.

## 8. Engrenagem e modal
- Casca de modal de `spfx-design-base`, compacta (`min(440px, 92vw)`), em portal, fechando com Esc e clique no fundo.
- Título "Configurações" e texto: "As ferramentas originais abrem no modo completo. As permissões continuam sendo verificadas pelo SharePoint."

  | Item | Destino | Permissão |
  |---|---|---|
  | Editar esta página | página atual sem o parâmetro, com `Mode=Edit` | EditListItems |
  | Navegação, aparência e demais opções | página atual sem o parâmetro | ManageWeb |
  | Conteúdo do site | `/_layouts/15/viewlsts.aspx` | ViewPages |
  | Configurações do site | `/_layouts/15/settings.aspx` | ManageWeb |
  | Permissões do site | `/_layouts/15/user.aspx` | ManagePermissions |
  | Lixeira | `/_layouts/15/RecycleBin.aspx` | EditListItems |

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

- A edição continua intacta porque `Mode=Edit` desativa a skin (2.2). Nunca ocultar painéis nativos, caixa de ferramentas, avisos e banners do sistema.
- `MutationObserver` no `<body>` reaplica as classes quando o SharePoint redesenha, agrupado por `requestAnimationFrame`.
- Ao desativar: remover todas as classes marcadas e parar o observer.

## 10. Tema e medidas
- **Fonte única de medidas** em TypeScript (barra, faixa superior, menu, menu recolhido, ponto de tela estreita), escritas como variáveis CSS no `<body>`. Não repetir números no SCSS. Valores: `templates/referencia-tecnica.md`.
- Deslocamento da área de conteúdo calculado pelo modo: lateral → largura do menu (ou recolhido); superior → barra + faixa; tela estreita → só a barra.
- Cores por tokens com prefixo próprio `--m365-skin-*`. **Nunca** sobrescrever variáveis do SharePoint (`--themePrimary`, `--white` etc.): as web parts da página dependem delas.
- `inheritTheme = true`: os tokens recebem o tema do site (inline no `<body>`); senão valem os padrões do SCSS global.
- Dois arquivos de estilo: global (`nativeOverrides.scss`: tokens padrão e regras das classes próprias) e módulo (componentes, só com variáveis, sem literais de cor).
- Ícones monocromáticos; cor de destaque só para ativo, foco e ações. `prefers-reduced-motion` desliga transições.

## 11. Diagnóstico (`?skinDebug=1`)
Com a skin ativa, `console.group('[m365-skin] diagnóstico')` com: modo de navegação, itens (quantidade e árvore), permissões, tabela de ícones (item com recuo por nível, ícone, camada, regra) e tabela dos elementos nativos (grupo, seletor, encontrados), incluindo a linha "Editar (botão do menu nativo)". É assim que seletores e regras são validados no tenant.

## 12. Configuração (`ClientSideComponentProperties`)
| Propriedade | Tipo | Padrão |
|---|---|---|
| `activationParam` / `activationValue` | string | `env` / `webview` |
| `logoUrl` | string | logo do site |
| `siteTitleOverride` / `subtitle` | string | título do web / vazio |
| `navigationMode` | `auto \| lateral \| superior` | `auto` |
| `searchPlaceholder` | string | "O que você precisa acessar?" |
| `roleLabels` | objeto | seção 7 |
| `inheritTheme` | boolean | true |

- Nada de URL, tenant, site ou grupo fixo no código.

## 13. Empacotamento e implantação
- `sharepoint/assets/elements.xml` com `CustomAction` em `Location="ClientSideExtension.ApplicationCustomizer"`, `ClientSideComponentId` = id do manifesto e `ClientSideComponentProperties` (JSON escapado com `&quot;`).
- Feature em `package-solution.json` com `"assets": { "elementManifests": ["elements.xml"] }`. Sem isso, o pacote implanta e **nada acontece**.
- `skipFeatureDeployment: false` (padrão): o app é adicionado por site (*Conteúdo do site → Novo → Aplicativo*). Implantação tenant-wide (`ClientSideInstance.xml` + `true`) só se o escopo pedir.
- **Toda nova geração de pacote incrementa a versão** da solução e da feature (ex.: `1.0.0.7` → `1.0.0.8`). Com a mesma versão, o site não oferece atualização.
- Teste após atualizar: Ctrl+F5 ou aba anônima (cache do navegador e extensões podem manter a versão anterior).

## 14. Código e testes
- Lógica pura (ativação, telas nativas, item ativo, modo, medidas, ícones, observação de URL, layout nativo) em módulos **sem** `@microsoft/sp-http`, testáveis com Jest (jsdom); o `sp-http` não carrega fora do SharePoint.
- Alvo de compilação do SPFx: sem `Promise.finally` (usar `then`/`catch`).
- Testes unitários mínimos: ativação e exclusões (2.2, incluindo maiúsculas), propagação, observação de URL (com e sem Navigation API), item ativo em 3 níveis, rótulo sem link, modo, deslocamentos, ícones por camada e sem falso positivo, marcação e limpeza do layout nativo, fluxo do editor de navegação (abrir, fechar, plano B).
- Build sem avisos de lint.

## 15. Ciclo de vida e performance
- Verificar a seção 2 antes de qualquer consulta.
- Uma instância por página. Navegação sem recarregar: atualizar item ativo sem recriar a barra nem refazer consultas.
- Bundle enxuto: sem bibliotecas de UI completas; ícones SVG inline.
- `onDispose`: remover listeners (`navigatedEvent`, tema, URL), restaurar `history`, desconectar observers, remover host e classes do `body`.

## 16. Validação
- [ ] Sem `env=webview`: interface padrão, nenhuma requisição, nenhum CSS.
- [ ] Com `env=webview`: skin aplicada; menu e busca mantêm o parâmetro.
- [ ] Clicar em **Editar** da página: o parâmetro sai da URL **sem recarregar** e a edição nativa fica intacta.
- [ ] `/_layouts/`, `/Forms/` e `Mode=Edit` (qualquer caixa): sem skin e sem o parâmetro.
- [ ] Barra de comandos da página oculta com a skin.
- [ ] Modo lateral e superior detectados em sites de comunicação e de equipe.
- [ ] Menu com 3 níveis: todos exibidos; caminho ativo expandido; rótulos sem link expandem.
- [ ] Ícones coerentes em todos os níveis; itens sem regra com o ícone padrão (conferir tabela do diagnóstico).
- [ ] **Editar** da navegação abre o editor nativo na própria página; após Salvar, o menu da skin mostra a nova ordem.
- [ ] Itens da engrenagem e **Editar** respeitam permissões (Proprietário, Membro, Visitante).
- [ ] Hambúrguer só no modo lateral; estado mantido entre páginas.
- [ ] Telas estreitas, teclado, leitor de tela e alto contraste.
- [ ] Tabela de elementos nativos do diagnóstico sem grupos com 0 encontrados.
- [ ] Diferenciar o que foi validado no código do que depende de teste no tenant.

## Padrões internos da equipe
Consolidados nesta skill.
