/*
 * Regras e formato do evento criado pela WP no calendário de um grupo ou equipe do Microsoft 365.
 * Módulo puro, sem chamadas ao SharePoint nem ao Graph, para ser testado isoladamente.
 */

/** Valores do formulário. Datas e horas chegam como texto dos campos do navegador. */
export interface INovoEventoValues {
  titulo: string;
  local: string;
  /** yyyy-mm-dd */
  dataInicio: string;
  /** HH:mm */
  horaInicio: string;
  dataFim: string;
  horaFim: string;
  descricao: string;
  reuniaoTeams: boolean;
}

/** Corpo do POST em /groups/{id}/calendar/events. */
export interface IGraphEventBody {
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  body?: { contentType: 'text'; content: string };
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: 'teamsForBusiness';
}

export const MAX_TITULO: number = 255;
export const MAX_LOCAL: number = 255;
export const MAX_DESCRICAO: number = 4000;

/** Instante a partir de data e hora locais do formulário. Sem deslocamento, o JavaScript usa o horário do navegador. */
const toInstant = (date: string, time: string): Date => new Date(`${date}T${time}`);

/** Formato aceito pelo Graph quando o fuso é informado separadamente. */
const toGraphUtc = (instant: Date): string => instant.toISOString().slice(0, 19);

/**
 * Regras de criação: assunto obrigatório, início e término preenchidos, término posterior ao início
 * e início não anterior a agora. Limites de texto seguem as colunas do próprio evento.
 */
export const validateNovoEvento = (values: INovoEventoValues, now: Date): Record<string, string> => {
  const errors: Record<string, string> = {};
  const titulo: string = values.titulo.trim();
  if (!titulo) {
    errors.titulo = 'Informe o assunto.';
  } else if (titulo.length > MAX_TITULO) {
    errors.titulo = `Use no máximo ${MAX_TITULO} caracteres.`;
  }
  if (values.local.trim().length > MAX_LOCAL) {
    errors.local = `Use no máximo ${MAX_LOCAL} caracteres.`;
  }
  if (values.descricao.trim().length > MAX_DESCRICAO) {
    errors.descricao = `Use no máximo ${MAX_DESCRICAO} caracteres.`;
  }
  if (!values.dataInicio) {
    errors.dataInicio = 'Informe a data de início.';
  }
  if (!values.horaInicio) {
    errors.horaInicio = 'Informe a hora de início.';
  }
  if (!values.dataFim) {
    errors.dataFim = 'Informe a data de término.';
  }
  if (!values.horaFim) {
    errors.horaFim = 'Informe a hora de término.';
  }
  if (values.dataInicio && values.horaInicio && values.dataFim && values.horaFim) {
    const inicio: Date = toInstant(values.dataInicio, values.horaInicio);
    const fim: Date = toInstant(values.dataFim, values.horaFim);
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      errors.dataFim = 'Data ou hora inválida.';
    } else if (inicio.getTime() < now.getTime()) {
      errors.dataInicio = 'O início não pode estar no passado.';
    } else if (fim.getTime() <= inicio.getTime()) {
      errors.dataFim = 'O término deve ser posterior ao início.';
    }
  }
  return errors;
};

/** Monta o corpo do evento. Horários são enviados em UTC, com timeZone explícito. */
export const toGraphEventBody = (values: INovoEventoValues): IGraphEventBody => {
  const inicio: Date = toInstant(values.dataInicio, values.horaInicio);
  const fim: Date = toInstant(values.dataFim, values.horaFim);
  const local: string = values.local.trim();
  const descricao: string = values.descricao.trim();
  return {
    subject: values.titulo.trim(),
    start: { dateTime: toGraphUtc(inicio), timeZone: 'UTC' },
    end: { dateTime: toGraphUtc(fim), timeZone: 'UTC' },
    ...(local ? { location: { displayName: local } } : {}),
    ...(descricao ? { body: { contentType: 'text' as const, content: descricao } } : {}),
    ...(values.reuniaoTeams ? { isOnlineMeeting: true, onlineMeetingProvider: 'teamsForBusiness' as const } : {})
  };
};
