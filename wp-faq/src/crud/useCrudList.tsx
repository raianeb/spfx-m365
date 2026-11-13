import * as React from 'react';
import { DefaultButton, IconButton } from '@fluentui/react/lib/Button';
import { CarreirasListService, IListQuery } from '../services/CarreirasListService';
import { DiagnosticsLogger, DiagnosticsPanel } from '../core/diagnostics';
import styles from './crud.module.scss';
import manageStyles from './manage.module.scss';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ManageAllModal from './ManageAllModal';
import { secondaryButtonStyles } from './modalStyles';

/** Contexto entregue ao formulário. A gravação e o recarregamento ficam no hook. */
export interface ICrudFormContext<T> {
  mode: 'add' | 'edit';
  item: T | undefined;
  contextLabel: string;
  themeStyle?: React.CSSProperties;
  diagnostics: React.ReactNode;
  onDismiss: () => void;
  /** Cria o item em inclusão e atualiza em edição. Fecha a modal e recarrega a lista ao concluir. */
  save: (body: Record<string, unknown>) => Promise<void>;
}

/** Botão de gerenciamento ao lado de "+": abre a modal com todos os registros, inclusive os fora da vigência. */
export interface ICrudManageOptions<T> {
  /** Rótulo do botão ao lado de "+". */
  label: string;
  /** Título da modal com a lista completa. */
  title: string;
  /** Texto complementar de cada linha, como situação e datas. */
  renderMeta?: (item: T) => string;
  /** Campo numérico que guarda a ordem de exibição. Quando informado, a modal permite reordenar e salvar. */
  orderField?: string;
}

export interface ICrudListOptions<T> {
  service: CarreirasListService;
  logger: DiagnosticsLogger;
  /** Nome físico da lista no ambiente ativo (com HML_ quando aplicável). */
  listTitle: string;
  /** Identificadores dos grupos do perfil Administradores no ambiente ativo. */
  adminGroupIds: number[];
  singular: string;
  select: string[];
  top: number;
  query: () => Pick<IListQuery, 'filter' | 'orderBy'>;
  getLabel: (item: T) => string;
  contextLabel: string;
  themeStyle?: React.CSSProperties;
  /** Dependências extras que recarregam a consulta. */
  deps: ReadonlyArray<unknown>;
  renderForm: (context: ICrudFormContext<T>) => React.ReactNode;
  /** Quando informado, exibe o botão "Todos" ao lado de "+" para usuários que podem gerenciar. */
  manage?: ICrudManageOptions<T>;
  /** Retorna o motivo que impede a exclusão ou undefined quando o item pode ser excluído. */
  guardDelete?: (item: T) => Promise<string | undefined>;
  /** Falso enquanto a lista não estiver configurada: nada é consultado e a lista fica vazia. */
  enabled?: boolean;
}

export interface ICrudList<T> {
  items: T[] | undefined;
  hasError: boolean;
  /** True enquanto a consulta da lista está em andamento, inclusive na troca de página ou de filtro. */
  loading: boolean;
  /** Incrementa a cada recarregamento feito após gravação ou exclusão. */
  revision: number;
  canManage: boolean;
  toolbar: React.ReactNode;
  renderActions: (item: T) => React.ReactNode;
  modals: React.ReactNode;
}

type ReturnTarget = 'manage' | undefined;

type ModalState<T> =
  | { mode: 'add'; returnTo?: ReturnTarget }
  | { mode: 'edit'; item: T; returnTo?: ReturnTarget }
  | { mode: 'delete'; item: T; returnTo?: ReturnTarget }
  | { mode: 'manage' };

/** Limite de segurança da lista completa. Acima disso, o gerenciamento deve ganhar paginação. */
const MANAGE_LIMIT: number = 500;

const returnsToManage = <T,>(state: ModalState<T> | undefined): boolean =>
  state !== undefined && state.mode !== 'manage' && state.returnTo === 'manage';

/**
 * Consulta a lista e controla inclusão, edição e exclusão. Os controles aparecem somente quando o usuário
 * tem Controle Total na lista e pertence a um grupo do perfil Administradores do ambiente.
 */
export function useCrudList<T extends { Id: number }>(options: ICrudListOptions<T>): ICrudList<T> {
  const {
    service,
    logger,
    listTitle,
    adminGroupIds,
    singular,
    select,
    top,
    query,
    getLabel,
    contextLabel,
    themeStyle,
    deps,
    renderForm,
    manage,
    guardDelete,
    enabled = true
  } = options;
  const [items, setItems] = React.useState<T[] | undefined>(undefined);
  const [hasError, setHasError] = React.useState<boolean>(false);
  const [canManage, setCanManage] = React.useState<boolean>(false);
  const [reloadKey, setReloadKey] = React.useState<number>(0);
  const [modal, setModal] = React.useState<ModalState<T> | undefined>(undefined);
  const [allItems, setAllItems] = React.useState<T[] | undefined>(undefined);
  const [allError, setAllError] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);

  const adminKey: string = adminGroupIds.join(',');

  React.useEffect(() => {
    let active: boolean = true;
    if (!enabled) {
      return undefined;
    }
    if (adminKey === '') {
      setCanManage(false);
      logger.log('warn', `Lista ${listTitle}`, 'Configuração pendente: grupos de Administradores não definidos para este ambiente.');
      return undefined;
    }
    const ids: number[] = adminKey.split(',').map(Number);
    Promise.all([service.canManageList(listTitle), service.getCurrentUserGroupIds()])
      .then(([fullControl, userGroups]: [boolean, number[]]) => {
        const member: boolean = userGroups.some((id: number) => ids.indexOf(id) !== -1);
        logger.log('info', `Lista ${listTitle}`, `Perfil Administradores: ${member ? 'sim' : 'não'}`);
        if (active) {
          setCanManage(fullControl && member);
        }
      })
      .catch(() => {
        if (active) {
          setCanManage(false);
        }
      });
    return () => {
      active = false;
    };
  }, [service, logger, listTitle, adminKey, enabled]);

  React.useEffect(() => {
    let active: boolean = true;
    if (!enabled) {
      return undefined;
    }
    setHasError(false);
    setLoading(true);
    const current: Pick<IListQuery, 'filter' | 'orderBy'> = query();
    service
      .getItems<T>({ listTitle, select, filter: current.filter, orderBy: current.orderBy, top })
      .then((result: T[]) => {
        if (active) {
          setItems(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setHasError(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
    // As dependências são controladas pelo chamador (reloadKey e deps extras).
  }, [service, listTitle, top, reloadKey, enabled, ...deps]);

  /** Carrega todos os registros, sem o filtro de vigência, para a modal de gerenciamento. */
  const loadAll = (): void => {
    setAllItems(undefined);
    setAllError(false);
    const current: Pick<IListQuery, 'filter' | 'orderBy'> = query();
    service
      .getItems<T>({ listTitle, select, orderBy: current.orderBy, top: MANAGE_LIMIT })
      .then((result: T[]) => setAllItems(result))
      .catch(() => setAllError(true));
  };

  const openManage = (): void => {
    loadAll();
    setModal({ mode: 'manage' });
  };

  const close = (): void => {
    if (returnsToManage(modal)) {
      openManage();
      return;
    }
    setModal(undefined);
  };

  const reload = (): void => {
    service.clearCache(listTitle);
    setReloadKey((key: number) => key + 1);
  };

  /** Grava a nova ordem apenas nos registros cujo valor mudou (1, 2, 3...) e recarrega a lista. */
  const saveOrder = async (ordered: T[]): Promise<void> => {
    const field: string | undefined = manage?.orderField;
    if (!field) {
      return;
    }
    const changes: Array<{ id: number; value: number }> = [];
    ordered.forEach((item: T, index: number) => {
      const current: unknown = (item as unknown as Record<string, unknown>)[field];
      if (current !== index + 1) {
        changes.push({ id: item.Id, value: index + 1 });
      }
    });
    await Promise.all(changes.map((change) => service.updateItem(listTitle, change.id, { [field]: change.value })));
    reload();
    setModal(undefined);
  };

  const save = async (body: Record<string, unknown>): Promise<void> => {
    if (!modal || modal.mode === 'delete' || modal.mode === 'manage') {
      return;
    }
    if (modal.mode === 'add') {
      await service.createItem(listTitle, body);
    } else {
      await service.updateItem(listTitle, modal.item.Id, body);
    }
    reload();
    if (returnsToManage(modal)) {
      openManage();
      return;
    }
    setModal(undefined);
  };

  const remove = async (): Promise<void> => {
    if (!modal || modal.mode !== 'delete') {
      return;
    }
    if (guardDelete) {
      const reason: string | undefined = await guardDelete(modal.item);
      if (reason) {
        // Erro identificado: a modal mostra o motivo, em vez da mensagem genérica.
        throw Object.assign(new Error(reason), { blocked: true });
      }
    }
    await service.deleteItem(listTitle, modal.item.Id);
    reload();
    if (returnsToManage(modal)) {
      openManage();
      return;
    }
    setModal(undefined);
  };

  const toolbar: React.ReactNode = canManage ? (
    <div className={manageStyles.toolbar}>
      {manage && (
        <DefaultButton
          iconProps={{ iconName: 'BulletedList' }}
          text={manage.label}
          ariaLabel={manage.title}
          title={manage.title}
          onClick={openManage}
          styles={secondaryButtonStyles}
        />
      )}
      <IconButton
        iconProps={{ iconName: 'Add' }}
        ariaLabel={`Adicionar ${singular}`}
        title={`Adicionar ${singular}`}
        onClick={() => setModal({ mode: 'add' })}
      />
    </div>
  ) : null;

  const renderActions = (item: T): React.ReactNode => {
    if (!canManage) {
      return null;
    }
    // Edição feita a partir da modal "Todos" volta para ela ao fechar ou salvar.
    const returnTo: ReturnTarget = modal?.mode === 'manage' ? 'manage' : undefined;
    return (
      <div className={styles.actions}>
        <IconButton
          iconProps={{ iconName: 'Edit' }}
          ariaLabel={`Editar ${singular}`}
          title={`Editar ${singular}`}
          onClick={() => setModal({ mode: 'edit', item, returnTo })}
        />
        <IconButton
          iconProps={{ iconName: 'Delete' }}
          ariaLabel={`Excluir ${singular}`}
          title={`Excluir ${singular}`}
          onClick={() => setModal({ mode: 'delete', item, returnTo })}
        />
      </div>
    );
  };

  let modals: React.ReactNode = null;
  if (modal) {
    const diagnostics: React.ReactNode = <DiagnosticsPanel logger={logger} />;
    if (modal.mode === 'manage') {
      modals = manage ? (
        <ManageAllModal<T>
          contextLabel={contextLabel}
          title={manage.title}
          items={allItems}
          hasError={allError}
          getLabel={getLabel}
          renderMeta={manage.renderMeta}
          renderActions={renderActions}
          onSaveOrder={manage.orderField ? saveOrder : undefined}
          onDismiss={close}
          diagnostics={diagnostics}
          themeStyle={themeStyle}
        />
      ) : null;
    } else if (modal.mode === 'delete') {
      modals = (
        <ConfirmDeleteModal
          contextLabel={contextLabel}
          itemLabel={getLabel(modal.item)}
          onDismiss={close}
          onConfirm={remove}
          diagnostics={diagnostics}
          themeStyle={themeStyle}
        />
      );
    } else {
      modals = renderForm({
        mode: modal.mode,
        item: modal.mode === 'edit' ? modal.item : undefined,
        contextLabel,
        themeStyle,
        diagnostics,
        onDismiss: close,
        save
      });
    }
  }

  if (!enabled) {
    return { items: [], hasError: false, loading: false, revision: reloadKey, canManage: false, toolbar, renderActions, modals };
  }
  return { items, hasError, loading, revision: reloadKey, canManage, toolbar, renderActions, modals };
}
