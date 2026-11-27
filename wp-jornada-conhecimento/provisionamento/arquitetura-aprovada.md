# Jornada de Conhecimento — arquitetura de dados (schema v1)

Site: https://<tenant>.sharepoint.com/sites/<nome-do-site> (HML e PROD no mesmo site, separados por prefixo).
Fonte: `jornada-conhecimento/definicao.json` (cópia em `definicao.json` nesta pasta). Escopo: `jornada-conhecimento/escopo.md`.

## Estruturas

| Nome PROD | Nome HML | Tipo | Criada por | Finalidade |
|---|---|---|---|---|
| `[prefixo PROD]JornadaAreas` | `[prefixo HML]JornadaAreas` | Lista (100, versionamento) | Script de Console | Cadastro das áreas e IDs dos grupos |
| `[prefixo PROD]<SIGLA>_Jornadas` | `[prefixo HML]<SIGLA>_Jornadas` | Lista (100, versionamento, aprovação de conteúdo) | Web part (aba Administração) | Jornadas da área |
| `[prefixo]<SIGLA>_Etapas` | idem | Lista (100, versionamento) | Web part | Etapas de cada jornada |
| `[prefixo]<SIGLA>_Matriculas` | idem | Lista (100, versionamento, lê e edita só os próprios) | Web part | Progresso individual |
| `[prefixo]<SIGLA>_Curtidas` | idem | Lista (100, edita só os próprios) | Web part | Curtidas por etapa |
| `[prefixo]<SIGLA>_Avaliacoes` | idem | Lista (100, versionamento, edita só os próprios) | Web part | Nota e comentário por jornada |
| `[prefixo]<SIGLA>_Conteudos` | idem | Biblioteca (101, versionamento) | Web part | Vídeos e documentos da área |

## Campos

### JornadaAreas
| Nome interno | Rótulo | Tipo | Índice | Regra |
|---|---|---|---|---|
| Title (nativo) | Nome da área | Texto | Não | Obrigatório na WP |
| Sigla | Sigla | Texto | Sim | Única (validada na WP); letras e números, usada nos nomes de grupos e listas |
| Cor | Cor | Texto | Não | Hexadecimal |
| Icone | Ícone | Texto | Não | Nome do ícone Fluent UI |
| Status | Status | Texto | Sim | `Provisionando`, `Ativa`, `Erro`, `Arquivada` |
| MensagemErro | Mensagem de erro | Texto longo | Não | Diagnóstico do provisionamento |
| GrupoGestoresId, GrupoApoioId, GrupoUsuariosId | IDs dos grupos | Número | Não | Preenchidos pela WP |

### `<SIGLA>_Jornadas`
| Nome interno | Rótulo | Tipo | Índice | Regra |
|---|---|---|---|---|
| Title (nativo) | Nome da jornada | Texto | Não | Obrigatório |
| Descricao | Descrição | Texto longo | Não | Sem formatação |
| Capa | Capa (URL da imagem) | Texto longo | Não | URL https ou da biblioteca da área |
| Categoria | Categoria | Texto | Sim | |
| PublicoEspecifico | Público específico (JSON) | Texto longo | Não | Vazio = todos da área. **Dado pessoal** (pessoas e grupos) |
| Obrigatoria, OrdemLivre, EmiteCertificado | — | Sim/Não | Não | |
| PrazoDias | Prazo (dias) | Número | Não | |
| ModeloCertificado | Modelo de certificado | Texto | Não | Gancho da fase 4 |
| Status | Status | Texto | Sim | `Rascunho`, `Publicada`, `Arquivada` |
| DataPublicacao | Data de publicação | Data | Sim | |

### `<SIGLA>_Etapas`
| Nome interno | Rótulo | Tipo | Índice | Regra |
|---|---|---|---|---|
| Title (nativo) | Nome da etapa | Texto | Não | |
| JornadaId | ID da jornada | Número | Sim | Relaciona com Jornadas |
| Ordem | Ordem | Número | Não | Ordenação na memória (até ~50 etapas por jornada) |
| Tipo | Tipo | Texto | Não | `YouTube`, `Video`, `Documento`, `Link` |
| Url | URL do conteúdo | Texto longo | Não | |
| DuracaoMin | Duração (min) | Número | Não | |
| Instrucoes | Instruções | Texto com formatação | Não | Sanitizado na WP |
| RegraConclusao | Regra de conclusão | Texto | Não | `Manual`, `PercentualAssistido`, `AbrirConteudo` |
| PercentualMinimo | Percentual mínimo | Número | Não | Usado com `PercentualAssistido` |

### `<SIGLA>_Matriculas` (dado pessoal)
| Nome interno | Rótulo | Tipo | Índice | Regra |
|---|---|---|---|---|
| Title (nativo) | Chave (jornada-usuário) | Texto | Sim | `<JornadaId>-<IdUsuario>`; uma por pessoa e jornada |
| Author (nativo) | Usuário | Pessoa | Sim | Quem criou = dono da matrícula |
| JornadaId | ID da jornada | Número | Sim | |
| EtapaAtualId | ID da etapa atual | Número | Não | Continuar de onde parei |
| ProgressoEtapas | Progresso por etapa (JSON) | Texto longo | Não | Por etapa: status, posição (s), percentual assistido, conclusão |
| PercentualConcluido | Percentual concluído | Número | Não | |
| Status | Status | Texto | Sim | `EmAndamento`, `Concluida` |
| DataInicio, UltimoAcesso, ConcluidaEm | — | Data | Não | |
| CertificadoEmitido | Certificado emitido | Sim/Não | Não | Fase 4 |

### `<SIGLA>_Curtidas`
| Nome interno | Rótulo | Tipo | Índice | Regra |
|---|---|---|---|---|
| Title (nativo) | Chave (etapa-usuário) | Texto | Sim | `<EtapaId>-<IdUsuario>`; impede curtida dupla |
| Author (nativo) | Usuário | Pessoa | Sim | |
| EtapaId, JornadaId | — | Número | Sim | |

### `<SIGLA>_Avaliacoes` (dado pessoal)
| Nome interno | Rótulo | Tipo | Índice | Regra |
|---|---|---|---|---|
| Title (nativo) | Chave (jornada-usuário) | Texto | Sim | Uma avaliação por pessoa e jornada |
| Author (nativo) | Usuário | Pessoa | Sim | |
| JornadaId | ID da jornada | Número | Sim | |
| Nota | Nota (1 a 5) | Número | Não | |
| Comentario | Comentário | Texto longo | Não | Até 1.000 caracteres (validado na WP) |
| Oculto | Oculto | Sim/Não | Não | Moderação pelo Gestor |

## Consultas previstas

| Tela | Lista | Filtro (índice) | Volume máximo por consulta |
|---|---|---|---|
| Detecção de perfil | JornadaAreas | Status (itens já restritos por área) | ~50 |
| Minhas Jornadas | `_Jornadas` | Status | ~30 por área |
| Minhas Jornadas, player | `_Matriculas` | Author = usuário atual | ~30 por área |
| Player | `_Etapas` | JornadaId | ~50 |
| Curtidas da etapa | `_Curtidas` | EtapaId | até ~4.000 (área Geral), paginado |
| Avaliações da jornada | `_Avaliacoes` | JornadaId | até ~4.000 (área Geral), paginado |
| Gestão, mapa de calor | `_Matriculas` | JornadaId | até ~4.000 por jornada, paginado |

Todas as consultas usam `select` explícito, `top` e paginação (skill `sharepoint-dados-listas`).

## Permissões por área (aplicadas pela web part)

| Objeto | Administradores | Gestores | Apoio | Usuários |
|---|---|---|---|---|
| Item da área em JornadaAreas | Controle total | Leitura | Leitura | Leitura |
| `_Jornadas` | Controle total | Contribuir e Aprovar | Contribuir | Leitura |
| `_Etapas`, `_Conteudos` | Controle total | Contribuir | Contribuir | Leitura |
| `_Matriculas` | Controle total | Gestor da área | Contribuir | Contribuir |
| `_Curtidas` | Controle total | Contribuir | Contribuir | Contribuir |
| `_Avaliacoes` | Controle total | Gestor da área | Contribuir | Contribuir |

- Grupos: `[prefixo]Jornadas – Administradores` e, por área, `[prefixo]Jornadas – <SIGLA> – Gestores | Apoio | Usuários`.
- Proprietários: Gestores pertence aos Administradores; Apoio e Usuários pertencem aos Gestores.
- Níveis personalizados: *Contribuir e Aprovar* (Contribuir + Aprovar itens) e *Gestor da área* (Contribuir + Gerenciar listas).
- Validação pendente em HML: leitura de todas as matrículas pelo Gestor (escopo, seção 7, item 1).
