---
name: "spfx-tema-marca"
description: "Integração com o tema do SharePoint em SPFx: tokens de tema, cores semânticas, modos claro, escuro e alto contraste, e fontes do Brand Center."
---

# Tema e marca

## Quando usar
Sempre que a web part definir cor, fonte, borda ou fundo.

## Regras-base
- Use tokens de tema e cores semânticas, nunca cores fixas no código.
- Suporte aos modos claro, escuro e alto contraste.
- Use as fontes do tema ou do Brand Center.
- Respeite a opção de herdar o tema do site.

## Padrões internos da equipe
- Herdar tema "Sim": usa o tema do site que hospeda a Web Part e atualiza quando o tema mudar. Cores são mapeadas para fundo, superfície, texto, borda, link e ação, com valor de reserva.
- Herdar tema "Não": usa somente os tokens da solução. Nenhum estilo herdado permanece ativo.
- Cores fixas são proibidas no código. Os valores de referência (como cinza de borda e vermelho de exclusão) ficam como tokens do tema da solução.
- Modais são renderizadas em portal e recebem as variáveis de tema explicitamente. Não dependem da herança do contêiner da página.
- Trocar o tema atualiza somente a apresentação, sem refazer consultas.
- Origem: skill pessoal de configuração de Web Parts (seção de tema) e código da própria solução.
