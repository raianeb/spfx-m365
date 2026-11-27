// Skills aplicadas: sharepoint-dados-listas (nomes internos, índices, versionamento), spfx-codigo-performance,
// spfx-implementacao-base. Exceção aprovada no escopo: o Administrador cria grupos, listas e permissões pela
// web part, com a própria sessão. Somente níveis de permissão padrão do SharePoint.
import { SPFI } from '@pnp/sp';
import { IFieldInfo } from '@pnp/sp/fields';
import { IList } from '@pnp/sp/lists';
import { IItem } from '@pnp/sp/items';
import { ISiteGroupInfo } from '@pnp/sp/site-groups';
import { ISiteUserInfo } from '@pnp/sp/site-users';
import { IRoleAssignmentInfo } from '@pnp/sp/security';
import { IPrincipalInfo, PrincipalSource, PrincipalType } from '@pnp/sp';
import { AmbienteLista, IPrefixosListas } from '../core/prefixos';
import { DiagnosticsLogger } from '../core/diagnostics';
import {
  PapelGrupo,
  nomeGrupoAdministradores,
  nomeGrupoDaArea,
  nomeListaAreas,
  nomeListaDaArea
} from '../jornada/nomes';
import { CATALOGO_AREA, ICampoCatalogo, IListaCatalogo, xmlDoCampo } from '../jornada/catalogoArea';
import { MATRIZ_ITEM_AREA, MATRIZ_PERMISSOES, MatrizLista, NivelPadrao, PAPEIS_GRUPO } from '../jornada/permissoes';
import { CAMPOS_AREA, IArea, IAreaItem, StatusArea, areaDe } from '../jornada/modelo';
import { mensagemDeErro, naoEncontrado } from './sp';

/** SP.DraftVisibilityType.Approver: rascunho visível só a quem aprova e ao autor. */
const RASCUNHO_APROVADORES: number = 2;
/** ReadSecurity/WriteSecurity: 1 = todos os itens; 2 = só os próprios. */
const SEGURANCA_ITENS: Record<'todos' | 'proprios', number> = { todos: 1, proprios: 2 };
/** SP.AddFieldOptions.AddFieldInternalNameHint: usa o atributo Name do XML como nome interno. */
const OPCAO_NOME_INTERNO: number = 8;
const LIMITE_MENSAGEM_ERRO: number = 1000;

export interface IPessoa {
  id?: number;
  loginName: string;
  nome: string;
  email: string;
}

export interface INovaArea {
  nome: string;
  sigla: string;
  cor: string;
  icone: string;
  gestores: IPessoa[];
}

export type ProgressoProvisionamento = (passo: string) => void;

export interface IContagemArea {
  jornadas?: number;
  /** Membros diretos do grupo de Usuários. Um grupo do Entra ID conta como um membro. */
  membros?: number;
}

export class AreaService {
  private readonly _niveis: Map<NivelPadrao, Promise<number>> = new Map<NivelPadrao, Promise<number>>();

  constructor(
    private readonly _sp: SPFI,
    private readonly _ambiente: AmbienteLista,
    private readonly _prefixos: IPrefixosListas,
    private readonly _logger: DiagnosticsLogger
  ) {}

  private get _listaAreas(): string {
    return nomeListaAreas(this._ambiente, this._prefixos);
  }

  // ---------------------------------------------------------------- Áreas

  public async listarAreas(): Promise<IArea[]> {
    const itens: IAreaItem[] = await this._sp.web.lists
      .getByTitle(this._listaAreas)
      .items.select(...CAMPOS_AREA)
      .orderBy('Title', true)
      .top(500)<IAreaItem[]>();
    return itens.map(areaDe);
  }

  /** Cria o item da área e monta toda a estrutura. Em falha, a área fica com Status Erro e pode ser reprocessada. */
  public async criarArea(nova: INovaArea, grupoAdministradoresId: number, progresso: ProgressoProvisionamento): Promise<IArea> {
    progresso('Registrando a área');
    const criado: { Id: number } = await this._sp.web.lists.getByTitle(this._listaAreas).items.add({
      Title: nova.nome.trim(),
      Sigla: nova.sigla,
      Cor: nova.cor,
      Icone: nova.icone,
      Status: 'Provisionando' as StatusArea
    });
    const area: IArea = areaDe({ Id: criado.Id, Title: nova.nome, Sigla: nova.sigla, Cor: nova.cor, Icone: nova.icone, Status: 'Provisionando' });
    return this.provisionar(area, grupoAdministradoresId, nova.gestores, progresso);
  }

  /**
   * Monta grupos, listas, biblioteca e permissões da área. Idempotente: cada passo verifica se o recurso já
   * existe antes de criar, então reprocessar nunca duplica grupos, listas ou campos.
   */
  public async provisionar(
    area: IArea,
    grupoAdministradoresId: number,
    gestores: IPessoa[],
    progresso: ProgressoProvisionamento
  ): Promise<IArea> {
    const escopo: string = `Área ${area.sigla}`;
    const inicio: number = performance.now();
    const item: IItem = this._sp.web.lists.getByTitle(this._listaAreas).items.getById(area.id);
    try {
      await item.update({ Status: 'Provisionando' as StatusArea, MensagemErro: '' });

      progresso('Criando os grupos da área');
      const gestoresId: number = await this._garantirGrupo(area, 'Gestores', grupoAdministradoresId);
      const apoioId: number = await this._garantirGrupo(area, 'Apoio', gestoresId);
      const usuariosId: number = await this._garantirGrupo(area, 'Usuarios', gestoresId);
      const grupos: Record<PapelGrupo, number> = { Gestores: gestoresId, Apoio: apoioId, Usuarios: usuariosId };

      if (gestores.length > 0) {
        progresso('Incluindo os gestores');
        await this.incluirMembros(gestoresId, gestores);
      }

      const usuarioAtualId: number = (await this._sp.web.currentUser.select('Id')<{ Id: number }>()).Id;
      for (const lista of CATALOGO_AREA) {
        const titulo: string = nomeListaDaArea(area.sigla, lista.base, this._ambiente, this._prefixos);
        progresso(`Criando ${titulo}`);
        const destino: IList = await this._garantirLista(titulo, lista);
        progresso(`Aplicando permissões em ${titulo}`);
        await this._aplicarPermissoes(destino, grupoAdministradoresId, grupos, MATRIZ_PERMISSOES[lista.base], usuarioAtualId);
      }

      progresso('Restringindo o item da área aos seus grupos');
      await this._aplicarPermissoes(item, grupoAdministradoresId, grupos, MATRIZ_ITEM_AREA, usuarioAtualId);

      await item.update({
        GrupoGestoresId: gestoresId,
        GrupoApoioId: apoioId,
        GrupoUsuariosId: usuariosId,
        Status: 'Ativa' as StatusArea,
        MensagemErro: ''
      });
      this._logger.log('info', escopo, 'Provisionamento concluído', performance.now() - inicio);
      return { ...area, status: 'Ativa', mensagemErro: '', grupoGestoresId: gestoresId, grupoApoioId: apoioId, grupoUsuariosId: usuariosId };
    } catch (erro: unknown) {
      const mensagem: string = mensagemDeErro(erro, 'Provisionamento da área');
      this._logger.log('error', escopo, mensagem);
      try {
        await item.update({ Status: 'Erro' as StatusArea, MensagemErro: mensagem.slice(0, LIMITE_MENSAGEM_ERRO) });
      } catch {
        this._logger.log('error', escopo, 'Não foi possível registrar o erro no item da área.');
      }
      throw new Error(mensagem);
    }
  }

  /** Números dos cards (jornadas cadastradas e membros do grupo de Usuários), numa única requisição em lote. */
  public async contarAreas(areas: IArea[]): Promise<Map<number, IContagemArea>> {
    const contagens: Map<number, IContagemArea> = new Map<number, IContagemArea>();
    const ativas: IArea[] = areas.filter((area: IArea) => area.status === 'Ativa');
    if (ativas.length === 0) {
      return contagens;
    }
    const [lote, executar] = this._sp.batched();
    ativas.forEach((area: IArea) => {
      const contagem: IContagemArea = {};
      contagens.set(area.id, contagem);
      lote.web.lists
        .getByTitle(nomeListaDaArea(area.sigla, 'Jornadas', this._ambiente, this._prefixos))
        .select('ItemCount')<{ ItemCount: number }>()
        .then((lista: { ItemCount: number }) => {
          contagem.jornadas = lista.ItemCount;
        })
        .catch(() => undefined);
      if (area.grupoUsuariosId) {
        lote.web.siteGroups
          .getById(area.grupoUsuariosId)
          .users.select('Id')
          .top(5000)<{ Id: number }[]>()
          .then((usuarios: { Id: number }[]) => {
            contagem.membros = usuarios.length;
          })
          .catch(() => undefined);
      }
    });
    await executar();
    return contagens;
  }

  public async alterarStatus(area: IArea, status: StatusArea): Promise<void> {
    await this._sp.web.lists.getByTitle(this._listaAreas).items.getById(area.id).update({ Status: status });
    this._logger.log('info', `Área ${area.sigla}`, `Status alterado para ${status}`);
  }

  // ---------------------------------------------------------------- Preparar o site

  /** Grupo de Administradores do ambiente, se já existir. */
  public async obterGrupoAdministradores(): Promise<ISiteGroupInfo | undefined> {
    const nome: string = nomeGrupoAdministradores(this._ambiente, this._prefixos);
    try {
      return await this._sp.web.siteGroups.getByName(nome).select('Id', 'Title')<ISiteGroupInfo>();
    } catch (erro: unknown) {
      if (naoEncontrado(erro)) {
        return undefined;
      }
      throw erro;
    }
  }

  /**
   * Cria o grupo de Administradores do ambiente com Controle Total no site e inclui o usuário logado.
   * Exige que o site tenha permissões próprias (não herdadas), para não alterar o site pai.
   */
  public async prepararSite(): Promise<ISiteGroupInfo> {
    const web: { HasUniqueRoleAssignments: boolean } = await this._sp.web.select('HasUniqueRoleAssignments')<{
      HasUniqueRoleAssignments: boolean;
    }>();
    if (!web.HasUniqueRoleAssignments) {
      throw new Error('O site herda permissões do site pai. Use um site com permissões próprias.');
    }
    const nome: string = nomeGrupoAdministradores(this._ambiente, this._prefixos);
    const existente: ISiteGroupInfo | undefined = await this.obterGrupoAdministradores();
    const grupo: ISiteGroupInfo =
      existente ??
      (await this._sp.web.siteGroups.add({
        Title: nome,
        Description: 'Jornada de Conhecimento: administradores (todas as áreas).'
      }));
    await this._configurarGrupo(grupo.Id, grupo.Id);
    await this._sp.web.roleAssignments.add(grupo.Id, await this._idDoNivel(NivelPadrao.ControleTotal));
    const usuario: { LoginName: string } = await this._sp.web.currentUser.select('LoginName')<{ LoginName: string }>();
    await this._sp.web.siteGroups.getById(grupo.Id).users.add(usuario.LoginName);
    this._logger.log('info', 'Preparar o site', `Grupo ${nome} pronto (ID ${grupo.Id})`);
    return grupo;
  }

  // ---------------------------------------------------------------- Membros

  public async listarMembros(grupoId: number): Promise<IPessoa[]> {
    const usuarios: ISiteUserInfo[] = await this._sp.web.siteGroups
      .getById(grupoId)
      .users.select('Id', 'Title', 'Email', 'LoginName')
      .top(5000)<ISiteUserInfo[]>();
    return usuarios.map((usuario: ISiteUserInfo) => ({
      id: usuario.Id,
      loginName: usuario.LoginName,
      nome: usuario.Title,
      email: usuario.Email
    }));
  }

  /** Inclui pessoas ou grupos no grupo. Quem já é membro é ignorado pelo SharePoint. */
  public async incluirMembros(grupoId: number, pessoas: IPessoa[]): Promise<void> {
    for (const pessoa of pessoas) {
      await this._sp.web.ensureUser(pessoa.loginName);
      await this._sp.web.siteGroups.getById(grupoId).users.add(pessoa.loginName);
    }
    this._logger.log('info', 'Membros', `${pessoas.length} inclusão(ões) no grupo ${grupoId}`);
  }

  public async removerMembro(grupoId: number, usuarioId: number): Promise<void> {
    await this._sp.web.siteGroups.getById(grupoId).users.removeById(usuarioId);
    this._logger.log('info', 'Membros', `Remoção no grupo ${grupoId}`);
  }

  /** Pesquisa pessoas (e, se pedido, grupos) para os seletores. Mínimo de 3 caracteres. */
  public async pesquisarPessoas(termo: string, incluirGrupos: boolean): Promise<IPessoa[]> {
    const texto: string = termo.trim();
    if (texto.length < 3) {
      return [];
    }
    const tipos: PrincipalType = incluirGrupos ? PrincipalType.User | PrincipalType.SecurityGroup : PrincipalType.User;
    const encontrados: IPrincipalInfo[] = await this._sp.utility.searchPrincipals(texto, tipos, PrincipalSource.All, '', 10);
    return encontrados.map((principal: IPrincipalInfo) => ({
      loginName: principal.LoginName,
      nome: principal.DisplayName,
      email: principal.Email ?? ''
    }));
  }

  // ---------------------------------------------------------------- Passos internos

  private async _garantirGrupo(area: IArea, papel: PapelGrupo, proprietarioId: number): Promise<number> {
    const nome: string = nomeGrupoDaArea(area.sigla, papel, this._ambiente, this._prefixos);
    let id: number;
    try {
      id = (await this._sp.web.siteGroups.getByName(nome).select('Id')<{ Id: number }>()).Id;
    } catch (erro: unknown) {
      if (!naoEncontrado(erro)) {
        throw erro;
      }
      id = (await this._sp.web.siteGroups.add({ Title: nome, Description: `Jornada de Conhecimento: ${area.nome}.` })).Id;
      this._logger.log('info', `Área ${area.sigla}`, `Grupo criado: ${nome}`);
    }
    await this._configurarGrupo(id, proprietarioId);
    return id;
  }

  /** Proprietário nativo do grupo e visibilidade dos membros (o gestor lista quem está na área). */
  private async _configurarGrupo(grupoId: number, proprietarioId: number): Promise<void> {
    await this._sp.web.siteGroups.getById(grupoId).update({
      AllowMembersEditMembership: false,
      AllowRequestToJoinLeave: false,
      OnlyAllowMembersViewMembership: false
    });
    await this._sp.web.siteGroups.getById(grupoId).setUserAsOwner(proprietarioId);
  }

  private async _garantirLista(titulo: string, definicao: IListaCatalogo): Promise<IList> {
    const resultado: { created: boolean; list: IList } = await this._sp.web.lists.ensure(titulo, '', definicao.modelo, false, {
      EnableVersioning: definicao.versionamento
    });
    const lista: IList = resultado.list;
    if (resultado.created) {
      this._logger.log('info', `Lista ${titulo}`, 'Criada');
    }

    const existentes: IFieldInfo[] = await lista.fields.select('InternalName', 'Title', 'Indexed')<IFieldInfo[]>();
    const porNome: Map<string, IFieldInfo> = new Map<string, IFieldInfo>(existentes.map((campo: IFieldInfo) => [campo.InternalName, campo]));

    for (const campo of definicao.campos) {
      if (!campo.nativo && !porNome.has(campo.nome)) {
        await lista.fields.createFieldAsXml({ SchemaXml: xmlDoCampo(campo), Options: OPCAO_NOME_INTERNO });
        this._logger.log('info', `Lista ${titulo}`, `Campo criado: ${campo.nome}`);
      }
      await this._ajustarCampo(lista, campo, porNome.get(campo.nome));
    }

    const configuracao: Record<string, unknown> = {};
    if (definicao.configuracao?.aprovacaoConteudo) {
      configuracao.EnableModeration = true;
      configuracao.DraftVersionVisibility = RASCUNHO_APROVADORES;
    }
    if (definicao.configuracao?.leitura) {
      configuracao.ReadSecurity = SEGURANCA_ITENS[definicao.configuracao.leitura];
    }
    if (definicao.configuracao?.edicao) {
      configuracao.WriteSecurity = SEGURANCA_ITENS[definicao.configuracao.edicao];
    }
    if (Object.keys(configuracao).length > 0) {
      await lista.update(configuracao);
    }
    return lista;
  }

  /** Rótulo depois do nome interno (regra 5 de sharepoint-provisionamento) e índice logo após a criação. */
  private async _ajustarCampo(lista: IList, campo: ICampoCatalogo, atual: IFieldInfo | undefined): Promise<void> {
    const alteracoes: Record<string, unknown> = {};
    if (!atual || atual.Title !== campo.rotulo) {
      alteracoes.Title = campo.rotulo;
    }
    if (campo.indexado && !(atual && atual.Indexed)) {
      alteracoes.Indexed = true;
    }
    if (Object.keys(alteracoes).length > 0) {
      await lista.fields.getByInternalNameOrTitle(campo.nome).update(alteracoes, 'SP.Field');
    }
  }

  /**
   * Quebra a herança (sem copiar) e concede: Administradores = Controle Total; grupos da área conforme a matriz.
   * Remove a atribuição direta do usuário logado que o SharePoint pode criar ao quebrar a herança; ele mantém
   * o acesso pelo grupo de Administradores.
   */
  private async _aplicarPermissoes(
    alvo: IList | IItem,
    administradoresId: number,
    grupos: Record<PapelGrupo, number>,
    matriz: MatrizLista,
    usuarioAtualId: number
  ): Promise<void> {
    const info: { HasUniqueRoleAssignments: boolean } = await alvo.select('HasUniqueRoleAssignments')<{
      HasUniqueRoleAssignments: boolean;
    }>();
    if (!info.HasUniqueRoleAssignments) {
      await alvo.breakRoleInheritance(false, true);
    }
    await alvo.roleAssignments.add(administradoresId, await this._idDoNivel(NivelPadrao.ControleTotal));
    for (const papel of PAPEIS_GRUPO) {
      await alvo.roleAssignments.add(grupos[papel], await this._idDoNivel(matriz[papel]));
    }
    const atribuicoes: IRoleAssignmentInfo[] = await alvo.roleAssignments.select('PrincipalId')<IRoleAssignmentInfo[]>();
    const permitidos: number[] = [administradoresId, grupos.Gestores, grupos.Apoio, grupos.Usuarios];
    if (
      permitidos.indexOf(usuarioAtualId) === -1 &&
      atribuicoes.some((atribuicao: IRoleAssignmentInfo) => atribuicao.PrincipalId === usuarioAtualId)
    ) {
      await alvo.roleAssignments.getById(usuarioAtualId).delete();
    }
  }

  /** ID da definição de permissão padrão pelo tipo (independe do idioma do site). */
  private _idDoNivel(nivel: NivelPadrao): Promise<number> {
    let id: Promise<number> | undefined = this._niveis.get(nivel);
    if (!id) {
      id = this._sp.web.roleDefinitions
        .getByType(nivel)
        .select('Id')<{ Id: number }>()
        .then((definicao: { Id: number }) => definicao.Id);
      this._niveis.set(nivel, id);
    }
    return id;
  }
}
