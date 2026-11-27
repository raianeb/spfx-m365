# Escopo — jornada-de-conhecimento

**Status:** Aprovado
**Responsável:** raianeb
**Data:** 2026-11-27
**Base:** "Hub de Aprendizagem – Especificação da Web Part SPFx" (documento inicial; o projeto passou a se chamar **Jornada de Conhecimento**). Este escopo mantém o que foi pedido e definido lá e registra, na seção 5, os ajustes decididos na descoberta (volume, ambientes e uso mínimo de Power Automate).

## 1. Problema e resultado esperado
**O que foi pedido**
- Web part SPFx no SharePoint para treinamentos em sequência, chamados **Jornadas** (o termo "trilha" não é usado na interface nem nos nomes técnicos).
- Conteúdos: vídeos do YouTube embutidos, vídeos próprios da biblioteca, documentos e links.
- Cada conteúdo é marcado como concluído, e o usuário retoma exatamente da etapa e da posição em que parou.
- Acompanhamento pelo próprio usuário (o que fez e o que concluiu) e pelo gestor (o que a equipe está fazendo).
- Interface simples, amigável e completa, sobre listas, bibliotecas e grupos de permissão **nativos** do SharePoint.
- Curtir materiais, avaliar e comentar jornadas.
- Certificado ao concluir, integrado à solução existente, numa fase posterior.

**Nome e navegação:** "Jornada de Conhecimento" é o título da web part. Abas: Minhas Jornadas, Gestão da Área, Estúdio e Administração. Cada pessoa vê só as abas do seu perfil, sem aba vazia ou bloqueada.

**Situação atual e métrica de sucesso:** não informadas (seção 7).

## 2. Usuários e perfis
Quatro perfis, cada um um grupo nativo do SharePoint. O Administrador é global; os demais existem por área.

| Perfil | Grupo do SharePoint | Quantidade aproximada | Papel na solução |
|---|---|---|---|
| Administrador | `Jornadas – Administradores` | poucos | Cria áreas e indica gestores, troca gestores, arquiva, vê e edita tudo |
| Gestor da área | `Jornadas – <SIGLA> – Gestores` | poucos por área | Vê tudo da área, acompanha todos, inclui e remove pessoas de Apoio e Usuários, cria, aprova e publica jornadas, modera comentários |
| Equipe de apoio | `Jornadas – <SIGLA> – Apoio` | poucos por área | Cria e edita jornadas, etapas e conteúdos; envia para publicação; vê só indicadores agregados |
| Usuário | `Jornadas – <SIGLA> – Usuários` | até 200 por área; área **Geral** com ~4.000 | Faz as jornadas publicadas, curte, avalia e comenta |

- **Volume:** 3 áreas no início, projetado para ~50; até ~30 jornadas por área.
- **Área Geral:** todos os colaboradores. O grupo de Usuários aceita grupos do Entra ID/M365 (ex.: "Todos, exceto usuários externos").
- **Perfis acumulam:** Gestora em FIN e Usuária em TI vê a Gestão só de FIN e só consome as jornadas de TI. Não enxerga painel nem dados de área em que não é Gestora.
- **Inclusão de pessoas:** o grupo de Gestores é o proprietário nativo dos grupos de Apoio e Usuários; o gestor inclui alguém pela web part, com o próprio acesso, e a pessoa entra no grupo na hora.
- **Gestores definidos pelo Administrador:** o grupo de Gestores pertence ao grupo `Jornadas – Administradores`.
- Gestores, Apoio e Administradores fazem as jornadas da própria área sem estar em Usuários. Para outra área, precisam estar no grupo Usuários dela.

## 3. Escopo funcional da primeira entrega
A entrega cobre as fases 1 a 3 do roteiro do documento inicial (provisionamento e web part). A fase 4 fica fora.

| Fase | Entrega |
|---|---|
| 1 – Fundação | Script de provisionamento da lista central (HML e PROD); aba **Administração**: preparar o site (grupo de Administradores do ambiente, pelo proprietário do site), criar área (grupos, listas, biblioteca e permissões), trocar gestores, reprocessar, arquivar e visão geral |
| 2 – Consumo | **Minhas Jornadas** (saudação, números rápidos, Continuar de onde parei, filtro por área em chips, abas Para mim, Em andamento e Concluídas, cards com capa, progresso, duração, nota, Obrigatória e prazo); **player** (linha do tempo, conteúdo embutido, curtir, Concluir etapa, Próxima etapa, aba Avaliações, salvamento a cada 15 s e ao sair); curtidas e avaliações |
| 3 – Gestão | **Estúdio** (lista de jornadas com status, conclusão, nota e curtidas por etapa; editor em passos: Dados gerais, Etapas, Público, Regras, Enviar ou Publicar; pré-visualização); **Gestão da Área** (painel, mapa de calor pessoas × jornadas com detalhe por etapa, Pessoas, Aprovações com Publicar e Devolver com comentário, exportar e lembrete aos atrasados) |

### Regras de negócio (do documento inicial)
- **Atribuição:** ao publicar, a jornada vale para todos os Usuários da área ou só para o Público específico.
- **Pessoa nova na área:** passa a ver as jornadas publicadas da área assim que entra no grupo.
- **Pessoa removida da área:** o histórico de matrículas fica preservado e sai dos indicadores.
- **Progresso:** concluir uma etapa atualiza o progresso, recalcula o percentual e avança a etapa atual; com 100%, a matrícula fica Concluída.
- **Ordem:** com Ordem livre desmarcada, a próxima etapa só libera após a anterior.
- **Prazo:** data limite = data de referência + PrazoDias; vencida sem conclusão, a jornada aparece como Atrasada (data de referência: seção 7).
- **Jornada alterada depois de publicada:** quem concluiu mantém a conclusão, e a etapa nova aparece como novidade opcional; quem está em andamento recebe a etapa normalmente.
- **Curtir:** um clique curte, outro descurte; uma curtida por pessoa por etapa; contador visível para a área.
- **Avaliar:** 1 a 5 estrelas, liberado após concluir ao menos metade das etapas; a nota pode ser alterada. A tela de conclusão abre o card de avaliação.
- **Comentar:** opcional, até 1.000 caracteres, com nome, foto e data; o autor edita ou exclui; o Gestor oculta.
- **Arquivar área:** as jornadas saem da tela dos usuários; dados e histórico ficam preservados; grupos só são excluídos por ação explícita do Administrador.
- **Apoio sem dados individuais:** vê conclusão, nota e curtidas agregadas, sem o progresso de cada pessoa.

**Fora desta entrega:**
- Fase 4: certificados (integração com a solução existente), notificações e relatórios avançados. Os campos de gancho já entram no modelo: `EmiteCertificado` e `ModeloCertificado` na Jornada, `CertificadoEmitido` na Matrícula.
- Regras de LGPD (retenção e anonimização), para um segundo momento.

## 4. Dados e integrações
- **Origem dos dados:** listas e biblioteca do SharePoint, no mesmo site para HML e PROD, separadas por prefixo configurável por instância da web part (padrão do repositório).
- **Modelo de dados:** colunas do documento inicial (seção 4), com os ajustes da seção 5 deste escopo:
  - **Áreas** (central): Title, Sigla (única), GestoresIndicados, IDs dos três grupos, Cor, Icone, Status (Provisionando, Ativa, Erro, Arquivada), MensagemErro.
  - **Jornadas:** Title, Descricao, Capa, Categoria, PublicoEspecifico, Obrigatoria, PrazoDias, OrdemLivre, EmiteCertificado, ModeloCertificado, Status (Rascunho, Publicada, Arquivada), DataPublicacao.
  - **Etapas:** Jornada, Ordem, Tipo, Url, DuracaoMin, Instrucoes, RegraConclusao, PercentualMinimo.
  - **Matrículas:** Title (`IdJornada-IdUsuario`), Usuario, Jornada, EtapaAtual, ProgressoEtapas (JSON por etapa: status, posição em segundos, percentual assistido, conclusão), PercentualConcluido, Status (EmAndamento, Concluida, Inativa), DataInicio, ConcluidaEm, CertificadoEmitido. Histórico de versões ligado (auditoria).
  - **Curtidas:** Title (`IdEtapa-IdUsuario`), Etapa, Jornada, Usuario.
  - **Avaliações:** Title (`IdJornada-IdUsuario`), Jornada, Usuario, Nota, Comentario, Oculto.
  - **Conteúdos de Jornadas** (biblioteca): vídeos e documentos de apoio.
- **Criação, edição ou consulta:** a web part cria e edita os dados com a permissão do próprio usuário.
- **Integrações:** APIs REST do SharePoint (PnPjs); lembretes por `SP.Utilities.Utility.SendEmail`. Power Automate só onde a web part não consegue fazer (seção 5).
- **Dados pessoais:** progresso individual, curtidas, avaliações e comentários com nome e foto. LGPD em segundo momento.

## 5. Plataforma e solução técnica
- **Onde será usada:** SharePoint Online, páginas modernas.
- **Solução:** web part SPFx 1.24.1, React 18.3.1, Fluent UI 8 e PnPjs, nas versões de `spfx-skills/docs/versoes-referencia.md`, na pasta `wp-jornada-de-conhecimento/`. Serviços do documento inicial: PerfilService, AreaService, JornadaService, EtapaService, MatriculaService (gravação com debounce), EngajamentoService (atualização otimista) e PlayerAdapters (YouTube, Biblioteca, Documento, Link).
- **Princípios mantidos:** recursos nativos primeiro; uma web part com quatro visões; progresso salvo sempre; simples na frente, completo por trás; segurança aplicada pelo SharePoint (a web part só filtra por conveniência).

### Ajustes em relação ao documento inicial
O documento inicial usa listas únicas com pasta por área, matrículas com permissão exclusiva e fluxos com conta de serviço para tudo que exige privilégio. Com o volume informado e a diretriz de usar Power Automate só quando indispensável:

| Ponto | Documento inicial | Neste escopo | Motivo |
|---|---|---|---|
| Isolamento das áreas | Listas únicas, uma pasta por área | **Listas por área** (`<prefixo><SIGLA>_Jornadas`, `_Etapas`, `_Matriculas`, `_Curtidas`, `_Avaliacoes`, `_Conteudos`) + lista central Áreas | Permissão no nível da lista, sem quebrar pastas; listas menores; cada área nasce com estrutura própria, como sugerido na descoberta. Minhas Jornadas consulta em lote só as áreas do usuário |
| Provisionamento da área | Fluxo "Provisionar Área" com conta de serviço | **A própria web part**, executada pelo Administrador (Controle Total no site), com os mesmos passos, Status e Reprocessar idempotente | O Administrador já tem a permissão necessária; dispensa o fluxo |
| Trocar gestores | Fluxo sincroniza o grupo | **Web part**, pelo Administrador (proprietário do grupo de Gestores) | Recurso nativo de proprietário de grupo |
| Matrículas | Criadas pelo fluxo na publicação, com permissão exclusiva por item | **Criadas pelo usuário ao abrir a jornada**, sem permissão por item; lista configurada para cada um ler e editar só os próprios itens; Gestores leem todas | A área Geral chegaria a ~120 mil matrículas, acima do limite de 50 mil itens com permissão exclusiva por lista |
| Quem nunca abriu, Atribuida, Atrasada | Matrículas pré-criadas e fluxo diário | **Calculados na tela:** membros do grupo × jornadas publicadas, menos as matrículas existentes; atraso pela data de referência + PrazoDias | Dispensa os fluxos Criar Matrículas e Rotina diária |
| Contadores (curtidas, nota média, conclusões) | Desnormalizados por fluxo | **Calculados pela web part**, com consultas por coluna indexada e cache em sessionStorage | O usuário não edita Jornadas e Etapas; dispensa o fluxo Contadores |
| Moderação | Pedido na Fila, fluxo marca Oculto | **Gestor marca Oculto direto** (nível padrão Editar na lista Avaliações) | Dispensa o fluxo Moderar |
| Fila de Solicitações | Lista central | **Removida** | Nada da entrega exige privilégio fora do perfil |
| Detecção de perfil | `currentuser/groups` comparado por ID | **Áreas visíveis** (item da área restrito aos seus grupos) **+ permissões efetivas** nas listas da área, em lote | Funciona com grupos do Entra ID dentro dos grupos do SharePoint (área Geral) |

**Power Automate:** nenhum fluxo na primeira entrega. Previsto para a fase 4 (certificados) e como plano B dos itens 1 e 4 da seção 7.

### Permissões por área
| Objeto | Administradores | Gestores | Apoio | Usuários |
|---|---|---|---|---|
| Item da área em Áreas | Controle total | Leitura | Leitura | Leitura |
| `_Jornadas` (Aprovação de Conteúdo; rascunho visível a quem aprova e ao autor) | Controle total | Design (inclui Aprovar itens) | Contribuir | Leitura (só aprovadas) |
| `_Etapas` e `_Conteudos` | Controle total | Contribuir | Contribuir | Leitura |
| `_Matriculas` (lê e edita só os próprios) | Controle total | Editar (lê todas) | Contribuir (só as próprias) | Contribuir (só as próprias) |
| `_Curtidas` (edita só as próprias) | Controle total | Contribuir | Contribuir | Contribuir |
| `_Avaliacoes` (edita só as próprias) | Controle total | Editar (modera) | Contribuir | Contribuir |

- **Somente níveis de permissão padrão do SharePoint** (Controle Total, Design, Editar, Contribuir, Leitura). Nenhum nível personalizado é criado.
  - **Design** na lista Jornadas, para o Gestor aprovar: é o menor nível padrão com *Aprovar itens* fora de sites de publicação.
  - **Editar** em Matrículas e Avaliações, para o Gestor ler todas as matrículas e moderar: inclui *Gerenciar listas*, que libera a leitura e a edição de itens de outras pessoas nessas listas.
  - Efeito colateral aceito: com Design e Editar, o Gestor também consegue alterar as configurações daquelas listas da própria área. A web part não oferece essa ação.
- Grupos de HML e PROD levam o prefixo do ambiente no nome, para conviverem no mesmo site.

### Alternativas consideradas
- **Documento inicial (pastas por área + fluxos):** uma consulta só no Minhas Jornadas e relatórios numa lista, mas quebra permissão em pastas, depende de conta de serviço e fluxos e esbarra no limite de permissões exclusivas nas matrículas da área Geral.
- **Mista (listas por área + fluxos só para matrículas protegidas):** isolamento total do progresso individual, mas reintroduz o limite na área Geral e a manutenção de fluxos.

### Exceção aprovada às regras do `spfx-skills`
As skills não foram alteradas. Neste projeto, por decisão do responsável:
- **Administrador:** pela web part, cria os grupos do SharePoint (Administradores e os grupos de cada área) e as listas e biblioteca da área, e gere as permissões delas, sempre com níveis de permissão padrão do SharePoint.
- **Gestor da área:** pela web part, inclui e remove membros dos grupos de Apoio e Usuários da própria área (grupos dos quais o grupo de Gestores é proprietário).
- **Sempre com o usuário logado:** cada ação usa a sessão e as permissões de quem está na tela. Sem conta de serviço, fluxo ou elevação de privilégio. A web part confere o acesso antes de oferecer a ação, e o SharePoint recusa o que a pessoa não pode fazer.
- **Pasta única:** escopo e definição ficam dentro de `wp-jornada-de-conhecimento/` (`docs/escopo.md` e `provisionamento/definicao.json`, fonte única), e não na pasta `<nome>/` separada que o `/iniciar-projeto` cria.
- O script de Console segue a regra do `sharepoint-provisionamento`: cria só a lista central, sem grupos nem permissões.

## 6. Operação
- **Manutenção:** equipe M365.
- **Ambientes:** HML e PROD no mesmo site. Padrão de nomes: HML = `HML_<Nome>`, PROD = `<Nome>`, para listas, bibliotecas e grupos (ex.: `HML_FIN_Jornadas`, `HML_Jornadas – FIN – Gestores`). Os prefixos continuam configuráveis na web part e no script (regra do `spfx-skills`), com esse padrão já preenchido na web part. A propriedade Ambiente define se a web part consome PROD ou HML.
- **Implantação:** pacote `.sppkg` no catálogo; estrutura central pelo script de Console em `wp-jornada-de-conhecimento/provisionamento/`; estrutura de cada área pela aba Administração.
- **Conta de serviço:** já existe; só será usada se algum fluxo se tornar necessário.
- **Riscos e forma de validação:**
  - Número de listas no site (~6 por área; ~600 com 50 áreas em HML e PROD): monitorar a página Conteúdo do site e, se preciso, mover o HML para outro site.
  - Consultas acima de 5.000 itens na área Geral: todas filtram por coluna indexada; teste de carga em HML.

## 7. Em aberto
| Item | Quem decide | Como validar |
|---|---|---|
| 1. O nível padrão Editar (com Gerenciar listas) permite ao Gestor ler todas as matrículas numa lista configurada para "ler só os próprios itens" | Equipe M365 | Teste em HML com dois usuários e um gestor. Plano B: matrículas protegidas por item via fluxo |
| 2. **Publicação:** passa pelo Gestor (Aprovação de Conteúdo) ou o Apoio pode publicar sozinho. Pendente desde o documento inicial | Responsável | Decisão de negócio; o escopo considera aprovação pelo Gestor |
| 3. Data de referência do prazo: publicação da jornada ou entrada da pessoa na área | Responsável | Decisão de negócio |
| 4. Contadores calculados na tela atendem a área Geral com bom tempo de resposta | Equipe M365 | Teste de carga em HML. Plano B: contadores por fluxo |
| 5. Posição do vídeo da biblioteca: player HTML5 com o arquivo da biblioteca (o player do Stream não expõe a posição) | Equipe M365 | Teste em HML com MP4 grande |
| 6. Lembretes por `SendEmail`: alcance para membros de grupos do Entra ID e limites de envio | Equipe M365 | Teste em HML |
| 7. Exportação: CSV (sem biblioteca) ou Excel `.xlsx` (aumenta o pacote) | Responsável | Decisão de uso |
| 8. Situação atual e métrica de sucesso | Responsável | Registrar antes da implantação em PROD |
| 9. LGPD: retenção e anonimização do progresso e dos comentários | Responsável e jurídico | Segundo momento |
| 10. Verificação do ambiente local (`verificar-ambiente.ps1`) | Desenvolvedora | Rodar antes da geração de código |
| 11. Configurações de lista pela API REST com a sessão do Administrador: "ler e editar só os próprios itens" (`ReadSecurity`/`WriteSecurity`), aprovação de conteúdo e visibilidade de rascunho | Equipe M365 | Criar uma área em HML e conferir as configurações de cada lista. Se a API recusar, a área fica com Status Erro e a mensagem indica o passo |

## 8. Aprovação
- [x] Escopo revisado pelo responsável
- [x] Escopo aprovado pela liderança técnica
