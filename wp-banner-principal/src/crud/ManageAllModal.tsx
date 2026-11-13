import * as React from 'react';
import { DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './crud.module.scss';
import manageStyles from './manage.module.scss';
import ModalShell from './ModalShell';
import { primaryButtonStyles, secondaryButtonStyles } from './modalStyles';

export interface IManageAllModalProps<T> {
  contextLabel: string;
  title: string;
  items: T[] | undefined;
  hasError: boolean;
  getLabel: (item: T) => string;
  renderMeta?: (item: T) => string;
  renderActions: (item: T) => React.ReactNode;
  onDismiss: () => void;
  diagnostics?: React.ReactNode;
  themeStyle?: React.CSSProperties;
  /** Quando informado, a lista pode ser reordenada (arrastar ou setas) e a nova ordem é salva por este callback. */
  onSaveOrder?: (ordered: T[]) => Promise<void>;
}

const moveItem = <T,>(list: T[], from: number, to: number): T[] => {
  const next: T[] = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

const sameOrder = <T extends { Id: number }>(a: T[], b: T[]): boolean =>
  a.length === b.length && a.every((item: T, index: number) => item.Id === b[index].Id);

/** Lista completa dos registros. Com onSaveOrder, permite definir a ordem de exibição; editar e excluir ficam em cada linha. */
function ManageAllModal<T extends { Id: number }>({
  contextLabel,
  title,
  items,
  hasError,
  getLabel,
  renderMeta,
  renderActions,
  onDismiss,
  diagnostics,
  themeStyle,
  onSaveOrder
}: IManageAllModalProps<T>): React.ReactElement {
  const titleId: string = React.useId();
  const [order, setOrder] = React.useState<T[] | undefined>(items);
  const [dragFrom, setDragFrom] = React.useState<number | undefined>(undefined);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [saveError, setSaveError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    setOrder(items);
  }, [items]);

  const rows: T[] | undefined = onSaveOrder ? order : items;
  const dirty: boolean = onSaveOrder !== undefined && order !== undefined && items !== undefined && !sameOrder(order, items);

  const shift = (index: number, to: number): void => {
    if (!order || to < 0 || to >= order.length) {
      return;
    }
    setOrder(moveItem(order, index, to));
  };

  const save = (): void => {
    if (!onSaveOrder || !order) {
      return;
    }
    setSaving(true);
    setSaveError(undefined);
    onSaveOrder(order).catch(() => {
      setSaveError('Não foi possível salvar a ordem. Tente novamente.');
      setSaving(false);
    });
  };

  let body: React.ReactNode;
  if (hasError) {
    body = (
      <div className={styles.error} role="alert">
        Não foi possível carregar os registros.
      </div>
    );
  } else if (rows === undefined) {
    body = <p className={manageStyles.status} aria-live="polite">Carregando registros...</p>;
  } else if (rows.length === 0) {
    body = <p className={manageStyles.status}>Nenhum registro cadastrado.</p>;
  } else {
    body = (
      <ul className={manageStyles.list}>
        {rows.map((item: T, index: number) => (
          <li
            key={item.Id}
            className={dragFrom === index ? `${manageStyles.row} ${manageStyles.rowDragging}` : manageStyles.row}
            draggable={onSaveOrder !== undefined && !saving}
            onDragStart={(event: React.DragEvent<HTMLLIElement>) => {
              setDragFrom(index);
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', String(item.Id));
            }}
            onDragOver={(event: React.DragEvent<HTMLLIElement>) => {
              if (dragFrom !== undefined) {
                event.preventDefault();
              }
            }}
            onDrop={(event: React.DragEvent<HTMLLIElement>) => {
              event.preventDefault();
              if (dragFrom !== undefined && dragFrom !== index) {
                shift(dragFrom, index);
              }
              setDragFrom(undefined);
            }}
            onDragEnd={() => setDragFrom(undefined)}
          >
            {onSaveOrder && (
              <span className={manageStyles.handle} aria-hidden="true" title="Arraste para reordenar">
                <Icon iconName="GripperDotsVertical" />
              </span>
            )}
            <div className={manageStyles.info}>
              <span className={manageStyles.label}>{getLabel(item)}</span>
              {renderMeta && <span className={manageStyles.meta}>{renderMeta(item)}</span>}
            </div>
            {onSaveOrder && (
              <div className={manageStyles.order}>
                <IconButton
                  iconProps={{ iconName: 'ChevronUp' }}
                  ariaLabel={`Mover ${getLabel(item)} para cima`}
                  title="Mover para cima"
                  disabled={index === 0 || saving}
                  onClick={() => shift(index, index - 1)}
                />
                <IconButton
                  iconProps={{ iconName: 'ChevronDown' }}
                  ariaLabel={`Mover ${getLabel(item)} para baixo`}
                  title="Mover para baixo"
                  disabled={index === rows.length - 1 || saving}
                  onClick={() => shift(index, index + 1)}
                />
              </div>
            )}
            {renderActions(item)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ModalShell contextLabel={contextLabel} titleId={titleId} onDismiss={onDismiss} themeStyle={themeStyle}>
      <h2 id={titleId} className={styles.modalTitle}>
        {title}
      </h2>
      {onSaveOrder && rows && rows.length > 1 && (
        <p className={manageStyles.hint}>Arraste os banners ou use as setas para definir a ordem de exibição. Salve para aplicar.</p>
      )}
      {body}
      {onSaveOrder && rows && rows.length > 0 && (
        <div className={manageStyles.footer}>
          <span className={manageStyles.status}>{dirty ? 'Ordem alterada e ainda não salva.' : 'Ordem atual.'}</span>
          <div className={manageStyles.footerActions}>
            <DefaultButton
              text="Desfazer"
              disabled={!dirty || saving}
              onClick={() => setOrder(items)}
              styles={secondaryButtonStyles}
            />
            <PrimaryButton
              text={saving ? 'Salvando...' : 'Salvar ordem'}
              disabled={!dirty || saving}
              onClick={save}
              styles={primaryButtonStyles}
            />
          </div>
        </div>
      )}
      {saveError && (
        <div className={styles.error} role="alert">
          {saveError}
        </div>
      )}
      {diagnostics && <div className={styles.diagnosticsArea}>{diagnostics}</div>}
    </ModalShell>
  );
}

export default ManageAllModal;
