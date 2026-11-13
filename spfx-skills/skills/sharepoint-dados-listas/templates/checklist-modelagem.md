# Checklist de modelagem de lista

Use antes de gerar o `definicao.json` do projeto.

## Volume
- [ ] Volume estimado de itens no primeiro ano:
- [ ] Volume estimado de itens em três anos:
- [ ] Versão de destino confirmada (SharePoint Online, 2016 ou 2019):

## Colunas
- [ ] Cada coluna tem nome interno técnico e rótulo de exibição.
- [ ] Tipo escolhido pelo dado (Text, Note, Number, DateTime, Boolean).
- [ ] Relacionamentos com outra lista usam pesquisa, não texto repetido.
- [ ] Texto longo marcado como `formatacao` quando o escopo pedir formatação.
- [ ] Nenhuma coluna duplica informação de outra.

## Consultas
- [ ] Liste as consultas previstas (tela ou relatório) com colunas de filtro e de ordenação.
- [ ] Cada coluna de filtro e ordenação está marcada como `indexado` quando o volume puder passar de 5.000.
- [ ] Nenhuma consulta depende de carregar a lista inteira.
- [ ] Paginação prevista para as telas que listam itens.

## Índices
- [ ] Número de colunas indexadas dentro do razoável para o volume.
- [ ] Índice não aplicado a coluna de texto longo.

## Permissões e dados sensíveis
- [ ] Colunas com dado pessoal ou sensível identificadas.
- [ ] Níveis de acesso previstos com o padrão do SharePoint.

## Ambientes
- [ ] Nenhum nome de lista ou prefixo fixo no código.
- [ ] Mesma definição para HML e PROD.
