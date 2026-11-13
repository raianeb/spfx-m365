---
name: "spfx-design-base"
description: "Padrão base de UI para web parts SPFx: estrutura, layout responsivo, comandos e estados vazio, erro e primeiro uso."
---

# Design base de web parts

## Quando usar
Ao criar ou alterar a interface de uma web part ou de uma extensão visual.

## Regras-base
- Estruture a web part em área de cabeçalho, conteúdo e ações, com hierarquia visual clara.
- Layout responsivo: deve funcionar em larguras de coluna pequenas e em telas grandes.
- Ações principais ficam visíveis; ações secundárias ficam em menu.
- Prevê os estados vazio, carregando, erro e primeiro uso, com mensagem e próximo passo.
- Acessibilidade de design: contraste e área de toque adequados.

## Padrões internos da equipe
### Modais de formulário e confirmação
- Use uma casca compartilhada para todas as modais da solução. Largura `min(800px, 92vw)`, altura máxima de 90vh, cantos de 8px.
- Cabeçalho fixo e compacto, com contexto discreto à esquerda e botão Fechar com `aria-label` à direita.
- Um único scroll vertical por modal, na área de conteúdo. Dois scrolls são defeito.
- Título grande, associado ao diálogo pelo identificador do título.
- Campos em coluna única, com asterisco nos obrigatórios e erro abaixo do campo.
- Rodapé de ações separado por linha. À esquerda, texto auxiliar. À direita, Cancelar (secundário) e ação principal.
- Durante a gravação, desabilite os botões e indique o estado no botão principal.
- Erro de gravação aparece no rodapé com `role="alert"` e não fecha a modal.
- Escape e Cancelar não gravam alterações.
- Foco inicial: primeiro campo editável, ou Cancelar em confirmações.
- Confirmação de exclusão nomeia o item, informa a lixeira do site e usa os rótulos "Cancelar" e "Excluir", nunca "Sim" e "Não".

### Barras e navegação
- Botões de barra com 32px de altura. Ícones de 16px dentro dos botões.
- Anterior e Próximo são botões só com ícone de seta, com `ariaLabel` e `title`.
- Ação de posição, como Hoje, é texto compacto ao lado das setas.
- Não use botões de largura fixa acima de 120px sem texto que justifique.
- Um único item ativo por grupo. O ativo usa a cor primária com texto branco.
- Ícones de barra não são coloridos. A cor de destaque fica para o estado ativo e o foco.

### Cabeçalho
- Um único ícone de 20px à esquerda do título, na cor primária, com margem de 8px.

### Referências de cor
- Os valores de borda, de texto secundário e de exclusão são tokens do tema. Nunca valores literais no código.
- Origem: skill pessoal de ícones e barras, e seção de modais da skill pessoal de configuração.
