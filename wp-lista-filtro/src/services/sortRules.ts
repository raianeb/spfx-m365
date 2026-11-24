import { isLargeList } from './camlBuilder';
import { IListField, LIST_VIEW_THRESHOLD } from './fieldSchema';

/** Ordenação escolhida no cabeçalho da grade. */
export interface ISort {
  /** Nome interno do campo. */
  field: string;
  ascending: boolean;
}

/** Situação da consulta que decide se a ordenação no servidor é segura. */
export interface ISortContext {
  /** Total de itens da lista. */
  itemCount: number;
  /** A consulta aplicada tem filtros. */
  hasFilter: boolean;
  /** Total de registros do filtro. Ausente enquanto a contagem não termina. */
  filteredTotal?: number;
}

export interface ISortAvailability {
  /** O tipo do campo aceita ordenação. Falso = o cabeçalho não mostra o controle. */
  sortable: boolean;
  /** A ordenação pode ser pedida agora. */
  allowed: boolean;
  /** Motivo do bloqueio, pronto para o usuário. Vazio quando permitida. */
  reason: string;
}

/** Tipos que o SharePoint ordena com um único valor por item. Texto longo, links e campos múltiplos ficam de fora. */
const SORTABLE_TYPES: ReadonlySet<string> = new Set<string>([
  'Text',
  'Choice',
  'Number',
  'Currency',
  'Integer',
  'Counter',
  'DateTime',
  'Boolean',
  'User',
  'Lookup'
]);

const NOT_SORTABLE: ISortAvailability = { sortable: false, allowed: false, reason: '' };
const ALLOWED: ISortAvailability = { sortable: true, allowed: true, reason: '' };
const blocked = (reason: string): ISortAvailability => ({ sortable: true, allowed: false, reason });
const THRESHOLD_TEXT: string = new Intl.NumberFormat('pt-BR').format(LIST_VIEW_THRESHOLD);

/**
 * Regras de ordenação por volume (skill sharepoint-dados-listas: ordenar por coluna indexada ou pelo ID).
 * A ordenação é sempre no servidor, sobre todos os registros da consulta, nunca só sobre a página.
 * - Lista dentro do limite: qualquer coluna ordenável.
 * - Lista grande sem filtro: somente coluna com índice.
 * - Lista grande com filtro: qualquer coluna ordenável, desde que o filtro devolva até 5.000 registros;
 *   acima disso o SharePoint recusa ordenar o resultado.
 */
export const sortAvailability = (field: IListField, context: ISortContext): ISortAvailability => {
  if (!SORTABLE_TYPES.has(field.type)) {
    return NOT_SORTABLE;
  }
  if (!isLargeList(context.itemCount)) {
    return ALLOWED;
  }
  if (!context.hasFilter) {
    return field.indexed ? ALLOWED : blocked('Ordenação indisponível: esta coluna não tem índice e a lista tem mais de 5.000 itens.');
  }
  if (context.filteredTotal === undefined) {
    return blocked('Aguarde a contagem dos registros para ordenar.');
  }
  return context.filteredTotal <= LIST_VIEW_THRESHOLD
    ? ALLOWED
    : blocked(`Refine o filtro para até ${THRESHOLD_TEXT} registros para ordenar.`);
};

/** Ciclo do clique no cabeçalho: crescente, decrescente e de volta à ordem padrão. */
export const nextSort = (current: ISort | undefined, field: string): ISort | undefined => {
  if (!current || current.field !== field) {
    return { field, ascending: true };
  }
  return current.ascending ? { field, ascending: false } : undefined;
};
