# Banner principal — arquitetura de dados (schema v1)

Site: https://<tenant>.sharepoint.com/sites/<nome-do-site>
Status: **proposta para validação.** Os scripts desta pasta só devem ser executados em `apply` após a validação da arquitetura.

## Estruturas

| Nome PROD | Nome HML | Tipo | Finalidade |
|---|---|---|---|
| Banner | [prefixo HML]Banner | Lista (modelo 100, versionamento ativo) | Registro dos banners do carrossel |
| Banner | [prefixo HML]Banner | Biblioteca de documentos (modelo 101, versionamento ativo) | Imagens dos banners, enviadas pelo usuário ou pelo upload da WP |

O nome da biblioteca é configurável na WP (propriedade `libraryName`, padrão `Banner`). O script cria a biblioteca padrão; se a WP apontar para outra, o recurso deve ser criado com o mesmo padrão de nomes.

## Campos da lista

| Nome interno | Rótulo | Tipo | Obrigatório | Índice | Regra |
|---|---|---|---|---|---|
| Title (nativo) | Title | Texto | Sim (nativo) | — | Título do banner, até 255 caracteres. Rótulo mantido como nativo. |
| DataPublicacao | Publicação | Data e hora | Sim (validado na WP) | Simples | Preenchido com a data e hora atuais na criação. |
| DataExpiracao | Expiração | Data e hora | Não | Simples | Vazio = nunca expira. Se preenchido, deve ser posterior à publicação. |
| Link | Link | URL (Hyperlink) | Não | — | Somente http/https. Vazio = clique no banner não faz nada. |
| ImagemCaminho | Caminho da imagem | Texto (uma linha) | Sim (validado na WP) | — | Caminho relativo do arquivo na biblioteca. |
| Ordem | Ordem de exibição | Número | Não | Simples | Padrão 0. Define a ordem do carrossel (menor primeiro). Preenchida pela tela de ordenação, com 1, 2, 3... |

Observação: a obrigatoriedade de Publicação e Imagem é validada no formulário da WP. A coluna não é marcada como obrigatória no SharePoint para não bloquear a criação por outras interfaces sem os dados.

## Consulta atendida pelos índices

- Banners publicados até agora e não expirados: `DataPublicacao le agora` e (`DataExpiracao` vazio ou `DataExpiracao ge agora`), ordenados por `Ordem` crescente e, em empate, por `DataPublicacao` decrescente.
- Ordenação administrativa: lista completa (sem filtro de vigência), na mesma ordem, com a ordem salva a cada alteração.
- Os dois campos de data são indexados porque participam do filtro. Volume previsto: pequeno (dezenas de banners); a consulta retorna somente as colunas necessárias.

## Responsabilidades

- SPFx (web part Banner principal): leitura do carrossel, formulários de criação e edição, upload de imagens para a biblioteca e exclusão, com a sessão do usuário.
- SharePoint: armazenamento da lista e da biblioteca, índices e versionamento.
- Power Automate: **nenhum fluxo necessário para o escopo atual.**
- Agentes de IA: não previstos nesta versão. Se houver agentes no futuro, o desenvolvimento deve ocorrer na plataforma AIRIA, com integração via API.

## Acesso

- Os controles de criar, editar e excluir aparecem somente para quem tem **Controle Total** na lista e pertence a um grupo do perfil **Administradores** do ambiente ativo (configurado nas propriedades da WP).
- Envio de imagens: o usuário precisa de permissão de **Colaborar** na biblioteca `Banner` para salvar arquivos. Sem essa permissão, o upload falha com mensagem de acesso.
- **Pendente de decisão:** os grupos de Administradores HML e PROD não são criados por este script (mesmo padrão do monorepo). Confirme se devem ser criados e quais membros terão acesso.
- O script não cria grupos nem concede permissões em PROD ou HML.

## Ambientes

- HML: criação da lista, dos campos e índices, e da biblioteca.
- PROD: criação com a mesma definição de HML, feita em `apply` somente se `createInProd` estiver `true` e o HML não tiver erro nem divergência na mesma execução. Nunca exclui nem altera recursos já existentes.
- GUIDs e registros podem diferir entre os ambientes; a paridade é estrutural.

## Pontos de validação

1. Os nomes `Banner` e `Banner` estão corretos?
2. Deseja um campo "Ativo" para desligar um banner sem excluí-lo? (não incluído)
3. O campo Title mantém o rótulo nativo "Title" ou deve ser exibido como "Título"? (rótulo nativo mantido)
4. Os grupos HML devem ser criados separadamente do acesso de PROD?
