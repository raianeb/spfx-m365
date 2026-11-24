import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './ListaFiltro.module.scss';
import { IListField } from '../../../services/fieldSchema';
import { formatCell, isHttpUrl } from '../../../services/formatValue';
import { ListRow } from '../../../services/ListQueryService';
import { ISort, ISortAvailability } from '../../../services/sortRules';

export interface IResultsTableProps {
  columns: IListField[];
  rows: ListRow[];
  /** Abre o item (primeira coluna vira botão). Ausente = sem link. */
  onOpenItem?: (id: number) => void;
  caption: string;
  /** Ordenação aplicada. Ausente = ordem padrão. */
  sort?: ISort;
  /** Se a coluna pode ser ordenada agora e, quando não pode, o motivo. */
  getSortAvailability: (column: IListField) => ISortAvailability;
  onSort: (column: IListField) => void;
  /** Consulta em andamento: os controles de ordenação ficam desabilitados. */
  busy: boolean;
}

const NUMERIC_TYPES: ReadonlySet<string> = new Set<string>(['Number', 'Currency', 'Integer']);
const NO_WRAP_TYPES: ReadonlySet<string> = new Set<string>(['DateTime', 'Boolean', 'Counter']);
const TEXT_TYPES: ReadonlySet<string> = new Set<string>(['Text', 'Note', 'Choice', 'MultiChoice', 'Calculated']);
/** Acima deste tamanho o texto é cortado em duas linhas. */
const LONG_TEXT: number = 60;
/** Acima deste tamanho a célula ganha largura mínima. */
const MEDIUM_TEXT: number = 20;

const renderValue = (row: ListRow, column: IListField): React.ReactNode => {
  const raw: unknown = row[column.name];
  if (column.type === 'URL' && typeof raw === 'string' && isHttpUrl(raw)) {
    const description: unknown = row[`${column.name}.desc`];
    const hasDescription: boolean = typeof description === 'string' && description !== '' && description !== raw;
    // Sem descrição, o endereço fica em uma linha com reticências; o endereço completo vai no title.
    return (
      <a href={raw} target="_blank" rel="noopener noreferrer" title={raw} className={hasDescription ? undefined : styles.urlLink}>
        {hasDescription ? (description as string) : raw.replace(/^https?:\/\//, '')}
      </a>
    );
  }
  const text: string = formatCell(raw, column.type);
  // Texto longo é cortado em duas linhas dentro da célula; o valor completo fica no title.
  return text.length > LONG_TEXT ? (
    <span className={styles.clamp} title={text}>
      {text}
    </span>
  ) : (
    text
  );
};

/** Largura mínima da célula pelo tamanho do texto, para não quebrar uma palavra por linha. */
const textWidthClass = (row: ListRow, column: IListField): string | undefined => {
  if (!TEXT_TYPES.has(column.type)) {
    return undefined;
  }
  const length: number = formatCell(row[column.name], column.type).length;
  if (length > LONG_TEXT) {
    return styles.cellLong;
  }
  return length > MEDIUM_TEXT ? styles.cellMedium : undefined;
};

/** Classe da coluna pelo tipo do campo: datas, números e Sim/Não não quebram; números alinham à direita. */
const columnClass = (column: IListField): string | undefined => {
  if (NUMERIC_TYPES.has(column.type)) {
    return `${styles.cellNoWrap} ${styles.cellNumber}`;
  }
  return NO_WRAP_TYPES.has(column.type) ? styles.cellNoWrap : undefined;
};

/** Tabela dos registros da página. Em telas estreitas, cada registro vira um bloco com rótulo por valor. */
const ResultsTable: React.FC<IResultsTableProps> = ({ columns, rows, onOpenItem, caption, sort, getSortAvailability, onSort, busy }) => (
  <div className={styles.tableWrap}>
    <table className={styles.table}>
      <caption className={styles.srOnly}>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column: IListField) => {
            const availability: ISortAvailability = getSortAvailability(column);
            const active: boolean = sort !== undefined && sort.field === column.name;
            const numeric: boolean = NUMERIC_TYPES.has(column.type);
            const ariaSort: 'ascending' | 'descending' | undefined = active ? (sort?.ascending ? 'ascending' : 'descending') : undefined;
            // Próximo estado do clique: crescente, decrescente e de volta à ordem padrão.
            const action: string = !active ? 'Ordenar em ordem crescente' : sort?.ascending ? 'Ordenar em ordem decrescente' : 'Remover ordenação';
            const hint: string = availability.allowed ? `${action}: ${column.title}` : availability.reason;
            return (
              <th key={column.name} scope="col" aria-sort={ariaSort} className={numeric ? styles.cellNumber : undefined}>
                {availability.sortable ? (
                  <span title={hint}>
                    <button
                      type="button"
                      className={active ? `${styles.sortButton} ${styles.sortButtonActive}` : styles.sortButton}
                      aria-label={hint}
                      disabled={!availability.allowed || busy}
                      onClick={(): void => onSort(column)}
                    >
                      {column.title}
                      <Icon iconName={!active ? 'Sort' : sort?.ascending ? 'SortUp' : 'SortDown'} className={styles.sortIcon} aria-hidden="true" />
                    </button>
                  </span>
                ) : (
                  column.title
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((row: ListRow, rowIndex: number) => {
          const id: string = String(row.ID ?? '');
          return (
            <tr key={id || rowIndex}>
              {columns.map((column: IListField, index: number) => {
                const content: React.ReactNode = renderValue(row, column);
                const linked: boolean = index === 0 && onOpenItem !== undefined && id !== '' && column.type !== 'URL';
                return (
                  <td key={column.name} data-label={column.title} className={columnClass(column) ?? textWidthClass(row, column)}>
                    {linked ? (
                      <button type="button" className={styles.linkButton} onClick={(): void => onOpenItem?.(Number(id))}>
                        {content || `Item ${id}`}
                      </button>
                    ) : (
                      content
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default ResultsTable;
