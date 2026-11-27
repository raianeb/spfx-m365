# Provisionamento — Jornada de Conhecimento (Equipe M365)

Use somente após validar `arquitetura-aprovada.md`.

O script desta pasta cria **apenas a lista central** `JornadaAreas`, em HML e PROD. Grupos, permissões (só níveis padrão do SharePoint) e as listas de cada área são criados pela própria web part, na aba **Administração** (exceção aprovada no `jornada-conhecimento/escopo.md`).

## Pré-requisitos
- Sessão logada no site de destino, com permissão de Controle Total.
- Navegador Chrome ou Edge.
- Padrão de nomes da equipe: HML = `HML_<Nome>`, PROD = `<Nome>`. Ao executar, informe o prefixo de HML **`HML_`** e deixe o de PROD **vazio**. São os mesmos valores já preenchidos na web part.

## Passo a passo
1. Abra qualquer página do site de destino (por exemplo, a Home).
2. Pressione F12 e abra a aba **Console**.
3. Se aparecer aviso para permitir colar código, digite `allow pasting` e Enter.
4. Abra `criar-estrutura.console.js`, copie tudo e cole no Console. Pressione Enter.
5. Informe, quando pedido, a URL do site (uma vez), o prefixo de HML (`HML_`) e o de PROD (vazio). Resultado: `HML_JornadaAreas` e `JornadaAreas`.
6. Confira o relatório de plano (tabela). Nenhuma alteração foi feita.
7. Para aplicar, altere no arquivo colado `mode: 'plan'` para `mode: 'apply'`, cole novamente e execute.
   - Ordem: HML primeiro, depois PROD. PROD só é criado se `createInProd` estiver `true` e o HML não tiver nenhum `erro` nem `divergente` no relatório.
   - Recomendado: na primeira execução em `apply`, use `createInProd: false`, valide o HML e depois ative.

## Reexecução
O script é idempotente: rodar de novo não duplica lista ou campo. Nada existente é alterado ou excluído.

## Interpretação dos resultados
- `criado`: alteração feita agora (inclui ajuste de rótulo e índice).
- `conforme`: já existe como previsto.
- `plano`: seria feito no modo apply.
- `divergente`: existe, mas diferente do esperado. Não é corrigido automaticamente.
- `pendente`: não foi criado porque a criação estava bloqueada naquele ambiente.
- `erro`: falha; veja a mensagem.

## Depois da criação
1. Implante o `wp-jornada-conhecimento.sppkg` no catálogo e adicione a web part a uma página do site.
2. Nas propriedades da web part, escolha o **Ambiente** (PROD ou HML) e o grupo de Administradores. Os prefixos já vêm preenchidos (`HML_` e vazio); só altere se o script tiver usado outros valores.
3. Com um usuário de Controle Total, abra a aba **Administração** e execute **Preparar o site**: cria o grupo de Administradores do ambiente (`Jornadas – Administradores` ou `HML_Jornadas – Administradores`), se ainda não existir. Nenhum nível de permissão é criado.
4. Crie as áreas pela aba **Administração**. Cada área recebe os três grupos, as listas e a biblioteca, com as permissões de `arquitetura-aprovada.md`.
