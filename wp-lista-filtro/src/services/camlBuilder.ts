import { IListField, LIST_VIEW_THRESHOLD } from './fieldSchema';

/**
 * Modo do filtro de data:
 * - dia: uma data exata (yyyy-MM-dd);
 * - mes: um mês inteiro (yyyy-MM);
 * - ano: um ano inteiro (yyyy);
 * - intervalo: de/até, ambos opcionais.
 */
export type DateMode = 'dia' | 'mes' | 'ano' | 'intervalo';

/** Valor digitado em um filtro. Cada tipo de campo usa as chaves que lhe cabem. */
export interface IFilterValue {
  /** Texto e opção. */
  text?: string;
  /** Início do intervalo (número, ou data no formato do modo de data). */
  from?: string;
  /** Fim do intervalo (número ou data yyyy-MM-dd). Usado só no modo intervalo. */
  to?: string;
  /** Modo do filtro de data. Ausente = intervalo. */
  dateMode?: DateMode;
  /** Sim/Não. Vazio = todos. */
  bool?: 'sim' | 'nao';
}

export type FilterValues = Record<string, IFilterValue>;

/** Busca em texto: pelo início (usa o índice) ou em qualquer parte (não usa o índice). */
export type TextMatch = 'inicio' | 'contem';

export interface ICondition {
  field: string;
  xml: string;
  /** A condição pode ser resolvida pelo índice do campo. */
  usesIndex: boolean;
}

export interface IConditionResult {
  conditions: ICondition[];
  /** Mensagens de validação, por nome interno do campo. */
  errors: Record<string, string>;
}

export interface IViewOptions {
  /** Nomes internos das colunas a devolver. */
  viewFields: string[];
  conditions: ICondition[];
  pageSize: number;
  /** Varredura completa (contagem, gráficos, exportação): página de até 5.000 em vez de 100. */
  scan?: boolean;
  /** Total de itens da lista, para escolher a estratégia de ordenação. */
  itemCount: number;
  newestFirst: boolean;
}

const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/;
const NUMERIC_TYPES: ReadonlySet<string> = new Set<string>(['Number', 'Currency', 'Counter', 'Integer']);

export const escapeXml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const fieldRef = (name: string): string => `<FieldRef Name="${escapeXml(name)}"/>`;

const compare = (operator: string, name: string, type: string, value: string, extra: string = ''): string =>
  `<${operator}>${fieldRef(name)}<Value Type="${type}"${extra}>${escapeXml(value)}</Value></${operator}>`;

/** Junta condições com And. O CAML aceita dois operandos por And, por isso o aninhamento. */
export const joinAnd = (parts: string[]): string =>
  parts.reduce((acc: string, part: string) => (acc === '' ? part : `<And>${acc}${part}</And>`), '');

const isValidDate = (value: string): boolean => DATE_PATTERN.test(value) && !isNaN(new Date(`${value}T00:00:00Z`).getTime());

const MONTH_PATTERN: RegExp = /^\d{4}-\d{2}$/;
const YEAR_PATTERN: RegExp = /^\d{4}$/;
const MIN_YEAR: number = 1900;
const MAX_YEAR: number = 2100;
const DATE_ONLY_EXTRA: string = ' IncludeTimeValue="FALSE"';

const pad2 = (value: number): string => `0${value}`.slice(-2);

interface IDateBounds {
  /** Primeiro dia incluído (yyyy-MM-dd), vazio = sem limite. */
  from: string;
  /** Último dia incluído (yyyy-MM-dd), vazio = sem limite. */
  to: string;
  error?: string;
}

const NO_BOUNDS: IDateBounds = { from: '', to: '' };

/**
 * Converte o modo escolhido em um intervalo de dias inclusivo.
 * Dia, mês e ano são convertidos para o intervalo completo, assim o CAML usa sempre Geq/Leq.
 */
export const dateBounds = (value: IFilterValue): IDateBounds => {
  const mode: DateMode = value.dateMode ?? 'intervalo';
  const from: string = (value.from ?? '').trim();
  const to: string = (value.to ?? '').trim();

  if (mode === 'dia') {
    if (from === '') {
      return NO_BOUNDS;
    }
    return isValidDate(from) ? { from, to: from } : { ...NO_BOUNDS, error: 'Informe uma data válida.' };
  }

  if (mode === 'mes') {
    if (from === '') {
      return NO_BOUNDS;
    }
    if (!MONTH_PATTERN.test(from)) {
      return { ...NO_BOUNDS, error: 'Informe um mês e ano válidos.' };
    }
    const year: number = Number(from.slice(0, 4));
    const month: number = Number(from.slice(5, 7));
    if (month < 1 || month > 12 || year < MIN_YEAR || year > MAX_YEAR) {
      return { ...NO_BOUNDS, error: 'Informe um mês e ano válidos.' };
    }
    // Dia 0 do mês seguinte = último dia do mês informado (month é 1-based aqui).
    const lastDay: number = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return { from: `${year}-${pad2(month)}-01`, to: `${year}-${pad2(month)}-${pad2(lastDay)}` };
  }

  if (mode === 'ano') {
    if (from === '') {
      return NO_BOUNDS;
    }
    const year: number = Number(from);
    if (!YEAR_PATTERN.test(from) || year < MIN_YEAR || year > MAX_YEAR) {
      return { ...NO_BOUNDS, error: `Informe um ano entre ${MIN_YEAR} e ${MAX_YEAR}.` };
    }
    return { from: `${from}-01-01`, to: `${from}-12-31` };
  }

  if ((from !== '' && !isValidDate(from)) || (to !== '' && !isValidDate(to))) {
    return { ...NO_BOUNDS, error: 'Informe datas válidas.' };
  }
  if (from !== '' && to !== '' && from > to) {
    return { ...NO_BOUNDS, error: 'A data inicial deve ser anterior à final.' };
  }
  return { from, to };
};

/** Condição de data: somente a parte de data é comparada (IncludeTimeValue FALSE), inclusive nos extremos. */
const dateXml = (name: string, bounds: IDateBounds): string => {
  const parts: string[] = [];
  if (bounds.from !== '') {
    parts.push(compare('Geq', name, 'DateTime', `${bounds.from}T00:00:00Z`, DATE_ONLY_EXTRA));
  }
  if (bounds.to !== '') {
    parts.push(compare('Leq', name, 'DateTime', `${bounds.to}T00:00:00Z`, DATE_ONLY_EXTRA));
  }
  return joinAnd(parts);
};

const rangeCondition = (
  field: IListField,
  value: IFilterValue,
  camlType: string,
  isValid: (text: string) => boolean,
  normalize: (text: string) => string,
  invalidMessage: string
): { xml: string; error?: string } => {
  const from: string = (value.from ?? '').trim();
  const to: string = (value.to ?? '').trim();
  if ((from !== '' && !isValid(from)) || (to !== '' && !isValid(to))) {
    return { xml: '', error: invalidMessage };
  }
  if (from !== '' && to !== '' && Number(from) > Number(to)) {
    return { xml: '', error: 'O valor mínimo deve ser menor que o máximo.' };
  }
  const parts: string[] = [];
  if (from !== '') {
    parts.push(compare('Geq', field.name, camlType, normalize(from)));
  }
  if (to !== '') {
    parts.push(compare('Leq', field.name, camlType, normalize(to)));
  }
  return { xml: joinAnd(parts) };
};

const isNumber = (text: string): boolean => text !== '' && isFinite(Number(text));

/**
 * Converte os filtros preenchidos em condições CAML. Filtros vazios são ignorados.
 * Valores passam por escape de XML; nomes de campo vêm do esquema da lista, nunca do usuário.
 */
export const buildConditions = (fields: IListField[], values: FilterValues, textMatch: TextMatch): IConditionResult => {
  const conditions: ICondition[] = [];
  const errors: Record<string, string> = {};

  fields.forEach((field: IListField) => {
    const value: IFilterValue = values[field.name] ?? {};
    let xml: string = '';
    let usesIndex: boolean = field.indexed;

    if (field.type === 'Text') {
      const text: string = (value.text ?? '').trim();
      if (text !== '') {
        xml = compare(textMatch === 'contem' ? 'Contains' : 'BeginsWith', field.name, 'Text', text);
        // "Contém" obriga o SharePoint a ler cada linha: não aproveita o índice.
        usesIndex = field.indexed && textMatch !== 'contem';
      }
    } else if (field.type === 'Choice') {
      const text: string = (value.text ?? '').trim();
      if (text !== '') {
        xml = compare('Eq', field.name, 'Text', text);
      }
    } else if (field.type === 'Boolean') {
      if (value.bool === 'sim' || value.bool === 'nao') {
        xml = compare('Eq', field.name, 'Boolean', value.bool === 'sim' ? '1' : '0');
      }
    } else if (field.type === 'DateTime') {
      const bounds: IDateBounds = dateBounds(value);
      if (bounds.error) {
        errors[field.name] = bounds.error;
      } else {
        xml = dateXml(field.name, bounds);
      }
    } else if (NUMERIC_TYPES.has(field.type)) {
      const camlType: string = field.type === 'Currency' ? 'Currency' : field.type === 'Counter' ? 'Counter' : 'Number';
      const result = rangeCondition(field, value, camlType, isNumber, (text: string) => String(Number(text)), 'Informe números válidos.');
      xml = result.xml;
      if (result.error) {
        errors[field.name] = result.error;
      }
    }

    if (xml !== '') {
      conditions.push({ field: field.name, xml, usesIndex });
    }
  });

  // Condições que usam índice vão primeiro: é por elas que o SharePoint reduz o conjunto lido.
  conditions.sort((a: ICondition, b: ICondition) => Number(b.usesIndex) - Number(a.usesIndex));
  return { conditions, errors };
};

/** Limite de linhas por página na grade (leitura rápida na tela). */
export const GRID_PAGE_MAX: number = 100;
/** Limite de linhas por página em varreduras (o SharePoint aceita até 5.000 por requisição). */
export const SCAN_PAGE_MAX: number = LIST_VIEW_THRESHOLD;

export const isLargeList = (itemCount: number): boolean => itemCount > LIST_VIEW_THRESHOLD;

/** Em lista grande, uma consulta com filtros só é segura se ao menos um deles usar índice. */
export const needsIndexedFilter = (conditions: ICondition[], itemCount: number): boolean =>
  isLargeList(itemCount) && conditions.length > 0 && !conditions.some((condition: ICondition) => condition.usesIndex);

/**
 * Ordenação segura para o volume:
 * - sem filtro, ou lista dentro do limite: por ID (índice nativo), na direção configurada;
 * - lista grande com filtro: percorre pelo índice do campo filtrado, sem ordenar o resultado inteiro.
 */
const buildOrderBy = (options: IViewOptions): string => {
  // Filtro só por ID: o ID é a chave primária, não um índice de coluna. UseIndexForOrderBy
  // nesse caso devolve "Invalid index" (0x80070585, HTTP 500); a ordenação explícita por ID resolve.
  const onlyById: boolean = options.conditions.every((condition: ICondition) => condition.field === 'ID');
  if (options.conditions.length > 0 && !onlyById && isLargeList(options.itemCount)) {
    return '<OrderBy UseIndexForOrderBy="TRUE" Override="TRUE"/>';
  }
  return `<OrderBy Override="TRUE"><FieldRef Name="ID" Ascending="${options.newestFirst ? 'FALSE' : 'TRUE'}"/></OrderBy>`;
};

/** ViewXml da página: somente as colunas exibidas, filtros no servidor e limite por página. */
export const buildViewXml = (options: IViewOptions): string => {
  const names: string[] = ['ID', ...options.viewFields.filter((name: string) => name !== 'ID')];
  const where: string = joinAnd(options.conditions.map((condition: ICondition) => condition.xml));
  const cap: number = options.scan ? SCAN_PAGE_MAX : GRID_PAGE_MAX;
  const pageSize: number = Math.min(cap, Math.max(1, Math.round(options.pageSize)));
  return (
    '<View>' +
    `<Query>${where ? `<Where>${where}</Where>` : ''}${buildOrderBy(options)}</Query>` +
    `<ViewFields>${names.map(fieldRef).join('')}</ViewFields>` +
    `<RowLimit Paged="TRUE">${pageSize}</RowLimit>` +
    '</View>'
  );
};
