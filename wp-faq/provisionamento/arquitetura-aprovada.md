# FAQ — arquitetura de dados (schema v1)

Site: https://smcgtipucminas.sharepoint.com/sites/espacopuccarreiras
Status: **proposta para validação.** Os scripts desta pasta só devem ser executados em `apply` após a validação desta arquitetura.

## Estruturas

| Nome PROD | Nome HML | Tipo | Finalidade |
|---|---|---|---|
| Carreiras - FAQ | HML_Carreiras - FAQ | Lista (modelo 100, versionamento ativo) | Perguntas e respostas publicadas |

Não há bibliotecas nem listas auxiliares: pergunta e resposta ficam na mesma lista, e categorias não estão previstas nesta versão.

## Campos da lista

| Nome interno | Rótulo | Tipo | Obrigatório (na WP) | Índice | Regra |
|---|---|---|---|---|---|
| Title (nativo) | Pergunta | Texto (255) | Sim | Não | Rótulo ajustado para "Pergunta". Limite de 255 caracteres. |
| Resposta | Resposta | Texto com formatação (rich text, modo Compatible, 6 linhas) | Sim | Não | HTML do editor da WP (negrito, itálico, sublinhado, listas e links). Sanitizado por allowlist antes de gravar e antes de exibir. Limite de 4000 caracteres de texto visível. |
| Ordem | Ordem | Número (inteiro) | Automático | **Simples** | Posição de exibição na ordenação "Ordem definida". Atribuída na inclusão (última posição + 1) e alterada pelo botão Ordenar. Não é digitada no formulário. |

A resposta usa o mesmo filtro de tags da WP de comunicados: scripts, eventos, imagens, estilos e links com protocolo fora de http, https e mailto são removidos.

## Índices e consultas

| Consulta | Ordenação | Índice | Observação |
|---|---|---|---|
| Ordem definida (padrão) | `Ordem asc, Id asc` | `Ordem` (simples) | Ordenação principal da lista. |
| Pergunta (A a Z) | `Title asc` | Nenhum | Lista pequena, carregada inteira. |
| Mais recentes primeiro | `Id desc` | Índice nativo | Sem índice adicional. |

Consulta única por carregamento, com limite de 500 perguntas. Acima disso, a WP precisará de paginação.

## Modo de abertura e link direto

- Modo de abertura (propriedade da WP, não da lista): todos fechados, todos abertos ou primeiro aberto.
- Cada pergunta tem o botão "Copiar link", que gera `endereço-da-página#faq-<Id>`. Ao abrir o link, a pergunta correspondente é aberta e levada para a tela.
- O `Id` do item identifica o link. Se a lista for recriada, os links antigos deixam de funcionar; por isso a lista não deve ser recriada depois de publicada.

## Sugestões (Power Automate)

- O botão "Sugerir nova pergunta" aparece somente quando as sugestões estão ativadas **e** a URL do fluxo é `https` válida.
- A WP não grava sugestões no SharePoint. Ela envia um POST JSON ao gatilho HTTP do fluxo, que encaminha a solicitação à equipe responsável.
- Contrato do corpo enviado:

```json
{
  "tipo": "sugestao-faq",
  "pergunta": "texto da pergunta sugerida",
  "detalhes": "texto complementar ou null",
  "solicitante": { "nome": "nome do usuário ou null", "email": "e-mail do usuário ou null" },
  "paginaOrigem": "endereço da página sem fragmento",
  "siteDeDados": "endereço do site de dados",
  "enviadoEm": "data e hora em UTC, formato ISO 8601"
}
```

- O fluxo deve responder com HTTP 2xx. Qualquer outra resposta é mostrada ao usuário como falha, sem perda do texto digitado.
- **Pendente de decisão:** o fluxo envia a sugestão por e-mail, por Planner ou por item em lista de triagem? A escolha define se a equipe responde ao solicitante e onde a sugestão fica registrada.
- **Pendente de decisão:** incluir o e-mail do solicitante no corpo. A versão atual inclui nome e e-mail para permitir resposta; se a equipe não precisar, remova o campo `email` em `buildSuggestionPayload`.

## Responsabilidades

- SPFx (web part FAQ): leitura, acordeão, link direto, busca, formulário de pergunta, reordenação e envio da sugestão, sempre com a sessão do usuário.
- SharePoint: armazenamento e índice de `Ordem` na lista.
- Power Automate: recebe o gatilho HTTP da sugestão e encaminha à equipe. Não atualiza a lista.
- Agentes de IA: não previstos nesta versão.

## Acesso

- Criar, editar, excluir e ordenar perguntas aparecem somente para quem tem **Controle Total** na lista **e** pertence a um grupo do perfil **Administradores** do ambiente ativo.
- Usuários sem essa permissão veem apenas as perguntas e podem enviar sugestões, quando habilitadas.
- **Pendente de decisão:** os grupos de Administradores HML e PROD não são criados por este script. Confirme quem fará parte.
- O script não cria grupos, não concede permissões e não envia sugestões.

## Ambientes

- HML: criação da lista, dos campos e do índice de `Ordem`, com o rótulo de Pergunta.
- PROD: criação com a mesma definição, em `apply`, somente se `createInProd` estiver `true` e o HML não tiver erro nem divergência na mesma execução. Nunca exclui nem altera recursos existentes.
- Lista já criada com `Resposta` em texto simples: o script aponta a divergência e não altera a coluna. Ajustar o tipo nas configurações da lista e validar de novo.

## Recursos fora desta versão (sugeridos)

- **Votação de utilidade** ("Esta resposta foi útil? Sim / Não"): exige colunas de contagem na lista e gravação por usuário, para não contar o mesmo voto duas vezes. Recomendado para a próxima versão, com a decisão sobre quem pode votar e se o voto é único por usuário.
- Busca no servidor: a versão atual pesquisa nas perguntas já carregadas. Com mais de 500 perguntas, a busca deve passar a consultar o servidor.

## Pontos de validação

1. O nome `Carreiras - FAQ` está correto?
2. A ordenação padrão deve ser "Ordem definida", com "Pergunta (A a Z)" como alternativa?
3. O fluxo de sugestão encaminha a qual equipe e por qual canal?
4. Perguntas podem ser ocultadas sem exclusão (campo "Ativo")? Não incluído nesta versão.
5. Votação de utilidade entra nesta entrega ou na próxima?
