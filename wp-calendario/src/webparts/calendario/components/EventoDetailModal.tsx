import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import formStyles from '../../../crud/crud.module.scss';
import ModalShell from '../../../crud/ModalShell';
import { secondaryButtonStyles } from '../../../crud/modalStyles';
import calendarioStyles from './Calendario.module.scss';
import { IEvento } from './IEventoProps';
import { formatDayLong, formatRange } from './calendarUtils';

export interface IEventoDetailProps {
  evento: IEvento;
  actions: React.ReactNode;
  contextLabel: string;
  themeStyle?: React.CSSProperties;
  onDismiss: () => void;
}

/** Detalhes somente leitura de um evento. Ações de editar e excluir aparecem para administradores. */
const EventoDetailModal: React.FC<IEventoDetailProps> = ({ evento, actions, contextLabel, themeStyle, onDismiss }) => {
  const titleId: string = React.useId();
  const start: Date = new Date(evento.DataInicio);
  return (
    <ModalShell contextLabel={contextLabel} titleId={titleId} firstFocusableClass={formStyles.focusFirst} onDismiss={onDismiss} themeStyle={themeStyle}>
      <h2 id={titleId} className={formStyles.modalTitle}>
        {evento.Title}
      </h2>
      <dl className={calendarioStyles.details}>
        <dt>Data</dt>
        <dd>{formatDayLong(start)}</dd>
        <dt>Horário</dt>
        <dd>{formatRange(evento)}</dd>
        {evento.Local && (
          <>
            <dt>Local</dt>
            <dd>{evento.Local}</dd>
          </>
        )}
        {evento.Tipo && (
          <>
            <dt>Tipo</dt>
            <dd>{evento.Tipo}</dd>
          </>
        )}
        {evento.Organizador && (
          <>
            <dt>Organizador</dt>
            <dd>{evento.Organizador}</dd>
          </>
        )}
        {evento.Origem === 'microsoft' && (
          <>
            <dt>Origem</dt>
            <dd>Grupo ou equipe Microsoft 365 (somente leitura)</dd>
          </>
        )}
      </dl>
      {evento.Descricao && <p className={calendarioStyles.description}>{evento.Descricao}</p>}
      <div className={formStyles.footer}>
        <div className={formStyles.footerActions}>
          {actions}
          <DefaultButton text="Fechar" onClick={onDismiss} styles={secondaryButtonStyles} />
        </div>
      </div>
    </ModalShell>
  );
};

export default EventoDetailModal;
