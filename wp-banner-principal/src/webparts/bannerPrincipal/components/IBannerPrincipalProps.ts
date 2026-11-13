import { IWebPartCommonProps } from '../../../core/config';

/** Banner publicado. Datas em ISO (UTC); ImagemCaminho guarda o caminho relativo do arquivo na biblioteca. */
export interface IBanner {
  Id: number;
  Title: string;
  DataPublicacao: string;
  DataExpiracao?: string;
  Link?: { Url: string; Description: string };
  ImagemCaminho?: string;
  /** Ordem de exibição no carrossel (menor primeiro). */
  Ordem?: number;
}

export interface IBannerPrincipalProps extends IWebPartCommonProps {
  /** Nome da biblioteca de imagens (sem prefixo); o prefixo é aplicado conforme o ambiente. */
  libraryName: string;
  /** Segundos entre os slides. Zero desativa a troca automática. */
  carouselInterval: number;
  showArrows: boolean;
  showDots: boolean;
  /** Cor do overlay sob o título, em hexadecimal (#RRGGBB). */
  overlayColor: string;
  /** Opacidade do overlay no ponto mais forte, de 0 a 100. */
  overlayOpacity: number;
}
