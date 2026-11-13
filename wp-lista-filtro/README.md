# wp-lista-filtro

Web Part SPFx genérica para filtrar e exibir registros de qualquer lista do SharePoint. Filtros e colunas são escolhidos na configuração, sem código. Preparada para listas de alto volume (100 mil itens ou mais): filtro e paginação no servidor.

## Como configurar

1. Adicione a Web Part "Lista com filtros" à página e abra as propriedades.
2. **Dados e ambiente**: escolha o site de dados, o ambiente e a lista.
3. **Campos de filtro**: aparecem somente campos úteis e que aceitam índice, com a marca "indexado" ou "sem índice".
4. **Campos de exibição**: marque as colunas e ajuste a ordem com as setas.
5. **Geral**: registros por página (10 a 100), modo de busca em texto, carregar ao abrir, ordem sem filtros e link para o item.

Para listas com mais de 5.000 itens, crie índice nos campos de filtro. Veja `provisionamento/INSTRUCOES.md`.

## Estrutura

```
src/
  core/        base da Web Part (configurações padrão), seletores do painel, diagnóstico, tema
  services/
    ListQueryService.ts  leitura paginada (RenderListDataAsStream), cache e novas tentativas
    camlBuilder.ts       filtros -> CAML, estratégia de ordenação por volume
    fieldSchema.ts       campos úteis, tipos filtráveis
    formatValue.ts       texto de exibição por tipo de valor
  webparts/listaFiltro/
    ListaFiltroWebPart.ts
    components/          ListaFiltro, FilterBar, ResultsTable, usePagedQuery
provisionamento/
  arquitetura.md, INSTRUCOES.md, criar-indices.console.js
```

## Build

```
npm install
npm run build
```

Pacote: `sharepoint/solution/wp-lista-filtro.sppkg`.

Decisões, regras de desempenho e pontos a validar no tenant estão em `provisionamento/arquitetura.md`.
