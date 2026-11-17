import * as React from 'react';
import { IconButton } from '@fluentui/react/lib/Button';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './ListaFiltro.module.scss';
import coreStyles from '../../../core/core.module.scss';
import { ICommonProps } from '../../../core/config';
import { nomeFisico } from '../../../core/prefixos';
import { DiagnosticsPanel } from '../../../core/diagnostics';
import {
  FilterValues,
  ICondition,
  IConditionResult,
  IFilterValue,
  TextMatch,
  buildConditions,
  buildViewXml,
  isLargeList,
  needsIndexedFilter
} from '../../../services/camlBuilder';
import { IListField, isFilterable, pickFields } from '../../../services/fieldSchema';
import { exportRowsToExcel, EXPORT_MAX_ROWS } from '../../../services/exportExcel';
import { IListInfo } from '../../../services/ListQueryService';
import { IAppliedFilter, describeAppliedFilters, pluralize, withoutFilter } from '../../../services/filterSummary';
import { IScanToken, isScanCancelled, scanItems } from '../../../services/scanService';
import { ISort, ISortAvailability, ISortContext, nextSort, sortAvailability } from '../../../services/sortRules';
import ChartsModal from './ChartsModal';
import DashboardView from './DashboardView';
import ItemModal from './ItemModal';
import { buttonStyles, iconButtonStyles } from './controlStyles';
import FilterBar from './FilterBar';
import ResultsTable from './ResultsTable';
import { DashboardCache, createDashboardCache } from './useDashboard';
import { IAppliedQuery, IPagedQuery, usePagedQuery } from './usePagedQuery';

interface ICountState {
  status: 'idle' | 'counting' | 'done' | 'error';
  /** Registros lidos até agora (durante a contagem). */
  scanned: number;
  total: number;
}

const IDLE_COUNT: ICountState = { status: 'idle', scanned: 0, total: 0 };
const NO_CONDITIONS: ICondition[] = [];

export interface IListaFiltroProps extends ICommonProps {
  /** Nome base da lista (sem prefixo). Vazio = ainda não configurada. */
  listName: string;
  filterFields: string[];
  displayFields: string[];
  /** Campos de agrupamento da gestão à vista. */
  dashboardFields: string[];
  pageSize: number;
  textMatch: TextMatch;
  loadOnOpen: boolean;
  linkToItem: boolean;
  newestFirst: boolean;
}

const KEY_SEPARATOR: string = '\n';
const toKey = (names: string[]): string => names.join(KEY_SEPARATOR);
const fromKey = (key: string): string[] => (key === '' ? [] : key.split(KEY_SEPARATOR));
const NUMBER_FORMAT: Intl.NumberFormat = new Intl.NumberFormat('pt-BR');

/** Sem colunas configuradas, mostra o título do item (ou o primeiro campo disponível). */
const fallbackColumns = (fields: IListField[]): IListField[] => {
  const title: IListField | undefined = fields.find((field: IListField) => field.name === 'Title');
  return title ? [title] : fields.slice(0, 1);
};

/**
 * Consulta de uma lista com filtros e colunas configurados na Web Part. Os filtros rodam no servidor,
 * uma página por vez, para funcionar também em listas de alto volume.
 */
const ListaFiltro: React.FC<IListaFiltroProps> = ({
  service,
  logger,
  environment,
  prefixos,
  adminGroupIds,
  title,
  themeStyle,
  listName,
  filterFields,
  displayFields,
  dashboardFields,
  pageSize,
  textMatch,
  loadOnOpen,
  linkToItem,
  newestFirst
}) => {
  const listTitle: string = nomeFisico(listName, environment, prefixos);
  const configured: boolean = listTitle !== '';
  const contextLabel: string = title || 'Consulta';
  const filterKey: string = toKey(filterFields);
  const displayKey: string = toKey(displayFields);
  const adminKey: string = adminGroupIds.join(',');

  const [info, setInfo] = React.useState<{ listTitle: string; value: IListInfo } | undefined>(undefined);
  const [infoError, setInfoError] = React.useState<boolean>(false);
  const [draft, setDraft] = React.useState<FilterValues>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [notice, setNotice] = React.useState<string>('');
  const [query, setQuery] = React.useState<IAppliedQuery | undefined>(undefined);
  /** Valores da consulta aplicada: alimentam as etiquetas de filtro acima da tabela. */
  const [applied, setApplied] = React.useState<FilterValues>({});
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);
  const [count, setCount] = React.useState<ICountState>(IDLE_COUNT);
  const [exporting, setExporting] = React.useState<boolean>(false);
  const [exportNote, setExportNote] = React.useState<string>('');
  const [chartsOpen, setChartsOpen] = React.useState<boolean>(false);
  const [openItemId, setOpenItemId] = React.useState<number | undefined>(undefined);
  /** Tela atual: a consulta ou a gestão à vista. Os filtros e a página da consulta são preservados na troca. */
  const [view, setView] = React.useState<'consulta' | 'painel'>('consulta');
  const dashboardCache: React.MutableRefObject<DashboardCache> = React.useRef<DashboardCache>(createDashboardCache());
  const queryCounter: React.MutableRefObject<number> = React.useRef<number>(0);
  /** Ordenação pedida no cabeçalho da grade. A referência evita recriar `run` (e limpar os filtros) a cada troca. */
  const [sort, setSort] = React.useState<ISort | undefined>(undefined);
  const sortRef: React.MutableRefObject<ISort | undefined> = React.useRef<ISort | undefined>(undefined);
  const applySort = (next: ISort | undefined): void => {
    sortRef.current = next;
    setSort(next);
  };

  // Estrutura da lista: total de itens e campos. Uma leitura por lista.
  React.useEffect((): (() => void) | undefined => {
    let active: boolean = true;
    setInfoError(false);
    if (!configured) {
      setInfo(undefined);
      return undefined;
    }
    service
      .getListInfo(listTitle)
      .then((value: IListInfo) => {
        if (active) {
          setInfo({ listTitle, value });
        }
      })
      .catch(() => {
        if (active) {
          setInfoError(true);
        }
      });
    return (): void => {
      active = false;
    };
  }, [service, listTitle, configured]);

  // Perfil Administradores: vê o atalho para abrir a lista no SharePoint.
  React.useEffect((): (() => void) | undefined => {
    let active: boolean = true;
    if (adminKey === '') {
      setIsAdmin(false);
      return undefined;
    }
    const ids: number[] = adminKey.split(',').map(Number);
    service
      .getCurrentUserGroupIds()
      .then((groups: number[]) => {
        if (active) {
          setIsAdmin(groups.some((id: number) => ids.indexOf(id) !== -1));
        }
      })
      .catch(() => {
        if (active) {
          setIsAdmin(false);
        }
      });
    return (): void => {
      active = false;
    };
  }, [service, adminKey]);

  const list: IListInfo | undefined = info && info.listTitle === listTitle ? info.value : undefined;

  const filters: IListField[] = React.useMemo(
    (): IListField[] => (list ? pickFields(fromKey(filterKey), list.fields).filter(isFilterable) : []),
    [list, filterKey]
  );
  const columns: IListField[] = React.useMemo((): IListField[] => {
    if (!list) {
      return [];
    }
    const picked: IListField[] = pickFields(fromKey(displayKey), list.fields);
    return picked.length > 0 ? picked : fallbackColumns(list.fields);
  }, [list, displayKey]);

  /** Valida os filtros e aplica a consulta. Em lista grande, exige ao menos um filtro que use índice. */
  const run = React.useCallback(
    (values: FilterValues): void => {
      if (!list) {
        return;
      }
      const result: IConditionResult = buildConditions(filters, values, textMatch);
      setErrors(result.errors);
      if (Object.keys(result.errors).length > 0) {
        return;
      }
      if (needsIndexedFilter(result.conditions, list.itemCount)) {
        const usable: string[] = filters
          .filter((field: IListField) => field.indexed && !(field.type === 'Text' && textMatch === 'contem'))
          .map((field: IListField) => field.title);
        setNotice(
          usable.length > 0
            ? `Esta lista tem mais de 5.000 itens. Preencha ao menos um destes filtros: ${usable.join(', ')}.`
            : 'Esta lista tem mais de 5.000 itens e nenhum campo de filtro tem índice. Solicite a criação dos índices ao administrador.'
        );
        setQuery(undefined);
        logger.log('warn', 'Consulta', 'Bloqueada: lista grande sem filtro indexado preenchido');
        return;
      }
      setNotice('');
      setApplied(values);
      // Filtro novo: a ordenação só é mantida se continuar segura sem conhecer o total do novo filtro.
      const currentSort: ISort | undefined = sortRef.current;
      const sortField: IListField | undefined = currentSort ? columns.find((column: IListField) => column.name === currentSort.field) : undefined;
      const keptSort: ISort | undefined =
        sortField && sortAvailability(sortField, { itemCount: list.itemCount, hasFilter: result.conditions.length > 0 }).allowed
          ? currentSort
          : undefined;
      sortRef.current = keptSort;
      setSort(keptSort);
      queryCounter.current += 1;
      logger.log(
        'info',
        'Consulta',
        `${result.conditions.length} filtro(s) | ${
          result.conditions.length > 0 && isLargeList(list.itemCount) ? 'percurso pelo índice do filtro' : 'ordem por ID'
        } | ${pageSize} por página`
      );
      setQuery({
        id: queryCounter.current,
        conditions: result.conditions,
        viewXml: buildViewXml({
          viewFields: columns.map((column: IListField) => column.name),
          conditions: result.conditions,
          pageSize,
          itemCount: list.itemCount,
          newestFirst,
          sort: keptSort
        })
      });
    },
    [list, filters, columns, textMatch, pageSize, newestFirst, logger]
  );

  // Lista ou configuração nova: limpa os filtros e, se configurado, carrega a primeira página.
  React.useEffect((): void => {
    setDraft({});
    setErrors({});
    setNotice('');
    if (loadOnOpen) {
      run({});
    } else {
      setQuery(undefined);
    }
  }, [run, loadOnOpen]);

  const paged: IPagedQuery = usePagedQuery(service, listTitle, query);

  // Total de registros do filtro: uma varredura só de IDs, cancelada quando a consulta muda.
  const itemCount: number | undefined = list?.itemCount;
  const queryConditions: ICondition[] | undefined = query?.conditions;
  React.useEffect((): (() => void) | undefined => {
    if (!queryConditions || itemCount === undefined) {
      setCount(IDLE_COUNT);
      return undefined;
    }
    const token: IScanToken = { cancelled: false };
    setCount({ status: 'counting', scanned: 0, total: 0 });
    scanItems({
      service,
      listTitle,
      listItemCount: itemCount,
      conditions: queryConditions,
      viewFields: ['ID'],
      collect: false,
      maxRows: 0,
      token,
      onProgress: (scanned: number): void => {
        if (!token.cancelled) {
          setCount((current: ICountState) => ({ ...current, scanned }));
        }
      }
    })
      .then((result) => {
        if (!token.cancelled) {
          setCount({ status: 'done', scanned: result.total, total: result.total });
        }
      })
      .catch((failure: unknown) => {
        if (!token.cancelled && !isScanCancelled(failure)) {
          logger.log('error', 'Contagem', 'Não foi possível contar os registros do filtro');
          setCount({ status: 'error', scanned: 0, total: 0 });
        }
      });
    return (): void => {
      token.cancelled = true;
    };
    // Depende das condições, não da consulta: trocar só a ordenação não refaz a contagem.
  }, [service, listTitle, itemCount, queryConditions, logger]);

  const exportToExcel = async (): Promise<void> => {
    if (!query || !list || exporting) {
      return;
    }
    setExporting(true);
    setExportNote('');
    try {
      const result = await scanItems({
        service,
        listTitle,
        listItemCount: list.itemCount,
        conditions: query.conditions,
        viewFields: columns.map((column: IListField) => column.name),
        collect: true,
        maxRows: EXPORT_MAX_ROWS,
        token: { cancelled: false }
      });
      const stamp: string = new Date().toISOString().slice(0, 10);
      await exportRowsToExcel(`${listTitle}-${stamp}.xlsx`, columns, result.rows);
      setExportNote(
        result.truncated
          ? `Exportados os primeiros ${NUMBER_FORMAT.format(EXPORT_MAX_ROWS)} de ${NUMBER_FORMAT.format(result.total)} registros. Refine o filtro para exportar tudo.`
          : `${pluralize(result.rows.length, NUMBER_FORMAT.format(result.rows.length), 'registro exportado', 'registros exportados')}.`
      );
      logger.log('info', 'Exportação', `${result.rows.length} registro(s) exportado(s) para Excel`);
    } catch (failure: unknown) {
      logger.log('error', 'Exportação', failure instanceof Error ? failure.message : 'Falha na exportação');
      setExportNote('Não foi possível exportar. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const countText: string =
    count.status === 'counting'
      ? `Contando registros… ${NUMBER_FORMAT.format(count.scanned)} lidos`
      : count.status === 'done'
        ? pluralize(count.total, NUMBER_FORMAT.format(count.total), 'registro encontrado', 'registros encontrados')
        : count.status === 'error'
          ? 'Não foi possível contar os registros'
          : '';
  const sortContext: ISortContext = {
    itemCount: itemCount ?? 0,
    hasFilter: (queryConditions?.length ?? 0) > 0,
    filteredTotal: count.status === 'done' ? count.total : undefined
  };
  const getSortAvailability = (column: IListField): ISortAvailability => sortAvailability(column, sortContext);
  /** Ordena no servidor: nova consulta com as mesmas condições, a partir da primeira página. */
  const changeSort = (column: IListField): void => {
    if (!query || !list || !getSortAvailability(column).allowed) {
      return;
    }
    const next: ISort | undefined = nextSort(sort, column.name);
    applySort(next);
    queryCounter.current += 1;
    logger.log('info', 'Consulta', next ? `Ordenação por ${column.name} (${next.ascending ? 'crescente' : 'decrescente'})` : 'Ordenação padrão');
    setQuery({
      id: queryCounter.current,
      conditions: query.conditions,
      viewXml: buildViewXml({
        viewFields: columns.map((item: IListField) => item.name),
        conditions: query.conditions,
        pageSize,
        itemCount: list.itemCount,
        newestFirst,
        sort: next
      })
    });
  };

  const appliedFilters: IAppliedFilter[] = React.useMemo(
    (): IAppliedFilter[] => (query ? describeAppliedFilters(filters, applied, textMatch) : []),
    [query, filters, applied, textMatch]
  );
  /** Remove um filtro aplicado e refaz a consulta com os demais. */
  const removeFilter = (name: string): void => {
    const next: FilterValues = withoutFilter(applied, name);
    setDraft(next);
    run(next);
  };

  // A barra aparece com a lista carregada; exportar e contar dependem de um filtro aplicado.
  const actions: React.ReactNode = list ? (
    <div className={styles.resultsBar}>
      <div className={styles.resultsSummary}>
        <span className={styles.resultsCount} role="status" aria-live="polite">
          {countText}
        </span>
        {appliedFilters.length > 0 && (
          <ul className={styles.appliedFilters} aria-label="Filtros aplicados">
            {appliedFilters.map((filter: IAppliedFilter) => (
              <li key={filter.name} className={styles.appliedFilter}>
                <span className={styles.appliedFilterText}>{filter.label}</span>
                <button
                  type="button"
                  className={styles.appliedFilterRemove}
                  aria-label={`Remover filtro ${filter.label}`}
                  title="Remover filtro"
                  disabled={paged.loading}
                  onClick={(): void => removeFilter(filter.name)}
                >
                  <Icon iconName="Cancel" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.resultsActions}>
        <DefaultButton
          text={exporting ? 'Exportando…' : 'Exportar Excel'}
          iconProps={{ iconName: 'ExcelDocument' }}
          disabled={!query || exporting || paged.loading || paged.rows === undefined}
          onClick={(): void => {
            exportToExcel().catch(() => undefined);
          }}
          styles={buttonStyles}
        />
        <DefaultButton
          text="Gráficos"
          iconProps={{ iconName: 'BarChartVertical' }}
          disabled={!list || paged.loading}
          onClick={(): void => setChartsOpen(true)}
          styles={buttonStyles}
        />
      </div>
    </div>
  ) : undefined;

  const origin: string = React.useMemo((): string => new URL(service.webUrl).origin, [service.webUrl]);
  const itemUrlBase: string | undefined = list && linkToItem ? `${origin}${list.rootFolderUrl}/DispForm.aspx?ID=` : undefined;

  const changeFilter = (name: string, value: IFilterValue): void => setDraft((current: FilterValues) => ({ ...current, [name]: value }));
  const clear = (): void => {
    setDraft({});
    setErrors({});
    setNotice('');
    if (loadOnOpen) {
      run({});
    } else {
      setQuery(undefined);
    }
  };

  let results: React.ReactNode;
  if (notice !== '') {
    results = <div className={styles.message} role="status">{notice}</div>;
  } else if (!query) {
    results = <div className={styles.empty}>Preencha os filtros e selecione Filtrar para ver os registros.</div>;
  } else if (paged.error) {
    results = <div className={styles.message} role="alert">{paged.error}</div>;
  } else if (paged.rows === undefined) {
    results = <div className={styles.skeleton} aria-busy="true" aria-label="Carregando registros" />;
  } else if (paged.rows.length === 0) {
    results = <div className={styles.empty}>Nenhum registro encontrado.</div>;
  } else {
    // Total de páginas do filtro: vem da contagem. Enquanto ela roda, o rodapé mostra só a página atual.
    const counted: boolean = count.status === 'done';
    const totalPages: number = counted ? Math.max(1, Math.ceil(count.total / pageSize)) : 0;
    const pagesText: string = `Página ${NUMBER_FORMAT.format(paged.page)}${
      totalPages > 0 ? ` de ${NUMBER_FORMAT.format(totalPages)}` : count.status === 'counting' ? ' (calculando total)' : ''
    }`;
    // Faixa de registros primeiro ("1–50 de 277"): é o que o usuário procura ao paginar.
    const range: string =
      paged.firstRow > 0 && paged.lastRow >= paged.firstRow
        ? `${NUMBER_FORMAT.format(paged.firstRow)}–${NUMBER_FORMAT.format(paged.lastRow)}${counted ? ` de ${NUMBER_FORMAT.format(count.total)}` : ''} · `
        : '';
    results = (
      <>
        <ResultsTable
          columns={columns}
          rows={paged.rows}
          onOpenItem={linkToItem ? setOpenItemId : undefined}
          caption={`Registros de ${contextLabel}`}
          sort={sort}
          getSortAvailability={getSortAvailability}
          onSort={changeSort}
          busy={paged.loading}
        />
        <nav className={styles.pager} aria-label="Paginação">
          <span className={styles.pagerInfo} role="status" aria-live="polite">
            {range}
            {pagesText}
          </span>
          <div className={styles.pagerButtons}>
            <IconButton
              iconProps={{ iconName: 'ChevronLeft' }}
              ariaLabel="Página anterior"
              title="Página anterior"
              disabled={!paged.hasPrevious || paged.loading}
              onClick={paged.previous}
              styles={iconButtonStyles}
            />
            <IconButton
              iconProps={{ iconName: 'ChevronRight' }}
              ariaLabel="Próxima página"
              title="Próxima página"
              disabled={!paged.hasNext || paged.loading}
              onClick={paged.next}
              styles={iconButtonStyles}
            />
          </div>
        </nav>
      </>
    );
  }

  let content: React.ReactNode;
  if (!configured) {
    content = <div className={styles.empty}>Selecione a lista nas configurações da Web Part.</div>;
  } else if (infoError) {
    content = <div className={styles.message} role="alert">Não foi possível ler a lista. Confira a lista, o ambiente e o seu acesso.</div>;
  } else if (!list) {
    content = <div className={styles.skeleton} aria-busy="true" aria-label="Carregando" />;
  } else if (view === 'painel') {
    content = (
      <DashboardView
        service={service}
        logger={logger}
        listTitle={listTitle}
        list={list}
        dimensionNames={dashboardFields}
        queryConditions={query?.conditions ?? NO_CONDITIONS}
        contextLabel={contextLabel}
        cache={dashboardCache.current}
      />
    );
  } else {
    content = (
      <>
        <FilterBar
          fields={filters}
          values={draft}
          errors={errors}
          textMatch={textMatch}
          busy={paged.loading}
          onChange={changeFilter}
          onApply={() => run(draft)}
          onClear={clear}
        />
        {actions}
        {exportNote !== '' && (
          <div className={styles.chartsHint} role="status">
            {exportNote}
          </div>
        )}
        <div className={styles.results}>{results}</div>
        {list && (
          <ChartsModal
            isOpen={chartsOpen}
            onDismiss={(): void => setChartsOpen(false)}
            service={service}
            listTitle={listTitle}
            itemCount={list.itemCount}
            fields={list.fields}
            conditions={query?.conditions ?? []}
            hasFilter={(query?.conditions.length ?? 0) > 0}
            contextLabel={contextLabel}
            themeStyle={themeStyle}
          />
        )}
        {list && openItemId !== undefined && (
          <ItemModal
            service={service}
            listTitle={listTitle}
            fields={list.fields}
            columns={columns}
            itemId={openItemId}
            itemCount={list.itemCount}
            contextLabel={contextLabel}
            themeStyle={themeStyle}
            openUrl={itemUrlBase ? `${itemUrlBase}${openItemId}` : undefined}
            onDismiss={(): void => setOpenItemId(undefined)}
          />
        )}
      </>
    );
  }

  const inDashboard: boolean = view === 'painel' && list !== undefined;

  return (
    <section className={styles.root} style={themeStyle} aria-label={contextLabel}>
      <header className={coreStyles.wpHeader}>
        {inDashboard ? (
          <div className={styles.headerActions}>
            <IconButton
              iconProps={{ iconName: 'ChevronLeft' }}
              ariaLabel="Voltar para a consulta"
              title="Voltar para a consulta"
              onClick={(): void => setView('consulta')}
              styles={iconButtonStyles}
            />
            <h2 className={coreStyles.wpTitle}>
              <Icon iconName="ViewDashboard" className={coreStyles.wpIcon} aria-hidden="true" />
              Gestão à vista{title ? ` · ${title}` : ''}
            </h2>
          </div>
        ) : (
          title && (
            <h2 className={coreStyles.wpTitle}>
              <Icon iconName="Table" className={coreStyles.wpIcon} aria-hidden="true" />
              {title}
            </h2>
          )
        )}
        {list && (
          <div className={styles.headerActions}>
            {!inDashboard && (
              <IconButton
                iconProps={{ iconName: 'ViewDashboard' }}
                ariaLabel="Abrir gestão à vista"
                title="Abrir gestão à vista"
                onClick={(): void => setView('painel')}
                styles={iconButtonStyles}
              />
            )}
            <div className={styles.headerInfo}>
              <span>{NUMBER_FORMAT.format(list.itemCount)} na lista</span>
              {isAdmin && (
                <a href={`${origin}${list.rootFolderUrl}`} target="_blank" rel="noopener noreferrer">
                  Abrir lista
                </a>
              )}
            </div>
          </div>
        )}
      </header>
      {content}
      <DiagnosticsPanel logger={logger} />
    </section>
  );
};

export default ListaFiltro;
