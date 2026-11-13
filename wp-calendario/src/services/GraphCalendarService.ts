import { MSGraphClientV3 } from '@microsoft/sp-http';

/*
 * Calendário de grupo e equipe Teams (grupo do Microsoft 365) pelo Microsoft Graph, com a sessão do usuário.
 * Permissão Group.ReadWrite.All aprovada pelo administrador do tenant em "API access".
 * Lê o período exibido e replica para o grupo os eventos criados na lista (criar, editar e excluir).
 */

export interface IGraphDateTime {
  dateTime: string;
  timeZone?: string;
}

/** Subconjunto das propriedades de event lidas pela WP. */
export interface IGraphEvent {
  id: string;
  subject?: string;
  start: IGraphDateTime;
  end: IGraphDateTime;
  isAllDay?: boolean;
  isCancelled?: boolean;
  location?: { displayName?: string };
  organizer?: { emailAddress?: { name?: string; address?: string } };
  onlineMeeting?: { joinUrl?: string };
  webLink?: string;
}

/** Corpo de criação e de atualização. Em atualização, somente os campos enviados mudam. */
export interface IGraphEventBody {
  subject?: string;
  start?: IGraphDateTime;
  end?: IGraphDateTime;
  isAllDay?: boolean;
  location?: { displayName: string };
  body?: { contentType: 'text'; content: string };
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: 'teamsForBusiness';
}

interface IGraphPage {
  value: IGraphEvent[];
  '@odata.nextLink'?: string;
}

interface IGraphGroupList {
  value: Array<{ id: string }>;
}

/** Evento já adaptado para exibição. Datas são instantes (Date). */
export interface IExternalEvento {
  id: string;
  titulo: string;
  local: string;
  organizador: string;
  inicio: Date;
  fim: Date;
  diaInteiro: boolean;
  linkReuniao?: string;
  linkOutlook?: string;
}

/** Teto de eventos lidos por período. Acima disso a WP avisa que a lista pode estar incompleta. */
export const MAX_EVENTS_SCANNED: number = 2000;
/** Quantidade de eventos exibida pela agenda. */
export type EventCount = number;
/** Janela de leitura de listUpcoming: um ano a partir da data de referência. */
const UPCOMING_WINDOW_MS: number = 365 * 24 * 60 * 60 * 1000;
/** $top da calendarView (mínimo 1, máximo 1000). */
const PAGE_SIZE: number = 500;

const SELECT: string = 'id,subject,start,end,isAllDay,isCancelled,location,organizer,onlineMeeting,webLink';
const GUID: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Converte dateTime do Graph em instante. A requisição pede UTC (Prefer: outlook.timezone="UTC"),
 * então um valor sem deslocamento é UTC. Frações com mais de 3 dígitos são cortadas.
 */
export const parseGraphDate = (value: IGraphDateTime): Date => {
  const raw: string = value.dateTime.replace(/(\.\d{3})\d+/, '$1');
  const hasOffset: boolean = /(Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  return new Date(hasOffset ? raw : `${raw}Z`);
};

/** Links só são aceitos em https, para não abrir esquemas inesperados. */
const httpsOnly = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  return /^https:\/\//i.test(value.trim()) ? value.trim() : undefined;
};

/** Adapta o evento do Graph. Eventos cancelados são descartados. */
export const toExternalEvent = (raw: IGraphEvent): IExternalEvento | undefined => {
  if (raw.isCancelled) {
    return undefined;
  }
  const organizer = raw.organizer?.emailAddress;
  return {
    id: raw.id,
    titulo: raw.subject?.trim() || '(Sem título)',
    local: raw.location?.displayName?.trim() ?? '',
    organizador: organizer?.name?.trim() || organizer?.address?.trim() || '',
    inicio: parseGraphDate(raw.start),
    fim: parseGraphDate(raw.end),
    diaInteiro: raw.isAllDay === true,
    linkReuniao: httpsOnly(raw.onlineMeeting?.joinUrl),
    linkOutlook: httpsOnly(raw.webLink)
  };
};

export const isGroupId = (value: string): boolean => GUID.test(value.trim());
export const isEmail = (value: string): boolean => EMAIL.test(value.trim());

/** Código HTTP do erro do Graph, quando disponível. */
export const statusOf = (error: unknown): number | undefined => (error as { statusCode?: number } | undefined)?.statusCode;

const eventPath = (groupId: string, eventId: string): string => `/groups/${groupId}/calendar/events/${encodeURIComponent(eventId)}`;

/**
 * Acesso ao calendário de um grupo ou equipe. Recebe o cliente do Graph já autenticado pelo SPFx
 * (MSGraphClientV3), que obtém o token da sessão do usuário.
 */
export class GraphCalendarService {
  constructor(private readonly client: MSGraphClientV3) {}

  /** Aceita o ID do grupo (ou da equipe) ou o e-mail do grupo. O e-mail é convertido em ID. */
  public async resolveGroupId(identifier: string): Promise<string> {
    const value: string = identifier.trim();
    if (isGroupId(value)) {
      return value;
    }
    if (!isEmail(value)) {
      throw new Error('Identificador inválido: informe o e-mail do grupo ou o ID do grupo/equipe.');
    }
    const response: IGraphGroupList = await this.client
      .api('/groups')
      .query({ $filter: `mail eq '${value.replace(/'/g, "''")}'`, $select: 'id', $top: 1 })
      .get();
    const id: string | undefined = response.value[0]?.id;
    if (!id) {
      throw new Error('Nenhum grupo encontrado com este e-mail.');
    }
    return id;
  }

  /**
   * Eventos do grupo que se sobrepõem ao intervalo (o período exibido). Lê em páginas (@odata.nextLink)
   * até MAX_EVENTS_SCANNED e informa se a leitura foi limitada.
   */
  public async listRange(groupId: string, start: Date, end: Date): Promise<{ events: IExternalEvento[]; truncated: boolean }> {
    const collected: IGraphEvent[] = [];
    let page: IGraphPage = await this.client
      .api(`/groups/${groupId}/calendar/calendarView`)
      .header('Prefer', 'outlook.timezone="UTC"')
      .query({ startDateTime: start.toISOString(), endDateTime: end.toISOString(), $select: SELECT, $top: PAGE_SIZE })
      .get();
    collected.push(...page.value);
    let next: string | undefined = page['@odata.nextLink'];
    while (next && collected.length < MAX_EVENTS_SCANNED) {
      page = await this.client.api(next).get();
      collected.push(...page.value);
      next = page['@odata.nextLink'];
    }
    const events: IExternalEvento[] = collected
      .map((raw: IGraphEvent): IExternalEvento | undefined => toExternalEvent(raw))
      .filter((event: IExternalEvento | undefined): event is IExternalEvento => event !== undefined);
    return { events, truncated: next !== undefined };
  }

  /**
   * Próximos eventos do grupo a partir de `from`, em ordem cronológica e limitados a `count`.
   * A ordenação vale só para o lote lido (ver MAX_EVENTS_SCANNED).
   */
  public async listUpcoming(groupId: string, count: EventCount, from: Date): Promise<{ events: IExternalEvento[]; truncated: boolean }> {
    const range: { events: IExternalEvento[]; truncated: boolean } = await this.listRange(groupId, from, new Date(from.getTime() + UPCOMING_WINDOW_MS));
    const events: IExternalEvento[] = range.events
      .filter((evento: IExternalEvento): boolean => evento.fim.getTime() >= from.getTime())
      .sort((a: IExternalEvento, b: IExternalEvento): number => a.inicio.getTime() - b.inicio.getTime())
      .slice(0, count);
    return { events, truncated: range.truncated };
  }

  /** Cria o evento no calendário do grupo e devolve o ID gerado pelo Graph. */
  public async createEvent(groupId: string, body: IGraphEventBody): Promise<string> {
    const created: IGraphEvent = await this.client
      .api(`/groups/${groupId}/calendar/events`)
      .header('Prefer', 'outlook.timezone="UTC"')
      .post(body);
    return created.id;
  }

  /** Atualiza somente os campos enviados no evento replicado. */
  public async updateEvent(groupId: string, eventId: string, patch: IGraphEventBody): Promise<void> {
    await this.client.api(eventPath(groupId, eventId)).header('Prefer', 'outlook.timezone="UTC"').patch(patch);
  }

  /** Exclui o evento replicado. Evento que já não existe (404) conta como excluído. */
  public async deleteEvent(groupId: string, eventId: string): Promise<void> {
    try {
      await this.client.api(eventPath(groupId, eventId)).delete();
    } catch (error: unknown) {
      if (statusOf(error) !== 404) {
        throw error;
      }
    }
  }
}
