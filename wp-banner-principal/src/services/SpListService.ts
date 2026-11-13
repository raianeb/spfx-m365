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

export class SpListService {
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
