# Documentos (visualização) — arquitetura de acesso (schema v1)

Site: https://<tenant>.sharepoint.com/sites/<nome-do-site>
Status: **proposta para validação.** Esta WP não cria estruturas: lê uma biblioteca já existente.

## Estruturas

Nenhuma lista ou biblioteca é criada. A WP usa a biblioteca escolhida nas propriedades, em cada ambiente:

| Escolha na WP | PROD | HML |
|---|---|---|
| Biblioteca de documentos (ex.: `Documentos`) | `Documentos` | `HML_Documentos` |

A biblioteca precisa existir nos dois ambientes com o mesmo nome base. A WP nunca usa PROD como alternativa quando HML estiver ausente.

## Campos e metadados

Nenhum campo é lido além do necessário para navegar: nome, caminho, data de alteração, tamanho e identificador do arquivo. Metadados de negócio não são exibidos nesta versão.

## Consultas

| Operação | Consulta | Custo |
|---|---|---|
| Raiz da biblioteca | `rootfolder` da biblioteca (uma vez por escolha) | Constante |
| Pastas de um nível | `GetFolderByServerRelativePath(...)/folders` (até 1000) | Depende da quantidade de pastas do nível aberto |
| Arquivos de um nível | `GetFolderByServerRelativePath(...)/files` (até 1000) | Depende da quantidade de arquivos do nível aberto |

Decisões de desempenho:

- Consulta por pasta, e não por `FileDirRef` ou CAML sobre a biblioteca inteira. Assim o custo depende só da pasta aberta, e a biblioteca pode crescer sem piorar a navegação.
- Pastas e arquivos são obtidos em paralelo (duas chamadas independentes).
- O resultado de cada nível é guardado em memória enquanto a WP estiver aberta. Voltar a um nível não refaz a consulta; o botão "Atualizar" invalida o nível atual.
- A busca filtra o nível aberto no navegador, sem nova consulta.
- Nenhum índice é criado: a WP não filtra a biblioteca no servidor.

Limite a considerar: uma pasta com mais de 5.000 itens pode não ser enumerada pelo SharePoint por causa do limite de exibição de lista. Nesse caso, a recomendação é organizar os documentos em subpastas. Não há paginação nesta versão.

## Permissões

- Somente leitura. A WP não cria, edita, exclui nem altera permissões.
- Cada usuário vê apenas o que já tem acesso no SharePoint. Pastas sem permissão não aparecem com conteúdo, e o link compartilhado só funciona para quem tem acesso ao arquivo.
- O botão "Compartilhar" copia o link direto do item. Não gera link anônimo nem altera permissões: quem recebe o link precisa ter acesso ao item.

## Abertura de arquivos

- Word, Excel e PowerPoint abrem no visualizador do SharePoint (`WopiFrame.aspx`, somente leitura), em nova aba.
- PDF, imagens, áudio, vídeo e demais formatos abrem pelo próprio link do arquivo, em nova aba.
- Pastas são navegadas dentro da WP, com caminho clicável no topo.

## Responsabilidades

- SPFx (web part Documentos): navegação, busca, visualização em grade ou lista, abertura e compartilhamento de link.
- SharePoint: armazenamento, permissões e visualização dos arquivos.
- Power Automate: **nenhum fluxo necessário para o escopo atual.**
- Agentes de IA: não previstos nesta versão. Se houver no futuro, o desenvolvimento deve ocorrer na plataforma AIRIA, com integração via API.

## Pontos de validação

1. A biblioteca inicial é `Documentos` (nome base)? Confirme o nome real de cada ambiente.
2. Há pastas com mais de 5.000 itens? Se houver, a navegação precisa ser reorganizada na biblioteca.
3. Deve existir paginação ou ordenação por data nesta versão?
4. A pasta "Forms" da raiz da biblioteca é ocultada automaticamente. Há outras pastas de sistema a ocultar?
5. Os grupos HML devem ser criados separadamente do acesso de PROD?
