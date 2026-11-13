import * as React from 'react';
import styles from './Calendario.module.scss';
import { IEvento } from './IEventoProps';
import { dayKey, eventKey, formatDayLong, formatRange, isSameDay, WEEKDAY_LABELS } from './calendarUtils';

/** Dias do grid (ou da semana/dia) com os eventos já agrupados por dia. */
export interface IViewProps {
  byDay: Map<string, IEvento[]>;
  onEventClick: (event: IEvento) => void;
}

const today: Date = new Date();
const MAX_CHIPS: number = 3;

const eventsOf = (byDay: Map<string, IEvento[]>, day: Date): IEvento[] => byDay.get(dayKey(day)) ?? [];

/** Miniatura: grade do mês compacta. O clique no dia abre os detalhes em modal. */
export const MiniMonth: React.FC<{ anchor: Date; days: Date[]; byDay: Map<string, IEvento[]>; onDayClick: (day: Date) => void }> = ({
  anchor,
  days,
  byDay,
  onDayClick
}) => (
  <div className={styles.mini} role="grid" aria-label="Miniatura do calendário">
    {WEEKDAY_LABELS.map((label: string) => (
      <div key={label} className={styles.miniWeekday} role="columnheader">
        {label.charAt(0).toUpperCase()}
      </div>
    ))}
    {days.map((day: Date) => {
      const count: number = eventsOf(byDay, day).length;
      const classes: string[] = [styles.miniDay];
      if (day.getMonth() !== anchor.getMonth()) classes.push(styles.outside);
      if (isSameDay(day, today)) classes.push(styles.today);
      const label: string = `${formatDayLong(day)}${count > 0 ? `, ${count} evento${count > 1 ? 's' : ''}` : ''}`;
      return (
        <button key={dayKey(day)} type="button" role="gridcell" className={classes.join(' ')} aria-label={label} onClick={() => onDayClick(day)}>
          <span>{day.getDate()}</span>
          {count > 0 && (
            <span className={styles.miniDots} aria-hidden="true">
              {Array.from({ length: Math.min(count, 3) }, (_value: unknown, index: number) => (
                <i key={index} className={styles.miniDot} />
              ))}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

/** Mês completo: eventos aparecem como chips. Clique no número do dia abre a visualização de dia. */
export const MonthView: React.FC<IViewProps & { anchor: Date; days: Date[]; onDayClick: (day: Date) => void }> = ({
  anchor,
  days,
  byDay,
  onEventClick,
  onDayClick
}) => (
  <div className={styles.monthGrid} role="grid" aria-label="Mês">
    {WEEKDAY_LABELS.map((label: string) => (
      <div key={label} className={styles.weekday} role="columnheader">
        {label}
      </div>
    ))}
    {days.map((day: Date) => {
      const list: IEvento[] = eventsOf(byDay, day);
      const classes: string[] = [styles.monthCell];
      if (day.getMonth() !== anchor.getMonth()) classes.push(styles.outside);
      if (isSameDay(day, today)) classes.push(styles.today);
      return (
        <div key={dayKey(day)} role="gridcell" className={classes.join(' ')}>
          <button type="button" className={styles.dayNumber} onClick={() => onDayClick(day)} aria-label={`Abrir ${formatDayLong(day)}`}>
            {day.getDate()}
          </button>
          {list.slice(0, MAX_CHIPS).map((event: IEvento) => (
            <button key={eventKey(event)} type="button" className={styles.chip} onClick={() => onEventClick(event)} title={event.Title}>
              {event.DiaInteiro ? '' : `${formatRange(event).split(' – ')[0]} `}
              {event.Title}
            </button>
          ))}
          {list.length > MAX_CHIPS && (
            <button type="button" className={styles.moreLink} onClick={() => onDayClick(day)}>
              +{list.length - MAX_CHIPS} mais
            </button>
          )}
        </div>
      );
    })}
  </div>
);

/** Semana: sete colunas com a lista de eventos de cada dia. */
export const WeekView: React.FC<IViewProps & { days: Date[] }> = ({ days, byDay, onEventClick }) => (
  <div className={styles.weekGrid}>
    {days.map((day: Date) => {
      const list: IEvento[] = eventsOf(byDay, day);
      const classes: string[] = [styles.weekColumn];
      if (isSameDay(day, today)) classes.push(styles.today);
      return (
        <section key={dayKey(day)} className={classes.join(' ')} aria-label={formatDayLong(day)}>
          <header className={styles.weekHeader}>
            <span>{WEEKDAY_LABELS[day.getDay()]}</span>
            <strong>{day.getDate()}</strong>
          </header>
          {list.length === 0 && <p className={styles.weekEmpty}>Sem eventos</p>}
          {list.map((event: IEvento) => (
            <button key={eventKey(event)} type="button" className={styles.weekEvent} onClick={() => onEventClick(event)}>
              <span className={styles.weekTime}>{formatRange(event)}</span>
              <span className={styles.weekTitle}>{event.Title}</span>
            </button>
          ))}
        </section>
      );
    })}
  </div>
);

/** Dia: lista ordenada, com dia inteiro antes dos horários. */
export const DayView: React.FC<IViewProps & { day: Date }> = ({ day, byDay, onEventClick }) => {
  const list: IEvento[] = eventsOf(byDay, day).slice().sort((a: IEvento, b: IEvento) => {
    if (a.DiaInteiro !== b.DiaInteiro) return a.DiaInteiro ? -1 : 1;
    return Date.parse(a.DataInicio) - Date.parse(b.DataInicio);
  });
  if (list.length === 0) {
    return <p className={styles.empty}>Nenhum evento neste dia.</p>;
  }
  return (
    <ol className={styles.dayList}>
      {list.map((event: IEvento) => (
        <li key={eventKey(event)}>
          <button type="button" className={styles.dayItem} onClick={() => onEventClick(event)}>
            <span className={styles.dayTime}>{formatRange(event)}</span>
            <span className={styles.dayBody}>
              <span className={styles.dayTitle}>{event.Title}</span>
              {event.Local && <span className={styles.dayMeta}>{event.Local}</span>}
            </span>
            {event.Tipo && <span className={styles.tag}>{event.Tipo}</span>}
          </button>
        </li>
      ))}
    </ol>
  );
};
