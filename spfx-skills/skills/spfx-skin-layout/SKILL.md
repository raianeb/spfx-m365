---
name: "spfx-skin-layout"
description: "Skin de layout por Application Customizer SPFx no SharePoint Online, ativada só com ?env=webview: barra superior fixa (logo, nome do site, busca, usuário e papel, engrenagem com modal) e menu lateral recolhível ou menu superior conforme a navegação nativa do site."
---

# Skin de layout (Application Customizer)

## Quando usar
Ao criar ou revisar uma extensão que substitui a moldura visual do site (cabeçalho e navegação) por um layout padronizado da equipe M365.
Carregue também: `spfx-extensoes-padroes`, `spfx-tema-marca`, `spfx-design-base` (modal e barras), `spfx-acessibilidade-conteudo`, `spfx-codigo-performance`.

## 1. Plataforma
- Somente **SharePoint Online**, em páginas modernas.
- Páginas clássicas e `/_layouts` não recebem a skin.

## 2. Ativação por query string
- A skin só é carregada quando a URL contém `env=webview` (ex.: `https://<tenant>.sharepoint.com/sites/<site>?env=webview`).
- Sem o parâmetro, ou com outro valor, a extensão não injeta nada e não aplica nenhum CSS: a página abre com a interface padrão do SharePoint.
- Leitura do parâmetro com `URLSearchParams`. Nome do parâmetro (`env`) e valor (`webview`) são comparados sem diferenciar maiúsculas e minúsculas, e ambos são configuráveis (seção 9), com esses valores como padrão.
- A decisão é reavaliada a cada navegação sem recarregar a página (`navigatedEvent`):
  - parâmetro presente: mantém ou monta a skin;
  - parâmetro ausente: remove a skin e os overrides do layout nativo, sem recarregar a página.
- **Propagação:** links gerados pela skin (itens do menu, busca e itens da modal que abrem páginas do site no mesmo contexto) preservam `env=webview`. Links no conteúdo da página não são reescritos; se o usuário sair do contexto por eles, volta a ver a interface padrão, que é o comportamento esperado.
- Ao propagar, preserve os demais parâmetros e o fragmento (`#`) da URL de destino. Não propague para domínios fora do tenant.
- A ativação por query string é **apresentação**, não segurança: qualquer usuário pode remover o parâmetro, e as permissões continuam sendo do SharePoint.

## 3. Estrutura da skin
- **Barra superior fixa** (placeholder `Top`), da esquerda para a direita:
  1. Botão hambúrguer: só no modo de menu lateral.
  2. Logo: da configuração; sem logo configurado, usa o logo do site.
  3. Divisor vertical e, ao lado, o nome do site (título do web por padrão, com override na configuração) e subtítulo opcional em caixa alta e fonte menor.
  4. Campo de busca com ícone de lupa e placeholder configurável.
  5. Usuário: avatar (foto ou iniciais), nome e, abaixo, o papel no site.
  6. Engrenagem: abre a modal de configurações.
- **Menu**: lateral ou superior, conforme a seção 4.
- **Conteúdo**: a área nativa da página, sem alteração de comportamento, em superfície com cantos arredondados sobre o fundo da skin.
- A barra tem altura fixa (referência: 64–76px), igual em todas as páginas; o conteúdo recebe deslocamento igual, para não ficar coberto.

## 4. Modo de navegação
- O modo vem da configuração nativa do site (layout de navegação horizontal ou vertical). Propriedades candidatas do web: `QuickLaunchEnabled`, `HorizontalQuickLaunch` e a do mega menu. **Valide no tenant antes de fixar a regra**, alternando a opção em *Alterar a aparência → Navegação* e conferindo `/_api/web?$select=...` em sites de comunicação e de equipe.
- Override opcional na configuração: `auto | lateral | superior` (padrão `auto`).
- Itens do menu vêm da navegação nativa do site (Início Rápido ou navegação superior), já filtrada por público e permissão pelo SharePoint. Nunca duplique os itens em código ou em lista própria.
- **Modo lateral:**
  - menu fixo à esquerda; item ativo com marcador vertical na cor primária e fundo suave;
  - o hambúrguer recolhe e expande o menu; estado recolhido por usuário em `localStorage` (com try/catch);
  - em telas estreitas, o menu vira gaveta sobre o conteúdo e o hambúrguer a abre.
- **Modo superior:**
  - itens na barra ou logo abaixo dela; sem hambúrguer em telas largas;
  - em telas estreitas, os itens vão para um menu compacto.
- Subníveis: no máximo 2 visíveis. Teclado e leitor de tela funcionando (`aria-expanded`, `aria-current="page"`).

## 5. Busca
- Envia para a busca do escopo configurado (site por padrão), preservando `env=webview`.
- Enter envia; Escape limpa.
- Sem sugestões automáticas na primeira versão. Se forem incluídas, debounce mínimo de 300 ms e limite de resultados.

## 6. Usuário e papel
- Nome e e-mail do contexto (`pageContext.user`); foto pelo endpoint de foto do usuário, com fallback para as iniciais.
- O papel vem das permissões efetivas no web, na ordem: controle total → "Proprietário do site"; edição → "Editor do site"; leitura → "Visitante". Rótulos configuráveis.
- Uma consulta por carregamento de site, com cache em memória durante a sessão; nunca consultar a cada navegação.

## 7. Engrenagem e modal de configurações
- Use a casca de modal de `spfx-design-base`, em versão compacta (referência: largura `min(440px, 92vw)`).
- Título "Configurações" e texto de apoio: "As ferramentas originais abrem no modo completo. As permissões continuam sendo verificadas pelo SharePoint."
- Itens em lista simples, cada um exibido só se o usuário tiver a permissão correspondente (`hasPermissions`):

  | Item | Destino | Permissão |
  |---|---|---|
  | Editar esta página | página atual em modo de edição, sem `env=webview` | EditListItems na biblioteca de páginas |
  | Navegação, aparência e demais opções | página atual sem `env=webview` (painel nativo) | ManageWeb |
  | Conteúdo do site | `/_layouts/15/viewlsts.aspx` | ViewPages |
  | Configurações do site | `/_layouts/15/settings.aspx` | ManageWeb |
  | Permissões do site | `/_layouts/15/user.aspx` | ManagePermissions |
  | Lixeira | `/_layouts/15/RecycleBin.aspx` | EditListItems |

- Rodapé separado por linha: "Abrir SharePoint completo ↗", que abre a página atual **sem** `env=webview` em nova aba.
- Esconder um item é conveniência; a segurança continua no SharePoint.
- Ferramentas nativas sempre abrem sem `env=webview`, para não aplicar a skin sobre telas de administração.

## 8. Ocultação do layout nativo (ponto de risco)
- Os seletores de suite bar, cabeçalho do site e menu nativo **não são API pública** e podem mudar sem aviso. Ficam em um único arquivo (`nativeOverrides.scss`), com comentário de risco e a data da última validação.
- Os overrides só são aplicados quando a seção 2 ativa a skin e depois que ela renderizou com sucesso. Erro na skin mantém o layout nativo visível (falha segura).
- Escopo dos overrides em uma classe no `body` (ex.: `m365-skin-ativa`), removida ao desativar a skin.
- Nunca oculte: barra de comando da página em edição, painéis nativos, avisos e banners do sistema.
- Após atualizações relevantes do SharePoint Online, executar o checklist da seção 12.

## 9. Configuração (`ClientSideComponentProperties`)
| Propriedade | Tipo | Padrão |
|---|---|---|
| `activationParam` / `activationValue` | string | `env` / `webview` |
| `logoUrl` | string | logo do site |
| `siteTitleOverride` / `subtitle` | string | título do web / vazio |
| `navigationMode` | `auto \| lateral \| superior` | `auto` |
| `searchScope` / `searchPlaceholder` | string | site / "O que você precisa acessar?" |
| `roleLabels` | objeto | ver seção 6 |
| `inheritTheme` | boolean | true |

- Nada de URL, tenant, site ou grupo fixo no código. A extensão é genérica da equipe M365, sem vínculo a um site.
- Implantação por site (custom action) ou tenant-wide (`ClientSideInstance.xml`), definida no escopo do projeto.

## 10. Tema
- Segue `spfx-tema-marca`: cor primária, superfícies, bordas e texto por tokens. A cor de marca da skin entra como token, nunca literal.
- Modos claro, escuro e alto contraste. A modal recebe as variáveis de tema explicitamente (portal).
- Ícones da barra monocromáticos; cor de destaque só para estado ativo, foco e ações principais.

## 11. Ciclo de vida e performance
- Verificar a seção 2 antes de qualquer consulta: sem o parâmetro, nenhuma requisição é feita.
- Uma única instância da skin por página: verificar antes de injetar.
- Navegação sem recarregar: atualizar item ativo e título sem recriar a barra nem refazer consultas.
- Consultas (navegação, permissões, usuário) uma vez por site, em paralelo, com cache; a barra renderiza antes, com placeholders.
- Bundle enxuto: sem bibliotecas de UI completas só para a skin; ícones em SVG inline ou Fluent pontual.
- `onDispose`: remover listeners, observers, nós injetados e a classe do `body`.

## 12. Validação
- [ ] Sem `env=webview`: interface padrão, nenhuma requisição da extensão e nenhum CSS aplicado.
- [ ] Com `env=webview`: skin aplicada; navegação pelo menu e pela busca mantém o parâmetro.
- [ ] Remover o parâmetro (ou navegar por link do conteúdo) volta à interface padrão sem resíduos.
- [ ] Modo lateral e superior detectados corretamente em sites de comunicação e de equipe.
- [ ] Hambúrguer só no modo lateral; estado mantido entre páginas.
- [ ] Itens da engrenagem respeitam permissões (Proprietário, Membro e Visitante).
- [ ] Ferramentas nativas e "Abrir SharePoint completo" abrem sem a skin.
- [ ] Página em edição e páginas de lista e biblioteca não quebram.
- [ ] Telas estreitas, teclado, leitor de tela e alto contraste.
- [ ] Sem execução duplicada ao navegar sem recarregar.
- [ ] Diferenciar o que foi validado no código do que depende de teste no tenant.

## Padrões internos da equipe
Consolidados nesta skill.
