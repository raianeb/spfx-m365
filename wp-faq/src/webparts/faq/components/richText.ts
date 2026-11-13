/*
 * Texto rico do comunicado. O HTML é gravado na coluna Mensagem pelo editor da WP e passa por uma
 * allowlist antes de qualquer gravação ou exibição: tags e atributos fora dela são removidos.
 * DOMParser analisa o conteúdo sem executar scripts nem carregar imagens.
 */

/** Tags que o editor produz e a leitura aceita. DIV (quebra de linha do navegador) vira P. */
const ALLOWED_TAGS: ReadonlySet<string> = new Set<string>(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'A']);

/** Elementos descartados junto com o conteúdo: não há texto legítimo dentro deles. */
const DROPPED_TAGS: ReadonlySet<string> = new Set<string>([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'TEMPLATE',
  'NOSCRIPT',
  'SVG',
  'MATH',
  'IMG',
  'FORM',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'BUTTON'
]);

const SAFE_PROTOCOLS: ReadonlySet<string> = new Set<string>(['http:', 'https:', 'mailto:']);

/** Marcação reconhecida como HTML do editor. Texto sem essas tags é tratado como texto simples antigo. */
const RICH_MARKUP: RegExp = /<(p|br|strong|b|em|i|u|ul|ol|li|a|div)[\s>/]/i;

/**
 * Link aceito: somente http, https ou mailto. O endereço é lido pelo parser de URL, que normaliza
 * espaços e controles antes de conferir o protocolo (evita "java\tscript:" e similares).
 * Endereços relativos são resolvidos em uma base fictícia apenas para conferir o protocolo.
 */
export const isSafeLink = (value: string): boolean => {
  const trimmed: string = value.trim();
  if (trimmed === '') {
    // Vazio resolveria para a própria base fictícia e passaria no teste de protocolo.
    return false;
  }
  try {
    return SAFE_PROTOCOLS.has(new URL(trimmed, 'https://relative.invalid/').protocol);
  } catch {
    return false;
  }
};

/** Copia para `target` somente o que está na allowlist, a partir de `node`. Recursivo. */
const cleanNode = (node: Node, target: Node, doc: Document): void => {
  const copyChildren = (source: Node, into: Node): void => {
    Array.from(source.childNodes).forEach((child: ChildNode): void => cleanNode(child, into, doc));
  };

  if (node.nodeType === Node.TEXT_NODE) {
    target.appendChild(doc.createTextNode(node.textContent ?? ''));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  const element: Element = node as Element;
  const tag: string = element.tagName.toUpperCase();
  if (DROPPED_TAGS.has(tag)) {
    return;
  }
  if (tag === 'A') {
    const href: string | null = element.getAttribute('href');
    if (href === null || !isSafeLink(href)) {
      // Link sem endereço aceito: o texto é mantido, sem o link.
      copyChildren(element, target);
      return;
    }
    const anchor: HTMLElement = doc.createElement('a');
    anchor.setAttribute('href', href.trim());
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
    copyChildren(element, anchor);
    target.appendChild(anchor);
    return;
  }
  if (!ALLOWED_TAGS.has(tag) && tag !== 'DIV') {
    // Elemento desconhecido: o texto que ele contém é mantido, o elemento não.
    copyChildren(element, target);
    return;
  }
  const outputTag: string = tag === 'DIV' ? 'p' : tag.toLowerCase();
  const output: HTMLElement = doc.createElement(outputTag);
  copyChildren(element, output);
  target.appendChild(output);
};

/** Remove tudo o que não está na allowlist. A saída contém apenas as tags e atributos permitidos. */
export const sanitizeRichText = (html: string): string => {
  const parsed: Document = new DOMParser().parseFromString(html, 'text/html');
  const container: HTMLElement = parsed.createElement('div');
  Array.from(parsed.body.childNodes).forEach((child: ChildNode): void => cleanNode(child, container, parsed));
  return container.innerHTML;
};

const escapeText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * HTML seguro para exibir ou carregar no editor. Conteúdo antigo, guardado como texto simples,
 * é escapado e recebe quebras de linha, para manter o aspecto que tinha antes do texto rico.
 */
export const toSafeHtml = (stored: string | undefined): string => {
  const value: string = stored ?? '';
  if (RICH_MARKUP.test(value)) {
    return sanitizeRichText(value);
  }
  return escapeText(value).replace(/\r?\n/g, '<br>');
};

/** Texto para cartões e validações: sem tags, com espaço entre blocos e em uma linha. */
export const toPlainText = (stored: string | undefined): string => {
  const spaced: string = toSafeHtml(stored).replace(/<br\s*\/?>|<\/(p|li)>/gi, ' ');
  const parsed: Document = new DOMParser().parseFromString(spaced, 'text/html');
  return (parsed.body.textContent ?? '').replace(/\s+/g, ' ').trim();
};
