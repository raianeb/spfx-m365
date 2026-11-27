// Skills aplicadas: spfx-configuracao-webpart (grupos por perfil), sharepoint-dados-listas, spfx-codigo-performance.
// Perfil do usuário logado: Administrador pelos grupos configurados na web part; papéis por área pela permissão
// efetiva na lista de Jornadas da área (funciona com grupos do Entra ID dentro dos grupos do SharePoint).
import { SPFI } from '@pnp/sp';
import { IBasePermissions, PermissionKind } from '@pnp/sp/security';
import { AmbienteLista, IPrefixosListas } from '../core/prefixos';
import { DiagnosticsLogger } from '../core/diagnostics';
import { nomeListaAreas, nomeListaDaArea } from '../jornada/nomes';
import { Aba, CAMPOS_AREA, IArea, IAreaItem, IPapeisArea, abasVisiveis, areaDe, papeisPorPermissao } from '../jornada/modelo';
import { naoEncontrado } from './sp';

export interface IAreaComPapel {
  area: IArea;
  papeis: IPapeisArea;
}

export type SituacaoPerfil = 'ok' | 'configuracaoPendente' | 'semListaCentral';

export interface IPerfil {
  situacao: SituacaoPerfil;
  administrador: boolean;
  /** Controle Total no site: pode executar "Preparar o site" mesmo antes de estar no grupo de Administradores. */
  podePrepararSite: boolean;
  usuarioId: number;
  areas: IAreaComPapel[];
  abas: Aba[];
  listaAreas: string;
}

const LIMITE_AREAS: number = 500;

export class PerfilService {
  constructor(
    private readonly _sp: SPFI,
    private readonly _ambiente: AmbienteLista,
    private readonly _prefixos: IPrefixosListas,
    private readonly _gruposAdministradores: number[],
    private readonly _logger: DiagnosticsLogger
  ) {}

  public async carregar(): Promise<IPerfil> {
    const listaAreas: string = nomeListaAreas(this._ambiente, this._prefixos);
    const vazio: IPerfil = {
      situacao: 'configuracaoPendente',
      administrador: false,
      podePrepararSite: false,
      usuarioId: 0,
      areas: [],
      abas: ['minhas'],
      listaAreas
    };
    if (listaAreas === '') {
      this._logger.log('warn', 'Perfil', 'Prefixos inválidos para o ambiente; configuração pendente.');
      return vazio;
    }

    const inicio: number = performance.now();
    const [usuario, grupos, permissoesSite] = await Promise.all([
      this._sp.web.currentUser.select('Id')<{ Id: number }>(),
      this._sp.web.currentUser.groups.select('Id')<{ Id: number }[]>(),
      this._sp.web.getCurrentUserEffectivePermissions()
    ]);
    const administrador: boolean =
      this._gruposAdministradores.length > 0 && grupos.some((grupo: { Id: number }) => this._gruposAdministradores.indexOf(grupo.Id) !== -1);
    const podePrepararSite: boolean =
      this._sp.web.hasPermissions(permissoesSite, PermissionKind.ManagePermissions) &&
      this._sp.web.hasPermissions(permissoesSite, PermissionKind.CreateGroups);

    let itens: IAreaItem[];
    try {
      itens = await this._sp.web.lists.getByTitle(listaAreas).items.select(...CAMPOS_AREA).top(LIMITE_AREAS)<IAreaItem[]>();
    } catch (erro: unknown) {
      if (naoEncontrado(erro)) {
        this._logger.log('warn', 'Perfil', `Lista central ${listaAreas} não encontrada.`);
        return { ...vazio, situacao: 'semListaCentral', administrador, podePrepararSite, usuarioId: usuario.Id, abas: abasVisiveis(administrador, [], podePrepararSite) };
      }
      throw erro;
    }

    const areas: IArea[] = itens
      .map(areaDe)
      .filter((area: IArea) => administrador || area.status === 'Ativa');
    const papeis: IPapeisArea[] = await this._papeis(areas);
    const comPapel: IAreaComPapel[] = areas.map((area: IArea, indice: number) => ({ area, papeis: papeis[indice] }));

    this._logger.log(
      'info',
      'Perfil',
      `Administrador: ${administrador ? 'sim' : 'não'}; áreas visíveis: ${areas.length}`,
      performance.now() - inicio
    );
    return {
      situacao: 'ok',
      administrador,
      podePrepararSite,
      usuarioId: usuario.Id,
      areas: comPapel,
      abas: abasVisiveis(administrador, papeis, podePrepararSite),
      listaAreas
    };
  }

  /** Permissão efetiva na lista de Jornadas de cada área ativa, numa única requisição em lote. */
  private async _papeis(areas: IArea[]): Promise<IPapeisArea[]> {
    const semPapel: IPapeisArea = { gestor: false, apoio: false, usuario: false };
    const ativas: IArea[] = areas.filter((area: IArea) => area.status === 'Ativa');
    if (ativas.length === 0) {
      return areas.map(() => semPapel);
    }
    const [lote, executar] = this._sp.batched();
    const mascaras: Map<number, IBasePermissions | undefined> = new Map<number, IBasePermissions | undefined>();
    ativas.forEach((area: IArea) => {
      const lista: string = nomeListaDaArea(area.sigla, 'Jornadas', this._ambiente, this._prefixos);
      lote.web.lists
        .getByTitle(lista)
        .getCurrentUserEffectivePermissions()
        .then((mascara: IBasePermissions) => mascaras.set(area.id, mascara))
        .catch(() => mascaras.set(area.id, undefined));
    });
    await executar();
    return areas.map((area: IArea) => papeisPorPermissao(mascaras.get(area.id)));
  }
}
