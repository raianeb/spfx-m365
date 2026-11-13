import { ISPHttpClientOptions, SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { IGroupRef } from './config';
import { IListField, IRawField, toListFields } from '../services/fieldSchema';

export interface ISiteRef {
  url: string;
  title: string;
}

interface ISearchResponse {
  PrimaryQueryResult?: {
    RelevantResults?: {
      Table?: { Rows?: { Cells: { Key: string; Value?: string }[] }[] };
    };
  };
}

const NO_METADATA: Record<string, string> = { Accept: 'application/json;odata=nometadata' };
const SEARCH_ROW_LIMIT: number = 10;

export const normalizeUrl = (url: string): string => url.trim().replace(/\/+$/, '');

/** Consultas de sites, grupos, listas e campos usadas pelo painel de propriedades. Usa a sessão do editor. */
export class SiteDirectoryService {
  constructor(private readonly _client: SPHttpClient, private readonly _currentWebUrl: string) {}

  /** Pesquisa sites do mesmo host organizacional por título. */
  public async searchSites(term: string): Promise<ISiteRef[]> {
    const word: string = term.replace(/["'*:()]/g, ' ').trim().split(' ')[0] ?? '';
    const query: string = word ? `contentclass:"STS_Site" AND Title:${word}*` : 'contentclass:"STS_Site"';
    const url: string =
      `${this._currentWebUrl}/_api/search/query?querytext='${encodeURIComponent(query)}'` +
      `&selectproperties='Title,Path'&rowlimit=${SEARCH_ROW_LIMIT}&trimduplicates=true`;

    const response: SPHttpClientResponse = await this._client.get(url, SPHttpClient.configurations.v1, {
      headers: NO_METADATA
    } as ISPHttpClientOptions);
    if (!response.ok) {
      throw new Error(`Falha na pesquisa de sites (HTTP ${response.status}).`);
    }

    const body: ISearchResponse = (await response.json()) as ISearchResponse;
    const rows: { Cells: { Key: string; Value?: string }[] }[] =
      body.PrimaryQueryResult?.RelevantResults?.Table?.Rows ?? [];

    const seen: Set<string> = new Set<string>();
    const sites: ISiteRef[] = [];
    rows.forEach((row: { Cells: { Key: string; Value?: string }[] }) => {
      const cell = (key: string): string => row.Cells.find((c) => c.Key === key)?.Value ?? '';
      const path: string = normalizeUrl(cell('Path'));
      if (!path || seen.has(path.toLowerCase()) || !this._isSameHost(path)) {
        return;
      }
      seen.add(path.toLowerCase());
      sites.push({ url: path, title: cell('Title') || path });
    });
    return sites;
  }

  /** Confirma acesso ao site escolhido antes de usá-lo como fonte de dados. */
  public async validateSite(url: string): Promise<ISiteRef> {
    const normalized: string = normalizeUrl(url);
    if (!this._isSameHost(normalized) || normalized.indexOf('https://') !== 0) {
      throw new Error('Site fora do ambiente organizacional permitido.');
    }
    const response: SPHttpClientResponse = await this._client.get(
      `${normalized}/_api/web?$select=Title,Url`,
      SPHttpClient.configurations.v1,
      { headers: NO_METADATA }
    );
    if (!response.ok) {
      throw new Error(`Site indisponível ou sem acesso (HTTP ${response.status}).`);
    }
    const body: { Title: string; Url: string } = (await response.json()) as { Title: string; Url: string };
    return { url: normalizeUrl(body.Url || normalized), title: body.Title };
  }

  /** Grupos SharePoint do site de dados. Retorna somente identificação e nome. */
  public async getSiteGroups(webUrl: string): Promise<IGroupRef[]> {
    const response: SPHttpClientResponse = await this._client.get(
      `${normalizeUrl(webUrl)}/_api/web/sitegroups?$select=Id,Title&$top=500&$orderby=Title`,
      SPHttpClient.configurations.v1,
      { headers: NO_METADATA }
    );
    if (!response.ok) {
      throw new Error(`Falha ao consultar grupos (HTTP ${response.status}).`);
    }
    const body: { value: { Id: number; Title: string }[] } = (await response.json()) as {
      value: { Id: number; Title: string }[];
    };
    return body.value.map((group: { Id: number; Title: string }) => ({ id: group.Id, title: group.Title }));
  }

  /** Listas de itens do site de dados (sem bibliotecas e sem as cópias HML_). Retorna somente os nomes, em ordem. */
  public async getSiteLists(webUrl: string): Promise<string[]> {
    const response: SPHttpClientResponse = await this._client.get(
      `${normalizeUrl(webUrl)}/_api/web/lists?$select=Title&$filter=Hidden%20eq%20false%20and%20BaseType%20eq%200&$orderby=Title&$top=500`,
      SPHttpClient.configurations.v1,
      { headers: NO_METADATA }
    );
    if (!response.ok) {
      throw new Error(`Falha ao consultar as listas (HTTP ${response.status}).`);
    }
    const body: { value: { Title: string }[] } = (await response.json()) as { value: { Title: string }[] };
    return body.value.map((list: { Title: string }) => list.Title).filter((name: string) => name.indexOf('HML_') !== 0);
  }

  /** Campos úteis de uma lista (sem os de sistema), com tipo e situação de índice. */
  public async getListFields(webUrl: string, listTitle: string): Promise<IListField[]> {
    const response: SPHttpClientResponse = await this._client.get(
      `${normalizeUrl(webUrl)}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle.replace(/'/g, "''"))}')/fields` +
        '?$select=InternalName,Title,TypeAsString,Indexed,Hidden,Choices&$filter=Hidden%20eq%20false&$top=500',
      SPHttpClient.configurations.v1,
      { headers: NO_METADATA }
    );
    if (response.status === 404) {
      throw new Error('Lista não encontrada neste ambiente.');
    }
    if (!response.ok) {
      throw new Error(`Falha ao consultar os campos (HTTP ${response.status}).`);
    }
    const body: { value: IRawField[] } = (await response.json()) as { value: IRawField[] };
    return toListFields(body.value);
  }

  private _isSameHost(url: string): boolean {
    try {
      return new URL(url).host === new URL(this._currentWebUrl).host;
    } catch {
      return false;
    }
  }
}
