import * as React from 'react';
import ModalShell from '../../../crud/ModalShell';
import styles from '../../../crud/crud.module.scss';
import manageStyles from '../../../crud/manage.module.scss';
import { ICrudList } from '../../../crud/useCrudList';
import { ICategoria } from './IComunicadosProps';

export interface ICategoriasModalProps {
  contextLabel: string;
  themeStyle?: React.CSSProperties;
  list: ICrudList<ICategoria>;
  onDismiss: () => void;
}

/**
 * Gerenciamento das categorias: lista com editar e excluir, inclusão pelo botão "+".
 * As modais de formulário e de confirmação do próprio hook são renderizadas dentro desta modal.
 */
const CategoriasModal: React.FC<ICategoriasModalProps> = ({ contextLabel, themeStyle, list, onDismiss }) => {
  const titleId: string = React.useId();
  const items: ICategoria[] | undefined = list.items;

  let body: React.ReactNode;
  if (list.hasError) {
    body = (
      <div className={styles.error} role="alert">
        Não foi possível carregar as categorias.
      </div>
    );
  } else if (items === undefined) {
    body = <p className={manageStyles.status} aria-live="polite">Carregando categorias...</p>;
  } else if (items.length === 0) {
    body = <p className={manageStyles.status}>Nenhuma categoria cadastrada. Use o botão + para incluir a primeira.</p>;
  } else {
    body = (
      <ul className={manageStyles.list}>
        {items.map((category: ICategoria) => (
          <li key={category.Id} className={manageStyles.row}>
            <div className={manageStyles.info}>
              <span className={manageStyles.label}>{category.Title}</span>
            </div>
            {list.renderActions(category)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ModalShell contextLabel={contextLabel} titleId={titleId} onDismiss={onDismiss} themeStyle={themeStyle}>
      <h2 id={titleId} className={styles.modalTitle}>
        Categorias de comunicados
      </h2>
      {list.toolbar}
      {body}
      {list.modals}
    </ModalShell>
  );
};

export default CategoriasModal;
