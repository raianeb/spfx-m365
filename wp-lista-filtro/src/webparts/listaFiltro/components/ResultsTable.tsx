import * as React from 'react';
import styles from './ListaFiltro.module.scss';
import { IListField } from '../../../services/fieldSchema';
import { formatCell, isHttpUrl } from '../../../services/formatValue';
import { ListRow } from '../../../services/ListQueryService';

export interface IResultsTableProps {
  columns: IListField[];
  rows: ListRow[];
  /** Abre o item (primeira coluna vira botão). Ausente = sem link. */
  onOpenItem?: (id: number) => void;
  caption: string;
}

const renderValue = (row: ListRow, column: IListField): React.ReactNode => {
  const raw: unknown = row[column.name];
  if (column.type === 'URL' && typeof raw === 'string' && isHttpUrl(raw)) {
    const description: unknown = row[`${column.name}.desc`];
    return (
      <a href={raw} target="_blank" rel="noopener noreferrer">
        {typeof description === 'string' && description !== '' ? description : raw}
      </a>
    );
  }
  const text: string = formatCell(raw, column.type);
  // Texto longo é cortado em três linhas dentro da célula, sem alterar o layout da tabela.
  return column.type === 'Note' && text !== '' ? <span className={styles.clamp}>{text}</span> : text;
};

/** Tabela dos registros da página. Em telas estreitas, cada registro vira um bloco com rótulo por valor. */
const ResultsTable: React.FC<IResultsTableProps> = ({ columns, rows, onOpenItem, caption }) => (
  <div className={styles.tableWrap}>
    <table className={styles.table}>
      <caption className={styles.srOnly}>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column: IListField) => (
            <th key={column.name} scope="col">
              {column.title}
            </th>
          ))}
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
                  <td key={column.name} data-label={column.title} className={column.type === 'Note' ? styles.cellLong : undefined}>
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
