// Skills aplicadas: spfx-implementacao-base (contratos tipados de props).
import { SPFI } from '@pnp/sp';
import { IWebPartCommonProps } from '../../../core/config';
import { IArea } from '../../../jornada/modelo';
import { IEtapa, IJornada, IMatricula } from '../../../jornada/progresso';
import { EngajamentoService } from '../../../services/EngajamentoService';
import { JornadaService } from '../../../services/JornadaService';
import { MatriculaService } from '../../../services/MatriculaService';
import { EstudioService } from '../../../services/EstudioService';
import { GestaoService } from '../../../services/GestaoService';

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
}

export const NOME_SOLUCAO: string = 'Jornada de Conhecimento';
