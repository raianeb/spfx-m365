// Skills aplicadas: spfx-acessibilidade-conteudo (valor em texto, não só visual), spfx-tema-marca (tokens).
import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './Indicadores.module.scss';

const formatarNota = (nota: number): string => nota.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export interface IEstrelasProps {
  nota: number;
  total?: number;
  /** Nota individual (comentário): sem a quantidade de avaliações. */
  individual?: boolean;
}

/** Nota média em estrelas, com o valor em texto. */
export const Estrelas: React.FC<IEstrelasProps> = ({ nota, total, individual }: IEstrelasProps) => {
  if (!total) {
    return <span className={styles.semNota}>Sem avaliações</span>;
  }
  const cheias: number = Math.round(nota);
  return (
    <span
      className={styles.estrelas}
      aria-label={individual ? `Nota ${nota} de 5` : `Nota ${formatarNota(nota)} de 5, ${total} avaliação(ões)`}
      role="img"
    >
      {[1, 2, 3, 4, 5].map((posicao: number) => (
        <Icon key={posicao} iconName={posicao <= cheias ? 'FavoriteStarFill' : 'FavoriteStar'} aria-hidden="true" />
      ))}
      {!individual && (
        <span className={styles.notaTexto} aria-hidden="true">
          {formatarNota(nota)} ({total})
        </span>
      )}
    </span>
  );
};

export interface IAnelProgressoProps {
  percentual: number;
  tamanho?: number;
}

/** Anel de progresso com o percentual no centro e no rótulo acessível. */
export const AnelProgresso: React.FC<IAnelProgressoProps> = ({ percentual, tamanho = 44 }: IAnelProgressoProps) => {
  const valor: number = Math.max(0, Math.min(100, Math.round(percentual)));
  const raio: number = (tamanho - 6) / 2;
  const circunferencia: number = 2 * Math.PI * raio;
  return (
    <span className={styles.anel} role="img" aria-label={`${valor}% concluído`} style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden="true" focusable="false">
        <circle className={styles.anelFundo} cx={tamanho / 2} cy={tamanho / 2} r={raio} strokeWidth={4} fill="none" />
        <circle
          className={styles.anelValor}
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          strokeWidth={4}
          fill="none"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - valor / 100)}
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        />
      </svg>
      <span className={styles.anelTexto} aria-hidden="true">
        {valor}%
      </span>
    </span>
  );
};
