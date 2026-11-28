// Skills aplicadas: spfx-implementacao-base (contratos tipados). Módulo puro, testável com Jest.

export type StatusArea = 'Provisionando' | 'Ativa' | 'Erro' | 'Arquivada';
export const STATUS_AREA: StatusArea[] = ['Provisionando', 'Ativa', 'Erro', 'Arquivada'];

export interface IArea {
  id: number;
  nome: string;
  sigla: string;
  cor: string;
  icone: string;
  status: StatusArea;
  mensagemErro: string;
  grupoGestoresId?: number;
  grupoApoioId?: number;
  grupoUsuariosId?: number;
}

/** Item da lista JornadaAreas, como volta da API (odata=nometadata). Campos vazios chegam ausentes ou nulos. */
export interface IAreaItem {
  Id: number;
  Title?: string;
  Sigla?: string;
  Cor?: string;
  Icone?: string;
  Status?: string;
  MensagemErro?: string;
  GrupoGestoresId?: number;
  GrupoApoioId?: number;
  GrupoUsuariosId?: number;
}

export const CAMPOS_AREA: (keyof IAreaItem)[] = [
  'Id',
  'Title',
  'Sigla',
  'Cor',
  'Icone',
  'Status',
  'MensagemErro',
  'GrupoGestoresId',
  'GrupoApoioId',
  'GrupoUsuariosId'
];

const COR_PADRAO: string = '#0F6CBD';
const ICONE_PADRAO: string = 'Education';
const COR_VALIDA: RegExp = /^#[0-9A-Fa-f]{6}$/;
const ICONE_VALIDO: RegExp = /^[A-Za-z0-9]{1,60}$/;

const opcional = (valor: number | undefined): number | undefined => (typeof valor === 'number' && valor > 0 ? valor : undefined);

export const statusDe = (valor: string | undefined): StatusArea =>
  STATUS_AREA.indexOf(valor as StatusArea) !== -1 ? (valor as StatusArea) : 'Erro';

/** Cor e ícone vêm de dado editável: só valores no formato esperado chegam ao estilo da tela. */
export const corSegura = (valor: string | undefined): string => (valor && COR_VALIDA.test(valor) ? valor : COR_PADRAO);
export const iconeSeguro = (valor: string | undefined): string =>
  valor && ICONE_VALIDO.test(valor) ? valor : ICONE_PADRAO;

export const areaDe = (item: IAreaItem): IArea => ({
  id: item.Id,
  nome: item.Title ?? '',
  sigla: (item.Sigla ?? '').toUpperCase(),
  cor: corSegura(item.Cor),
  icone: iconeSeguro(item.Icone),
  status: statusDe(item.Status),
  mensagemErro: item.MensagemErro ?? '',
  grupoGestoresId: opcional(item.GrupoGestoresId),
  grupoApoioId: opcional(item.GrupoApoioId),
  grupoUsuariosId: opcional(item.GrupoUsuariosId)
});

// ---- Papéis por permissão efetiva ----

/** SP.PermissionKind usados na detecção de papel (bit = valor - 1 na parte Low). */
const PERMISSAO = { ViewListItems: 1, EditListItems: 3, ApproveItems: 5, ManagePermissions: 25 } as const;

export interface IMascaraPermissao {
  High: number;
  Low: number;
}

export const temPermissao = (mascara: IMascaraPermissao | undefined, tipo: number): boolean => {
  if (!mascara) {
    return false;
  }
  const bit: number = tipo - 1;
  // Low cobre os bits 0 a 31; os tipos usados aqui estão todos nessa faixa.
  return bit < 32 && ((mascara.Low >>> 0) & (1 << bit)) !== 0;
};

export interface IPapeisArea {
  gestor: boolean;
  apoio: boolean;
  usuario: boolean;
}

/**
 * Papel na área a partir da permissão efetiva do usuário logado na lista de Jornadas da área.
 * Gestor aprova (Design ou Controle Total); Apoio edita sem aprovar; Usuário só lê.
 * Quem não lê a lista não tem papel na área.
 */
export const papeisPorPermissao = (jornadas: IMascaraPermissao | undefined): IPapeisArea => {
  const le: boolean = temPermissao(jornadas, PERMISSAO.ViewListItems);
  const edita: boolean = temPermissao(jornadas, PERMISSAO.EditListItems);
  const aprova: boolean = temPermissao(jornadas, PERMISSAO.ApproveItems);
  return {
    gestor: le && aprova,
    apoio: le && edita && !aprova,
    usuario: le
  };
};

/** Grupos da área de que o usuário é membro direto (currentUser.groups). */
export interface IMembroArea {
  gestores: boolean;
  apoio: boolean;
}

/**
 * Papel na área. Quem tem Controle Total na lista (ManagePermissions) recebeu isso como Administrador da
 * Jornada ou por ser dono/administrador do site — não por ser Gestor ou Apoio da área. Nesse caso o papel
 * vem do grupo de que a pessoa é membro; o Administrador da Jornada gere todas as áreas.
 * Sem Controle Total, vale a permissão efetiva (cobre grupos do Entra ID dentro dos grupos da área).
 */
export const papeisDaArea = (jornadas: IMascaraPermissao | undefined, membro: IMembroArea, administrador: boolean): IPapeisArea => {
  if (!temPermissao(jornadas, PERMISSAO.ManagePermissions)) {
    return papeisPorPermissao(jornadas);
  }
  if (administrador || membro.gestores) {
    return { gestor: true, apoio: false, usuario: true };
  }
  return { gestor: false, apoio: membro.apoio, usuario: true };
};

export type Aba = 'minhas' | 'gestao' | 'estudio' | 'administracao';

/**
 * Abas visíveis: Minhas Jornadas para todos; as demais conforme o perfil (escopo, seção 2).
 * Administração: só para o grupo de Administradores configurado. Enquanto nenhum grupo estiver configurado,
 * quem tem Controle Total no site a vê para executar "Preparar o site" (donoDoSite).
 */
export const abasVisiveis = (administrador: boolean, papeis: IPapeisArea[], donoDoSite: boolean = false): Aba[] => {
  const abas: Aba[] = ['minhas'];
  const gestor: boolean = papeis.some((papel: IPapeisArea) => papel.gestor);
  const apoio: boolean = papeis.some((papel: IPapeisArea) => papel.apoio);
  if (gestor) {
    abas.push('gestao');
  }
  if (gestor || apoio) {
    abas.push('estudio');
  }
  if (administrador || donoDoSite) {
    abas.push('administracao');
  }
  return abas;
};
