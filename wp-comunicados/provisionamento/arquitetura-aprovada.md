# Comunicados — arquitetura de dados (schema v1)

Site: https://<tenant>.sharepoint.com/sites/<nome-do-site>
Status: **proposta para validação.** Os scripts desta pasta só devem ser executados em `apply` após a validação da arquitetura.

## Estruturas

| Nome PROD | Nome HML | Tipo | Finalidade |
|---|---|---|---|
| Comunicados | [prefixo HML]Comunicados | Lista (modelo 100, versionamento ativo) | Comunicados publicados |
| Categorias Comunicados | [prefixo HML]Categorias Comunicados | Lista (modelo 100, versionamento ativo) | Lista auxiliar de categorias, mantida pela própria WP |

Não há bibliotecas nesta versão: o comunicado não tem anexos previstos no print.

## Campos da lista de comunicados

| Nome interno | Rótulo | Tipo | Obrigatório (na WP) | Índice | Regra |
|---|---|---|---|---|---|
| Title (nativo) | Título | Texto (255) | Sim | Não | Rótulo ajustado para "Título". Sem filtro por título nesta versão. |
| DataComunicado | Data | Data e hora | Sim | **Simples** | Preenchido com a data e hora atuais na criação. Ordenação principal da lista. |
| CategoriaId | Categoria | Número | Sim | **Simples** | Guarda o Id da categoria na lista auxiliar. Sem Lookup. |
| Mensagem | Mensagem | Texto com formatação (rich text, modo Compatible, 6 linhas) | Sim | Não | HTML do editor da WP (negrito, itálico, sublinhado, listas e links). Sanitizado por allowlist antes de gravar e antes de exibir. Não é indexável. |
| Autor | Autor | Texto (255) | Não | Não | Informação exibida no cartão. Não é filtrado. |

A Mensagem é texto com formatação (RF-COM-01). O HTML é filtrado por uma allowlist de tags e atributos (`richText.ts`) antes de ser gravado e antes de ser exibido: scripts, eventos, imagens, estilos e links com protocolo fora de http, https e mailto são removidos. Autor é texto simples.

## Lista de categorias

| Nome interno | Rótulo | Tipo | Índice | Regra |
|---|---|---|---|---|
| Title (nativo) | Categoria | Texto (100 na WP) | Não | Nome único, comparado sem diferenciar maiúsculas e minúsculas pela WP. |

Justificativa para não indexar `Title`: a lista terá poucas dezenas de registros. Ela é carregada inteira, em uma única consulta, e ordenada em memória. Um índice não traria ganho mensurável.

## Relacionamento e consistência

- A categoria é guardada como número (`CategoriaId`), e não como Lookup. Isso evita a junção automática do SharePoint, a sobrecarga de consulta com Lookup e o limite de colunas de relacionamento.
- O nome da categoria não é copiado para o comunicado. A WP lê a lista de categorias uma vez e resolve o nome em memória. Renomear uma categoria não exige atualizar comunicados.
- Antes de excluir uma categoria, a WP consulta se existe comunicado com `CategoriaId` igual a ela, usando o índice de `CategoriaId`. Se houver, a exclusão é bloqueada e a mensagem informa o motivo.
- Como a verificação e a exclusão não são uma transação, uma corrida rara pode associar um comunicado a uma categoria excluída logo em seguida. A WP trata isso exibindo "Sem categoria" para Ids que não existem mais.

## Índices e consultas

| Consulta | Campos | Índice | Observação |
|---|---|---|---|
| Comunicados por data, mais recentes primeiro (página inicial) | `DataComunicado desc, Id desc`, `$top=4` | `DataComunicado` (simples); `Id` é índice nativo | Exibe 3. O quarto item só indica se há "Ver Todos" (RF-COM-03 e RF-COM-04). |
| Comunicados por data, mais recentes primeiro (página completa) | `DataComunicado desc, Id desc`, `$top` crescente | `DataComunicado` (simples); `Id` é índice nativo | Paginação por "Carregar mais" (RF-COM-02). |
| Verificar uso de uma categoria antes de excluir | `CategoriaId eq <id>`, `$top=1` | `CategoriaId` (simples) | Consulta de existência, com retorno de no máximo um item |
| Lista de categorias | `Title asc` | Nenhum | Lista pequena, carregada inteira |

Índice composto não foi criado: não há consulta que filtre por categoria e ordene por data na primeira versão. Se a tela passar a filtrar por categoria, avaliar `CategoriaId` + `DataComunicado` como índice composto.

## Exibição (RF-COM-02, 03 e 04)

- A ordem é sempre por `DataComunicado` decrescente, com `Id` como desempate. Não há ordenação manual.
- Modo **página inicial**: exibe 3 comunicados. Quando houver mais, aparece o botão "Ver Todos", que abre o endereço configurado nas propriedades da WP. Sem endereço configurado, o botão não aparece.
- Modo **página completa**: exibe todos, em páginas de "Carregar mais". Essa WP fica na página de destino do "Ver Todos", com o modo completa.
- A quantidade "Quantidade máxima de itens" do painel comum é o tamanho de página do modo completa. No modo página inicial ela não se aplica, porque o limite é fixo em 3.
- Cartões e linhas mostram somente o texto, sem formatação. A leitura completa, com formatação, abre no modal "Ver mais".
- Coluna `Ordem`: criada nas versões 1.0.2.x e não usada desde a 1.0.3.0. Os scripts não a excluem. `validar-estrutura` a aponta como extra enquanto existir. Pode ser removida manualmente nas configurações da lista.

## Responsabilidades

- SPFx (web part Comunicados): leitura paginada, cartões, formulário de comunicado, gerenciamento de categorias e exclusão com verificação de uso, sempre com a sessão do usuário.
- SharePoint: armazenamento, índices e versionamento das duas listas.
- Power Automate: **nenhum fluxo necessário para o escopo atual.**
- Agentes de IA: não previstos nesta versão. Se houver agentes no futuro, o desenvolvimento deve ocorrer na plataforma AIRIA, com integração via API.

## Acesso

- Criar, editar e excluir comunicados e categorias aparecem somente para quem tem **Controle Total** na lista correspondente **e** pertence a um grupo do perfil **Administradores** do ambiente ativo (configurado nas propriedades da WP).
- Usuários sem essa permissão veem apenas a lista de comunicados.
- **Pendente de decisão:** os grupos de Administradores HML e PROD não são criados por este script (mesmo padrão dos demais projetos). Confirme se devem ser criados e quem fará parte.
- O script não cria grupos nem concede permissões.

## Ambientes

- HML: criação das duas listas, dos campos e dos índices, com o rótulo de Título.
- PROD: criação com a mesma definição, em `apply`, somente se `createInProd` estiver `true` e o HML não tiver erro nem divergência na mesma execução. Nunca exclui nem altera recursos já existentes.
- Listas já criadas com `Mensagem` em texto simples: o script não altera colunas existentes. `criar-estrutura` e `validar-estrutura` apontam a divergência. Ajustar o tipo da coluna nas configurações da lista, em PROD e em HML, e depois validar de novo. Comunicados antigos, em texto simples, continuam válidos e são exibidos com as quebras de linha.
- GUIDs e registros podem diferir entre os ambientes; a paridade é estrutural.

## Pontos de validação

1. Os nomes `Comunicados` e `Categorias Comunicados` estão corretos?
2. Resolvido: `Mensagem` é texto com formatação (negrito, itálico, sublinhado, listas e links), com sanitização na gravação e na exibição.
3. Deve existir campo "Ativo" para ocultar comunicados sem excluí-los? Não incluído nesta versão.
4. Comunicados com data futura devem aparecer na lista? A versão atual exibe todos.
5. Os grupos HML devem ser criados separadamente do acesso de PROD?
