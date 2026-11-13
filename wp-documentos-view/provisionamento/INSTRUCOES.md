# Documentos (visualização) — instruções

Esta WP não cria listas nem bibliotecas. Ela lê uma biblioteca de documentos que já exista.

## Antes de usar
1. Confirme que a biblioteca existe em PROD (ex.: `Documentos`) e, se usar o ambiente HML, em `HML_Documentos`.
2. Abra o Console com o site aberto (F12 > Console), cole `validar-estrutura.console.js` e confira a tabela. Ela não altera nada.
3. Os usuários precisam de permissão de leitura na biblioteca. A WP não concede acesso.

## Configurar a WP
1. Em **Dados e ambiente**, escolha o site de dados e o ambiente (HML ou Produção).
2. Em **Biblioteca de documentos**, escolha a biblioteca. A lista mostra somente bibliotecas do site, sem as cópias HML_.
3. Em **Visualização inicial**, escolha Grade de ícones ou Lista.

## Uso pelo usuário
- Clique em uma pasta para abrir. O caminho no topo permite voltar a qualquer nível.
- Clique em um arquivo para abrir em nova aba.
- O ícone de compartilhamento copia o link direto do item. Quem receber o link precisa ter acesso a ele.
- A busca filtra somente a pasta aberta.

## Resolução de problemas
- "Não foi possível acessar a biblioteca": verifique se o usuário tem permissão de leitura e se a biblioteca escolhida existe no ambiente ativo.
- Pasta com muitos itens não carrega: organize os documentos em subpastas (limite de exibição do SharePoint).
