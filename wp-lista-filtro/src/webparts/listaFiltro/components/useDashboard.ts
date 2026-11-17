import * as React from 'react';
import { DiagnosticsLogger } from '../../../core/diagnostics';
import { ICondition, buildConditions, isLargeList } from '../../../services/camlBuilder';
import { DashboardPeriod, IDashboardData, IPeriodRange, buildDashboard, isDashboardDimension, periodRange } from '../../../services/dashboard';
import { IListField, pickFields } from '../../../services/fieldSchema';
import { ListQueryService } from '../../../services/ListQueryService';
import { IScanToken, isScanCancelled, scanItems } from '../../../services/scanService';

/** Campo de data da evolução e do recorte de período: a data de criação existe em toda lista. */
const DATE_FIELD_NAME: string = 'Created';
/** Teto de linhas lidas, o mesmo dos gráficos. Acima disso o painel avisa que o resultado é parcial. */
const DASHBOARD_MAX_ROWS: number = 200000;
/** Validade do resultado em cache (skill sharepoint-dados-listas: cache com tempo de vida definido). */
const CACHE_TTL_MS: number = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES: number = 12;

interface IDashboardCacheEntry {
  expiresAt: number;
  loadedAt: Date;
  data: IDashboardData;
}

/** Cache dos números já calculados, por instância da Web Part. Guarda só o agregado, nunca as linhas. */
export type DashboardCache = Map<string, IDashboardCacheEntry>;

export const createDashboardCache = (): DashboardCache => new Map<string, IDashboardCacheEntry>();

export interface IDashboardQuery {
  service: ListQueryService;
  logger: DiagnosticsLogger;
  listTitle: string;
  itemCount: number;
  /** Campos úteis da lista. */
  fields: IListField[];
  /** Nomes internos dos campos de agrupamento configurados. */
  dimensionNames: string[];
  period: DashboardPeriod;
  /** Condições da consulta aplicada na tela, quando o usuário pede o mesmo recorte. */
  extraConditions: ICondition[];
  /** Muda a cada "Atualizar": ignora o cache e relê a lista. */
  refreshId: number;
  cache: DashboardCache;
}

export interface IDashboardState {
  status: 'loading' | 'done' | 'error';
  /** Registros lidos até agora, durante a leitura. */
  scanned: number;
  data?: IDashboardData;
  loadedAt?: Date;
  /** O campo de data não tem índice em lista grande: o período é recortado depois de ler a lista. */
  fullScan: boolean;
  dateField?: IListField;
  dimensions: IListField[];
  range: IPeriodRange;
}

const store = (cache: DashboardCache, key: string, entry: IDashboardCacheEntry): void => {
  cache.delete(key);
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest: string | undefined = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
  cache.set(key, entry);
};

/**
 * Lê os registros do período (só a data e os campos de agrupamento) e calcula os números do painel.
 * A leitura é paginada no servidor, cancelada quando o período muda, e o agregado fica em cache curto.
 */
export const useDashboard = (query: IDashboardQuery): IDashboardState => {
  const { service, logger, listTitle, itemCount, fields, dimensionNames, period, extraConditions, refreshId, cache } = query;
  const dimensionKey: string = dimensionNames.join('\n');

  const dimensions: IListField[] = React.useMemo(
    (): IListField[] => pickFields(dimensionKey === '' ? [] : dimensionKey.split('\n'), fields).filter(isDashboardDimension),
    [dimensionKey, fields]
  );
  const dateField: IListField | undefined = React.useMemo(
    (): IListField | undefined => fields.find((field: IListField) => field.name === DATE_FIELD_NAME && field.type === 'DateTime'),
    [fields]
  );
  // O dia entra na dependência para o período "andar" quando a página fica aberta de um dia para o outro.
  const todayKey: string = new Date().toDateString();
  const range: IPeriodRange = React.useMemo((): IPeriodRange => periodRange(period), [period, todayKey]);
  const fullScan: boolean = dateField !== undefined && isLargeList(itemCount) && !dateField.indexed;

  const conditions: ICondition[] = React.useMemo((): ICondition[] => {
    const dateConditions: ICondition[] =
      dateField && !fullScan
        ? buildConditions([dateField], { [dateField.name]: { dateMode: 'intervalo', from: range.from, to: range.to } }, 'inicio').conditions
        : [];
    // Condições com índice primeiro: é por elas que o SharePoint reduz o conjunto lido.
    return [...extraConditions, ...dateConditions].sort((a: ICondition, b: ICondition) => Number(b.usesIndex) - Number(a.usesIndex));
  }, [dateField, fullScan, range, extraConditions]);

  const cacheKey: string = React.useMemo(
    (): string => [listTitle, range.from, range.to, dimensionKey, conditions.map((condition: ICondition) => condition.xml).join('')].join('|'),
    [listTitle, range, dimensionKey, conditions]
  );

  const [result, setResult] = React.useState<{ key: string; status: 'done' | 'error'; data?: IDashboardData; loadedAt?: Date } | undefined>(undefined);
  const [scanned, setScanned] = React.useState<number>(0);
  const lastRefresh: React.MutableRefObject<number> = React.useRef<number>(refreshId);

  React.useEffect((): (() => void) | undefined => {
    const forced: boolean = lastRefresh.current !== refreshId;
    lastRefresh.current = refreshId;
    const cached: IDashboardCacheEntry | undefined = cache.get(cacheKey);
    if (!forced && cached && cached.expiresAt > Date.now()) {
      setResult({ key: cacheKey, status: 'done', data: cached.data, loadedAt: cached.loadedAt });
      logger.log('info', 'Gestão à vista', 'Números em cache');
      return undefined;
    }

    const token: IScanToken = { cancelled: false };
    const started: number = performance.now();
    setScanned(0);
    setResult(undefined);
    const viewFields: string[] = [...(dateField ? [dateField.name] : []), ...dimensions.map((field: IListField) => field.name)];
    scanItems({
      service,
      listTitle,
      listItemCount: itemCount,
      conditions,
      viewFields,
      collect: true,
      maxRows: DASHBOARD_MAX_ROWS,
      token,
      onProgress: (count: number): void => {
        if (!token.cancelled) {
          setScanned(count);
        }
      }
    })
      .then((scan) => {
        if (token.cancelled) {
          return;
        }
        const data: IDashboardData = buildDashboard(scan.rows, { dateField, dimensions, range, truncated: scan.truncated });
        const loadedAt: Date = new Date();
        store(cache, cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, loadedAt, data });
        setResult({ key: cacheKey, status: 'done', data, loadedAt });
        logger.log(
          'info',
          'Gestão à vista',
          `${scan.total} registro(s) lido(s) | ${fullScan ? 'lista inteira (data sem índice)' : 'filtro de período no servidor'}`,
          performance.now() - started
        );
      })
      .catch((failure: unknown) => {
        if (!token.cancelled && !isScanCancelled(failure)) {
          logger.log('error', 'Gestão à vista', failure instanceof Error ? failure.message : 'Falha ao calcular o painel');
          setResult({ key: cacheKey, status: 'error' });
        }
      });
    return (): void => {
      token.cancelled = true;
    };
  }, [service, logger, listTitle, itemCount, conditions, dateField, dimensions, range, fullScan, cache, cacheKey, refreshId]);

  const current = result && result.key === cacheKey ? result : undefined;
  return {
    status: current ? current.status : 'loading',
    scanned,
    data: current?.data,
    loadedAt: current?.loadedAt,
    fullScan,
    dateField,
    dimensions,
    range
  };
};
