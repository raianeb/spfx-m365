const TAG_PATTERN: RegExp = /<[^>]+>/g;

/** Texto de um HTML, sem executar nem exibir marcação. Usado em campos de texto longo. */
export const stripHtml = (html: string): string => {
  if (html.indexOf('<') === -1) {
    return html;
  }
  if (typeof DOMParser !== 'undefined') {
    const parsed: Document = new DOMParser().parseFromString(html, 'text/html');
    return (parsed.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  }
  return html.replace(TAG_PATTERN, ' ').replace(/\s+/g, ' ').trim();
};

const fromObject = (value: Record<string, unknown>): string => {
  const candidate: unknown = value.title ?? value.lookupValue ?? value.Label ?? value.DisplayName ?? value.desc ?? '';
  return typeof candidate === 'string' || typeof candidate === 'number' ? String(candidate) : '';
};

/**
 * Texto de exibição de um valor devolvido pelo SharePoint: texto simples, pessoa, consulta,
 * metadados gerenciados e seus equivalentes de múltipla seleção.
 */
export const formatCell = (value: unknown, type: string): string => {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return type === 'Note' ? stripHtml(value) : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((entry: unknown) => formatCell(entry, type))
      .filter((text: string) => text !== '')
      .join(', ');
  }
  if (typeof value === 'object') {
    return fromObject(value as Record<string, unknown>);
  }
  return '';
};

/** Endereço aceito como link em células: somente http e https. */
export const isHttpUrl = (value: string): boolean => {
  try {
    const protocol: string = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};
