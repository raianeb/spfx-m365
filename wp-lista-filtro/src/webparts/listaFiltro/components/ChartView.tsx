import * as React from 'react';
import styles from './ListaFiltro.module.scss';
import { IBucket } from '../../../services/aggregate';

export type ChartType = 'barH' | 'barV' | 'donut' | 'line';

export const CHART_LABELS: Record<ChartType, string> = {
  barH: 'Barras horizontais',
  barV: 'Barras verticais',
  donut: 'Rosca (proporção)',
  line: 'Linha (série temporal)'
};

/**
 * Paleta categórica: oito posições fixas, validadas por scripts/validate_palette.js
 * (claro). A cor "Outros" é cinza e fica fora da sequência categórica.
 */
const SERIES: string[] = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
const OTHERS: string = '#8a8886';
const TEXT_PRIMARY: string = '#1f1f1f';
const TEXT_MUTED: string = '#52514e';
const GRID: string = '#edebe9';
const SURFACE: string = '#ffffff';

const W: number = 640;
const LABEL_MAX: number = 22;

export interface IChartViewProps {
  type: ChartType;
  buckets: IBucket[];
  /** Formatação do valor da métrica (inteiro, moeda, decimal). */
  format: (value: number) => string;
  /** Descrição curta para leitores de tela. A tabela de dados traz os valores completos. */
  description: string;
}

const shorten = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Cor de cada barra: série única usa a cor 1; "Outros" usa o cinza. */
const barColor = (bucket: IBucket): string => (bucket.folded ? OTHERS : SERIES[0]);

const VerticalBars: React.FC<IChartViewProps> = ({ buckets, format, description }) => {
  const H: number = 300;
  const left: number = 56;
  const right: number = 12;
  const top: number = 28;
  const bottom: number = 56;
  const plotW: number = W - left - right;
  const plotH: number = H - top - bottom;
  const max: number = Math.max(1, ...buckets.map((b: IBucket) => b.value));
  const band: number = plotW / Math.max(1, buckets.length);
  const barW: number = Math.min(56, band * 0.6);
  const ticks: number[] = [0, 1, 2, 3, 4];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description} className={styles.chartSvg}>
      {ticks.map((i: number) => {
        const y: number = top + (plotH * i) / 4;
        return (
          <g key={`g${i}`}>
            <line x1={left} x2={W - right} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
            <text x={left - 8} y={y + 4} textAnchor="end" fontSize={11} fill={TEXT_MUTED}>
              {format(max - (max * i) / 4)}
            </text>
          </g>
        );
      })}
      {buckets.map((bucket: IBucket, index: number) => {
        const h: number = (plotH * bucket.value) / max;
        const x: number = left + band * index + (band - barW) / 2;
        const y: number = top + plotH - h;
        return (
          <g key={bucket.key}>
            <rect x={x} y={y} width={barW} height={Math.max(h, 0)} rx={4} fill={barColor(bucket)}>
              <title>{`${bucket.label}: ${format(bucket.value)}`}</title>
            </rect>
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={12} fill={TEXT_PRIMARY}>
              {format(bucket.value)}
            </text>
            <text x={left + band * index + band / 2} y={top + plotH + 18} textAnchor="middle" fontSize={11} fill={TEXT_MUTED}>
              <title>{bucket.label}</title>
              {shorten(bucket.label, 12)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const HorizontalBars: React.FC<IChartViewProps> = ({ buckets, format, description }) => {
  const rowH: number = 34;
  const left: number = 170;
  const right: number = 80;
  const top: number = 8;
  const H: number = Math.max(160, buckets.length * rowH + top + 12);
  const plotW: number = W - left - right;
  const max: number = Math.max(1, ...buckets.map((b: IBucket) => b.value));
  const barH: number = 20;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description} className={styles.chartSvg}>
      {buckets.map((bucket: IBucket, index: number) => {
        const y: number = top + rowH * index + (rowH - barH) / 2;
        const w: number = (plotW * bucket.value) / max;
        return (
          <g key={bucket.key}>
            <text x={left - 10} y={y + barH / 2 + 4} textAnchor="end" fontSize={12} fill={TEXT_PRIMARY}>
              <title>{bucket.label}</title>
              {shorten(bucket.label, LABEL_MAX)}
            </text>
            <rect x={left} y={y} width={Math.max(w, 0)} height={barH} rx={4} fill={barColor(bucket)}>
              <title>{`${bucket.label}: ${format(bucket.value)}`}</title>
            </rect>
            <text x={left + w + 6} y={y + barH / 2 + 4} fontSize={12} fill={TEXT_PRIMARY}>
              {format(bucket.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/** Arco de anel entre dois ângulos, com folga de 2px visual (0,02 rad) entre fatias. */
const arcPath = (cx: number, cy: number, r: number, start: number, end: number): string => {
  const x1: number = cx + r * Math.cos(start);
  const y1: number = cy + r * Math.sin(start);
  const x2: number = cx + r * Math.cos(end);
  const y2: number = cy + r * Math.sin(end);
  const large: number = end - start > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
};

const Donut: React.FC<IChartViewProps> = ({ buckets, format, description }) => {
  const size: number = 240;
  const cx: number = size / 2;
  const r: number = 92;
  const total: number = buckets.reduce((sum: number, b: IBucket) => sum + b.value, 0);
  let angle: number = -Math.PI / 2;
  const gap: number = 0.02;

  return (
    <div className={styles.donutWrap}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={description} className={styles.donutSvg}>
        {total > 0 &&
          buckets.map((bucket: IBucket, index: number) => {
            const sweep: number = (bucket.value / total) * Math.PI * 2;
            if (sweep <= 0) {
              return null;
            }
            const start: number = angle + gap / 2;
            const end: number = angle + sweep - gap / 2;
            angle += sweep;
            const color: string = bucket.folded ? OTHERS : SERIES[index % SERIES.length];
            // Um único grupo ocupa o anel inteiro: arco de início e fim iguais não é desenhado, então usa círculo.
            if (sweep >= Math.PI * 2 - 1e-6) {
              return (
                <circle key={bucket.key} cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={28}>
                  <title>{`${bucket.label}: ${format(bucket.value)}`}</title>
                </circle>
              );
            }
            return sweep - gap > 0 ? (
              <path key={bucket.key} d={arcPath(cx, cx, r, start, end)} fill="none" stroke={color} strokeWidth={28}>
                <title>{`${bucket.label}: ${format(bucket.value)}`}</title>
              </path>
            ) : null;
          })}
        <text x={cx} y={cx + 6} textAnchor="middle" fontSize={20} fill={TEXT_PRIMARY}>
          {format(total)}
        </text>
      </svg>
      <ul className={styles.legend} aria-label="Legenda">
        {buckets.map((bucket: IBucket, index: number) => {
          const color: string = bucket.folded ? OTHERS : SERIES[index % SERIES.length];
          const share: string = total > 0 ? `${Math.round((bucket.value / total) * 1000) / 10}%` : '0%';
          return (
            <li key={bucket.key} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: color }} aria-hidden="true" />
              <span className={styles.legendLabel}>{bucket.label}</span>
              <span className={styles.legendValue}>
                {format(bucket.value)} · {share}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const LineChart: React.FC<IChartViewProps> = ({ buckets, format, description }) => {
  const H: number = 300;
  const left: number = 56;
  const right: number = 16;
  const top: number = 28;
  const bottom: number = 40;
  const plotW: number = W - left - right;
  const plotH: number = H - top - bottom;
  const max: number = Math.max(1, ...buckets.map((b: IBucket) => b.value));
  const n: number = buckets.length;
  const xAt = (index: number): number => (n <= 1 ? left + plotW / 2 : left + (plotW * index) / (n - 1));
  const yAt = (value: number): number => top + plotH - (plotH * value) / max;
  const points: string = buckets.map((b: IBucket, i: number) => `${xAt(i)},${yAt(b.value)}`).join(' ');
  // Rótulo de valor apenas no maior ponto e no último: os demais ficam no tooltip e na tabela.
  const peak: number = buckets.reduce((best: number, b: IBucket, i: number) => (b.value > buckets[best].value ? i : best), 0);
  const labelled: number[] = n === 0 ? [] : Array.from(new Set([peak, n - 1]));
  const labelEvery: number = Math.max(1, Math.ceil(n / 8));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description} className={styles.chartSvg}>
      {[0, 1, 2, 3, 4].map((i: number) => {
        const y: number = top + (plotH * i) / 4;
        return (
          <g key={`g${i}`}>
            <line x1={left} x2={W - right} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
            <text x={left - 8} y={y + 4} textAnchor="end" fontSize={11} fill={TEXT_MUTED}>
              {format(max - (max * i) / 4)}
            </text>
          </g>
        );
      })}
      {n > 1 && <polyline points={points} fill="none" stroke={SERIES[0]} strokeWidth={2} />}
      {buckets.map((bucket: IBucket, index: number) => (
        <g key={bucket.key}>
          <circle cx={xAt(index)} cy={yAt(bucket.value)} r={4} fill={SERIES[0]} stroke={SURFACE} strokeWidth={2}>
            <title>{`${bucket.label}: ${format(bucket.value)}`}</title>
          </circle>
          {labelled.indexOf(index) !== -1 && (
            <text x={xAt(index)} y={yAt(bucket.value) - 10} textAnchor="middle" fontSize={12} fill={TEXT_PRIMARY}>
              {format(bucket.value)}
            </text>
          )}
          {index % labelEvery === 0 && (
            <text x={xAt(index)} y={top + plotH + 18} textAnchor="middle" fontSize={11} fill={TEXT_MUTED}>
              {shorten(bucket.label, 10)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

/** Gráfico escolhido. Séries com mais de uma categoria recebem legenda; a rosca tem legenda própria. */
const ChartView: React.FC<IChartViewProps> = (props: IChartViewProps) => {
  switch (props.type) {
    case 'barV':
      return <VerticalBars {...props} />;
    case 'donut':
      return <Donut {...props} />;
    case 'line':
      return <LineChart {...props} />;
    default:
      return <HorizontalBars {...props} />;
  }
};

export default ChartView;
