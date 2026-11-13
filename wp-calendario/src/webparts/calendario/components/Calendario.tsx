import * as React from 'react';
import { DefaultButton, IButtonStyles, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './Carreiras.module.scss';
import calendarioStyles from './Calendario.module.scss';
import coreStyles from '../../../core/core.module.scss';
import { CalendarView, ICalendarioProps, IEvento } from './IEventoProps';
import { ICrudList, ICrudWriteHooks, useCrudList } from '../../../crud/useCrudList';
import { DiagnosticsPanel } from '../../../core/diagnostics';
import { resolveListTitle } from '../../../core/config';
import { GraphCalendarService } from '../../../services/GraphCalendarService';
import { describeGraphError, listToGraphBody, mergeCalendarEvents, syncError } from '../calendarSync';
import { useGroupCalendarEvents } from './useGroupCalendarEvents';
import EventoForm from './EventoForm';
import EventoDetailModal from './EventoDetailModal';
import DayEventsModal from './DayEventsModal';
import { DayView, MiniMonth, MonthView, WeekView } from './CalendarViews';
import { dayKey, daysFor, eventsByDay, formatPeriodTitle, periodFor, shiftAnchor, startOfDay } from './calendarUtils';

/** Campos lidos da lista. Inclui o ID do evento replicado no grupo ou equipe. */
const SELECT: string[] = ['Id', 'Title', 'Local', 'DataInicio', 'DataFim', 'DiaInteiro', 'Descricao', 'Organizador', 'Tipo', 'IdEventoMicrosoft'];
/** Limite de eventos da lista por período. Um mês comum fica bem abaixo disso. */
const EVENT_LIMIT: number = 500;
const VIEWS: CalendarView[] = ['dia', 'semana', 'mes'];
const VIEW_LABELS: Record<CalendarView, string> = { dia: 'Dia', semana: 'Semana', mes: 'Mês' };

/*
 * Controles da barra do calendário: alvo de 32px, ícone de 16px e borda discreta.
 * Botões de 96px com ícone pequeno pareciam exagerados; a cor de destaque fica só no estado ativo.
 */
const compactBase = {
  height: 32,
  minWidth: 32,
  padding: '0 10px',
  borderRadius: 4,
  borderColor: '#edebe9',
  background: '#fff',
  color: 'var(--cc-text, #1f1f1f)',
  fontSize: 13,
  fontWeight: 'normal' as const
};
const compactHover = {
  background: '#fff',
  borderColor: 'var(--cc-primary, #E45900)',
  color: 'var(--cc-primary, #E45900)'
};
const navButtonStyles: IButtonStyles = {
  root: compactBase,
  rootHovered: compactHover,
  rootPressed: { background: '#faf9f8', borderColor: 'var(--cc-primary, #E45900)' },
  icon: { fontSize: 16 }
};
const activeViewStyles: IButtonStyles = {
  root: { ...compactBase, background: 'var(--cc-primary, #E45900)', borderColor: 'var(--cc-primary, #E45900)', color: '#fff', fontWeight: 600 },
  rootHovered: { background: 'var(--cc-primary-alt, #F08C00)', borderColor: 'var(--cc-primary-alt, #F08C00)', color: '#fff' },
  rootPressed: { background: 'var(--cc-primary-alt, #F08C00)', borderColor: 'var(--cc-primary-alt, #F08C00)', color: '#fff' }
};

/** Datas do filtro em formato OData de data e hora, como as demais consultas do projeto. */
const odataDateTime = (date: Date): string => `datetime'${date.toISOString()}'`;

/** Cliente do Graph e ID do grupo ou equipe, para as operações de replicação. */
const openGroup = async (
  getClient: ICalendarioProps['getClient'],
  identifier: string
): Promise<{ service: GraphCalendarService; groupId: string }> => {
  const service: GraphCalendarService = new GraphCalendarService(await getClient());
  const groupId: string = await service.resolveGroupId(identifier);
  return { service, groupId };
};

/**
 * Calendário central. Mostra os eventos da lista e, quando há grupo ou equipe configurado, também os do
 * Microsoft 365 no mesmo período. Eventos replicados aparecem uma vez. Miniatura: mês compacto com detalhes
 * do dia em modal. Completo: dia, semana e mês. Eventos do grupo são somente leitura e abrem o detalhe com os links.
 */
const Calendario: React.FC<ICalendarioProps> = ({
  service,
  logger,
  environment,
  adminGroupIds,
  title,
  themeStyle,
  listName,
  template,
  defaultView,
  identifier,
  getClient
}) => {
  const isMini: boolean = template === 'miniatura';
  const contextLabel: string = title || 'Calendário';
  const [chosenView, setChosenView] = React.useState<CalendarView>(defaultView);
  const view: CalendarView = isMini ? 'mes' : chosenView;
  const [anchor, setAnchor] = React.useState<Date>((): Date => startOfDay(new Date()));
  const [detail, setDetail] = React.useState<IEvento | undefined>(undefined);
  const [dayOpen, setDayOpen] = React.useState<Date | undefined>(undefined);
  /** Incrementado após cada replicação, para reler o calendário do grupo. */
  const [syncVersion, setSyncVersion] = React.useState<number>(0);

  const base: string = listName.trim();
  const listTitle: string = base === '' || base.indexOf('HML_') === 0 ? '' : resolveListTitle(base, environment);
  const configured: boolean = listTitle !== '';
  const groupIdentifier: string = configured ? identifier.trim() : '';
  const sync: boolean = groupIdentifier !== '';

  const period = React.useMemo(() => periodFor(view, anchor), [view, anchor]);
  const periodKey: string = `${period.start.getTime()}|${period.end.getTime()}`;

  /** Replica para o grupo ou equipe: criar, editar e excluir acompanham o item da lista. */
  const writeHooks: ICrudWriteHooks<IEvento> = {
    beforeCreate: async (body: Record<string, unknown>, extras: Record<string, unknown>) => {
      if (!sync) {
        return { fields: {} };
      }
      try {
        const { service: graph, groupId } = await openGroup(getClient, groupIdentifier);
        const eventId: string = await graph.createEvent(groupId, listToGraphBody(body, extras.reuniaoTeams === true));
        logger.log('info', 'Replicação', 'Evento criado no grupo ou equipe.');
        setSyncVersion((version: number): number => version + 1);
        return {
          fields: { IdEventoMicrosoft: eventId },
          rollback: async (): Promise<void> => {
            await graph.deleteEvent(groupId, eventId);
          }
        };
      } catch (error: unknown) {
        const message: string = describeGraphError(error);
        logger.log('error', 'Replicação', message);
        throw syncError(`Não foi possível criar o evento no grupo ou equipe: ${message}`);
      }
    },
    beforeUpdate: async (item: IEvento, body: Record<string, unknown>): Promise<void> => {
      // Itens criados antes da replicação não têm ID no grupo: continuam somente na lista.
      if (!sync || !item.IdEventoMicrosoft) {
        return;
      }
      try {
        const { service: graph, groupId } = await openGroup(getClient, groupIdentifier);
        await graph.updateEvent(groupId, item.IdEventoMicrosoft, listToGraphBody(body, false));
        logger.log('info', 'Replicação', 'Evento atualizado no grupo ou equipe.');
        setSyncVersion((version: number): number => version + 1);
      } catch (error: unknown) {
        const message: string = describeGraphError(error);
        logger.log('error', 'Replicação', message);
        throw syncError(`Não foi possível atualizar o evento no grupo ou equipe: ${message}`);
      }
    },
    beforeDelete: async (item: IEvento): Promise<void> => {
      if (!sync || !item.IdEventoMicrosoft) {
        return;
      }
      try {
        const { service: graph, groupId } = await openGroup(getClient, groupIdentifier);
        await graph.deleteEvent(groupId, item.IdEventoMicrosoft);
        logger.log('info', 'Replicação', 'Evento excluído do grupo ou equipe.');
        setSyncVersion((version: number): number => version + 1);
      } catch (error: unknown) {
        const message: string = describeGraphError(error);
        logger.log('error', 'Replicação', message);
        throw syncError(`Não foi possível excluir o evento do grupo ou equipe: ${message}`);
      }
    }
  };

  const calendar: ICrudList<IEvento> = useCrudList<IEvento>({
    service,
    logger,
    listTitle,
    adminGroupIds,
    singular: 'evento',
    select: SELECT,
    top: EVENT_LIMIT,
    query: () => ({
      filter: `DataInicio lt ${odataDateTime(period.end)} and DataFim gt ${odataDateTime(period.start)}`,
      orderBy: 'DataInicio asc'
    }),
    getLabel: (event: IEvento) => event.Title,
    contextLabel,
    themeStyle,
    deps: [periodKey],
    enabled: configured,
    writeHooks,
    renderForm: (context) => <EventoForm {...context} syncEnabled={sync} />
  });

  const group = useGroupCalendarEvents({
    identifier: groupIdentifier,
    getClient,
    period,
    logger,
    reloadKey: syncVersion
  });

  const items: IEvento[] | undefined = React.useMemo(
    (): IEvento[] | undefined => (calendar.items === undefined ? undefined : mergeCalendarEvents(calendar.items, group.events)),
    [calendar.items, group.events]
  );

  const days: Date[] = React.useMemo((): Date[] => daysFor(view, anchor), [view, anchor]);
  const byDay: Map<string, IEvento[]> = React.useMemo(
    (): Map<string, IEvento[]> => eventsByDay(items ?? [], days),
    [items, days]
  );

  const move = (step: number): void => setAnchor((current: Date): Date => shiftAnchor(view, current, step));
  const goToday = (): void => setAnchor(startOfDay(new Date()));

  const openDayView = (day: Date): void => {
    setChosenView('dia');
    setAnchor(day);
  };

  /** Ações do detalhe: links do Teams e do Outlook para eventos replicados ou do grupo; edição só na lista. */
  const actionsFor = (event: IEvento): React.ReactNode => (
    <>
      {event.LinkReuniao && (
        <DefaultButton
          text="Link da reunião"
          href={event.LinkReuniao}
          target="_blank"
          iconProps={{ iconName: 'Video' }}
          title="Entrar na reunião (abre em nova aba)"
          styles={navButtonStyles}
        />
      )}
      {event.LinkOutlook && (
        <DefaultButton
          text="Abrir no Outlook"
          href={event.LinkOutlook}
          target="_blank"
          iconProps={{ iconName: 'OpenInNewWindow' }}
          title="Abrir o evento original no Outlook (abre em nova aba)"
          styles={navButtonStyles}
        />
      )}
      {event.Origem !== 'microsoft' && calendar.renderActions(event)}
    </>
  );

  const loading: boolean = items === undefined || group.loading;

  let content: React.ReactNode;
  if (!configured) {
    content = <div className={styles.empty}>Escolha a lista de eventos nas configurações da Web Part.</div>;
  } else if (calendar.hasError) {
    content = <div className={styles.message} role="alert">Não foi possível carregar os eventos.</div>;
  } else if (loading || items === undefined) {
    content = <div className={styles.skeleton} aria-busy="true" aria-label="Carregando eventos" />;
  } else if (isMini) {
    content = <MiniMonth anchor={anchor} days={days} byDay={byDay} onDayClick={(day: Date) => setDayOpen(day)} />;
  } else if (view === 'mes') {
    content = (
      <MonthView
        anchor={anchor}
        days={days}
        byDay={byDay}
        onEventClick={(event: IEvento) => setDetail(event)}
        onDayClick={openDayView}
      />
    );
  } else if (view === 'semana') {
    content = <WeekView days={days} byDay={byDay} onEventClick={(event: IEvento) => setDetail(event)} />;
  } else {
    content = <DayView day={period.start} byDay={byDay} onEventClick={(event: IEvento) => setDetail(event)} />;
  }

  return (
    <section className={styles.root} style={themeStyle} aria-label={contextLabel}>
      <header className={coreStyles.wpHeader}>
        {title && (
          <h2 className={coreStyles.wpTitle}>
            <Icon iconName="Calendar" className={coreStyles.wpIcon} aria-hidden="true" />
            {title}
          </h2>
        )}
      </header>
      {configured && (
        <div className={calendarioStyles.toolbar}>
          <div className={calendarioStyles.nav}>
            <DefaultButton
              iconProps={{ iconName: 'ChevronLeft' }}
              ariaLabel="Anterior"
              title="Anterior"
              onClick={() => move(-1)}
              styles={navButtonStyles}
            />
            <DefaultButton text="Hoje" onClick={goToday} styles={navButtonStyles} />
            <DefaultButton
              iconProps={{ iconName: 'ChevronRight' }}
              ariaLabel="Próximo"
              title="Próximo"
              onClick={() => move(1)}
              styles={navButtonStyles}
            />
          </div>
          <h3 className={calendarioStyles.periodTitle} aria-live="polite">
            {formatPeriodTitle(view, anchor)}
          </h3>
          {!isMini && (
            <div className={calendarioStyles.views} role="group" aria-label="Visualização">
              {VIEWS.map((option: CalendarView) =>
                option === view ? (
                  <PrimaryButton key={option} text={VIEW_LABELS[option]} aria-pressed="true" onClick={() => setChosenView(option)} styles={activeViewStyles} />
                ) : (
                  <DefaultButton key={option} text={VIEW_LABELS[option]} aria-pressed="false" onClick={() => setChosenView(option)} styles={navButtonStyles} />
                )
              )}
            </div>
          )}
          {calendar.toolbar}
        </div>
      )}
      {group.error && (
        <div className={styles.message} role="status">
          Eventos do grupo ou equipe não carregados: {group.error}
        </div>
      )}
      {content}
      <DiagnosticsPanel logger={logger} />
      {calendar.modals}
      {detail && (
        <EventoDetailModal
          evento={detail}
          actions={actionsFor(detail)}
          contextLabel={contextLabel}
          themeStyle={themeStyle}
          onDismiss={() => setDetail(undefined)}
        />
      )}
      {dayOpen && (
        <DayEventsModal
          date={dayOpen}
          events={byDay.get(dayKey(dayOpen)) ?? []}
          renderActions={actionsFor}
          contextLabel={contextLabel}
          themeStyle={themeStyle}
          onDismiss={() => setDayOpen(undefined)}
        />
      )}
    </section>
  );
};

export default Calendario;
