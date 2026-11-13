import { CalendarView, IEvento } from './IEventoProps';

/** Período consultado: início inclusivo e fim exclusivo, no horário local. */
export interface IPeriod {
  start: Date;
  end: Date;
}

const pad = (value: number): string => (value < 10 ? `0${value}` : String(value));

export const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Primeiro dia do mês deslocado. */
export const shiftMonth = (date: Date, months: number): Date => new Date(date.getFullYear(), date.getMonth() + months, 1);

/** Semana começa no domingo, como no Outlook em pt-BR. */
export const startOfWeek = (date: Date): Date => addDays(startOfDay(date), -date.getDay());

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const dayKey = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** 42 dias (6 semanas) que cobrem o mês do ancorador, começando no domingo. */
export const monthGrid = (anchor: Date): Date[] => {
  const first: Date = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart: Date = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_value: unknown, index: number): Date => addDays(gridStart, index));
};

/** Dias exibidos pela visualização, na ordem em que aparecem. */
export const daysFor = (view: CalendarView, anchor: Date): Date[] => {
  if (view === 'mes') {
    return monthGrid(anchor);
  }
  if (view === 'semana') {
    const start: Date = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_value: unknown, index: number): Date => addDays(start, index));
  }
  return [startOfDay(anchor)];
};

/** Intervalo a consultar na lista, cobrindo exatamente os dias exibidos. */
export const periodFor = (view: CalendarView, anchor: Date): IPeriod => {
  const days: Date[] = daysFor(view, anchor);
  return { start: days[0], end: addDays(days[days.length - 1], 1) };
};

/** Desloca o ancorador conforme a visualização: mês, semana ou dia. */
export const shiftAnchor = (view: CalendarView, anchor: Date, step: number): Date => {
  if (view === 'mes') {
    return shiftMonth(anchor, step);
  }
  return addDays(anchor, view === 'semana' ? step * 7 : step);
};

/**
 * Agrupa os eventos por dia. Um evento aparece em todos os dias que intersecta.
 * Os limites são comparados em milissegundos, uma vez por evento, para manter o custo baixo.
 */
export const eventsByDay = (events: IEvento[], days: Date[]): Map<string, IEvento[]> => {
  const parsed: Array<{ event: IEvento; start: number; end: number }> = events.map((event: IEvento) => ({
    event,
    start: Date.parse(event.DataInicio),
    end: Date.parse(event.DataFim)
  }));
  const map: Map<string, IEvento[]> = new Map<string, IEvento[]>();
  days.forEach((day: Date) => {
    const from: number = startOfDay(day).getTime();
    const to: number = addDays(day, 1).getTime();
    const list: IEvento[] = parsed
      .filter((item: { event: IEvento; start: number; end: number }) => item.start < to && item.end > from)
      .map((item: { event: IEvento; start: number; end: number }) => item.event);
    map.set(dayKey(day), list);
  });
  return map;
};

export const formatTime = (iso: string): string => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const formatDayLong = (date: Date): string =>
  date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

export const formatMonthTitle = (date: Date): string => date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

export const formatPeriodTitle = (view: CalendarView, anchor: Date): string => {
  if (view === 'mes') {
    return formatMonthTitle(anchor);
  }
  if (view === 'dia') {
    return formatDayLong(anchor);
  }
  const days: Date[] = daysFor('semana', anchor);
  const short = (date: Date): string => date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${short(days[0])} – ${short(days[6])}`;
};

export const WEEKDAY_LABELS: string[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Valor de data para input type="date" (horário local). */
export const toDateInput = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Valor de hora para input type="time" (horário local). */
export const toTimeInput = (date: Date): string => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Intervalo de um evento para exibição, por exemplo "09:00 – 10:30" ou "Dia inteiro". */
export const formatRange = (event: IEvento): string =>
  event.DiaInteiro ? 'Dia inteiro' : `${formatTime(event.DataInicio)} – ${formatTime(event.DataFim)}`;

/** Chave estável de exibição: evita colisão entre itens da lista e eventos do Microsoft 365. */
export const eventKey = (event: IEvento): string =>
  event.Origem === 'microsoft' ? `m-${event.IdEventoMicrosoft ?? ''}` : `l-${event.Id}`;
