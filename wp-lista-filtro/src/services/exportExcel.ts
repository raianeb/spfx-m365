import { IListField } from './fieldSchema';
import { formatCell } from './formatValue';
import { ListRow } from './ListQueryService';

/** Limite de linhas exportadas. Acima disso o arquivo fica pesado para o navegador do usuário. */
export const EXPORT_MAX_ROWS: number = 50000;

const NUMERIC_TYPES: ReadonlySet<string> = new Set<string>(['Number', 'Currency', 'Integer', 'Counter']);

/** Célula do Excel: número para campos numéricos (somável no Excel), texto para o restante. */
const toCell = (raw: unknown, column: IListField): string | number => {
  if (NUMERIC_TYPES.has(column.type) && typeof raw === 'number' && isFinite(raw)) {
    return raw;
  }
  return formatCell(raw, column.type);
};

/**
 * Gera um .xlsx com as colunas exibidas e os registros filtrados.
 * A biblioteca é carregada sob demanda, só quando o usuário exporta.
 */
export const exportRowsToExcel = async (fileName: string, columns: IListField[], rows: ListRow[]): Promise<void> => {
  const XLSX = await import(/* webpackChunkName: "xlsx" */ 'xlsx');
  const header: string[] = columns.map((column: IListField) => column.title);
  const body: Array<Array<string | number>> = rows.map((row: ListRow) =>
    columns.map((column: IListField) => toCell(row[column.name], column))
  );
  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, columns.length - 1) } }) };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Registros');
  XLSX.writeFile(workbook, fileName, { compression: true });
};
