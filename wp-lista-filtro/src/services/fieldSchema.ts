/** Campo de lista, reduzido ao que a Web Part usa para filtrar e exibir. */
export interface IListField {
  /** Nome interno, usado nas consultas. */
  name: string;
  /** Rótulo visível da coluna. */
  title: string;
  /** Tipo do SharePoint (TypeAsString). */
  type: string;
  indexed: boolean;
  /** Opções dos campos de escolha. */
  choices: string[];
}

/** Formato dos campos devolvido pela API REST de campos. */
export interface IRawField {
  InternalName: string;
  Title: string;
  TypeAsString: string;
  Indexed?: boolean;
  Hidden?: boolean;
  Choices?: string[] | { results?: string[] };
}

/** Limite de itens que o SharePoint percorre em uma consulta sem índice. */
export const LIST_VIEW_THRESHOLD: number = 5000;

/** Tipos que aceitam índice e têm controle de filtro nesta Web Part. */
const FILTERABLE_TYPES: ReadonlySet<string> = new Set<string>([
  'Text',
  'Choice',
  'Number',
  'Currency',
  'DateTime',
  'Boolean',
  'Counter',
  'Integer'
]);

/** Tipos sem valor próprio para leitura: são calculados pela interface do SharePoint. */
const HIDDEN_TYPES: ReadonlySet<string> = new Set<string>(['Computed', 'Attachments', 'ContentTypeId', 'ThreadIndex', 'Guid', 'File', 'ModStat', 'AllDayEvent', 'Recurrence', 'CrossProjectLink']);

/** Campos de sistema que passam pelo filtro "não oculto", mas não têm utilidade para o usuário final. */
const SYSTEM_NAMES: ReadonlySet<string> = new Set<string>([
  'ContentType',
  'Attachments',
  'Edit',
  'LinkTitle',
  'LinkTitleNoMenu',
  'DocIcon',
  'ItemChildCount',
  'FolderChildCount',
  'AppAuthor',
  'AppEditor',
  'ComplianceAssetId',
  'SelectTitle',
  'Order',
  'GUID',
  'FileRef',
  'FileDirRef',
  'FileLeafRef',
  'FSObjType',
  'UniqueId',
  'ParentUniqueId',
  'SMTotalSize',
  'SMLastModifiedDate',
  'SMTotalFileStreamSize',
  'SMTotalFileCount',
  'owshiddenversion',
  'WorkflowVersion',
  'WorkflowInstanceID',
  'InstanceID',
  'MetaInfo',
  'ScopeId',
  'ProgId',
  'SortBehavior',
  'PermMask',
  'Restricted',
  'OriginatorId',
  'NoExecute',
  'ContentVersion',
  'AccessPolicy',
  'BSN',
  'HTML_x0020_File_x0020_Type',
  'File_x0020_Type',
  'Created_x0020_Date',
  'Last_x0020_Modified',
  'SyncClientId',
  'ServerUrl',
  'EncodedAbsUrl',
  'BaseName'
]);

const TYPE_LABELS: Record<string, string> = {
  Text: 'Texto',
  Note: 'Texto longo',
  Number: 'Número',
  Currency: 'Moeda',
  DateTime: 'Data',
  Choice: 'Opção',
  MultiChoice: 'Opções (várias)',
  Boolean: 'Sim/Não',
  User: 'Pessoa',
  UserMulti: 'Pessoas',
  Lookup: 'Consulta',
  LookupMulti: 'Consulta (várias)',
  URL: 'Link',
  Counter: 'ID',
  Integer: 'Número inteiro',
  Calculated: 'Calculado',
  TaxonomyFieldType: 'Metadados',
  TaxonomyFieldTypeMulti: 'Metadados (vários)'
};

export const typeLabel = (type: string): string => TYPE_LABELS[type] ?? type;

const readChoices = (raw: IRawField): string[] => {
  if (Array.isArray(raw.Choices)) {
    return raw.Choices;
  }
  return raw.Choices?.results ?? [];
};

/** Campo útil para o usuário: não oculto, não interno e com valor legível. */
const isUseful = (raw: IRawField): boolean =>
  raw.Hidden !== true &&
  raw.InternalName.indexOf('_') !== 0 &&
  !SYSTEM_NAMES.has(raw.InternalName) &&
  !HIDDEN_TYPES.has(raw.TypeAsString);

/** Converte a resposta da API em campos úteis, em ordem alfabética de rótulo. */
export const toListFields = (raw: IRawField[]): IListField[] =>
  raw
    .filter(isUseful)
    .map((field: IRawField): IListField => ({
      name: field.InternalName,
      title: field.Title || field.InternalName,
      type: field.TypeAsString,
      indexed: field.Indexed === true || field.InternalName === 'ID',
      choices: readChoices(field)
    }))
    .sort((a: IListField, b: IListField) => a.title.localeCompare(b.title, 'pt-BR'));

/** Campo que pode ser usado como filtro: tipo indexável e com controle de entrada. */
export const isFilterable = (field: IListField): boolean => FILTERABLE_TYPES.has(field.type);

/** Mantém a ordem configurada e descarta nomes que não existem mais na lista. */
export const pickFields = (names: string[], schema: IListField[]): IListField[] => {
  const byName: Map<string, IListField> = new Map<string, IListField>(
    schema.map((field: IListField): [string, IListField] => [field.name, field])
  );
  const seen: Set<string> = new Set<string>();
  const picked: IListField[] = [];
  names.forEach((name: string) => {
    const field: IListField | undefined = byName.get(name);
    if (field && !seen.has(name)) {
      seen.add(name);
      picked.push(field);
    }
  });
  return picked;
};
