import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { TextField } from '@fluentui/react/lib/TextField';
import styles from './shared.module.scss';
import comunicadoStyles from './Comunicados.module.scss';
import coreStyles from '../../../core/core.module.scss';
import { ICategoria, IComunicado, IComunicadosProps } from './IComunicadosProps';
import { ICrudList, useCrudList } from '../../../crud/useCrudList';
import { DiagnosticsPanel } from '../../../core/diagnostics';
import { resolveListTitle } from '../../../core/config';
import { secondaryButtonStyles } from '../../../crud/modalStyles';
import { escapeOData } from '../../../services/SpListService';
import ComunicadoForm from './ComunicadoForm';
import CategoriaForm from './CategoriaForm';
import CategoriasModal from './CategoriasModal';
import ComunicadoReadModal from './ComunicadoReadModal';
import { toPlainText } from './richText';

const SELECT_COMUNICADOS: string[] = ['Id', 'Title', 'DataComunicado', 'CategoriaId', 'Mensagem', 'Autor'];
const SELECT_CATEGORIAS: string[] = ['Id', 'Title'];
/** Categorias são uma lista pequena: carregadas inteiras, uma vez por abertura da WP. */
const CATEGORY_LIMIT: number = 200;
const MAX_COLUMNS: number = 4;
/** Quantidade exibida ao abrir a WP e a cada "Carregar mais". */
const PAGE_SIZE: number = 3;
/** Espera após a última tecla antes de consultar a busca. */
const SEARCH_DEBOUNCE_MS: number = 300;
/** Limite da contagem de resultados da busca. Acima disso, a contagem indica o máximo consultado. */
const SEARCH_COUNT_LIMIT: number = 5000;
const DATE_OPTIONS: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };

export const formatComunicadoDate = (value: string): string => new Date(value).toLocaleString('pt-BR', DATE_OPTIONS);

/** Texto do contador ao lado do título. Total sempre considera todos os comunicados, sem filtro. */
const countLabel = (total: number | undefined, matches: number | undefined, searching: boolean): string => {
  if (total === undefined) {
    return '';
  }
  if (searching && matches !== undefined) {
    return `${matches} de ${total} ${total === 1 ? 'comunicado' : 'comunicados'}`;
  }
  return `${total} ${total === 1 ? 'comunicado' : 'comunicados'}`;
};

/** Campos visíveis, configurados na property pane. */
interface IDisplayOptions {
  showMessage: boolean;
  showCategory: boolean;
  showAuthor: boolean;
}

interface ICardProps {
  item: IComunicado;
  categoryName: string;
  actions: React.ReactNode;
  options: IDisplayOptions;
  onReadMore: (item: IComunicado) => void;
  featured?: boolean;
}

/**
 * Indica se o conteúdo não cabe na área visível (altura ou largura). É o que decide a exibição de "Ver mais".
 * Recalcula quando o elemento muda de tamanho.
 */
const useOverflow = (ref: React.RefObject<HTMLElement>, deps: ReadonlyArray<unknown>): boolean => {
  const [overflowing, setOverflowing] = React.useState<boolean>(false);
  React.useEffect((): (() => void) | undefined => {
    const element: HTMLElement | null = ref.current;
    if (!element) {
      setOverflowing(false);
      return undefined;
    }
    const measure = (): void => {
      setOverflowing(element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer: ResizeObserver = new ResizeObserver(measure);
    observer.observe(element);
    return (): void => observer.disconnect();
  }, [ref, ...deps]);
  return overflowing;
};

/** Cartão de altura fixa: título, data, categoria, mensagem e autor. Com mensagem cortada, mostra "Ver mais". */
const ComunicadoCard: React.FC<ICardProps> = ({ item, categoryName, actions, options, onReadMore, featured = false }) => {
  // Cartão mostra só o texto, sem formatação: a leitura completa fica no modal.
  const message: string = toPlainText(item.Mensagem);
  const showMessage: boolean = options.showMessage && message !== '';
  const showAuthor: boolean = options.showAuthor && Boolean(item.Autor);
  const messageRef: React.RefObject<HTMLDivElement> = React.useRef<HTMLDivElement>(null);
  const overflowing: boolean = useOverflow(messageRef, [message, showMessage, featured]);
  const articleClass: string = featured
    ? `${comunicadoStyles.card} ${comunicadoStyles.cardFeatured}`
    : comunicadoStyles.card;

  return (
    <article className={articleClass}>
      <header className={comunicadoStyles.cardHeader}>
        <h3 className={comunicadoStyles.cardTitle}>{item.Title}</h3>
        {actions}
      </header>
      <div className={comunicadoStyles.meta}>
        <span className={comunicadoStyles.date}>{formatComunicadoDate(item.DataComunicado)}</span>
        {options.showCategory && categoryName && <span className={comunicadoStyles.category}>{categoryName}</span>}
      </div>
      {showMessage && (
        <div ref={messageRef} className={comunicadoStyles.messageBox}>
          <p className={comunicadoStyles.message}>{message}</p>
        </div>
      )}
      {(overflowing || showAuthor) && (
        <div className={comunicadoStyles.cardFooter}>
          {overflowing && (
            <button
              type="button"
              className={comunicadoStyles.more}
              onClick={() => onReadMore(item)}
              aria-label={`Ver mais: ${item.Title}`}
            >
              Ver mais
            </button>
          )}
          {showAuthor && <span className={comunicadoStyles.author}>Autor: {item.Autor}</span>}
        </div>
      )}
    </article>
  );
};

/** Linha do layout compacto: data, título, categoria, mensagem em uma linha e "Ver mais" quando cortada. */
const ComunicadoRow: React.FC<ICardProps> = ({ item, categoryName, actions, options, onReadMore }) => {
  const message: string = toPlainText(item.Mensagem);
  const showMessage: boolean = options.showMessage && message !== '';
  const messageRef: React.RefObject<HTMLParagraphElement> = React.useRef<HTMLParagraphElement>(null);
  const overflowing: boolean = useOverflow(messageRef, [message, showMessage]);

  return (
    <article className={comunicadoStyles.row}>
      <span className={comunicadoStyles.rowDate}>{formatComunicadoDate(item.DataComunicado)}</span>
      <div className={comunicadoStyles.rowBody}>
        <h3 className={comunicadoStyles.rowTitle}>{item.Title}</h3>
        {options.showCategory && categoryName && <span className={comunicadoStyles.category}>{categoryName}</span>}
        {showMessage && (
          <p ref={messageRef} className={comunicadoStyles.rowMessage}>
            {message}
          </p>
        )}
        {overflowing && (
          <button
            type="button"
            className={`${comunicadoStyles.more} ${comunicadoStyles.rowMore}`}
            onClick={() => onReadMore(item)}
            aria-label={`Ver mais: ${item.Title}`}
          >
            Ver mais
          </button>
        )}
      </div>
      {options.showAuthor && item.Autor && <span className={comunicadoStyles.rowAuthor}>{item.Autor}</span>}
      <div className={comunicadoStyles.rowActions}>{actions}</div>
    </article>
  );
};

/**
 * Lista de comunicados em ordem de data (mais recentes primeiro), em um dos layouts configurados.
 * Exibe os primeiros itens e carrega mais no próprio lugar, com indicador de carregamento e busca pelo título.
 * A categoria é exibida a partir da lista auxiliar, sem Lookup. Administradores criam, editam e
 * excluem comunicados e categorias.
 */
const Comunicados: React.FC<IComunicadosProps> = ({
  service,
  logger,
  environment,
  adminGroupIds,
  title,
  themeStyle,
  listName,
  categoriesListName,
  layout,
  columns,
  showMessage,
  showCategory,
  showAuthor
}) => {
  const [shown, setShown] = React.useState<number>(PAGE_SIZE);
  const [searchText, setSearchText] = React.useState<string>('');
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [total, setTotal] = React.useState<number | undefined>(undefined);
  const [matches, setMatches] = React.useState<number | undefined>(undefined);
  const [categoriesOpen, setCategoriesOpen] = React.useState<boolean>(false);
  const [reading, setReading] = React.useState<IComunicado | undefined>(undefined);
  const categoryRef: React.MutableRefObject<ICategoria[]> = React.useRef<ICategoria[]>([]);
  const contextLabel: string = title || 'Comunicados';

  /** Nome físico da lista no ambiente. Vazio enquanto não houver lista escolhida (ou se for uma cópia HML_). */
  const resolveName = (baseName: string): string => {
    const base: string = baseName.trim();
    return base === '' || base.indexOf('HML_') === 0 ? '' : resolveListTitle(base, environment);
  };
  const comunicadosList: string = resolveName(listName);
  const categoriasList: string = resolveName(categoriesListName);
  const configured: boolean = comunicadosList !== '';
  const hasCategories: boolean = categoriasList !== '';
  const display: IDisplayOptions = { showMessage, showCategory, showAuthor };
  const safeColumns: number = Math.min(MAX_COLUMNS, Math.max(1, Math.round(columns)));
  const gridStyle: React.CSSProperties = { '--cc-columns': String(safeColumns) } as unknown as React.CSSProperties;

  /** Impede excluir categoria que ainda esteja em uso. A consulta usa o índice de CategoriaId. */
  const guardCategoryDelete = async (category: ICategoria): Promise<string | undefined> => {
    if (!configured) {
      return 'Escolha a lista de comunicados nas configurações da Web Part antes de excluir categorias.';
    }
    service.clearCache(comunicadosList);
    const inUse: Array<{ Id: number }> = await service.getItems<{ Id: number }>({
      listTitle: comunicadosList,
      select: ['Id'],
      filter: `CategoriaId eq ${category.Id}`,
      top: 1
    });
    return inUse.length > 0
      ? 'Esta categoria está em uso por comunicados. Altere esses comunicados antes de excluí-la.'
      : undefined;
  };

  const categories: ICrudList<ICategoria> = useCrudList<ICategoria>({
    service,
    logger,
    listTitle: categoriasList,
    adminGroupIds,
    singular: 'categoria',
    select: SELECT_CATEGORIAS,
    top: CATEGORY_LIMIT,
    query: () => ({ orderBy: 'Title asc' }),
    getLabel: (category: ICategoria) => category.Title,
    contextLabel,
    themeStyle,
    deps: [],
    enabled: hasCategories,
    guardDelete: guardCategoryDelete,
    renderForm: (context) => <CategoriaForm {...context} existing={categoryRef.current} />
  });
  categoryRef.current = categories.items ?? [];

  // A consulta pede um item a mais que o exibido, para saber se existe "Carregar mais".
  const comunicados: ICrudList<IComunicado> = useCrudList<IComunicado>({
    service,
    logger,
    listTitle: comunicadosList,
    adminGroupIds,
    singular: 'comunicado',
    select: SELECT_COMUNICADOS,
    top: shown + 1,
    query: () => ({
      orderBy: 'DataComunicado desc,Id desc',
      filter: searchTerm === '' ? undefined : `substringof('${escapeOData(searchTerm)}', Title)`
    }),
    getLabel: (item: IComunicado) => item.Title,
    contextLabel,
    themeStyle,
    deps: [searchTerm],
    enabled: configured,
    renderForm: (context) => <ComunicadoForm {...context} categories={categoryRef.current} />
  });

  // Digitação na busca: a consulta só muda depois de uma pausa, e a lista volta à primeira página.
  React.useEffect((): (() => void) => {
    const handle: number = window.setTimeout(() => {
      setSearchTerm(searchText.trim());
      setShown(PAGE_SIZE);
    }, SEARCH_DEBOUNCE_MS);
    return (): void => window.clearTimeout(handle);
  }, [searchText]);

  // Total de todos os comunicados, sem filtro. Atualiza após cada gravação ou exclusão.
  React.useEffect((): (() => void) | undefined => {
    let active: boolean = true;
    if (!configured) {
      return undefined;
    }
    service
      .getItemCount(comunicadosList)
      .then((count: number) => {
        if (active) {
          setTotal(count);
        }
      })
      .catch(() => {
        if (active) {
          setTotal(undefined);
        }
      });
    return (): void => {
      active = false;
    };
  }, [service, comunicadosList, configured, comunicados.revision]);

  // Quantidade de resultados da busca, quando há termo digitado.
  React.useEffect((): (() => void) | undefined => {
    let active: boolean = true;
    if (!configured || searchTerm === '') {
      setMatches(undefined);
      return undefined;
    }
    service
      .getItems<{ Id: number }>({
        listTitle: comunicadosList,
        select: ['Id'],
        filter: `substringof('${escapeOData(searchTerm)}', Title)`,
        top: SEARCH_COUNT_LIMIT
      })
      .then((found: Array<{ Id: number }>) => {
        if (active) {
          setMatches(found.length);
        }
      })
      .catch(() => {
        if (active) {
          setMatches(undefined);
        }
      });
    return (): void => {
      active = false;
    };
  }, [service, comunicadosList, configured, searchTerm, comunicados.revision]);

  const categoryNames: Map<number, string> = React.useMemo((): Map<number, string> => {
    const map: Map<number, string> = new Map<number, string>();
    (categories.items ?? []).forEach((category: ICategoria) => map.set(category.Id, category.Title));
    return map;
  }, [categories.items]);

  const categoryOf = (item: IComunicado): string =>
    typeof item.CategoriaId === 'number' ? categoryNames.get(item.CategoriaId) ?? '' : '';

  const toolbar: React.ReactNode = configured ? (
    <div className={comunicadoStyles.toolbar}>
      {hasCategories && categories.canManage && (
        <DefaultButton
          iconProps={{ iconName: 'Tag' }}
          text="Categorias"
          ariaLabel="Gerenciar categorias de comunicados"
          title="Gerenciar categorias de comunicados"
          onClick={() => setCategoriesOpen(true)}
          styles={secondaryButtonStyles}
        />
      )}
      {comunicados.toolbar}
    </div>
  ) : undefined;

  const loaded: IComunicado[] | undefined = comunicados.items;
  const items: IComunicado[] | undefined = loaded ? loaded.slice(0, shown) : undefined;
  const hasMore: boolean = loaded !== undefined && loaded.length > shown;
  // Durante o carregamento, o botão permanece visível e desabilitado, com o indicador ao lado.
  const showLoadMore: boolean =
    configured && !comunicados.hasError && items !== undefined && (hasMore || comunicados.loading);
  const searching: boolean = searchTerm !== '';
  const countText: string = configured ? countLabel(total, matches, searching) : '';

  const loadMore = (): void => setShown((current: number) => current + PAGE_SIZE);

  const renderCard = (item: IComunicado, featured: boolean): React.ReactNode => (
    <ComunicadoCard
      item={item}
      categoryName={categoryOf(item)}
      actions={comunicados.renderActions(item)}
      options={display}
      onReadMore={(target: IComunicado) => setReading(target)}
      featured={featured}
    />
  );

  let content: React.ReactNode;
  if (!configured) {
    content = <div className={styles.empty}>Escolha a lista de comunicados nas configurações da Web Part.</div>;
  } else if (comunicados.hasError) {
    content = <div className={styles.message} role="alert">Não foi possível carregar os comunicados.</div>;
  } else if (items === undefined || (items.length === 0 && comunicados.loading)) {
    content = <div className={styles.skeleton} aria-busy="true" aria-label="Carregando comunicados" />;
  } else if (items.length === 0) {
    content = (
      <div className={styles.empty}>
        {searching ? `Nenhum comunicado encontrado para "${searchTerm}".` : 'Nenhum comunicado publicado.'}
      </div>
    );
  } else if (layout === 'compact') {
    content = (
      <ul className={comunicadoStyles.list}>
        {items.map((item: IComunicado) => (
          <li key={item.Id}>
            <ComunicadoRow
              item={item}
              categoryName={categoryOf(item)}
              actions={comunicados.renderActions(item)}
              options={display}
              onReadMore={(target: IComunicado) => setReading(target)}
            />
          </li>
        ))}
      </ul>
    );
  } else {
    const featuredItem: IComunicado | undefined = layout === 'featured' ? items[0] : undefined;
    const gridItems: IComunicado[] = layout === 'featured' ? items.slice(1) : items;
    content = (
      <>
        {featuredItem && (
          <ul className={comunicadoStyles.featuredList}>
            <li>{renderCard(featuredItem, true)}</li>
          </ul>
        )}
        {gridItems.length > 0 && (
          <ul className={comunicadoStyles.grid} style={gridStyle}>
            {gridItems.map((item: IComunicado) => (
              <li key={item.Id}>{renderCard(item, false)}</li>
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <section className={styles.root} style={themeStyle} aria-label={contextLabel}>
      <header className={coreStyles.wpHeader}>
        {title && (
          <h2 className={coreStyles.wpTitle}>
            <Icon iconName="Megaphone" className={coreStyles.wpIcon} aria-hidden="true" />
            {title}
            {countText !== '' && <span className={comunicadoStyles.total}>{countText}</span>}
          </h2>
        )}
        {toolbar}
      </header>
      {configured && (
        <div className={comunicadoStyles.searchRow}>
          <TextField
            value={searchText}
            onChange={(_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, value?: string) =>
              setSearchText(value ?? '')
            }
            placeholder="Buscar comunicados pelo título"
            ariaLabel="Buscar comunicados pelo título"
            iconProps={{ iconName: 'Search' }}
          />
        </div>
      )}
      {content}
      {showLoadMore && (
        <div className={comunicadoStyles.loadMore}>
          {comunicados.loading && <Spinner size={SpinnerSize.small} label="Carregando" labelPosition="right" />}
          <DefaultButton
            text="Carregar mais"
            iconProps={{ iconName: 'ChevronDown' }}
            disabled={comunicados.loading}
            onClick={loadMore}
            styles={secondaryButtonStyles}
          />
        </div>
      )}
      <DiagnosticsPanel logger={logger} />
      {comunicados.modals}
      {reading && (
        <ComunicadoReadModal
          item={reading}
          categoryName={categoryOf(reading)}
          dateText={formatComunicadoDate(reading.DataComunicado)}
          contextLabel={contextLabel}
          themeStyle={themeStyle}
          onDismiss={() => setReading(undefined)}
        />
      )}
      {categoriesOpen && hasCategories && (
        <CategoriasModal
          contextLabel={contextLabel}
          themeStyle={themeStyle}
          list={categories}
          onDismiss={() => setCategoriesOpen(false)}
        />
      )}
    </section>
  );
};

export default Comunicados;
