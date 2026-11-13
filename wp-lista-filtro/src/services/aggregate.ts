import { IListField } from './fieldSchema';
import { formatCell } from './formatValue';
import { ListRow } from './ListQueryService';

export type Metric = 'count' | 'sum' | 'avg' | 'min' | 'max';
/** Agrupamento de datas: ano, mês ou dia. */
export type Granularity = 'ano' | 'mes' | 'dia';

export const METRIC_LABELS: Record<Metric, string> = {
  count: 'Quantidade de registros',
  sum: 'Soma',
  avg: 'Média',
  min: 'Mínimo',
  max: 'Máximo'
};

export const GRANULARITY_LABELS: Record<Granularity, string> = { ano: 'Ano', mes: 'Mês', dia: 'Dia' };

/** Máximo de categorias com cor própria: sete posições da paleta categórica + "Outros" em cinza. */
export const MAX_CATEGORIES: number = 8;
const COLORED_CATEGORIES: number = 7;
const OTHERS_KEY: string = '__outros';

export interface IAccumulator {
  /** Registros do grupo. */
  rows: number;
  /** Registros com valor numérico preenchido (base da média e dos extremos). */
  numeric: number;
  sum: number;
  min: number;
  max: number;
}

export interface IBucket {
  key: string;
  label: string;
  acc: IAccumulator;
  /** Valor da métrica escolhida para este grupo. */
  value: number;
  /** Verdadeiro para o agrupamento "Outros". */
  folded: boolean;
}

export interface IAggregation {
  buckets: IBucket[];
  /** Acumulado de todos os registros (base dos indicadores). */
  overall: IAccumulator;
  /** Valor da métrica considerando todos os registros. */
  overallValue: number;
  /** Séries temporais (ano, mês, dia) mantêm a ordem cronológica e não são agrupadas em "Outros". */
  timeSeries: boolean;
}

export interface IAggregateOptions {
  dimension: IListField;
  valueField?: IListField;
  granularity?: Granularity;
  metric: Metric;
}

export const emptyAccumulator = (): IAccumulator => ({ rows: 0, numeric: 0, sum: 0, min: Infinity, max: -Infinity });

const addToAccumulator = (acc: IAccumulator, numeric: number | undefined): void => {
  acc.rows += 1;
  if (numeric !== undefined && isFinite(numeric)) {
    acc.numeric += 1;
    acc.sum += numeric;
    acc.min = Math.min(acc.min, numeric);
    acc.max = Math.max(acc.max, numeric);
  }
};

const mergeAccumulator = (target: IAccumulator, source: IAccumulator): void => {
  target.rows += source.rows;
  target.numeric += source.numeric;
  target.sum += source.sum;
  target.min = Math.min(target.min, source.min);
  target.max = Math.max(target.max, source.max);
};

/** Valor de uma métrica a partir do acumulado. Sem valores numéricos, devolve 0. */
export const metricValue = (acc: IAccumulator, metric: Metric): number => {
  switch (metric) {
    case 'count':
      return acc.rows;
    case 'sum':
      return acc.sum;
    case 'avg':
      return acc.numeric > 0 ? acc.sum / acc.numeric : 0;
    case 'min':
      return acc.numeric > 0 ? acc.min : 0;
    case 'max':
      return acc.numeric > 0 ? acc.max : 0;
  }
};

const DATE_ISO: RegExp = /^(\d{4})-(\d{2})-(\d{2})/;
const DATE_BR: RegExp = /^(\d{2})\/(\d{2})\/(\d{4})/;

/** Partes de data (ano, mês, dia) a partir do texto devolvido pelo SharePoint. */
const dateParts = (text: string): { y: string; m: string; d: string } | undefined => {
  const iso: RegExpExecArray | null = DATE_ISO.exec(text);
  if (iso) {
    return { y: iso[1], m: iso[2], d: iso[3] };
  }
  const br: RegExpExecArray | null = DATE_BR.exec(text);
  if (br) {
    return { y: br[3], m: br[2], d: br[1] };
  }
  return undefined;
};

/** Chave e rótulo do grupo de um valor. Datas são agrupadas pela granularidade escolhida. */
const groupOf = (raw: unknown, field: IListField, granularity: Granularity | undefined): { key: string; label: string } => {
  if (field.type === 'DateTime') {
    const parts: { y: string; m: string; d: string } | undefined = dateParts(formatCell(raw, field.type));
    if (!parts) {
      return { key: '', label: '(vazio)' };
    }
    if (granularity === 'ano') {
      return { key: parts.y, label: parts.y };
    }
    if (granularity === 'mes') {
      return { key: `${parts.y}-${parts.m}`, label: `${parts.m}/${parts.y}` };
    }
    return { key: `${parts.y}-${parts.m}-${parts.d}`, label: `${parts.d}/${parts.m}/${parts.y}` };
  }
  if (field.type === 'Boolean') {
    const isTrue: boolean = raw === true || raw === 'true' || raw === 'Sim';
    const isFalse: boolean = raw === false || raw === 'false' || raw === 'Não';
    if (isTrue) {
      return { key: 'sim', label: 'Sim' };
    }
    if (isFalse) {
      return { key: 'nao', label: 'Não' };
    }
    return { key: '', label: '(vazio)' };
  }
  const text: string = formatCell(raw, field.type).trim();
  return text === '' ? { key: '', label: '(vazio)' } : { key: text, label: text };
};

/** Valor numérico de uma célula (moeda e número). Texto não numérico não entra na soma. */
const numericOf = (raw: unknown): number | undefined => {
  if (typeof raw === 'number') {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed: number = Number(raw.replace(',', '.'));
    return isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

/**
 * Agrupa os registros pela dimensão e calcula a métrica por grupo.
 * Categorias são ordenadas do maior para o menor valor; além de MAX_CATEGORIES, o restante vira "Outros".
 * Datas usam ordem cronológica e não são agrupadas.
 */
export const aggregateRows = (rows: ListRow[], options: IAggregateOptions): IAggregation => {
  const groups: Map<string, { label: string; acc: IAccumulator }> = new Map();
  const overall: IAccumulator = emptyAccumulator();
  const timeSeries: boolean = options.dimension.type === 'DateTime';

  rows.forEach((row: ListRow) => {
    const group: { key: string; label: string } = groupOf(row[options.dimension.name], options.dimension, options.granularity);
    const numeric: number | undefined = options.valueField ? numericOf(row[options.valueField.name]) : undefined;
    let entry: { label: string; acc: IAccumulator } | undefined = groups.get(group.key);
    if (!entry) {
      entry = { label: group.label, acc: emptyAccumulator() };
      groups.set(group.key, entry);
    }
    addToAccumulator(entry.acc, numeric);
    addToAccumulator(overall, numeric);
  });

  let buckets: IBucket[] = Array.from(groups.entries()).map(
    ([key, entry]): IBucket => ({ key, label: entry.label, acc: entry.acc, value: metricValue(entry.acc, options.metric), folded: false })
  );

  if (timeSeries) {
    buckets.sort((a: IBucket, b: IBucket) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  } else {
    buckets.sort((a: IBucket, b: IBucket) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'));
    if (buckets.length > MAX_CATEGORIES) {
      const kept: IBucket[] = buckets.slice(0, COLORED_CATEGORIES);
      const others: IAccumulator = emptyAccumulator();
      buckets.slice(COLORED_CATEGORIES).forEach((bucket: IBucket) => mergeAccumulator(others, bucket.acc));
      const folded: IBucket = {
        key: OTHERS_KEY,
        label: `Outros (${buckets.length - COLORED_CATEGORIES})`,
        acc: others,
        value: metricValue(others, options.metric),
        folded: true
      };
      buckets = [...kept, folded];
    }
  }

  return { buckets, overall, overallValue: metricValue(overall, options.metric), timeSeries };
};
