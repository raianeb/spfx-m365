import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { DiagnosticsLogger } from '../core/diagnostics';
import { IListField, IRawField, toListFields } from './fieldSchema';

/** Dados da lista necessários para montar filtros, colunas e a estratégia de consulta. */
export interface IListInfo {
  itemCount: number;
  /** Caminho relativo ao servidor da pasta raiz da lista. */
  rootFolderUrl: string;
  fields: IListField[];
}

export type ListRow = Record<string, unknown>;

export interface IListPage {
  rows: ListRow[];
  /** Cursor da próxima página. Ausente na última. */
  nextPaging?: string;
  firstRow: number;
  lastRow: number;
}

interface IRenderResponse {
  Row?: ListRow[];
  NextHref?: string;
  FirstRow?: number;
  LastRow?: number;
}

interface IPageCacheEntry {
  expiresAt: number;
  page: IListPage;
}

/** Consulta recusada pelo limite de itens do SharePoint (lista grande sem filtro indexado). */
export class ThresholdError extends Error {
  public readonly threshold: boolean = true;
  constructor() {
    super('A consulta ultrapassou o limite de itens do SharePoint.');
  }
}

export const isThresholdError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { threshold?: boolean }).threshold === true;

const NO_METADATA: Record<string, string> = { Accept: 'application/json;odata=nometadata' };
const PAGE_CACHE_TTL_MS: number = 2 * 60 * 1000;
const PAGE_CACHE_MAX: number = 60;
const MAX_RETRIES: number = 2;
/** RenderOptions.ListData: somente as linhas, sem esquema nem contexto da view. */
const RENDER_LIST_DATA: number = 2;
/** Marcas do erro de limite de exibição de lista na resposta do SharePoint. */
const THRESHOLD_MARKS: string[] = ['-2147024860', 'SPQueryThrottledException', 'list view threshold', 'limite de exibição'];

/** Mensagem de erro devolvida pelo SharePoint (JSON odata), em texto curto. Vazio se não houver. */
const sharePointMessage = (body: string): string => {
  try {
    const parsed: { error?: { message?: { value?: string } } } = JSON.parse(body) as { error?: { message?: { value?: string } } };
    const value: string = parsed.error?.message?.value ?? '';
    return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  } catch {
    return '';
  }
};

const delay = (ms: number): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Leitura paginada de uma lista por RenderListDataAsStream. Cada chamada traz uma página;
 * a lista nunca é carregada inteira. Páginas já visitadas ficam em cache curto, por instância.
 */
export class ListQueryService {
  private readonly _info: Map<string, Promise<IListInfo>> = new Map<string, Promise<IListInfo>>();
  private readonly _pages: Map<string, IPageCacheEntry> = new Map<string, IPageCacheEntry>();
  private _currentGroups: Promise<number[]> | undefined;

  constructor(
    private readonly _client: SPHttpClient,
    private readonly _webUrl: string,
    private readonly _logger?: DiagnosticsLogger
  ) {}

  /** Site de dados que este serviço consulta. */
  public get webUrl(): string {
    return this._webUrl;
  }

  /** Total de itens, pasta raiz e campos úteis da lista. Uma leitura por lista, reaproveitada. */
  public getListInfo(listTitle: string): Promise<IListInfo> {
    const existing: Promise<IListInfo> | undefined = this._info.get(listTitle);
    if (existing) {
      return existing;
    }
    const request: Promise<IListInfo> = this._loadListInfo(listTitle).catch((error: unknown) => {
      this._info.delete(listTitle);
      throw error;
    });
    this._info.set(listTitle, request);
    return request;
  }

  /** Uma página de itens. `paging` é o cursor devolvido pela página anterior; ausente na primeira. */
  public async queryPage(listTitle: string, viewXml: string, paging?: string): Promise<IListPage> {
    const key: string = `${listTitle}|${viewXml}|${paging ?? ''}`;
    const cached: IPageCacheEntry | undefined = this._pages.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      this._logger?.log('info', `Lista ${listTitle}`, `Página em cache: ${cached.page.rows.length} registro(s)`);
      return cached.page;
    }

    const scope: string = `Lista ${listTitle}`;
    const started: number = performance.now();
    this._logger?.log('info', scope, paging ? 'Consulta da próxima página iniciada' : 'Consulta iniciada');
    try {
      const body: IRenderResponse = await this._render(listTitle, viewXml, paging, 0);
      const rows: ListRow[] = body.Row ?? [];
      const page: IListPage = {
        rows,
        nextPaging: body.NextHref ? body.NextHref.replace(/^\?/, '') : undefined,
        firstRow: Number(body.FirstRow) || 0,
        lastRow: Number(body.LastRow) || 0
      };
      this._store(key, page);
      this._logger?.log('info', scope, `Consulta concluída: ${rows.length} registro(s)`, performance.now() - started);
      return page;
    } catch (error: unknown) {
      this._logger?.log('error', scope, `Falha na consulta: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
      throw error;
    }
  }

  /**
   * Página de uma varredura (contagem, gráficos, exportação). Não usa o cache de páginas:
   * uma varredura de 100 mil itens não deve ocupar a memória da grade.
   */
  public async scanPage(listTitle: string, viewXml: string, paging?: string): Promise<IListPage> {
    const body: IRenderResponse = await this._render(listTitle, viewXml, paging, 0);
    return {
      rows: body.Row ?? [],
      nextPaging: body.NextHref ? body.NextHref.replace(/^\?/, '') : undefined,
      firstRow: Number(body.FirstRow) || 0,
      lastRow: Number(body.LastRow) || 0
    };
  }

  /** Identificadores dos grupos do usuário logado no site de dados. */
  public getCurrentUserGroupIds(): Promise<number[]> {
    if (!this._currentGroups) {
      this._currentGroups = this._client
        .get(`${this._webUrl}/_api/web/currentuser/groups?$select=Id`, SPHttpClient.configurations.v1, { headers: NO_METADATA })
        .then(async (response: SPHttpClientResponse): Promise<number[]> => {
          if (!response.ok) {
            throw new Error(`Falha ao consultar grupos do usuário (HTTP ${response.status}).`);
          }
          const body: { value: { Id: number }[] } = (await response.json()) as { value: { Id: number }[] };
          return body.value.map((group: { Id: number }) => group.Id);
        })
        .catch((error: unknown) => {
          this._currentGroups = undefined;
          throw error;
        });
    }
    return this._currentGroups;
  }

  private _listUrl(listTitle: string): string {
    return `${this._webUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle.replace(/'/g, "''"))}')`;
  }

  private async _getJson<T>(url: string, failure: string): Promise<T> {
    const response: SPHttpClientResponse = await this._client.get(url, SPHttpClient.configurations.v1, { headers: NO_METADATA });
    if (!response.ok) {
      throw new Error(`${failure} (HTTP ${response.status}).`);
    }
    return (await response.json()) as T;
  }

  private async _loadListInfo(listTitle: string): Promise<IListInfo> {
    const scope: string = `Lista ${listTitle}`;
    const started: number = performance.now();
    const base: string = this._listUrl(listTitle);
    try {
      const [list, fields] = await Promise.all([
        this._getJson<{ ItemCount: number; RootFolder: { ServerRelativeUrl: string } }>(
          `${base}?$select=ItemCount,RootFolder/ServerRelativeUrl&$expand=RootFolder`,
          'Falha ao ler a lista'
        ),
        this._getJson<{ value: IRawField[] }>(
          `${base}/fields?$select=InternalName,Title,TypeAsString,Indexed,Hidden,Choices&$filter=Hidden%20eq%20false&$top=500`,
          'Falha ao ler os campos da lista'
        )
      ]);
      const info: IListInfo = {
        itemCount: list.ItemCount,
        rootFolderUrl: list.RootFolder.ServerRelativeUrl,
        fields: toListFields(fields.value)
      };
      this._logger?.log('info', scope, `Estrutura lida: ${info.itemCount} item(ns), ${info.fields.length} campo(s) útil(eis)`, performance.now() - started);
      return info;
    } catch (error: unknown) {
      this._logger?.log('error', scope, error instanceof Error ? error.message : 'Falha ao ler a lista');
      throw error;
    }
  }

  private async _render(listTitle: string, viewXml: string, paging: string | undefined, attempt: number): Promise<IRenderResponse> {
    const parameters: Record<string, unknown> = { RenderOptions: RENDER_LIST_DATA, ViewXml: viewXml };
    if (paging) {
      parameters.Paging = paging;
    }
    const response: SPHttpClientResponse = await this._client.post(
      `${this._listUrl(listTitle)}/RenderListDataAsStream`,
      SPHttpClient.configurations.v1,
      {
        headers: { ...NO_METADATA, 'Content-Type': 'application/json;odata=nometadata' },
        body: JSON.stringify({ parameters })
      }
    );

    if (response.ok) {
      return (await response.json()) as IRenderResponse;
    }
    if ((response.status === 429 || response.status === 503) && attempt < MAX_RETRIES) {
      const retryAfter: number = Number(response.headers.get('Retry-After'));
      this._logger?.log('warn', 'Consulta', `Nova tentativa após HTTP ${response.status}`);
      await delay(retryAfter > 0 ? retryAfter * 1000 : 500 * Math.pow(2, attempt));
      return this._render(listTitle, viewXml, paging, attempt + 1);
    }
    const text: string = await response.text().catch(() => '');
    const lower: string = text.toLowerCase();
    if (THRESHOLD_MARKS.some((mark: string) => lower.indexOf(mark.toLowerCase()) !== -1)) {
      throw new ThresholdError();
    }
    // A mensagem do SharePoint indica o campo ou a regra que falhou. Vai para o diagnóstico, truncada.
    const detail: string = sharePointMessage(text);
    this._logger?.log('error', 'Consulta', `HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    throw new Error(`Falha ao consultar a lista (HTTP ${response.status})${detail ? `: ${detail}` : ''}.`);
  }

  private _store(key: string, page: IListPage): void {
    if (this._pages.size >= PAGE_CACHE_MAX) {
      // Descarta a entrada mais antiga: o Map preserva a ordem de inserção.
      const oldest: string | undefined = this._pages.keys().next().value;
      if (oldest !== undefined) {
        this._pages.delete(oldest);
      }
    }
    this._pages.set(key, { expiresAt: Date.now() + PAGE_CACHE_TTL_MS, page });
  }
}
