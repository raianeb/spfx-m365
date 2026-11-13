# Framework de padronização

## Abordagem
Construção incremental. Cada etapa adiciona uma camada e é validada antes da próxima.

| Etapa | Escopo | Status |
|---|---|---|
| 1 | Estrutura de skills SPFx em português, baseada na referência (`docs/fontes.md`) | Concluída |
| 2 | Padrões internos da equipe incorporados às skills SPFx | Aguardando orientações da equipe |
| 3 | Processo de início de projeto (`/iniciar-projeto`) ligado às skills | Concluída (escopo na raiz do repositório) |
| 4 | Provisionamento por Console (`sharepoint-provisionamento`, `/provisionar-estrutura`) | Skill e template criados; geração de projeto real pendente de teste em HML |
| 4b | Skill de dados de listas (`sharepoint-dados-listas`): modelagem, índices e consultas | Criada; integração com as skills de código e provisionamento em revisão |
| 4c | Skills de Power Automate e Microsoft Graph | Pendente |
| 5 | Checklist de entrega e critérios de qualidade | Pendente |

## Regras de uso das skills
1. Em qualquer tarefa SPFx, carregar `skills/spfx-hub-ux` primeiro.
2. Carregar apenas as skills que a tarefa exige.
3. Citar as skills aplicadas nos comentários de código e na descrição de PR.
4. Quando uma regra da skill conflitar com o pedido do usuário, sinalizar o conflito antes de implementar.
