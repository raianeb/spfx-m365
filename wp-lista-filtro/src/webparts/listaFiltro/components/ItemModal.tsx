import * as React from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Modal } from '@fluentui/react/lib/Modal';
import styles from './ListaFiltro.module.scss';
import { MODAL_STYLES, buttonStyles } from './controlStyles';
import { ICondition, buildViewXml } from '../../../services/camlBuilder';
import { IListField } from '../../../services/fieldSchema';
import { formatCell, isHttpUrl } from '../../../services/formatValue';
import { ListQueryService, ListRow } from '../../../services/ListQueryService';

export interface IItemModalProps {
  service: ListQueryService;
  listTitle: string;
  /** Campos úteis da lista, na ordem da lista. */
  fields: IListField[];
  /** Colunas exibidas na grade: usadas se a consulta completa falhar. */
  columns: IListField[];
  itemId: number;
  itemCount: number;
  contextLabel: string;
  /** Endereço do formulário de exibição no SharePoint. Ausente = sem botão de abrir. */
  openUrl?: string;
  onDismiss: () => void;
}

/** `partial`: a consulta completa falhou e a modal mostra só as colunas da grade. */
type LoadState =
  | { status: 'loading' }
  | { status: 'done'; row: ListRow | undefined; partial: boolean }
  | { status: 'error'; detail: string };

/** Texto curto do erro, para mostrar na modal e ajudar o diagnóstico. */
const errorText = (error: unknown): string => (error instanceof Error ? error.message : '');

/** Valor de um campo, formatado como na grade. Booleanos viram Sim/Não e vazios viram travessão. */
const displayValue = (row: ListRow, field: IListField): React.ReactNode => {
  const raw: unknown = row[field.name];
  if (field.type === 'Boolean') {
    return raw === true ? 'Sim' : raw === false ? 'Não' : '—';
  }
  if (field.type === 'URL' && typeof raw === 'string' && isHttpUrl(raw)) {
    const description: unknown = row[`${field.name}.desc`];
    return (
      <a href={raw} target="_blank" rel="noopener noreferrer">
        {typeof description === 'string' && description !== '' ? description : raw}
      </a>
    );
  }
  const text: string = formatCell(raw, field.type);
  return text === '' ? '—' : text;
};

/**
 * Informações completas de um item, em modal. Os dados vêm de uma consulta por ID, com a mesma
 * formatação da grade (pessoa, consulta, data e texto longo).
 */
const ItemModal: React.FC<IItemModalProps> = ({ service, listTitle, fields, columns, itemId, itemCount, contextLabel, openUrl, onDismiss }) => {
  const [state, setState] = React.useState<LoadState>({ status: 'loading' });

  // Mesma ordem da grade: primeiro as colunas configuradas, na ordem delas; depois os demais campos.
  const orderedFields: IListField[] = React.useMemo((): IListField[] => {
    const gridNames: string[] = columns.map((column: IListField) => column.name);
    return [...columns, ...fields.filter((field: IListField) => gridNames.indexOf(field.name) === -1)];
  }, [fields, columns]);

  React.useEffect((): (() => void) | undefined => {
    let active: boolean = true;
    setState({ status: 'loading' });
    const condition: ICondition = {
      field: 'ID',
      xml: `<Eq><FieldRef Name="ID"/><Value Type="Counter">${itemId}</Value></Eq>`,
      usesIndex: true
    };
    const fetchWith = (names: string[]): Promise<ListRow | undefined> =>
      service
        .scanPage(
          listTitle,
          buildViewXml({ viewFields: names, conditions: [condition], pageSize: 1, itemCount, newestFirst: false })
        )
        .then((page) => page.rows[0]);
    const allNames: string[] = fields.map((field: IListField) => field.name);
    const gridNames: string[] = columns.map((column: IListField) => column.name).filter((name: string) => allNames.indexOf(name) !== -1);

    const load = async (): Promise<void> => {
      let firstError: unknown;
      try {
        const row: ListRow | undefined = await fetchWith(allNames);
        if (active) {
          setState({ status: 'done', row, partial: false });
        }
        return;
      } catch (error: unknown) {
        // Um campo que a consulta completa não consegue ler não pode derrubar a modal:
        // tenta de novo só com as colunas da grade, e a modal avisa que os dados são parciais.
        firstError = error;
      }
      if (gridNames.length === 0 || gridNames.length >= allNames.length) {
        if (active) {
          setState({ status: 'error', detail: errorText(firstError) });
        }
        return;
      }
      try {
        const row: ListRow | undefined = await fetchWith(gridNames);
        if (active) {
          setState({ status: 'done', row, partial: true });
        }
      } catch (error: unknown) {
        if (active) {
          setState({ status: 'error', detail: errorText(error) || errorText(firstError) });
        }
      }
    };
    load().catch((error: unknown) => {
      if (active) {
        setState({ status: 'error', detail: errorText(error) });
      }
    });
    return (): void => {
      active = false;
    };
  }, [service, listTitle, fields, columns, itemId, itemCount]);

  return (
    <Modal isOpen onDismiss={onDismiss} isBlocking={false} styles={MODAL_STYLES} titleAriaId="lista-filtro-item-titulo">
      <div className={styles.chartsHeader}>
        <h2 id="lista-filtro-item-titulo" className={styles.chartsTitle}>
          Item {itemId} · {contextLabel}
        </h2>
        <div className={styles.resultsActions}>
          {openUrl && (
            <PrimaryButton text="Abrir no SharePoint" iconProps={{ iconName: 'OpenInNewWindow' }} href={openUrl} target="_blank" styles={buttonStyles} />
          )}
          <DefaultButton text="Fechar" onClick={onDismiss} styles={buttonStyles} />
        </div>
      </div>

      {state.status === 'loading' && <div className={styles.skeleton} aria-busy="true" aria-label="Carregando item" />}
      {state.status === 'error' && (
        <div className={styles.message} role="alert">
          <div>Não foi possível carregar o item. Tente novamente.</div>
          {state.detail !== '' && <div className={styles.chartsHint}>Detalhe do SharePoint: {state.detail}</div>}
        </div>
      )}
      {state.status === 'done' && state.row === undefined && (
        <div className={styles.empty}>Item não encontrado. Pode ter sido excluído.</div>
      )}
      {state.status === 'done' && state.partial && (
        <div className={styles.chartsHint} role="status">
          Alguns campos não puderam ser lidos. Exibindo as colunas da tela; o detalhe do erro está no diagnóstico.
        </div>
      )}
      {state.status === 'done' && state.row !== undefined && (
        <dl className={styles.detailGrid}>
          {(state.partial ? columns : orderedFields).map((field: IListField) => (
            <div key={field.name} className={field.type === 'Note' ? `${styles.detailItem} ${styles.detailWide}` : styles.detailItem}>
              <dt className={styles.detailLabel}>{field.title}</dt>
              <dd className={styles.detailValue}>{displayValue(state.row as ListRow, field)}</dd>
            </div>
          ))}
        </dl>
      )}
    </Modal>
  );
};

export default ItemModal;
