// Modelo: ícones lineares do padrão GTI (skill spfx-padrao-visual-gti).
// SVG 24 × 24, sem preenchimento, traço currentColor 1.65, pontas e junções arredondadas.
// Acrescente novos desenhos nesta mesma linguagem; não misture bibliotecas de ícones.
import * as React from 'react';

const caminhos = {
  inicio: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z',
  grade: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  lista: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  capelo: 'M2 9l10-5 10 5-10 5Zm4 2.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v5',
  lapis: 'M4 20h4L19 9l-4-4L4 16Zm9-13 4 4',
  grafico: 'M4 20h16M6 16v-5M11 16V7M16 16v-8',
  pessoas: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 9v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8',
  check: 'M5 12.5 10 17l9-10',
  checkCirculo: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-4-9 3 3 5-6',
  escudo: 'M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6Z',
  relogio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2',
  calendario: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  play: 'M8 5v14l11-7Z',
  pausa: 'M8 5v14M16 5v14',
  arquivo: 'M5 3h9l5 5v13H5Zm9 0v6h5M8 13h8m-8 4h8',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
  curtir: 'M7 10v10H4V10Zm0 0 4-7c1.5 0 2.5 1 2.2 2.6L12.7 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7',
  estrela: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z',
  busca: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
  mais: 'M12 5v14M5 12h14',
  fechar: 'm6 6 12 12M6 18 18 6',
  esquerda: 'M15 6l-6 6 6 6',
  direita: 'M9 6l6 6-6 6',
  cima: 'M6 15l6-6 6 6',
  baixo: 'M6 9l6 6 6-6',
  cadeado: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3',
  alerta: 'M12 4 2.5 20h19ZM12 10v4m0 3v.01',
  email: 'M3 6h18v12H3zM3 7l9 6 9-6',
  baixar: 'M12 4v11m-5-5 5 5 5-5M5 20h14',
  olho: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  arrastar: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  lixeira: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  medalha: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm-3.5 4.5L9 21l3-1.5 3 1.5.5-6.5',
  camadas: 'M12 3 2 8l10 5 10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5',
  bandeira: 'M5 21V4h11l-1.5 4L16 12H5',
  predio: 'M4 21V5l8-2v18M12 7h8v14M7 9h2M7 13h2M15 11h2M15 15h2M2 21h20',
  alvo: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  atualizar: 'M20 11a8 8 0 0 0-14.5-4.5L4 8m0-5v5h5M4 13a8 8 0 0 0 14.5 4.5L20 16m0 5v-5h-5',
  enviar: 'M21 3 10 14M21 3l-7 18-4-7-7-4Z',
  copiar: 'M8 8h12v12H8zM4 16V4h12',
  livro: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Zm0 14a2 2 0 0 1 2-2h13',
  caixaEntrada: 'M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6H3v-6Z',
  lateral: 'M4 4h16v16H4zM9 4v16',
  desfazer: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  engrenagem: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  menu: 'M3 6h18M3 12h18M3 18h18',
  imagem: 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5h.01',
  pasta: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
  texto: 'M5 5h14M5 10h14M5 15h9M5 20h6',
  negrito: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
  italico: 'M10 5h8M6 19h8M14 5l-4 14',
  sublinhado: 'M7 4v7a5 5 0 0 0 10 0V4M5 20h14',
  listaNumerada: 'M10 6h11M10 12h11M10 18h11M4 5l1-1v4M3.5 14.5a1.2 1.2 0 0 1 2.2.6c0 .8-2.2 1.9-2.2 2.9h2.4',
  citacao: 'M5 11h4v6H4v-5c0-3 1-5 4-6M15 11h4v6h-5v-5c0-3 1-5 4-6',
  divisor: 'M3 12h18M8 7h8M8 17h8',
  limparFormato: 'M6 5h12M12 5l-3 14M4 20l16-16',
  subir: 'M12 16V4M7 9l5-5 5 5M4 20h16'
} as const;

export type NomeIcone = keyof typeof caminhos;

export interface IIconProps {
  nome: NomeIcone;
  /** Tamanho em px. Padrão 20; use 16–18 em botões. */
  tamanho?: number;
  className?: string;
}

export function Icon(props: IIconProps): React.ReactElement {
  const tamanho = props.tamanho ?? 20;
  return (
    <svg
      className={props.className}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={props.nome === 'arrastar' ? 2.6 : 1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={caminhos[props.nome]} />
    </svg>
  );
}
