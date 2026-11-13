import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import formStyles from '../../../crud/crud.module.scss';
import ModalShell from '../../../crud/ModalShell';
import { secondaryButtonStyles } from '../../../crud/modalStyles';
import comunicadoStyles from './Comunicados.module.scss';
import { IComunicado } from './IComunicadosProps';
import { toSafeHtml } from './richText';

export interface IComunicadoReadModalProps {
  item: IComunicado;
  categoryName: string;
  dateText: string;
  contextLabel: string;
  themeStyle?: React.CSSProperties;
  onDismiss: () => void;
}

/** Leitura integral de um comunicado (somente leitura), no layout padrão de modais. */
const ComunicadoReadModal: React.FC<IComunicadoReadModalProps> = ({ item, categoryName, dateText, contextLabel, themeStyle, onDismiss }) => {
  const titleId: string = React.useId();
  return (
    <ModalShell
      contextLabel={contextLabel}
      titleId={titleId}
      firstFocusableClass={formStyles.focusFirst}
      onDismiss={onDismiss}
      themeStyle={themeStyle}
    >
      <h2 id={titleId} className={formStyles.modalTitle}>
        {item.Title}
      </h2>
      <div className={comunicadoStyles.readMeta}>
        <span className={comunicadoStyles.date}>{dateText}</span>
        {categoryName && <span className={comunicadoStyles.category}>{categoryName}</span>}
      </div>
      {/* HTML já passou pela allowlist (richText.ts); texto antigo é escapado antes de virar HTML. */}
      <div className={comunicadoStyles.readMessage} dangerouslySetInnerHTML={{ __html: toSafeHtml(item.Mensagem) }} />
      {item.Autor && <div className={comunicadoStyles.author}>Autor: {item.Autor}</div>}
      <div className={formStyles.footer}>
        <div className={formStyles.footerActions}>
          <DefaultButton text="Fechar" onClick={onDismiss} styles={secondaryButtonStyles} className={formStyles.focusFirst} />
        </div>
      </div>
    </ModalShell>
  );
};

export default ComunicadoReadModal;
