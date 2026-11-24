# Extensão padrão da skin — `ex-layout-sharepoint`

Pacote pronto da skin de layout, usado quando o `/iniciar-projeto` (ou a skill `spfx-skin-layout`, seção 0) recebe **Sim** para "Utilizar a extensão padrão?". O arquivo é copiado para a pasta do projeto, sem build.

| Item | Valor |
|---|---|
| Arquivo | `ex-layout-sharepoint.sppkg`, nesta pasta |
| Status | **Pendente:** o pacote ainda não foi adicionado. Enquanto o arquivo não existir, a opção "extensão padrão" informa a falta e para |
| Versionamento | Exceção no `.gitignore` da raiz (`*.sppkg` é ignorado nos projetos) |
| Ícones no menu | Não usa |
| Implantação | "Adicionado a todos os sites" (skill, seção 13) |

## Versão atual
| Versão da solução | Data | SHA-256 | ComponentId | Responsável |
|---|---|---|---|---|
| a preencher | a preencher | a preencher | a preencher | a preencher |

O SHA-256 é conferido antes da cópia. Para calcular no Windows:

    Get-FileHash .\ex-layout-sharepoint.sppkg -Algorithm SHA256

## Propriedades aceitas (*Component Properties*)
Configuradas na entrada da lista **Tenant Wide Extensions** do catálogo de aplicativos do tenant, não no pacote. Conferir com o `ClientSideInstance.xml` do pacote a cada atualização e manter esta lista em dia.

| Propriedade | Padrão | Observação |
|---|---|---|
| a preencher | — | Referência: skill `spfx-skin-layout`, seção 12 (confirmar quais o pacote aceita) |

## Diferenças conhecidas em relação à skill
A skill descreve a nova extensão. A extensão padrão foi construída antes desta revisão e pode diferir; registre aqui cada diferença confirmada.

| Ponto | Skill | Extensão padrão |
|---|---|---|
| Menu lateral | Menu próprio, montado pela API (seção 5) | Reaproveita o menu vertical nativo quando ele existe (documentação de origem do padrão de navegação). Confirmar |

## Como atualizar o pacote
1. Gere o novo `.sppkg` no projeto `ex-layout-sharepoint`, com a versão incrementada.
2. Substitua o arquivo desta pasta, mantendo o nome.
3. Atualize a tabela "Versão atual" (versão, data, SHA-256, ComponentId) e, se mudaram, as propriedades e as diferenças.
4. Abra um PR com as três mudanças juntas.
5. No catálogo do tenant, envie a nova versão **sem** marcar "adicionar a todos os sites" (marcar de novo duplica a entrada na lista Tenant Wide Extensions).
