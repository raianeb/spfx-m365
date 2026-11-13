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
import { IScanToken, isScanCancelled, scanItems } from '../../../services/scanService';
import ChartsModal from './ChartsModal';
import ItemModal from './ItemModal';
import { buttonStyles } from './controlStyles';
import FilterBar from './FilterBar';
import ResultsTable from './ResultsTable';
import { IAppliedQuery, IPagedQuery, usePagedQuery } from './usePagedQuery';

interface ICountState {
  status: 'idle' | 'counting' | 'done' | 'error';
  /** Registros lidos até agora (durante a contagem). */
  scanned: number;
  total: number;
}

const IDLE_COUNT: ICountState = { status: 'idle', scanned: 0, total: 0 };

export interface IListaFiltroProps extends ICommonProps {
  /** Nome base da lista (sem prefixo). Vazio = ainda não configurada. */
  listName: string;
  filterFields: string[];
  displayFields: string[];
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
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);
  const [count, setCount] = React.useState<ICountState>(IDLE_COUNT);
  const [exporting, setExporting] = React.useState<boolean>(false);
  const [exportNote, setExportNote] = React.useState<string>('');
  const [chartsOpen, setChartsOpen] = React.useState<boolean>(false);
  const [openItemId, setOpenItemId] = React.useState<number | undefined>(undefined);
  const queryCounter: React.MutableRefObject<number> = React.useRef<number>(0);

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
          newestFirst
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
  React.useEffect((): (() => void) | undefined => {
    if (!query || itemCount === undefined) {
      setCount(IDLE_COUNT);
      return undefined;
    }
    const token: IScanToken = { cancelled: false };
    setCount({ status: 'counting', scanned: 0, total: 0 });
    scanItems({
      service,
      listTitle,
      listItemCount: itemCount,
      conditions: query.conditions,
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
  }, [service, listTitle, itemCount, query, logger]);

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
          : `${NUMBER_FORMAT.format(result.rows.length)} registro(s) exportado(s).`
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
        ? `${NUMBER_FORMAT.format(count.total)} registro(s) encontrado(s)`
        : count.status === 'error'
          ? 'Não foi possível contar os registros'
          : '';
  // A barra aparece com a lista carregada; exportar e contar dependem de um filtro aplicado.
  const actions: React.ReactNode = list ? (
    <div className={styles.resultsBar}>
      <span className={styles.resultsCount} role="status" aria-live="polite">
        {countText}
      </span>
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
    const totalPages: number = count.status === 'done' ? Math.max(1, Math.ceil(count.total / pageSize)) : 0;
    const pagesText: string = totalPages > 0 ? ` de ${NUMBER_FORMAT.format(totalPages)}` : count.status === 'counting' ? ' (calculando total)' : '';
    const range: string =
      paged.firstRow > 0 && paged.lastRow >= paged.firstRow ? ` · registros ${paged.firstRow} a ${paged.lastRow}` : '';
    results = (
      <>
        <ResultsTable columns={columns} rows={paged.rows} onOpenItem={linkToItem ? setOpenItemId : undefined} caption={`Registros de ${contextLabel}`} />
        <nav className={styles.pager} aria-label="Paginação">
          <span className={styles.pagerInfo} role="status" aria-live="polite">
            Página {paged.page}
            {pagesText}
            {range}
          </span>
          <div className={styles.pagerButtons}>
            <IconButton
              iconProps={{ iconName: 'ChevronLeft' }}
              ariaLabel="Página anterior"
              title="Página anterior"
              disabled={!paged.hasPrevious || paged.loading}
              onClick={paged.previous}
            />
            <IconButton
              iconProps={{ iconName: 'ChevronRight' }}
              ariaLabel="Próxima página"
              title="Próxima página"
              disabled={!paged.hasNext || paged.loading}
              onClick={paged.next}
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
            openUrl={itemUrlBase ? `${itemUrlBase}${openItemId}` : undefined}
            onDismiss={(): void => setOpenItemId(undefined)}
          />
        )}
      </>
    );
  }

  return (
    <section className={styles.root} style={themeStyle} aria-label={contextLabel}>
      <header className={coreStyles.wpHeader}>
        {title && (
          <h2 className={coreStyles.wpTitle}>
            <Icon iconName="Filter" className={coreStyles.wpIcon} aria-hidden="true" />
            {title}
          </h2>
        )}
        {list && (
          <div className={styles.headerInfo}>
            <span>{NUMBER_FORMAT.format(list.itemCount)} na lista</span>
            {isAdmin && (
              <a href={`${origin}${list.rootFolderUrl}`} target="_blank" rel="noopener noreferrer">
                Abrir lista
              </a>
            )}
          </div>
        )}
      </header>
      {content}
      <DiagnosticsPanel logger={logger} />
    </section>
  );
};

export default ListaFiltro;
