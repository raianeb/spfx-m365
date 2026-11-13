import * as React from 'react';
import { DefaultButton, IButtonStyles } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { MSGraphClientV3 } from '@microsoft/sp-http';
import styles from './shared.module.scss';
import coreStyles from '../../../core/core.module.scss';
import agendaStyles from './AgendaMicrosoft.module.scss';
import { DiagnosticsLogger, DiagnosticsPanel } from '../../../core/diagnostics';
import { EventCount, GraphCalendarService, IExternalEvento, MAX_EVENTS_SCANNED } from '../../../services/GraphCalendarService';
import { INovoEventoValues } from '../../../services/GraphEventInput';
import NovoEventoGraphForm from './NovoEventoGraphForm';

export type AgendaSource = 'grupo' | 'equipe';

export interface IAgendaMicrosoftProps {
  logger: DiagnosticsLogger;
  title: string;
  themeStyle: React.CSSProperties;
  source: AgendaSource;
  /** E-mail ou ID do grupo (ou da equipe). */
  identifier: string;
  count: EventCount;
  /** Quando verdadeiro, a WP oferece a ação de criar evento no calendário do grupo ou equipe. */
  canCreate: boolean;
  /** Fábrica estável do cliente Graph do SPFx (MSGraphClientV3). */
  getClient: () => Promise<MSGraphClientV3>;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; events: IExternalEvento[]; truncated: boolean }
  | { status: 'error'; message: string };

const SOURCE_LABEL: Record<AgendaSource, string> = { grupo: 'Grupo Microsoft 365', equipe: 'Equipe Teams' };

/** Botão de barra compacto: 32px de altura, ícone de 16px. */
const toolbarButtonStyles: IButtonStyles = {
  root: { height: 32, minWidth: 0, padding: '0 12px' },
  label: { fontSize: 13, fontWeight: 400 },
  icon: { fontSize: 16 }
};

const dateText = (date: Date, timeZone?: string): string =>
  date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone });

const timeText = (date: Date): string => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Data e horário do evento. Dia inteiro usa a data em UTC, que é como o Graph grava o dia. */
export const formatWhen = (evento: IExternalEvento): string => {
  if (evento.diaInteiro) {
    return `${dateText(evento.inicio, 'UTC')} · Dia inteiro`;
  }
  const start: string = `${dateText(evento.inicio)} ${timeText(evento.inicio)}`;
  if (dateText(evento.inicio) === dateText(evento.fim)) {
    return `${start} – ${timeText(evento.fim)}`;
  }
  return `${start} – ${dateText(evento.fim)} ${timeText(evento.fim)}`;
};

/** Mensagem clara para o erro do Graph. 401/403 costuma ser permissão ainda não aprovada ou falta de vínculo com o grupo. */
export const describeError = (error: unknown): string => {
  const status: number | undefined = (error as { statusCode?: number } | undefined)?.statusCode;
  if (status === 401 || status === 403) {
    return 'Sem permissão para acessar este calendário. Confirme se você é membro do grupo ou equipe e se o administrador aprovou a permissão Group.ReadWrite.All em API access.';
  }
  if (status === 404) {
    return 'Grupo ou equipe não encontrado. Confira o identificador nas configurações da Web Part.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Não foi possível carregar os eventos.';
};

const EventoItem: React.FC<{ evento: IExternalEvento }> = ({ evento }) => (
  <article className={agendaStyles.item}>
    <div className={agendaStyles.when}>{formatWhen(evento)}</div>
    <div className={agendaStyles.body}>
      <h3 className={agendaStyles.titulo}>{evento.titulo}</h3>
      <div className={agendaStyles.meta}>
        {evento.local && <span>Local: {evento.local}</span>}
        {evento.organizador && <span>Organizador: {evento.organizador}</span>}
      </div>
    </div>
    <div className={agendaStyles.actions}>
      {evento.linkReuniao && (
        <DefaultButton text="Link da reunião" href={evento.linkReuniao} target="_blank" iconProps={{ iconName: 'Video' }} title="Entrar na reunião (abre em nova aba)" />
      )}
      {evento.linkOutlook && (
        <DefaultButton text="Abrir no Outlook" href={evento.linkOutlook} target="_blank" iconProps={{ iconName: 'OpenInNewWindow' }} title="Abrir o evento original no Outlook (abre em nova aba)" />
      )}
    </div>
  </article>
);

/**
 * Agenda de eventos de um grupo ou equipe do Microsoft 365. Mostra título, local, organizador, data e os
 * links da reunião e do evento original (RF-CAL-02, RF-CAL-03 e RF-CAL-04). Quando habilitada pelo
 * administrador, permite criar evento no mesmo calendário.
 */
const AgendaMicrosoft: React.FC<IAgendaMicrosoftProps> = ({ logger, title, themeStyle, source, identifier, count, canCreate, getClient }) => {
  const [state, setState] = React.useState<LoadState>({ status: 'loading' });
  const [formOpen, setFormOpen] = React.useState<boolean>(false);
  /** Incrementado após criar um evento, para recarregar a lista sem trocar a configuração. */
  const [reloadToken, setReloadToken] = React.useState<number>(0);
  const contextLabel: string = title || 'Agenda';
  const value: string = identifier.trim();
  const queryKey: string = `${source}|${value}|${count}|${reloadToken}`;

  React.useEffect(() => {
    let active: boolean = true;
    if (value === '') {
      setState({ status: 'error', message: 'Informe o e-mail ou o ID do grupo/equipe nas configurações da Web Part.' });
      return undefined;
    }
    setState({ status: 'loading' });
    const load = async (): Promise<void> => {
      const service: GraphCalendarService = new GraphCalendarService(await getClient());
      const groupId: string = await service.resolveGroupId(value);
      const result = await service.listUpcoming(groupId, count, new Date());
      if (result.truncated) {
        logger.log('warn', 'Agenda Microsoft 365', `Calendário com mais de ${MAX_EVENTS_SCANNED} eventos na janela: a ordenação vale só para o lote lido.`);
      }
      logger.log('info', 'Agenda Microsoft 365', `${result.events.length} evento(s) carregado(s) de ${SOURCE_LABEL[source]}.`);
      if (active) {
        setState({ status: 'ready', events: result.events, truncated: result.truncated });
      }
    };
    load().catch((error: unknown) => {
      const message: string = describeError(error);
      logger.log('error', 'Agenda Microsoft 365', message);
      if (active) {
        setState({ status: 'error', message });
      }
    });
    return () => {
      active = false;
    };
    // queryKey resume source, identifier, count e a última criação; getClient e logger são estáveis.
  }, [queryKey, getClient, logger]);

  /** Grava o evento no calendário. Falhas viram Error com mensagem clara para o formulário. */
  const saveEvento = async (values: INovoEventoValues): Promise<void> => {
    try {
      const service: GraphCalendarService = new GraphCalendarService(await getClient());
      const groupId: string = await service.resolveGroupId(value);
      const evento: IExternalEvento = await service.createEvent(groupId, values);
      logger.log('info', 'Agenda Microsoft 365', `Evento criado em ${SOURCE_LABEL[source]}: ${evento.titulo}.`);
      setFormOpen(false);
      setReloadToken((token: number) => token + 1);
    } catch (error: unknown) {
      const message: string = describeError(error);
      logger.log('error', 'Agenda Microsoft 365', `Falha ao criar evento: ${message}`);
      throw new Error(message);
    }
  };

  let body: React.ReactNode;
  if (state.status === 'loading') {
    body = <div className={styles.skeleton} aria-busy="true" aria-label="Carregando eventos" />;
  } else if (state.status === 'error') {
    body = <div className={styles.message} role="alert">{state.message}</div>;
  } else if (state.events.length === 0) {
    body = <div className={styles.empty}>Nenhum evento a partir de hoje.</div>;
  } else {
    body = (
      <ul className={agendaStyles.list}>
        {state.events.map((evento: IExternalEvento) => (
          <li key={evento.id}>
            <EventoItem evento={evento} />
          </li>
        ))}
      </ul>
    );
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
      <div className={agendaStyles.toolbar}>
        <div className={agendaStyles.caption}>
          {SOURCE_LABEL[source]} · {canCreate ? 'criação habilitada' : 'somente leitura'}
        </div>
        {canCreate && value !== '' && (
          <DefaultButton
            text="Novo evento"
            iconProps={{ iconName: 'Add' }}
            title="Criar evento neste calendário"
            onClick={() => setFormOpen(true)}
            styles={toolbarButtonStyles}
          />
        )}
      </div>
      {body}
      {state.status === 'ready' && state.truncated && (
        <div className={agendaStyles.notice} role="status">
          O calendário tem muitos eventos no período. A lista considera apenas os primeiros lidos.
        </div>
      )}
      {formOpen && (
        <NovoEventoGraphForm
          logger={logger}
          contextLabel={contextLabel}
          themeStyle={themeStyle}
          onDismiss={() => setFormOpen(false)}
          save={saveEvento}
        />
      )}
      <DiagnosticsPanel logger={logger} />
    </section>
  );
};

export default AgendaMicrosoft;
