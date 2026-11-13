import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import formStyles from '../../../crud/crud.module.scss';
import ModalShell from '../../../crud/ModalShell';
import { secondaryButtonStyles } from '../../../crud/modalStyles';
import calendarioStyles from './Calendario.module.scss';
import { IEvento } from './IEventoProps';
import { eventKey, formatDayLong, formatRange } from './calendarUtils';

export interface IDayEventsProps {
  date: Date;
  events: IEvento[];
  renderActions: (event: IEvento) => React.ReactNode;
  contextLabel: string;
  themeStyle?: React.CSSProperties;
  onDismiss: () => void;
}

/** Miniatura: detalhes de todos os eventos do dia, abertos ao clicar no dia. */
const DayEventsModal: React.FC<IDayEventsProps> = ({ date, events, renderActions, contextLabel, themeStyle, onDismiss }) => {
  const titleId: string = React.useId();
  return (
    <ModalShell contextLabel={contextLabel} titleId={titleId} firstFocusableClass={formStyles.focusFirst} onDismiss={onDismiss} themeStyle={themeStyle}>
      <h2 id={titleId} className={formStyles.modalTitle}>
        {formatDayLong(date)}
      </h2>
      {events.length === 0 && <p className={calendarioStyles.empty}>Nenhum evento neste dia.</p>}
      {events.map((event: IEvento) => (
        <article key={eventKey(event)} className={calendarioStyles.dayEvent}>
          <header className={calendarioStyles.dayEventHeader}>
            <h3 className={calendarioStyles.dayEventTitle}>{event.Title}</h3>
            {renderActions(event)}
          </header>
          <dl className={calendarioStyles.details}>
            <dt>Horário</dt>
            <dd>{formatRange(event)}</dd>
            {event.Local && (
              <>
                <dt>Local</dt>
                <dd>{event.Local}</dd>
              </>
            )}
            {event.Tipo && (
              <>
                <dt>Tipo</dt>
                <dd>{event.Tipo}</dd>
              </>
            )}
            {event.Organizador && (
              <>
                <dt>Organizador</dt>
                <dd>{event.Organizador}</dd>
              </>
            )}
            {event.Origem === 'microsoft' && (
              <>
                <dt>Origem</dt>
                <dd>Grupo ou equipe Microsoft 365 (somente leitura)</dd>
              </>
            )}
          </dl>
          {event.Descricao && <p className={calendarioStyles.description}>{event.Descricao}</p>}
        </article>
      ))}
      <div className={formStyles.footer}>
        <div className={formStyles.footerActions}>
          <DefaultButton text="Fechar" onClick={onDismiss} styles={secondaryButtonStyles} />
        </div>
      </div>
    </ModalShell>
  );
};

export default DayEventsModal;
