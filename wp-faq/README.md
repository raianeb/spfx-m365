# wp-faq — Perguntas Frequentes (Equipe M365)

Web Part SPFx de perguntas e respostas, com acordeão, ordenação configurável, link direto por pergunta, busca e sugestão de novas perguntas por fluxo do Power Automate.

## Funcionalidades

- Pergunta e resposta, em texto com formatação (negrito, itálico, sublinhado, listas e links).
- Ordenação: ordem definida (manual), pergunta de A a Z, ou mais recentes primeiro.
- Modo de abertura: todos fechados, todos abertos ou primeiro aberto.
- Botão "Copiar link" em cada pergunta. O link abre a pergunta diretamente na página.
- Busca instantânea no título e na resposta, sem acentos e sem diferença entre maiúsculas e minúsculas.
- Sugestão de novas perguntas: botão "Sugerir nova pergunta" aparece quando o envio está ativado e a URL do fluxo é válida. O envio é um POST JSON ao gatilho HTTP do Power Automate.
- Administradores cadastram, editam e excluem perguntas pelos botões "+" e nas ações de cada linha. O botão "Ordenar" define a ordem de exibição, como na WP banner. Os controles aparecem para quem tem Controle Total na lista e pertence ao grupo do perfil Administradores configurado na WP.
- Seis configurações obrigatórias do padrão Equipe M365: título, site de dados, grupos de Administradores por ambiente, ambiente PROD/HML, herança de tema e log.

## Configurações da Web Part

| Configuração | Opções |
|---|---|
| Lista de perguntas frequentes | Lista escolhida no site de dados. Padrão: `FAQ`. |
| Modo de abertura | Todos fechados · Todos abertos · Primeiro aberto |
| Ordenação | Ordem definida · Pergunta (A a Z) · Mais recentes primeiro |
| Permitir envio de sugestões | Sim · Não |
| URL do fluxo Power Automate | URL HTTP Trigger (https). Vazia desliga o botão de sugestão. |

## Regras funcionais atendidas

| Regra | Atendimento |
|---|---|
| RF-FAQ-01 Cadastro de perguntas e respostas | Formulário com título e editor de texto rico. |
| RF-FAQ-02 Ordem de exibição | Coluna `Ordem`, atribuída na inclusão e alterada pelo botão "Ordenar". |
| RF-FAQ-03 Comportamento inicial | Propriedade "Modo de abertura". |
| RF-FAQ-04 Copiar link | Botão "Copiar link" em cada pergunta, com âncora `#faq-<Id>`. |
| RF-FAQ-05 Habilitar sugestões | Propriedade "Permitir envio de sugestões". |
| RF-FAQ-06 Acionar a URL configurada | POST JSON ao fluxo, com mensagem de sucesso ou falha. |

Melhorias recomendadas: busca instantânea (incluída nesta versão). Votação de utilidade ("Esta resposta foi útil?") ficou para a próxima versão, pois exige colunas de contagem e controle de voto único por usuário.

## Estrutura

```
src/
  core/        base das WPs Equipe M365 (configurações obrigatórias), config, diagnóstico, seletores
  crud/        CRUD com modais, reordenação e gerenciamento
  services/    acesso às listas (SharePoint REST) e envio de sugestões
  webparts/faq/
    FaqWebPart.ts
    components/
      Faq.tsx, FaqItem.tsx, FaqForm.tsx, SuggestionModal.tsx
      faqRules.ts        regras puras (ordenação, abertura, busca, validações, payload)
      richText.ts        allowlist de HTML da resposta
      RichTextEditor.tsx editor de texto rico
provisionamento/
  arquitetura-aprovada.md, INSTRUCOES.md, criar/validar-estrutura.console.js
```

## Build e instalação

```
npm install
npm run build
```

O pacote gerado fica em `sharepoint/solution/wp-faq.sppkg`. Envie-o ao catálogo de aplicativos do site e adicione a Web Part na página.

## Provisionamento

Siga `provisionamento/INSTRUCOES.md`. O script cria a lista `FAQ` e a coluna `Ordem`, com índice, em PROD e HML, sem excluir nem alterar recursos existentes.

## Testes de regras

As regras de `faqRules.ts` e o envio em `SuggestionService.ts` foram verificados por testes de comportamento (ordenação, abertura, link direto, busca sem acentos, validações, payload e falhas de envio). O sanitizador de HTML é o mesmo validado no wp-comunicados.
