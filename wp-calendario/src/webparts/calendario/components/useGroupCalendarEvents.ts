import * as React from 'react';
import { MSGraphClientV3 } from '@microsoft/sp-http';
import { DiagnosticsLogger } from '../../../core/diagnostics';
import { GraphCalendarService, IExternalEvento, MAX_EVENTS_SCANNED } from '../../../services/GraphCalendarService';
import { describeGraphError } from '../calendarSync';
import { IPeriod } from './calendarUtils';

export interface IGroupEventsOptions {
  /** E-mail ou ID do grupo/equipe. Vazio: nenhuma consulta. */
  identifier: string;
  getClient: () => Promise<MSGraphClientV3>;
  /** Período exibido. Deve ser estável entre renderizações (memoizado pelo chamador). */
  period: IPeriod;
  logger: DiagnosticsLogger;
  /** Incrementado após uma replicação, para reler o grupo sem trocar o período. */
  reloadKey: number;
}

export interface IGroupEventsState {
  events: IExternalEvento[];
  loading: boolean;
  error?: string;
}

/** Eventos do grupo ou equipe no período exibido. Falha não impede a exibição da lista. */
export const useGroupCalendarEvents = (options: IGroupEventsOptions): IGroupEventsState => {
  const { identifier, getClient, period, logger, reloadKey } = options;
  const value: string = identifier.trim();
  const [state, setState] = React.useState<IGroupEventsState>({ events: [], loading: value !== '' });

  React.useEffect(() => {
    let active: boolean = true;
    if (value === '') {
      setState({ events: [], loading: false });
      return undefined;
    }
    setState((current: IGroupEventsState): IGroupEventsState => ({ events: current.events, loading: true }));
    const load = async (): Promise<void> => {
      const service: GraphCalendarService = new GraphCalendarService(await getClient());
      const groupId: string = await service.resolveGroupId(value);
      const result = await service.listRange(groupId, period.start, period.end);
      if (result.truncated) {
        logger.log('warn', 'Calendário Microsoft 365', `Mais de ${MAX_EVENTS_SCANNED} eventos no período: a lista pode estar incompleta.`);
      }
      logger.log('info', 'Calendário Microsoft 365', `${result.events.length} evento(s) do grupo ou equipe no período.`);
      if (active) {
        setState({ events: result.events, loading: false });
      }
    };
    load().catch((error: unknown) => {
      const message: string = describeGraphError(error);
      logger.log('error', 'Calendário Microsoft 365', message);
      if (active) {
        setState({ events: [], loading: false, error: message });
      }
    });
    return () => {
      active = false;
    };
  }, [value, period, getClient, logger, reloadKey]);

  return state;
};
