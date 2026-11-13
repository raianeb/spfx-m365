import * as React from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import styles from './crud.module.scss';
import ModalShell from './ModalShell';
import { dangerButtonStyles, secondaryButtonStyles } from './modalStyles';

export interface IConfirmDeleteModalProps {
  contextLabel: string;
  itemLabel: string;
  onDismiss: () => void;
  onConfirm: () => Promise<void>;
  diagnostics?: React.ReactNode;
  themeStyle?: React.CSSProperties;
}

/** Confirmação antes de excluir, no mesmo layout das demais modais. O item segue para a lixeira do site. */
const ConfirmDeleteModal: React.FC<IConfirmDeleteModalProps> = ({
  contextLabel,
  itemLabel,
  onDismiss,
  onConfirm,
  diagnostics,
  themeStyle,
}) => {
  const titleId: string = React.useId();
  const [deleting, setDeleting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);

  const confirm = async (): Promise<void> => {
    setDeleting(true);
    setError(undefined);
    try {
      await onConfirm();
    } catch {
      setError('Não foi possível excluir o item. Tente novamente.');
      setDeleting(false);
    }
  };

  return (
    <ModalShell
      contextLabel={contextLabel}
      titleId={titleId}
      firstFocusableClass={styles.focusFirst}
      onDismiss={onDismiss}
      themeStyle={themeStyle}
    >
      <h2 id={titleId} className={styles.modalTitle}>
        Excluir item
      </h2>
      <p className={styles.modalText}>
        Tem certeza de que deseja excluir <strong>{itemLabel}</strong>? O item será enviado para a lixeira do site.
      </p>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      <div className={styles.footer}>
        <span className={styles.helper}>O item pode ser restaurado pela lixeira do site.</span>
        <div className={styles.footerActions}>
          <DefaultButton
            className={styles.focusFirst}
            text="Cancelar"
            onClick={onDismiss}
            disabled={deleting}
            styles={secondaryButtonStyles}
          />
          <PrimaryButton
            text={deleting ? 'Excluindo...' : 'Excluir'}
            disabled={deleting}
            onClick={confirm}
            styles={dangerButtonStyles}
          />
        </div>
      </div>
      {diagnostics && <div className={styles.diagnosticsArea}>{diagnostics}</div>}
    </ModalShell>
  );
};

export default ConfirmDeleteModal;
