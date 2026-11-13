import { IEvento } from './components/IEventoProps';
import { addDays, startOfDay, toDateInput } from './components/calendarUtils';
import { IExternalEvento, IGraphDateTime, IGraphEventBody, statusOf } from '../../services/GraphCalendarService';

/*
 * Ponte entre a lista de eventos (calendário central) e o calendário do grupo ou equipe Microsoft 365.
 * Funções puras: datas e corpo das requisições, mesclagem sem duplicidade e mensagens de erro.
 */

type ListBody = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const toGraphUtc = (instant: Date): string => instant.toISOString().slice(0, 19);

/** Dia inteiro no Graph: início 00:00 do primeiro dia; término 00:00 do dia seguinte (exclusivo). */
const dayStamp = (day: Date): string => `${toDateInput(day)}T00:00:00`;

const toGraphRange = (body: ListBody): { start: IGraphDateTime; end: IGraphDateTime; isAllDay: boolean } => {
  const inicio: Date = new Date(text(body.DataInicio));
  const fim: Date = new Date(text(body.DataFim));
  if (body.DiaInteiro === true) {
    return {
      start: { dateTime: dayStamp(startOfDay(inicio)), timeZone: 'UTC' },
      end: { dateTime: dayStamp(addDays(startOfDay(fim), 1)), timeZone: 'UTC' },
      isAllDay: true
    };
  }
  return {
    start: { dateTime: toGraphUtc(inicio), timeZone: 'UTC' },
    end: { dateTime: toGraphUtc(fim), timeZone: 'UTC' },
    isAllDay: false
  };
};

/**
 * Corpo do evento a partir do item gravado na lista. Com reuniaoTeams, o Graph cria a reunião online do Teams.
 * Em atualização, passe reuniaoTeams = false: o link existente permanece.
 */
export const listToGraphBody = (body: ListBody, reuniaoTeams: boolean): IGraphEventBody => {
  const range: { start: IGraphDateTime; end: IGraphDateTime; isAllDay: boolean } = toGraphRange(body);
  return {
    subject: text(body.Title).trim(),
    start: range.start,
    end: range.end,
    isAllDay: range.isAllDay,
    location: { displayName: text(body.Local).trim() },
    body: { contentType: 'text', content: text(body.Descricao).trim() },
    ...(reuniaoTeams ? { isOnlineMeeting: true, onlineMeetingProvider: 'teamsForBusiness' as const } : {})
  };
};

/** Dia inteiro vindo do Graph: a data UTC é o dia; a exibição usa 00:00 a 23:59:59 local, como na lista. */
const allDayStart = (inicio: Date): Date => new Date(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate());
const allDayEnd = (fim: Date): Date => new Date(fim.getUTCFullYear(), fim.getUTCMonth(), fim.getUTCDate() - 1, 23, 59, 59);

/** Evento do grupo ou equipe no formato de exibição do calendário, somente leitura. */
export const graphToEvento = (evento: IExternalEvento): IEvento => {
  const inicio: Date = evento.diaInteiro ? allDayStart(evento.inicio) : evento.inicio;
  const fim: Date = evento.diaInteiro ? allDayEnd(evento.fim) : evento.fim;
  return {
    Id: 0,
    Title: evento.titulo,
    Local: evento.local,
    DataInicio: inicio.toISOString(),
    DataFim: fim.toISOString(),
    DiaInteiro: evento.diaInteiro,
    Organizador: evento.organizador,
    Origem: 'microsoft',
    IdEventoMicrosoft: evento.id,
    LinkReuniao: evento.linkReuniao,
    LinkOutlook: evento.linkOutlook
  };
};

/**
 * Mescla os itens da lista com os eventos do grupo ou equipe. Evento replicado (ID gravado na lista)
 * aparece uma vez, com os links do Teams e do Outlook. Os demais eventos do grupo entram como somente leitura.
 */
export const mergeCalendarEvents = (listItems: IEvento[], groupEvents: IExternalEvento[]): IEvento[] => {
  const byId: Map<string, IExternalEvento> = new Map<string, IExternalEvento>();
  groupEvents.forEach((evento: IExternalEvento): void => {
    byId.set(evento.id, evento);
  });
  const replicated: Set<string> = new Set<string>();
  const rows: IEvento[] = listItems.map((item: IEvento): IEvento => {
    const id: string | undefined = item.IdEventoMicrosoft;
    const match: IExternalEvento | undefined = id ? byId.get(id) : undefined;
    if (!match) {
      return item;
    }
    replicated.add(match.id);
    return { ...item, LinkReuniao: match.linkReuniao, LinkOutlook: match.linkOutlook };
  });
  const extras: IEvento[] = groupEvents
    .filter((evento: IExternalEvento): boolean => !replicated.has(evento.id))
    .map((evento: IExternalEvento): IEvento => graphToEvento(evento));
  return rows.concat(extras).sort((a: IEvento, b: IEvento): number => Date.parse(a.DataInicio) - Date.parse(b.DataInicio));
};

/** Mensagem clara para erro do Graph. 401/403 costuma ser falta de vínculo com o grupo ou permissão não aprovada. */
export const describeGraphError = (error: unknown): string => {
  const status: number | undefined = statusOf(error);
  if (status === 401 || status === 403) {
    return 'Sem permissão no calendário do grupo ou equipe. Confirme se você é membro do grupo e se o administrador aprovou a permissão Group.ReadWrite.All em API access.';
  }
  if (status === 404) {
    return 'Grupo ou equipe não encontrado. Confira o identificador nas configurações da Web Part.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Falha na comunicação com o Microsoft 365.';
};

/** Erro de sincronização: a mensagem vai para o formulário. Erros técnicos da lista continuam genéricos. */
export const syncError = (message: string): Error => Object.assign(new Error(message), { sincronizacao: true });

export const isSyncError = (error: unknown): boolean => (error as { sincronizacao?: boolean } | undefined)?.sincronizacao === true;
