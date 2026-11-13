import * as React from 'react';
import { ICondition } from '../../../services/camlBuilder';
import { IListPage, ListQueryService, ListRow, isThresholdError } from '../../../services/ListQueryService';

/** Consulta aplicada. O id muda a cada "Filtrar", mesmo com os mesmos filtros. */
export interface IAppliedQuery {
  id: number;
  viewXml: string;
  /** Condições do filtro, reaproveitadas pela contagem, exportação e gráficos. */
  conditions: ICondition[];
}

export interface IPagedQuery {
  rows: ListRow[] | undefined;
  loading: boolean;
  /** Mensagem pronta para o usuário. */
  error: string | undefined;
  /** Página atual, a partir de 1. */
  page: number;
  firstRow: number;
  lastRow: number;
  hasNext: boolean;
  hasPrevious: boolean;
  next: () => void;
  previous: () => void;
}

interface ICursor {
  queryId: number;
  page: number;
  /** Cursor de cada página já alcançada. A primeira página não tem cursor. */
  tokens: Array<string | undefined>;
}

const THRESHOLD_MESSAGE: string =
  'A consulta ultrapassou o limite de 5.000 itens do SharePoint. Preencha um filtro com índice ou refine os filtros.';
const GENERIC_MESSAGE: string = 'Não foi possível consultar os registros. Tente novamente.';

/**
 * Paginação por cursor: cada página é pedida ao servidor com o cursor devolvido pela anterior.
 * "Anterior" reutiliza os cursores guardados, e respostas fora de ordem são descartadas.
 */
export const usePagedQuery = (service: ListQueryService, listTitle: string, query: IAppliedQuery | undefined): IPagedQuery => {
  const [cursor, setCursor] = React.useState<ICursor>({ queryId: -1, page: 0, tokens: [undefined] });
  const [data, setData] = React.useState<{ key: string; page: IListPage } | undefined>(undefined);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);

  // Consulta nova começa na primeira página, sem depender de um efeito para zerar o cursor.
  const active: ICursor = query && cursor.queryId === query.id ? cursor : { queryId: query?.id ?? -1, page: 0, tokens: [undefined] };
  const requestKey: string | undefined = query ? `${listTitle}|${query.id}|${active.page}` : undefined;
  const token: string | undefined = active.tokens[active.page];
  const viewXml: string | undefined = query?.viewXml;

  React.useEffect((): (() => void) | undefined => {
    if (requestKey === undefined || viewXml === undefined) {
      setData(undefined);
      setError(undefined);
      setLoading(false);
      return undefined;
    }
    let current: boolean = true;
    setLoading(true);
    setError(undefined);
    service
      .queryPage(listTitle, viewXml, token)
      .then((page: IListPage) => {
        if (current) {
          setData({ key: requestKey, page });
          setLoading(false);
        }
      })
      .catch((failure: unknown) => {
        if (current) {
          setError(isThresholdError(failure) ? THRESHOLD_MESSAGE : GENERIC_MESSAGE);
          setLoading(false);
        }
      });
    return (): void => {
      current = false;
    };
  }, [service, listTitle, viewXml, requestKey, token]);

  const page: IListPage | undefined = data && data.key === requestKey ? data.page : undefined;
  const nextPaging: string | undefined = page?.nextPaging;

  const next = (): void => {
    if (!query || nextPaging === undefined) {
      return;
    }
    setCursor({ queryId: query.id, page: active.page + 1, tokens: [...active.tokens.slice(0, active.page + 1), nextPaging] });
  };

  const previous = (): void => {
    if (!query || active.page === 0) {
      return;
    }
    setCursor({ queryId: query.id, page: active.page - 1, tokens: active.tokens });
  };

  return {
    rows: page?.rows,
    loading,
    error,
    page: active.page + 1,
    firstRow: page?.firstRow ?? 0,
    lastRow: page?.lastRow ?? 0,
    hasNext: nextPaging !== undefined,
    hasPrevious: active.page > 0,
    next,
    previous
  };
};
