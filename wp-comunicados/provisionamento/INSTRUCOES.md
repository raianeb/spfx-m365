# Provisionamento — Comunicados (Espaço PUC Carreiras)

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
   - Ordem: HML primeiro, depois PROD. PROD só é criado se `createInProd` estiver `true` e o HML não tiver nenhum `erro` nem `divergente` no relatório.
   - Se o HML tiver problemas, PROD fica `pendente` e nada é criado nele.
   - Recomendado: na primeira execução em `apply`, use `createInProd: false`, valide o HML e depois ative.
7. Execute `validar-estrutura.console.js`. As duas listas devem mostrar **paridade estrutural** e **conforme ao catálogo** em HML e em PROD (ou "ausente" em PROD, se ainda não foi criada).

## Reexecução
O script é idempotente: rodar de novo não duplica lista ou campo. Se um recurso falhar, os demais continuam e o erro aparece no relatório. Corrija a causa e execute de novo.

## Interpretação dos resultados
- `criado`: alteração feita agora (inclui ajuste de rótulo).
- `conforme`: já existe como previsto.
- `plano`: seria feito no modo apply.
- `divergente`: existe, mas diferente do esperado. Não é corrigido automaticamente.
- `pendente`: não foi criado porque a criação estava bloqueada naquele ambiente (ver mensagem).
- `erro`: falha; veja a mensagem.

## Depois da criação
- Os grupos de Administradores (HML e PROD) precisam ser definidos nas propriedades da web part, em cada ambiente.
- Quem apenas lê comunicados não precisa de nenhuma permissão extra além de leitura no site.
- Não há fluxos Power Automate nesta etapa.
- Cadastre as categorias pela própria WP (botão "Categorias") antes de publicar comunicados, porque a categoria é obrigatória.
