// Skills aplicadas: spfx-implementacao-base (contratos tipados de props).
import { SPFI } from '@pnp/sp';
import { IWebPartCommonProps } from '../../../core/config';

export interface IJornadaConhecimentoProps extends IWebPartCommonProps {
  sp: SPFI;
  siteUrl: string;
  nomeUsuario: string;
}

export const NOME_SOLUCAO: string = 'Jornada de Conhecimento';
