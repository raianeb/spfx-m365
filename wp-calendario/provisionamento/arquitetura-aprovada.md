# Calendário — arquitetura de dados (schema v1)

Site: https://<tenant>.sharepoint.com/sites/<nome-do-site>
Status: **proposta para validação.** Os scripts desta pasta só devem ser executados em `apply` após a validação desta arquitetura.

## Estruturas

| Nome PROD | Nome HML | Tipo | Finalidade |
|---|---|---|---|
| Calendario | HML_Calendario | Lista (modelo 100, sem versionamento) | Eventos e reuniões exibidos pela WP de calendário |

Não há bibliotecas nem listas auxiliares nesta versão. Tipo é uma escolha fixa, e não um cadastro próprio.

## Campos da lista

| Nome interno | Rótulo | Tipo | Índice | Regra |
|---|---|---|---|---|
| Title (nativo) | Assunto | Texto (255) | Não | Obrigatório na WP. Rótulo ajustado para "Assunto", como no Outlook. |
| Local | Local | Texto (255) | Não | Opcional. Não é filtrado. |
| DataInicio | Início | Data e hora | **Simples** | Obrigatório. Início do evento; para dia inteiro, 00:00 do primeiro dia. |
| DataFim | Término | Data e hora | **Simples** | Obrigatório. Término do evento; para dia inteiro, 23:59:59 do último dia. Não pode ser anterior ao início (validado na WP). |
| DiaInteiro | Dia inteiro | Sim/Não (padrão Não) | Não | Controla os campos de hora do formulário e a exibição "Dia inteiro". |
| Descricao | Descrição | Texto de várias linhas (6 linhas, sem rich text) | Não | Texto simples, com quebras de linha. Não é indexável. |
| Organizador | Organizador | Texto (255) | Não | Opcional. Informação exibida, não filtrada. |
| Tipo | Tipo | Escolha (Reunião, Evento, Treinamento, Lembrete) | Não | Escolha simples, sem Lookup. Opções fixas nesta versão. |

Os campos de data são os únicos indexados, porque são os únicos usados nos filtros e na ordenação.

## Consulta principal

A WP consulta apenas o período exibido (dia, semana ou mês, com 42 dias na grade do mês):

```
DataInicio lt <fim do período> and DataFim gt <início do período>
$orderby=DataInicio asc   $top=500
```

Esse filtro retorna todos os eventos que intersectam o período. Ele usa os dois índices de data. Um evento que começa antes do período e termina dentro dele aparece, o que é o comportamento esperado de um calendário.

| Consulta | Campos | Índice | Observação |
|---|---|---|---|
| Eventos do período exibido | `DataInicio` e `DataFim` | `DataInicio` e `DataFim` (simples) | Intervalo; cada visualização consulta apenas o seu período. |
| Ordenação dos eventos | `DataInicio` | `DataInicio` | Mesmo índice do filtro. |

Índice composto não foi criado. Uma consulta composta por `DataInicio` e `DataFim` não tem ganho claro sobre os dois índices simples nesse volume, e a estrutura fica mais simples de manter. Se a lista passar de alguns milhares de eventos, avaliar um índice composto com o volume real.

Limite de 500 eventos por período. Um mês comum fica muito abaixo disso; se o limite for atingido, a WP passa a mostrar um aviso (a implementar nas próximas iterações).

## Relacionamentos

Nenhum. A lista não usa Lookup nem Pessoa/Grupo. O organizador é texto, e o tipo é escolha. Isso mantém as consultas simples e elimina junções automáticas.

## Responsabilidades

- SPFx (web part Calendário): leitura por período, visualizações, formulário de evento, detalhes em modal e criação, edição e exclusão para administradores, sempre com a sessão do usuário.
- SharePoint: armazenamento, índices e permissões da lista.
- Power Automate: **nenhum fluxo necessário para o escopo atual.** Lembretes e notificações por e-mail, se forem necessários depois, devem ser especificados em outra versão.
- Agentes de IA: não previstos nesta versão. Se houver agentes no futuro, o desenvolvimento deve ocorrer na plataforma AIRIA, com integração via API.

## Acesso

- Criar, editar e excluir eventos aparece somente para quem tem **Controle Total** na lista **e** pertence a um grupo do perfil **Administradores** do ambiente ativo (configurado nas propriedades da WP).
- Usuários sem essa permissão veem os eventos, mas não os controles de alteração.
- **Pendente de decisão:** os grupos de Administradores HML e PROD não são criados por este script (mesmo padrão dos demais projetos).
- O script não cria grupos nem concede permissões.

## Ambientes

- HML: criação da lista, dos campos e dos índices.
- PROD: criação com a mesma definição, em `apply`, somente se `createInProd` estiver `true` e o HML não tiver erro nem divergência na mesma execução. Nunca exclui nem altera recursos existentes.
- GUIDs e registros podem diferir entre os ambientes; a paridade é estrutural.

## Pontos de validação

1. O nome `Calendario` está correto? (Pode ser "Calendário" com acento, se a equipe preferir.)
2. A lista de tipos (Reunião, Evento, Treinamento, Lembrete) está correta? Ela é fixa nesta versão.
3. Eventos recorrentes (repetir diariamente, semanalmente) não estão previstos nesta versão. Confirme se são necessários já.
4. Participantes e convites não estão previstos. Se forem necessários, a coluna de pessoas (múltipla) exige uma decisão de desempenho antes da criação.
5. Os grupos HML devem ser criados separadamente do acesso de PROD?
6. O limite de 500 eventos por período atende ao volume esperado?
