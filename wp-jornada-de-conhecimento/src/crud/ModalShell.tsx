import * as React from 'react';
import { Modal } from '@fluentui/react/lib/Modal';
import { IconButton } from '@fluentui/react/lib/Button';
import styles from './crud.module.scss';
import { closeButtonStyles, modalContainerStyles } from './modalStyles';

export interface IModalShellProps {
  /** Nome da WP, mostrado discretamente no cabeçalho. */
  contextLabel: string;
  titleId: string;
  /** Classe do elemento que deve receber o foco inicial (primeiro campo ou ação de cancelar). */
  firstFocusableClass?: string;
  onDismiss: () => void;
  themeStyle?: React.CSSProperties;
  children: React.ReactNode;
}

/** Casca padrão das modais da WP: cabeçalho fixo, área de conteúdo com uma única rolagem e tema da instância. */
const ModalShell: React.FC<IModalShellProps> = ({ contextLabel, titleId, firstFocusableClass, onDismiss, themeStyle, children }) => (
  <Modal
    isOpen
    onDismiss={onDismiss}
    titleAriaId={titleId}
    styles={modalContainerStyles}
    firstFocusableSelector={firstFocusableClass}
  >
    <div className={styles.modalRoot} style={themeStyle}>
      <header className={styles.modalHeader}>
        <span className={styles.modalContext}>{contextLabel}</span>
        <IconButton
          iconProps={{ iconName: 'Cancel' }}
          ariaLabel="Fechar"
          title="Fechar"
          onClick={onDismiss}
          styles={closeButtonStyles}
        />
      </header>
      <div className={styles.modalScroll}>{children}</div>
    </div>
  </Modal>
);

export default ModalShell;
