import { FilterValues, IFilterValue, TextMatch, dateBounds } from './camlBuilder';
import { IListField } from './fieldSchema';

/** Filtro aplicado, descrito em texto para o usuário (etiqueta removível acima da tabela). */
export interface IAppliedFilter {
  /** Nome interno do campo. */
  name: string;
  /** Texto pronto: rótulo do campo e valor. */
  label: string;
}

/** Atalho de período de um filtro de data. */
export interface IDateShortcut {
  key: string;
  text: string;
  value: IFilterValue;
}

const NUMERIC_TYPES: ReadonlySet<string> = new Set<string>(['Number', 'Currency', 'Counter', 'Integer']);
const WEEK_SPAN_DAYS: number = 6;

const pad2 = (value: number): string => `0${value}`.slice(-2);

/** Data local no formato dos campos de data (yyyy-MM-dd). */
const toIsoDate = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** yyyy-MM-dd para dd/MM/yyyy, sem passar por Date (evita deslocamento de fuso). */
const toDisplayDate = (iso: string): string => {
  const parts: string[] = iso.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
};

/** Atalhos de período a partir da data informada (padrão: agora, no fuso do navegador). */
export const getDateShortcuts = (now: Date = new Date()): IDateShortcut[] => {
  const today: string = toIsoDate(now);
  const weekStart: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - WEEK_SPAN_DAYS);
  return [
    { key: 'hoje', text: 'Hoje', value: { dateMode: 'dia', from: today } },
    { key: '7dias', text: 'Últimos 7 dias', value: { dateMode: 'intervalo', from: toIsoDate(weekStart), to: today } },
    { key: 'mes', text: 'Mês atual', value: { dateMode: 'mes', from: today.slice(0, 7) } }
  ];
};

/** O valor digitado é exatamente o do atalho: usado para marcar o atalho ativo. */
export const isShortcutActive = (value: IFilterValue, shortcut: IDateShortcut): boolean =>
  (value.dateMode ?? 'intervalo') === shortcut.value.dateMode &&
  (value.from ?? '') === (shortcut.value.from ?? '') &&
  (value.to ?? '') === (shortcut.value.to ?? '');

const describeRange = (from: string, to: string, format: (text: string) => string): string => {
  if (from !== '' && to !== '') {
    return from === to ? format(from) : `${format(from)} a ${format(to)}`;
  }
  if (from !== '') {
    return `a partir de ${format(from)}`;
  }
  return to !== '' ? `até ${format(to)}` : '';
};

const describeValue = (field: IListField, value: IFilterValue, textMatch: TextMatch): string => {
  if (field.type === 'Boolean') {
    return value.bool === 'sim' ? 'Sim' : value.bool === 'nao' ? 'Não' : '';
  }
  if (field.type === 'DateTime') {
    const bounds: { from: string; to: string; error?: string } = dateBounds(value);
    return bounds.error ? '' : describeRange(bounds.from, bounds.to, toDisplayDate);
  }
  if (NUMERIC_TYPES.has(field.type)) {
    return describeRange((value.from ?? '').trim(), (value.to ?? '').trim(), (text: string) => text);
  }
  const text: string = (value.text ?? '').trim();
  if (text === '') {
    return '';
  }
  if (field.type === 'Choice') {
    return text;
  }
  return `${textMatch === 'contem' ? 'contém' : 'começa com'} "${text}"`;
};

/** Descreve os filtros preenchidos, na ordem dos campos. Campos sem valor ficam de fora. */
export const describeAppliedFilters = (fields: IListField[], values: FilterValues, textMatch: TextMatch): IAppliedFilter[] =>
  fields.reduce((applied: IAppliedFilter[], field: IListField) => {
    const value: IFilterValue | undefined = values[field.name];
    const description: string = value ? describeValue(field, value, textMatch) : '';
    if (description !== '') {
      applied.push({ name: field.name, label: `${field.title}: ${description}` });
    }
    return applied;
  }, []);

/** Cópia dos valores sem o campo informado. */
export const withoutFilter = (values: FilterValues, name: string): FilterValues =>
  Object.keys(values).reduce((next: FilterValues, key: string) => {
    if (key !== name) {
      next[key] = values[key];
    }
    return next;
  }, {});

/** Texto com singular e plural corretos: "1 registro encontrado", "277 registros encontrados". */
export const pluralize = (count: number, formatted: string, singular: string, plural: string): string =>
  `${formatted} ${count === 1 ? singular : plural}`;
