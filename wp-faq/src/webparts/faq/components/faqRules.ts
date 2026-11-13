import { toPlainText } from './richText';

/** Pergunta do FAQ. Ordem é a posição manual, usada na ordenação "Ordem definida". */
export interface IPergunta {
  Id: number;
  Title: string;
  Resposta?: string;
  Ordem?: number;
}

/** Comportamento inicial dos itens (RF-FAQ-03). */
export type FaqOpenMode = 'fechados' | 'abertos' | 'primeiro';

/** Ordenação configurável (lista de perguntas). */
export type FaqSortMode = 'ordem' | 'pergunta' | 'recentes';

export interface IPerguntaValues {
  title: string;
  /** HTML do editor de texto rico, já sanitizado na gravação. */
  answer: string;
}

export interface ISuggestionValues {
  pergunta: string;
  detalhes: string;
}

export interface ISolicitante {
  nome: string;
  email: string;
}

export const TITLE_LIMIT: number = 255;
export const ANSWER_LIMIT: number = 4000;
export const SUGGESTION_LIMIT: number = 255;
export const DETAILS_LIMIT: number = 2000;

export const SORT_ORDER_BY: Record<FaqSortMode, string> = {
  ordem: 'Ordem asc,Id asc',
  pergunta: 'Title asc',
  recentes: 'Id desc'
};

/** Itens que começam abertos conforme o modo configurado. */
export const initialOpenIds = (items: IPergunta[], mode: FaqOpenMode): number[] => {
  if (mode === 'abertos') {
    return items.map((item: IPergunta) => item.Id);
  }
  if (mode === 'primeiro') {
    return items.length > 0 ? [items[0].Id] : [];
  }
  return [];
};

/** Texto sem acentos e sem diferença entre maiúsculas e minúsculas, para a busca em português. */
const fold = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca no título e no texto da resposta (sem as tags). Termo vazio mostra tudo. */
export const matchesSearch = (item: IPergunta, term: string): boolean => {
  const needle: string = fold(term.trim());
  if (needle === '') {
    return true;
  }
  return fold(item.Title).includes(needle) || fold(toPlainText(item.Resposta)).includes(needle);
};

/** Âncora HTML de cada pergunta. Serve de destino para o link copiado. */
export const itemAnchor = (id: number): string => `faq-${id}`;

/** Id da pergunta indicada pelo fragmento da URL, quando ele tem o formato da âncora. */
export const idFromHash = (hash: string): number | undefined => {
  const match: RegExpExecArray | null = /^#faq-(\d+)$/.exec(hash);
  return match ? Number(match[1]) : undefined;
};

/** Endereço da página atual, sem fragmento. */
export const currentPageUrl = (): string => window.location.href.split('#')[0];

/** Link direto para a pergunta: a mesma página com a âncora da pergunta. */
export const buildItemLink = (pageUrl: string, id: number): string => `${pageUrl.split('#')[0]}#${itemAnchor(id)}`;

/** Regras da pergunta: título e resposta obrigatórios. A posição (Ordem) não é digitada: é atribuída ao criar e alterada pelo botão Ordenar. */
export const validatePergunta = (values: IPerguntaValues): Record<string, string> => {
  const errors: Record<string, string> = {};
  const title: string = values.title.trim();
  if (!title) {
    errors.title = 'Informe a pergunta.';
  } else if (title.length > TITLE_LIMIT) {
    errors.title = `Use no máximo ${TITLE_LIMIT} caracteres.`;
  }
  const answer: string = toPlainText(values.answer);
  if (!answer) {
    errors.answer = 'Informe a resposta.';
  } else if (answer.length > ANSWER_LIMIT) {
    errors.answer = `Use no máximo ${ANSWER_LIMIT} caracteres.`;
  }
  return errors;
};

/** Regras da sugestão: a pergunta é obrigatória. Detalhes são opcionais. */
export const validateSuggestion = (values: ISuggestionValues): Record<string, string> => {
  const errors: Record<string, string> = {};
  const question: string = values.pergunta.trim();
  if (!question) {
    errors.pergunta = 'Escreva a pergunta que você gostaria de ver no FAQ.';
  } else if (question.length > SUGGESTION_LIMIT) {
    errors.pergunta = `Use no máximo ${SUGGESTION_LIMIT} caracteres.`;
  }
  if (values.detalhes.trim().length > DETAILS_LIMIT) {
    errors.detalhes = `Use no máximo ${DETAILS_LIMIT} caracteres.`;
  }
  return errors;
};

/**
 * Endereço do fluxo: somente HTTPS. Vazio ou inválido desliga o envio de sugestões,
 * e o botão não aparece.
 */
export const isSafeFlowUrl = (value: string): boolean => {
  const trimmed: string = value.trim();
  if (trimmed === '') {
    return false;
  }
  try {
    const parsed: URL = new URL(trimmed);
    return parsed.protocol === 'https:' && parsed.hostname !== '';
  } catch {
    return false;
  }
};

/** Corpo enviado ao fluxo. Campos vazios viram null, para o fluxo tratar a ausência de forma explícita. */
export const buildSuggestionPayload = (
  values: ISuggestionValues,
  solicitante: ISolicitante,
  paginaOrigem: string,
  siteDeDados: string,
  enviadoEm: Date
): Record<string, unknown> => ({
  tipo: 'sugestao-faq',
  pergunta: values.pergunta.trim(),
  detalhes: values.detalhes.trim() ? values.detalhes.trim() : null,
  solicitante: {
    nome: solicitante.nome || null,
    email: solicitante.email || null
  },
  paginaOrigem,
  siteDeDados,
  enviadoEm: enviadoEm.toISOString()
});

/** Texto da posição em cada linha da tela "Ordenar". */
export const describePergunta = (item: IPergunta): string =>
  item.Ordem ? `Posição ${item.Ordem}` : 'Sem posição definida';
