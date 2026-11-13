---
name: "spfx-property-pane-reatividade"
description: "Painel de propriedades em SPFx: quando usar atualização reativa ou não reativa, evitar trabalho caro a cada tecla e tornar explícito o comportamento do botão Aplicar."
---

# Painel de propriedades

## Quando usar
Ao criar ou alterar campos do painel de propriedades.

## Regras-base
- Reativo só quando a atualização for barata; caso contrário, use aplicação explícita.
- Não execute chamadas de rede a cada tecla digitada.
- Deixe claro quando a alteração é aplicada.

## Padrões internos da equipe
- Seletores de site e grupos carregam dados ao abrir o painel ou ao pesquisar. Nunca fazem chamada HTTP dentro de `getPropertyPaneConfiguration` a cada renderização.
- Todo seletor tem estados de carregando, vazio, erro e nova tentativa.
- A seleção atual é preservada mesmo quando não está na primeira página de resultados.
- Respostas de uma consulta antiga são descartadas quando o site muda.
- Alterar uma propriedade não refaz consultas que não dependem dela.
- Origem: skill pessoal de configuração de Web Parts, seção de controles assíncronos.
