// Skills aplicadas: spfx-implementacao-base (contratos tipados de props).
import { SPFI } from '@pnp/sp';
import { IWebPartCommonProps } from '../../../core/config';
import { IArea } from '../../../jornada/modelo';
import { IEtapa, IJornada, IMatricula, IResumoAvaliacoes } from '../../../jornada/progresso';
import { EngajamentoService } from '../../../services/EngajamentoService';
import { JornadaService } from '../../../services/JornadaService';
import { MatriculaService } from '../../../services/MatriculaService';
import { EstudioService } from '../../../services/EstudioService';
import { GestaoService } from '../../../services/GestaoService';
import { AreaService } from '../../../services/AreaService';
import { IPerfil } from '../../../services/PerfilService';
import { IRoteador } from './gti';

export interface IJornadaConhecimentoProps extends IWebPartCommonProps {
  sp: SPFI;
  siteUrl: string;
  nomeUsuario: string;
  loginUsuario: string;
}

export interface IServicosJornada {
  jornadas: JornadaService;
  matriculas: MatriculaService;
  engajamento: EngajamentoService;
  estudio: EstudioService;
  gestao: GestaoService;
  areas: AreaService;
}

/** Jornada pronta para a tela: área, resumo das etapas, matrícula do usuário e situação de prazo. */
export interface IJornadaVisivel {
  area: IArea;
  jornada: IJornada;
  etapas: IEtapa[];
  matricula?: IMatricula;
  percentual: number;
  atrasada: boolean;
  limite?: Date;
  duracaoMin: number;
  nota?: IResumoAvaliacoes;
}

/** Catálogo do usuário logado, compartilhado entre Início, Catálogo, Meu aprendizado e Detalhe. */
export type EstadoCatalogo =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; itens: IJornadaVisivel[]; areasComFalha: string[] };

/** O que toda tela recebe do contêiner. */
export interface IContextoTela {
  props: IJornadaConhecimentoProps;
  perfil: IPerfil;
  servicos: IServicosJornada;
  roteador: IRoteador;
  catalogo: EstadoCatalogo;
  /** Recarrega o catálogo (depois de concluir etapas ou publicar jornadas). */
  recarregarCatalogo: () => void;
  /** Recarrega o perfil (depois de criar ou alterar áreas). */
  recarregarPerfil: () => void;
  avisar: (mensagem: string) => void;
  /** Id do título da tela, para mover o foco ao trocar de tela. */
  idTitulo: string;
}

export const NOME_SOLUCAO: string = 'Jornada de Conhecimento';

/** Rotas: jornada/<area>/<jornada>, player/<area>/<jornada>[/<etapa>], editor/<area>/<jornada|novo>. */
export const rotaJornada = (item: Pick<IJornadaVisivel, 'area' | 'jornada'>): string => `jornada/${item.area.id}/${item.jornada.id}`;
export const rotaPlayer = (item: Pick<IJornadaVisivel, 'area' | 'jornada'>, etapaId?: number): string =>
  `player/${item.area.id}/${item.jornada.id}${etapaId ? `/${etapaId}` : ''}`;
