import { ISPHttpClientOptions, SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { DiagnosticsLogger } from '../core/diagnostics';

/** Consulta enxuta a uma lista: colunas explícitas, filtro, ordenação e limite obrigatórios. */
export interface IListQuery {
  listTitle: string;
  select: string[];
  filter?: string;
  orderBy?: string;
  top: number;
}

interface ICacheEntry {
  expiresAt: number;
  value: unknown[];
}

interface IDigestCache {
  value: string;
  expiresAt: number;
}

interface IPermissionResponse {
  EffectiveBasePermissions: { High: number; Low: number };
}

const CACHE_TTL_MS: number = 5 * 60 * 1000;
const MAX_RETRIES: number = 2;
const DIGEST_MARGIN_MS: number = 60 * 1000;
const FULL_CONTROL_HIGH: number = 2147483647;
const FULL_CONTROL_LOW: number = 4294967295;
// AddAndCustomizePages (0x40000): o tenant costuma não conceder este bit às listas, mesmo para proprietários.
const IGNORED_LOW_BITS: number = 0x40000;
const NO_METADATA: Record<string, string> = { Accept: 'application/json;odata=nometadata' };

// Cache e deduplicação de requisições em voo, válidos para a vida da página.
const cache: Map<string, ICacheEntry> = new Map<string, ICacheEntry>();
const inFlight: Map<string, Promise<unknown[]>> = new Map<string, Promise<unknown[]>>();

const delay = (ms: number): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Imagem de uma biblioteca de imagens do site. */
export interface ILibraryImage {
  name: string;
  serverRelativeUrl: string;
}

const IMAGE_EXTENSION: RegExp = /\.(jpe?g|png|gif|webp)$/i;
const escapeLiteral = (value: string): string => value.replace(/'/g, "''");

/** Subpasta de uma biblioteca, como retornada pela API de pastas. */
export interface IFolderEntry {
  Name: string;
  ServerRelativeUrl: string;
  TimeLastModified: string;
  ItemCount: number;
}

/** Arquivo de uma biblioteca, como retornado pela API de pastas. */
export interface IFileEntry {
  Name: string;
  ServerRelativeUrl: string;
  TimeLastModified: string;
  Length: number;
  UniqueId: string;
}

export interface IFolderContent {
  folders: IFolderEntry[];
  files: IFileEntry[];
  /** Link da próxima página de arquivos. Ausente quando a pasta já foi lida por completo. */
  nextFilesUrl?: string;
}

/** Arquivo encontrado pela busca recursiva. Location descreve a pasta onde ele está, relativa à pasta pesquisada. */
export interface ISearchFileEntry extends IFileEntry {
  location: string;
}

/** Resultado da busca: truncated indica que havia pastas ou arquivos sem pesquisar por causa dos limites. */
export interface ISearchResult {
  items: ISearchFileEntry[];
  truncated: boolean;
  failedFolders: number;
}

/** Uma página de resultados do SharePoint e o link da próxima, quando existir. */
interface IPage<T> {
  value: T[];
  next?: string;
}

/** Item de arquivo retornado pela consulta à lista durante a busca. */
interface ISearchItem {
  FileLeafRef: string;
  FileRef: string;
  Modified: string;
  UniqueId: string;
}

/** Tamanhos de página e limites. Nenhuma consulta lê a biblioteca inteira de uma vez. */
const FOLDER_PAGE: number = 1000;
const FILE_PAGE: number = 200;
const SEARCH_FILE_PAGE: number = 100;
const MAX_PAGES: number = 20;
const SEARCH_CONCURRENCY: number = 4;

/** Caracteres com significado na sintaxe de busca; são removidos do termo digitado. */
const SEARCH_RESERVED: RegExp = /["'*():\\\[\]{}]/g;

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export class CarreirasListService {
  private _digest: IDigestCache | undefined;
  private _currentGroups: Promise<number[]> | undefined;
  private readonly _permissions: Map<string, Promise<boolean>> = new Map<string, Promise<boolean>>();

  constructor(
    private readonly _client: SPHttpClient,
    private readonly _webUrl: string,
    private readonly _logger?: DiagnosticsLogger
  ) {}

  /** Site de dados que este serviço consulta. */
  public get webUrl(): string {
    return this._webUrl;
  }

  public getItems<T>(query: IListQuery): Promise<T[]> {
    const url: string = this._buildUrl(query);

    const cached: ICacheEntry | undefined = cache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.value as T[]);
    }

    const pending: Promise<unknown[]> | undefined = inFlight.get(url);
    if (pending) {
      return pending as Promise<T[]>;
    }

    const scope: string = `Lista ${query.listTitle}`;
    const started: number = performance.now();
    this._logger?.log('info', scope, 'Consulta iniciada');

    const request: Promise<T[]> = this._fetchAll<T>(url, 0).then(
      (value: T[]) => {
        inFlight.delete(url);
        cache.set(url, { expiresAt: Date.now() + CACHE_TTL_MS, value });
        this._logger?.log('info', scope, `Consulta concluída: ${value.length} registro(s)`, performance.now() - started);
        return value;
      },
      (error: unknown) => {
        inFlight.delete(url);
        this._logger?.log('error', scope, `Falha na consulta: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
        throw error;
      }
    );

    inFlight.set(url, request);
    return request;
  }

  /** Remove do cache as consultas de uma lista, para que a próxima leitura reflita as alterações. */
  public clearCache(listTitle: string): void {
    const token: string = `getbytitle('${encodeURIComponent(listTitle)}')`;
    Array.from(cache.keys())
      .filter((key: string) => key.indexOf(token) !== -1)
      .forEach((key: string) => cache.delete(key));
    Array.from(inFlight.keys())
      .filter((key: string) => key.indexOf(token) !== -1)
      .forEach((key: string) => inFlight.delete(key));
  }

  /** True somente quando o usuário logado tem Controle Total na lista. Resultado em cache por lista. */
  public canManageList(listTitle: string): Promise<boolean> {
    const existing: Promise<boolean> | undefined = this._permissions.get(listTitle);
    if (existing) {
      return existing;
    }

    const url: string =
      `${this._webUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle)}')?$select=EffectiveBasePermissions`;
    const request: Promise<boolean> = this._client
      .get(url, SPHttpClient.configurations.v1, { headers: NO_METADATA })
      .then(async (response: SPHttpClientResponse): Promise<boolean> => {
        if (!response.ok) {
          throw new Error(`Falha ao verificar permissões (HTTP ${response.status}).`);
        }
        const body: IPermissionResponse = (await response.json()) as IPermissionResponse;
        const mask: { High: number; Low: number } = body.EffectiveBasePermissions;
        const fullControl: boolean = mask.High === FULL_CONTROL_HIGH && (((mask.Low >>> 0) | IGNORED_LOW_BITS) >>> 0) === FULL_CONTROL_LOW;
        this._logger?.log('info', `Lista ${listTitle}`, `Controle Total: ${fullControl ? 'sim' : 'não'} (High=${mask.High}, Low=${mask.Low})`);
        return fullControl;
      })
      .catch((error: unknown) => {
        this._permissions.delete(listTitle);
        throw error;
      });

    this._permissions.set(listTitle, request);
    return request;
  }

  /** Identificadores dos grupos do usuário logado no site de dados. */
  public getCurrentUserGroupIds(): Promise<number[]> {
    if (!this._currentGroups) {
      this._currentGroups = this._client
        .get(`${this._webUrl}/_api/web/currentuser/groups?$select=Id`, SPHttpClient.configurations.v1, {
          headers: NO_METADATA
        })
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

  public createItem(listTitle: string, body: object): Promise<void> {
    return this._write(listTitle, this._itemsUrl(listTitle), 'POST', body, {});
  }

  public updateItem(listTitle: string, id: number, body: object): Promise<void> {
    return this._write(listTitle, `${this._itemsUrl(listTitle)}(${id})`, 'MERGE', body, { 'IF-MATCH': '*' });
  }

  public deleteItem(listTitle: string, id: number): Promise<void> {
    return this._write(listTitle, `${this._itemsUrl(listTitle)}(${id})`, 'DELETE', undefined, { 'IF-MATCH': '*' });
  }

  /** Imagens de uma biblioteca, mais recentes primeiro, com busca opcional pelo nome. */
  public async getLibraryImages(libraryTitle: string, term: string, top: number): Promise<ILibraryImage[]> {
    const filters: string[] = ['FSObjType eq 0'];
    if (term) {
      filters.push(`substringof('${escapeLiteral(term)}', FileLeafRef)`);
    }
    const url: string =
      `${this._webUrl}/_api/web/lists/getbytitle('${encodeURIComponent(libraryTitle)}')/items` +
      `?$select=FileLeafRef,FileRef&$filter=${encodeURIComponent(filters.join(' and '))}` +
      `&$orderby=Modified desc&$top=${top}`;
    const response: SPHttpClientResponse = await this._client.get(url, SPHttpClient.configurations.v1, {
      headers: NO_METADATA
    });
    if (!response.ok) {
      throw new Error(`Falha ao consultar a biblioteca (HTTP ${response.status}).`);
    }
    const body: { value: { FileLeafRef: string; FileRef: string }[] } = (await response.json()) as {
      value: { FileLeafRef: string; FileRef: string }[];
    };
    return body.value
      .filter((file: { FileLeafRef: string }) => IMAGE_EXTENSION.test(file.FileLeafRef))
      .map((file: { FileLeafRef: string; FileRef: string }) => ({
        name: file.FileLeafRef,
        serverRelativeUrl: file.FileRef
      }));
  }

  /**
   * Envia uma imagem para a raiz da biblioteca com a sessão do usuário. Se o nome já existir,
   * grava uma segunda vez com sufixo de data e hora, sem substituir o arquivo existente.
   */
  public async uploadLibraryImage(libraryTitle: string, fileName: string, content: ArrayBuffer): Promise<ILibraryImage> {
    const base: string = `${this._webUrl}/_api/web/lists/getbytitle('${encodeURIComponent(libraryTitle)}')/rootfolder/files/add(url='`;
    const dot: number = fileName.lastIndexOf('.');
    const stem: string = dot > 0 ? fileName.slice(0, dot) : fileName;
    const extension: string = dot > 0 ? fileName.slice(dot) : '';
    const send = async (name: string): Promise<Response> => {
      const digest: string = await this._getDigest();
      return fetch(`${base}${encodeURIComponent(escapeLiteral(name))}',overwrite=false)`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json;odata=nometadata', 'X-RequestDigest': digest },
        body: content
      });
    };
    let response: Response = await send(fileName);
    if (response.status === 409 || response.status === 400) {
      response = await send(`${stem}-${Date.now()}${extension}`);
    }
    if (!response.ok) {
      throw new Error(`Não foi possível enviar a imagem (HTTP ${response.status}).`);
    }
    const created: { Name: string; ServerRelativeUrl: string } = (await response.json()) as {
      Name: string;
      ServerRelativeUrl: string;
    };
    this._logger?.log('info', `Biblioteca ${libraryTitle}`, 'Imagem enviada');
    return { name: created.Name, serverRelativeUrl: created.ServerRelativeUrl };
  }

  /** Caminho no servidor da raiz de uma biblioteca, por exemplo /sites/espacopuccarreiras/Documentos. */
  public async getLibraryRootPath(libraryTitle: string): Promise<string> {
    const response: SPHttpClientResponse = await this._client.get(
      `${this._webUrl}/_api/web/lists/getbytitle('${encodeURIComponent(libraryTitle)}')/rootfolder?$select=ServerRelativeUrl`,
      SPHttpClient.configurations.v1,
      { headers: NO_METADATA }
    );
    if (!response.ok) {
      throw new Error(`Falha ao consultar a biblioteca (HTTP ${response.status}).`);
    }
    const body: { ServerRelativeUrl: string } = (await response.json()) as { ServerRelativeUrl: string };
    return body.ServerRelativeUrl;
  }

  /**
   * Subpastas e arquivos de uma pasta, por duas consultas diretas à própria pasta.
   * Não usa CAML nem filtro por FileDirRef: o custo depende da pasta aberta, não do tamanho da biblioteca.
   */
  /**
   * Subpastas e a primeira página de arquivos de uma pasta. As demais páginas vêm por getMoreFiles,
   * enquanto houver nextFilesUrl. A pasta nunca é lida inteira de uma vez.
   */
  public async getFolderContent(folderPath: string): Promise<IFolderContent> {
    const folder: string = this._folderApi(folderPath);
    const [folders, filesPage]: [IFolderEntry[], IPage<IFileEntry>] = await Promise.all([
      this._getAllPages<IFolderEntry>(`${folder}/folders?$select=Name,ServerRelativeUrl,TimeLastModified,ItemCount&$top=${FOLDER_PAGE}`),
      this._getPage<IFileEntry>(`${folder}/files?$select=Name,ServerRelativeUrl,TimeLastModified,Length,UniqueId&$top=${FILE_PAGE}`)
    ]);
    return { folders, files: filesPage.value, nextFilesUrl: filesPage.next };
  }

  /** Próxima página de arquivos de uma pasta, pelo link que o SharePoint devolveu na página anterior. */
  public async getMoreFiles(nextUrl: string): Promise<{ files: IFileEntry[]; nextFilesUrl?: string }> {
    const page: IPage<IFileEntry> = await this._getPage<IFileEntry>(nextUrl);
    return { files: page.value, nextFilesUrl: page.next };
  }

  /**
   * Quantidade de arquivos diretamente na pasta: itens da pasta menos as subpastas.
   * Não lista os arquivos, então a contagem não depende do tamanho da pasta.
   */
  public async getFileCount(folderPath: string): Promise<number> {
    const folder: string = this._folderApi(folderPath);
    const [info, subfolders]: [{ ItemCount: number }, { Name: string }[]] = await Promise.all([
      this._getJson<{ ItemCount: number }>(`${folder}?$select=ItemCount`),
      this._getAllPages<{ Name: string }>(`${folder}/folders?$select=Name&$top=${FOLDER_PAGE}`)
    ]);
    return Math.max(0, info.ItemCount - subfolders.length);
  }

  /**
   * Busca recursiva por nome, percorrendo as subpastas uma a uma. Cada consulta fica restrita a uma pasta,
   * então o tamanho total da biblioteca não estoura o limite de consulta do SharePoint.
   * Para ao atingir maxFolders ou maxResults; truncated indica que ainda havia pastas ou resultados sem pesquisar.
   */
  public async searchFolderTree(libraryTitle: string, scopePath: string, term: string, maxResults: number, maxFolders: number): Promise<ISearchResult> {
    const words: string[] = term
      .replace(SEARCH_RESERVED, ' ')
      .split(/\s+/)
      .filter((word: string) => word !== '');
    if (words.length === 0) {
      return { items: [], truncated: false, failedFolders: 0 };
    }
    const root: string = scopePath.replace(/\/+$/, '');
    // substringof na lista não diferencia maiúsculas de minúsculas; no endpoint de pastas diferencia.
    const nameFilter: string = words.map((word: string) => `substringof('${escapeLiteral(word)}', FileLeafRef)`).join(' and ');
    const pending: string[] = [root];
    const found: ISearchFileEntry[] = [];
    let visited: number = 0;
    let failedFolders: number = 0;
    this._logger?.log('info', 'Busca', `Pesquisa em ${root}: termos "${words.join(' ')}"`);

    while (pending.length > 0 && found.length < maxResults && visited < maxFolders) {
      const batch: string[] = pending.splice(0, Math.min(SEARCH_CONCURRENCY, maxFolders - visited));
      visited += batch.length;
      const results: ({ folders: string[]; files: ISearchFileEntry[] } | undefined)[] = await Promise.all(
        batch.map((path: string) =>
          this._searchFolder(libraryTitle, path, root, nameFilter).catch(() => {
            failedFolders += 1;
            return undefined;
          })
        )
      );
      results.forEach((result) => {
        if (result) {
          pending.push(...result.folders);
          found.push(...result.files);
        }
      });
    }

    const sorted: ISearchFileEntry[] = found.sort((a: ISearchFileEntry, b: ISearchFileEntry) => b.TimeLastModified.localeCompare(a.TimeLastModified));
    const truncated: boolean = pending.length > 0 || found.length >= maxResults;
    this._logger?.log(
      'info',
      'Busca',
      `${visited} pasta(s) pesquisada(s), ${sorted.length} arquivo(s)${truncated ? ' (limite atingido)' : ''}${failedFolders > 0 ? `, ${failedFolders} falha(s)` : ''}`
    );
    return { items: sorted.slice(0, maxResults), truncated, failedFolders };
  }

  /**
   * Subpastas e arquivos de uma pasta que combinam com o filtro de nome. Uma pasta por consulta.
   * Os arquivos vêm da lista, filtrados por FileDirRef (somente a pasta, sem as subpastas), para que a busca
   * não diferencie maiúsculas de minúsculas.
   */
  private async _searchFolder(libraryTitle: string, path: string, root: string, nameFilter: string): Promise<{ folders: string[]; files: ISearchFileEntry[] }> {
    const folder: string = this._folderApi(path);
    const itemsUrl: string = `${this._webUrl}/_api/web/lists/getbytitle('${encodeURIComponent(libraryTitle)}')/items`;
    const filter: string = `FSObjType eq 0 and FileDirRef eq '${escapeLiteral(path)}' and ${nameFilter}`;
    const [subfolders, files]: [IPage<{ ServerRelativeUrl: string }>, IPage<ISearchItem>] = await Promise.all([
      this._getPage<{ ServerRelativeUrl: string }>(`${folder}/folders?$select=ServerRelativeUrl&$top=${FOLDER_PAGE}`),
      this._getPage<ISearchItem>(
        `${itemsUrl}?$select=FileLeafRef,FileRef,Modified,UniqueId&$filter=${encodeURIComponent(filter)}&$top=${SEARCH_FILE_PAGE}`
      )
    ]);
    const relative: string = safeDecode(path).slice(root.length).replace(/^\/+/, '');
    const location: string = relative === '' ? 'Raiz' : relative.split('/').join(' › ');
    return {
      folders: subfolders.value.map((item: { ServerRelativeUrl: string }) => item.ServerRelativeUrl).filter((url: string) => url !== `${root}/Forms`),
      files: files.value.map(
        (item: ISearchItem): ISearchFileEntry => ({
          Name: item.FileLeafRef,
          ServerRelativeUrl: item.FileRef,
          TimeLastModified: item.Modified,
          Length: 0,
          UniqueId: item.UniqueId,
          location
        })
      )
    };
  }

  /** Uma página de resultados de uma consulta OData. */
  private async _getPage<T>(url: string): Promise<IPage<T>> {
    const response: SPHttpClientResponse = await this._client.get(url, SPHttpClient.configurations.v1, { headers: NO_METADATA });
    if (!response.ok) {
      throw new Error(`Falha ao consultar a pasta (HTTP ${response.status}).`);
    }
    const body: { value: T[]; 'odata.nextLink'?: string } = (await response.json()) as { value: T[]; 'odata.nextLink'?: string };
    return { value: body.value, next: body['odata.nextLink'] };
  }

  /** Todas as páginas de uma consulta, até o limite MAX_PAGES. */
  private async _getAllPages<T>(url: string): Promise<T[]> {
    const items: T[] = [];
    let next: string | undefined = url;
    for (let pages: number = 0; next && pages < MAX_PAGES; pages++) {
      const page: IPage<T> = await this._getPage<T>(next);
      items.push(...page.value);
      next = page.next;
    }
    return items;
  }

  private async _getJson<T>(url: string): Promise<T> {
    const response: SPHttpClientResponse = await this._client.get(url, SPHttpClient.configurations.v1, { headers: NO_METADATA });
    if (!response.ok) {
      throw new Error(`Falha ao consultar a pasta (HTTP ${response.status}).`);
    }
    return (await response.json()) as T;
  }

  private _folderApi(folderPath: string): string {
    return `${this._webUrl}/_api/web/GetFolderByServerRelativePath(DecodedUrl='${encodeURIComponent(folderPath.replace(/'/g, "''"))}')`;
  }

  private _itemsUrl(listTitle: string): string {
    return `${this._webUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle)}')/items`;
  }

  private _buildUrl(query: IListQuery): string {
    const params: string[] = [`$select=${query.select.join(',')}`, `$top=${query.top}`];
    if (query.filter) {
      params.push(`$filter=${encodeURIComponent(query.filter)}`);
    }
    if (query.orderBy) {
      params.push(`$orderby=${encodeURIComponent(query.orderBy)}`);
    }
    return `${this._itemsUrl(query.listTitle)}?${params.join('&')}`;
  }

  private async _fetchAll<T>(url: string, attempt: number): Promise<T[]> {
    const options: ISPHttpClientOptions = { headers: NO_METADATA };
    const response: SPHttpClientResponse = await this._client.get(url, SPHttpClient.configurations.v1, options);

    if (!response.ok) {
      const retryable: boolean = response.status === 429 || response.status === 503;
      if (retryable && attempt < MAX_RETRIES) {
        const retryAfter: number = Number(response.headers.get('Retry-After'));
        this._logger?.log('warn', 'Consulta', `Nova tentativa após HTTP ${response.status}`);
        await delay(retryAfter > 0 ? retryAfter * 1000 : 500 * Math.pow(2, attempt));
        return this._fetchAll<T>(url, attempt + 1);
      }
      throw new Error(`Falha ao consultar a lista (HTTP ${response.status}).`);
    }

    const body: { value: T[] } = (await response.json()) as { value: T[] };
    return body.value;
  }

  private async _getDigest(): Promise<string> {
    if (this._digest && this._digest.expiresAt > Date.now()) {
      return this._digest.value;
    }
    const response: SPHttpClientResponse = await this._client.post(
      `${this._webUrl}/_api/contextinfo`,
      SPHttpClient.configurations.v1,
      { headers: NO_METADATA }
    );
    if (!response.ok) {
      throw new Error(`Falha ao obter o token de segurança (HTTP ${response.status}).`);
    }
    const body: { FormDigestValue: string; FormDigestTimeoutSeconds: number } = (await response.json()) as {
      FormDigestValue: string;
      FormDigestTimeoutSeconds: number;
    };
    this._digest = {
      value: body.FormDigestValue,
      expiresAt: Date.now() + body.FormDigestTimeoutSeconds * 1000 - DIGEST_MARGIN_MS
    };
    return body.FormDigestValue;
  }

  private async _write(
    listTitle: string,
    url: string,
    method: 'POST' | 'MERGE' | 'DELETE',
    body: object | undefined,
    extraHeaders: Record<string, string>
  ): Promise<void> {
    const scope: string = `Lista ${listTitle}`;
    const started: number = performance.now();
    this._logger?.log('info', scope, `Gravação (${method}) iniciada`);
    try {
      const digest: string = await this._getDigest();
      const headers: Record<string, string> = {
        ...NO_METADATA,
        'Content-Type': 'application/json;odata=nometadata',
        'X-RequestDigest': digest,
        ...extraHeaders
      };
      if (method !== 'POST') {
        headers['X-HTTP-Method'] = method;
      }
      const response: SPHttpClientResponse = await this._client.post(url, SPHttpClient.configurations.v1, {
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      if (!response.ok) {
        throw new Error(`Não foi possível salvar as alterações (HTTP ${response.status}).`);
      }
      this._logger?.log('info', scope, `Gravação (${method}) concluída`, performance.now() - started);
    } catch (error: unknown) {
      this._logger?.log('error', scope, `Gravação (${method}) falhou: ${error instanceof Error ? error.message : 'erro'}`);
      throw error;
    }
  }
}

export const toIsoNow = (): string => new Date().toISOString();

export const toIsoStartOfToday = (): string => {
  const today: Date = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
};

export const odataDate = (iso: string): string => `datetime'${iso}'`;

export const escapeOData = (value: string): string => value.replace(/'/g, "''");

export const formatDate = (iso?: string): string => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');
