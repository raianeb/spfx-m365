# Índices dos campos de filtro

A Web Part filtra no servidor. Em listas com mais de 5.000 itens, o SharePoint só aceita filtro em campo com índice. Use `criar-indices.console.js` para criar os índices dos campos escolhidos como filtro.

## Pré-requisitos
- Sessão logada no site da lista, com permissão para gerenciar listas (Controle Total ou Editar).
- Navegador Chrome ou Edge.

## Passo a passo
1. Abra qualquer página do site da lista, pressione F12 e abra a aba **Console**.
2. Se aparecer aviso para permitir colar código, digite `allow pasting` e Enter.
3. O script pede três entradas ao executar: a URL do site (padrão: o site aberto), o nome da lista sem prefixo e o prefixo de HML (obrigatório) e o de PROD (vazio para nenhum). As listas são processadas HML primeiro.
   - Em `CONFIG`, ajuste apenas `fields`: nomes internos dos campos usados como filtro. O painel da Web Part mostra quais estão "sem índice".
4. Cole e execute com `mode: 'plan'`. Confira a tabela: nada foi alterado.
5. Troque para `mode: 'apply'` e execute de novo. Uma lista só é alterada se as anteriores não tiverem `erro` nem `divergente`.
6. Reabra o painel da Web Part: os campos devem aparecer como "indexado".

## Resultados
- `criado`: índice criado agora. `conforme`: já existia. `plano`: seria criado em apply.
- `divergente`: o tipo do campo não aceita índice, ou a lista já tem 20 índices. Não é corrigido automaticamente.
- `pendente`: bloqueado porque uma lista anterior teve problema. `erro`: veja a mensagem.

## Observações
- Criar índice não altera dados. Em lista muito grande, a criação pode levar alguns minutos para ter efeito.
- Se o SharePoint recusar a criação do índice em uma lista que já passou do limite, crie o índice pela interface (Configurações da lista > Colunas indexadas) fora do horário de pico, ou abra chamado com a Microsoft. Esse comportamento varia por tenant e precisa ser validado no seu ambiente.
- Remover índice não é feito por este script.
