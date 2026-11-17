import { IBucket, aggregateRows, dayKeyOf } from './aggregate';
import { IListField } from './fieldSchema';
import { formatCell } from './formatValue';
import { ListRow } from './ListQueryService';

/** Período da gestão à vista. Todos terminam hoje. */
export type DashboardPeriod = 'hoje' | '7dias' | 'mes' | '12meses';

export const DASHBOARD_PERIODS: ReadonlyArray<{ key: DashboardPeriod; text: string }> = [
  { key: 'hoje', text: 'Hoje' },
  { key: '7dias', text: 'Últimos 7 dias' },
  { key: 'mes', text: 'Mês atual' },
  { key: '12meses', text: 'Últimos 12 meses' }
];

/** Período padrão: lê pouco e responde rápido mesmo em lista grande. */
export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriod = 'mes';

export interface IPeriodRange {
  /** Primeiro e último dia, inclusive (yyyy-MM-dd). */
  from: string;
  to: string;
  /** Agrupamento da evolução. Ausente = sem gráfico de evolução (um único dia). */
  granularity?: 'dia' | 'mes';
  /** Dias corridos do período, para a média diária. */
  days: number;
}

export interface ITrendPoint {
  key: string;
  /** Rótulo curto do eixo (dia ou mês). */
  label: string;
  /** Rótulo completo, para a dica e o leitor de tela. */
  fullLabel: string;
  value: number;
  /** Último mês ainda em andamento. */
  partial: boolean;
}

export interface IRankingItem {
  key: string;
  label: string;
  value: number;
  /** Agrupamento dos menores grupos ("Outros"). */
  folded: boolean;
}

export interface IRanking {
  field: IListField;
  items: IRankingItem[];
  /** Valores distintos preenchidos no período. */
  distinct: number;
  /** Registros com o campo vazio. */
  empty: number;
}

export interface IDashboardData {
  /** Registros do período. */
  total: number;
  /** Registros de hoje. Ausente quando a lista não tem o campo de data. */
  today?: number;
  days: number;
  trend: ITrendPoint[];
  trendGranularity?: 'dia' | 'mes';
  rankings: IRanking[];
  /** A leitura parou no teto de linhas: os números são parciais. */
  truncated: boolean;
}

/** Tipos que não servem de agrupamento: texto longo, data (já é a evolução) e link. */
const NON_DIMENSION_TYPES: ReadonlySet<string> = new Set<string>(['Note', 'DateTime', 'URL']);
const MONTH_NAMES: string[] = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEK_SPAN_DAYS: number = 6;
const YEAR_SPAN_MONTHS: number = 11;
const MS_PER_DAY: number = 24 * 60 * 60 * 1000;

const pad2 = (value: number): string => `0${value}`.slice(-2);
const toIso = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export const isDashboardDimension = (field: IListField): boolean => !NON_DIMENSION_TYPES.has(field.type);

/** Intervalo de datas de um período, no fuso do navegador. */
export const periodRange = (period: DashboardPeriod, now: Date = new Date()): IPeriodRange => {
  const today: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start: Date = today;
  let granularity: 'dia' | 'mes' | undefined;
  if (period === '7dias') {
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - WEEK_SPAN_DAYS);
    granularity = 'dia';
  } else if (period === 'mes') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    granularity = 'dia';
  } else if (period === '12meses') {
    start = new Date(today.getFullYear(), today.getMonth() - YEAR_SPAN_MONTHS, 1);
    granularity = 'mes';
  }
  const days: number = Math.round((today.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  return { from: toIso(start), to: toIso(today), granularity, days };
};

/** Todos os pontos do período, inclusive os sem registro, para a evolução não esconder dias ou meses vazios. */
const trendSkeleton = (range: IPeriodRange): ITrendPoint[] => {
  const points: ITrendPoint[] = [];
  const [fromYear, fromMonth, fromDay] = range.from.split('-').map(Number);
  const [toYear, toMonth, toDay] = range.to.split('-').map(Number);
  if (range.granularity === 'mes') {
    const lastOfMonth: number = new Date(toYear, toMonth, 0).getDate();
    for (let cursor: Date = new Date(fromYear, fromMonth - 1, 1); toIso(cursor) <= range.to; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
      const year: number = cursor.getFullYear();
      const month: number = cursor.getMonth();
      const current: boolean = year === toYear && month === toMonth - 1;
      points.push({
        key: `${year}-${pad2(month + 1)}`,
        label: MONTH_NAMES[month],
        fullLabel: `${MONTH_NAMES[month]}/${year}`,
        value: 0,
        partial: current && toDay < lastOfMonth
      });
    }
    return points;
  }
  for (let cursor: Date = new Date(fromYear, fromMonth - 1, fromDay); toIso(cursor) <= range.to; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) {
    points.push({
      key: toIso(cursor),
      label: pad2(cursor.getDate()),
      fullLabel: `${pad2(cursor.getDate())}/${pad2(cursor.getMonth() + 1)}/${cursor.getFullYear()}`,
      value: 0,
      partial: false
    });
  }
  return points;
};

const buildRanking = (rows: ListRow[], field: IListField): IRanking => {
  let empty: number = 0;
  const seen: Set<string> = new Set<string>();
  rows.forEach((row: ListRow) => {
    const text: string = formatCell(row[field.name], field.type).trim();
    if (text === '') {
      empty += 1;
    } else {
      seen.add(text);
    }
  });
  // O vazio tem o seu próprio indicador (preenchimento); fora do ranking, não disputa posição com valores reais.
  const filled: ListRow[] = empty > 0 ? rows.filter((row: ListRow) => formatCell(row[field.name], field.type).trim() !== '') : rows;
  const items: IRankingItem[] = aggregateRows(filled, { dimension: field, metric: 'count' }).buckets.map(
    (bucket: IBucket): IRankingItem => ({ key: bucket.key, label: bucket.label, value: bucket.value, folded: bucket.folded })
  );
  return { field, items, distinct: seen.size, empty };
};

export interface IBuildDashboardOptions {
  /** Campo de data da evolução. Ausente = sem recorte de período nem evolução. */
  dateField?: IListField;
  dimensions: IListField[];
  range: IPeriodRange;
  truncated: boolean;
}

/**
 * Monta os números do painel a partir das linhas lidas. As linhas são recortadas pelo período aqui também:
 * quando o campo de data não tem índice, a leitura vem sem filtro de data do servidor.
 */
export const buildDashboard = (rows: ListRow[], options: IBuildDashboardOptions): IDashboardData => {
  const { dateField, range } = options;
  const dayOf = (row: ListRow): string | undefined => (dateField ? dayKeyOf(row[dateField.name]) : undefined);
  const inPeriod: ListRow[] = dateField
    ? rows.filter((row: ListRow) => {
        const day: string | undefined = dayOf(row);
        return day !== undefined && day >= range.from && day <= range.to;
      })
    : rows;

  let today: number | undefined;
  let trend: ITrendPoint[] = [];
  if (dateField) {
    const keyLength: number = range.granularity === 'mes' ? 7 : 10;
    const counts: Map<string, number> = new Map<string, number>();
    today = 0;
    inPeriod.forEach((row: ListRow) => {
      const day: string = dayOf(row) as string;
      if (day === range.to) {
        today = (today ?? 0) + 1;
      }
      const key: string = day.slice(0, keyLength);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    if (range.granularity) {
      trend = trendSkeleton(range).map((point: ITrendPoint) => ({ ...point, value: counts.get(point.key) ?? 0 }));
    }
  }

  return {
    total: inPeriod.length,
    today,
    days: range.days,
    trend,
    trendGranularity: dateField ? range.granularity : undefined,
    rankings: options.dimensions.map((field: IListField) => buildRanking(inPeriod, field)),
    truncated: options.truncated
  };
};
