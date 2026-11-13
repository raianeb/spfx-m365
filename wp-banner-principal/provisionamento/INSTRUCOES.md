# Provisionamento HML — Banner principal (Espaço PUC Carreiras)

Use somente após validar `arquitetura-aprovada.md`.

## Pré-requisitos
- Sessão logada em https://smcgtipucminas.sharepoint.com/sites/espacopuccarreiras com permissão de Controle Total no site.
- Navegador Chrome ou Edge.

## Passo a passo
1. Abra qualquer página do site (por exemplo, a Home).
2. Pressione F12 e abra a aba **Console**.
3. Se aparecer aviso para permitir colar código, digite `allow pasting` e Enter.
4. Abra `criar-estrutura.console.js`, copie tudo e cole no Console. Pressione Enter.
5. Confira o relatório de plano (tabela). Nenhuma alteração foi feita.
6. Para aplicar, altere no arquivo colado a linha `mode: 'plan'` para `mode: 'apply'`, cole novamente e execute.
   - Ordem: HML primeiro, depois PROD. PROD só é criado se `createInProd` estiver `true` e o HML não tiver nenhum `erro` nem `divergente` no relatório. Recursos já existentes nunca são alterados.
   - Se o HML tiver problemas, PROD fica `pendente` e nada é criado nele.
7. Execute `validar-estrutura.console.js`. A coluna "paridade" deve mostrar **paridade estrutural** e ambas as colunas PROD e HML devem mostrar **conforme ao catálogo**.
8. Valide o HML antes de executar o `apply` em PROD. Ou seja: na primeira execução em `apply`, o PROD só será criado se o HML estiver limpo naquela mesma rodada. Recomendado: rode primeiro com `createInProd: false`, valide o HML e depois ative.

## Reexecução
O script é idempotente: rodar de novo não duplica lista, biblioteca ou campo. Se um recurso falhar, os demais continuam e o erro aparece no relatório. Corrija a causa e execute de novo.

## Interpretação dos resultados
- `criado`: alteração feita agora.
- `conforme`: já existe como previsto.
- `plano`: seria feito no modo apply.
- `divergente`: existe, mas diferente do esperado. Não é corrigido automaticamente.
- `pendente`: não foi criado porque a criação estava bloqueada naquele ambiente (ver mensagem).
- `erro`: falha; veja a mensagem.

## Depois da criação
- A coluna `Ordem` é nova. Se a lista HML já existia, a execução em `apply` a cria com padrão 0 e a indexa. Em PROD, ela só é criada se o gate permitir (ver passo 6).
- A biblioteca `HML_Banner` deve receber permissão de Colaborar para quem envia imagens. Este script não altera permissões.
- Os grupos de Administradores HML precisam ser definidos nas propriedades da web part, no ambiente HML.
- Na web part, mantenha o campo "Biblioteca de imagens dos banners" igual ao nome base (`Banner`); o prefixo HML_ é aplicado automaticamente.
- Não há fluxos Power Automate nesta etapa.
