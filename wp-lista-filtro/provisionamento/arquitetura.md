# wp-lista-filtro — arquitetura

Web Part genérica: não cria nem altera listas. Lê uma lista existente, escolhida na configuração.

## Fluxo de consulta

1. **Estrutura** (uma vez por lista, por instância): total de itens (`ItemCount`), pasta raiz e campos não ocultos. Duas chamadas em paralelo.
2. **Consulta**: `POST .../RenderListDataAsStream` com um `ViewXml` (CAML) que contém somente as colunas exibidas, os filtros preenchidos e `RowLimit Paged="TRUE"`.
3. **Paginação**: o servidor devolve `NextHref`, usado como cursor da página seguinte. A Web Part guarda os cursores das páginas visitadas para o "Anterior". Não existe salto para uma página arbitrária nem contagem do total filtrado: as duas operações exigiriam percorrer a lista.

A lista nunca é carregada inteira no navegador. Cada página traz no máximo 100 registros.

## Por que RenderListDataAsStream

| Critério | `items?$filter` (REST) | `RenderListDataAsStream` (escolhido) |
|---|---|---|
| Paginação em lista grande | `$skiptoken` | Cursor `NextHref`, o mesmo das views modernas |
| Pessoa, consulta, metadados | Exige `$expand` por campo e tipo | Vêm formatados na resposta |
| Datas e números | Valor bruto, formatar no cliente | Formatados na localidade do site |
| Complexidade do filtro | OData | CAML (mais verboso, mais previsível com índices) |

## Regras para alto volume

| Situação | Estratégia |
|---|---|
| Sem filtro | Ordena por `ID` (índice nativo), na direção configurada. |
| Lista até 5.000 itens, com filtro | Ordena por `ID`. Qualquer filtro é aceito. |
| Lista acima de 5.000, com filtro | Condição indexada primeiro no `Where` e `OrderBy UseIndexForOrderBy`, que percorre pelo índice do campo filtrado em vez de ordenar o resultado. A ordem dos registros segue esse índice. |
| Lista acima de 5.000, filtros preenchidos sem índice | A Web Part bloqueia a consulta e informa quais filtros indexados preencher. |
| Limite estourado mesmo assim | O erro do SharePoint é identificado e mostrado como orientação, não como falha genérica. |

- Tipos oferecidos como filtro: texto, opção, número, moeda, data, sim/não e ID. Todos aceitam índice.
- Texto usa "começa com" por padrão, porque "contém" não aproveita índice. "Contém" pode ser ativado nas configurações e, em lista grande, só funciona junto com outro filtro indexado.
- Datas são comparadas sem hora (`IncludeTimeValue="FALSE"`).
- Páginas visitadas ficam em cache por 2 minutos (até 60 páginas por instância). Voltar à página anterior não refaz a chamada.
- HTTP 429 e 503 são repetidos até 2 vezes, respeitando `Retry-After`.

## Segurança

- Valores digitados passam por escape de XML antes de entrar no CAML. Nomes de campo vêm do esquema da lista, nunca do usuário.
- Texto longo é exibido sem marcação HTML. Links só são renderizados para `http` e `https`.
- A consulta usa a sessão do usuário: ele só vê itens aos quais tem acesso.

## Configurações

Padrão das Web Parts: título, site de dados, ambiente (PROD/HML com prefixo `HML_`), grupos de Administradores por ambiente, herança de tema e log. Específicas: lista, campos de filtro, campos de exibição, registros por página, modo de busca em texto, carregar ao abrir, ordem sem filtros e link para o item.

O perfil Administradores vê o atalho "Abrir lista". Isso é conveniência de interface, não controle de acesso.

## Pontos a validar no tenant

Não foi possível testar contra um tenant real. Validar com uma lista de alto volume:

1. Paginação com `UseIndexForOrderBy` em `RenderListDataAsStream` (avançar várias páginas com filtro indexado que retorne mais de 5.000 itens).
2. Filtro por intervalo de datas em campo indexado com resultado acima de 5.000 itens.
3. Criação de índice em lista que já passou de 5.000 itens.
4. Formato dos valores de pessoa, consulta e metadados nas colunas.

Com "Exibir log" ativo, o diagnóstico mostra a estratégia usada, o tempo e a quantidade de registros de cada consulta.

## Fora desta versão

- Filtro por pessoa e por consulta (lookup): aceitam índice, mas pedem seletor próprio.
- Ordenação por clique no cabeçalho: em lista grande só é segura em coluna indexada.
- Exportação dos resultados.
