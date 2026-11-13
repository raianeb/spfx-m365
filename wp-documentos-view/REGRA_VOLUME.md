# Regra de volume para bibliotecas de documentos

Vale para qualquer Web Part que leia uma biblioteca do Espaço PUC Carreiras, independentemente de quantos itens ela tenha.

## Princípios

1. **Nunca ler a biblioteca inteira.** Toda consulta é restrita a uma pasta, ou a um lote limitado de itens.
2. **Paginação com `odata.nextLink`.** Pastas com mais itens que o tamanho da página são lidas em páginas. A interface oferece "Carregar mais" em vez de carregar tudo.
3. **Contagem sem listagem.** A quantidade de arquivos de uma pasta é `ItemCount` da pasta menos a quantidade de subpastas. O `$count` da coleção de arquivos não é usado, porque não existe nesse ambiente (HTTP 404).
4. **Busca por percurso de pastas.** A busca percorre as subpastas uma a uma, com consultas por pasta. Não usa filtro por caminho (`startswith(FileDirRef)`) sobre a biblioteca inteira, porque esse filtro não usa índice e estoura o limite de consulta (5.000 itens) em bibliotecas grandes.
5. **Limites explícitos.** A busca tem teto de resultados e de pastas percorridas. Ao atingir o teto, a tela avisa que o resultado está limitado.
6. **Lotes pequenos.** Requisições em paralelo são feitas em lotes de até 4.

## Limites atuais (CarreirasListService / Documentos)

| Item | Valor |
|---|---|
| Itens de subpasta por página | 1.000 |
| Arquivos por página | 200 |
| Resultados da busca | 200 |
| Pastas percorridas na busca | 200 |
| Requisições simultâneas | 4 |
| Páginas máximas de uma consulta | 20 |

## Quando revisar

- Uma única pasta com mais de 5.000 itens pode falhar na busca por percurso. Nesse caso a tela mostra quantas pastas não puderam ser pesquisadas.
- Se o uso passar de centenas de pastas, avaliar a indexação de colunas ou a busca pelo índice do SharePoint, depois de resolvido o erro HTTP 500 observado na Web Part.
