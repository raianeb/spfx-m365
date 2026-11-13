import { ICondition, SCAN_PAGE_MAX, buildViewXml } from './camlBuilder';
import { ListQueryService, ListRow } from './ListQueryService';

/** Controle de cancelamento compartilhado: ao mudar a consulta, a varredura anterior para. */
export interface IScanToken {
  cancelled: boolean;
}

export interface IScanOptions {
  service: ListQueryService;
  listTitle: string;
  listItemCount: number;
  conditions: ICondition[];
  /** Colunas a trazer. Para somente contar, use apenas ID. */
  viewFields: string[];
  /** Guarda as linhas (para exportação e agregações). Falso = só conta. */
  collect: boolean;
  /** Número máximo de linhas guardadas quando `collect` é verdadeiro. */
  maxRows: number;
  token: IScanToken;
  onProgress?: (scanned: number) => void;
}

export interface IScanResult {
  /** Total de registros que atendem ao filtro (todas as páginas). */
  total: number;
  /** Linhas guardadas, até `maxRows`. Vazio quando `collect` é falso. */
  rows: ListRow[];
  /** Verdadeiro quando o total passou de `maxRows` e as linhas foram cortadas. */
  truncated: boolean;
}

export class ScanCancelledError extends Error {
  public readonly cancelled: boolean = true;
  constructor() {
    super('Varredura cancelada.');
  }
}

export const isScanCancelled = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { cancelled?: boolean }).cancelled === true;

/**
 * Percorre todas as páginas dos registros que atendem ao filtro, com o cursor do servidor.
 * Lê só as colunas pedidas. Em listas grandes, o filtro usa índice; o percurso é sequencial
 * para não sobrecarregar o SharePoint.
 */
export const scanItems = async (options: IScanOptions): Promise<IScanResult> => {
  const rows: ListRow[] = [];
  let total: number = 0;
  let paging: string | undefined;

  do {
    if (options.token.cancelled) {
      throw new ScanCancelledError();
    }
    const viewXml: string = buildViewXml({
      viewFields: options.viewFields,
      conditions: options.conditions,
      pageSize: SCAN_PAGE_MAX,
      itemCount: options.listItemCount,
      newestFirst: false,
      scan: true
    });
    const page = await options.service.scanPage(options.listTitle, viewXml, paging);
    total += page.rows.length;
    if (options.collect && rows.length < options.maxRows) {
      rows.push(...page.rows.slice(0, options.maxRows - rows.length));
    }
    options.onProgress?.(total);
    paging = page.nextPaging;
  } while (paging !== undefined);

  return { total, rows, truncated: options.collect && total > options.maxRows };
};
