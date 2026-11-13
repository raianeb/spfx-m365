import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { TextField } from '@fluentui/react/lib/TextField';
import styles from './Faq.module.scss';
import coreStyles from '../../../core/core.module.scss';
import { ICarreirasCommonProps, resolveListTitle } from '../../../core/config';
import { DiagnosticsPanel } from '../../../core/diagnostics';
import { ICrudList, useCrudList } from '../../../crud/useCrudList';
import { secondaryButtonStyles } from '../../../crud/modalStyles';
import { sendSuggestion } from '../../../services/SuggestionService';
import FaqForm from './FaqForm';
import FaqItem from './FaqItem';
import SuggestionModal from './SuggestionModal';
import {
  describePergunta,
  FaqOpenMode,
  FaqSortMode,
  ISolicitante,
  ISuggestionValues,
  IPergunta,
  SORT_ORDER_BY,
  buildItemLink,
  buildSuggestionPayload,
  currentPageUrl,
  idFromHash,
  initialOpenIds,
  isSafeFlowUrl,
  itemAnchor,
  matchesSearch
} from './faqRules';

const SELECT_PERGUNTAS: string[] = ['Id', 'Title', 'Resposta', 'Ordem'];
/** Perguntas são uma lista curta: carregadas inteiras, em uma consulta. */
const FAQ_LIMIT: number = 500;
/** Tempo em que a mensagem de confirmação permanece visível. */
const NOTICE_MS: number = 3000;

export interface IFaqProps extends ICarreirasCommonProps {
  /** Nome base da lista de perguntas (sem HML_). Vazio = ainda não configurada. */
  listName: string;
  openMode: FaqOpenMode;
  sortMode: FaqSortMode;
  allowSuggestions: boolean;
  /** URL HTTP Trigger do fluxo do Power Automate. Vazia = sugestões indisponíveis. */
  suggestionFlowUrl: string;
  solicitante: ISolicitante;
}

/**
 * Perguntas frequentes em acordeão. Cada pergunta tem link direto e pode ser copiada. Administradores
 * cadastram, editam, excluem e ordenam as perguntas. Usuários podem enviar sugestões por fluxo.
 */
const Faq: React.FC<IFaqProps> = ({
  service,
  logger,
  environment,
  adminGroupIds,
  title,
  themeStyle,
  listName,
  openMode,
  sortMode,
  allowSuggestions,
  suggestionFlowUrl,
  solicitante
}) => {
  const [openIds, setOpenIds] = React.useState<number[]>([]);
  const [searchText, setSearchText] = React.useState<string>('');
  const [suggestOpen, setSuggestOpen] = React.useState<boolean>(false);
  const [notice, setNotice] = React.useState<string>('');
  const seededMode: React.MutableRefObject<FaqOpenMode | undefined> = React.useRef<FaqOpenMode | undefined>(undefined);
  const nextOrderRef: React.MutableRefObject<number> = React.useRef<number>(1);
  const contextLabel: string = title || 'Perguntas Frequentes';

  /** Nome físico da lista no ambiente. Vazio enquanto não houver lista escolhida (ou se for uma cópia HML_). */
  const base: string = listName.trim();
  const listTitle: string = base === '' || base.indexOf('HML_') === 0 ? '' : resolveListTitle(base, environment);
  const configured: boolean = listTitle !== '';
  const suggestionReady: boolean = configured && allowSuggestions && isSafeFlowUrl(suggestionFlowUrl);

  const faq: ICrudList<IPergunta> = useCrudList<IPergunta>({
    service,
    logger,
    listTitle,
    adminGroupIds,
    singular: 'pergunta',
    select: SELECT_PERGUNTAS,
    top: FAQ_LIMIT,
    query: () => ({ orderBy: SORT_ORDER_BY[sortMode] }),
    getLabel: (item: IPergunta) => item.Title,
    contextLabel,
    themeStyle,
    deps: [sortMode],
    enabled: configured,
    manage: { label: 'Ordenar', title: 'Ordem de exibição das perguntas', renderMeta: describePergunta, orderField: 'Ordem' },
    renderForm: (context) => <FaqForm {...context} nextOrder={nextOrderRef.current} />
  });

  const items: IPergunta[] | undefined = faq.items;
  // Próxima posição: a última da lista mais um. Usada como sugestão no formulário de inclusão.
  nextOrderRef.current = (items ?? []).reduce((max: number, item: IPergunta) => Math.max(max, item.Ordem ?? 0), 0) + 1;
  const visible: IPergunta[] | undefined = items?.filter((item: IPergunta) => matchesSearch(item, searchText));

  const announce = (message: string): void => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), NOTICE_MS);
  };

  // Estado inicial dos itens: refeito na primeira carga e sempre que o modo mudar. Recargas após edição preservam o que o usuário abriu.
  React.useEffect((): void => {
    if (items === undefined || seededMode.current === openMode) {
      return;
    }
    seededMode.current = openMode;
    setOpenIds(initialOpenIds(items, openMode));
  }, [items, openMode]);

  // Link direto: abre a pergunta indicada pela âncora e a leva para a tela.
  const openFromHash = React.useCallback((): void => {
    const id: number | undefined = idFromHash(window.location.hash);
    if (id === undefined) {
      return;
    }
    setOpenIds((current: number[]) => (current.indexOf(id) !== -1 ? current : [...current, id]));
    window.setTimeout(() => {
      document.getElementById(itemAnchor(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, []);

  React.useEffect((): (() => void) | undefined => {
    if (items === undefined) {
      return undefined;
    }
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return (): void => window.removeEventListener('hashchange', openFromHash);
  }, [items, openFromHash]);

  const toggle = (id: number): void => {
    setOpenIds((current: number[]) =>
      current.indexOf(id) !== -1 ? current.filter((openId: number) => openId !== id) : [...current, id]
    );
  };

  const copyLink = async (item: IPergunta): Promise<void> => {
    try {
      await navigator.clipboard.writeText(buildItemLink(currentPageUrl(), item.Id));
      announce('Link copiado.');
    } catch {
      logger.log('warn', 'Link', 'Área de transferência indisponível');
      announce('Não foi possível copiar. Copie o endereço da barra do navegador.');
    }
  };

  const sendToFlow = async (values: ISuggestionValues): Promise<void> => {
    const payload: Record<string, unknown> = buildSuggestionPayload(
      values,
      solicitante,
      currentPageUrl(),
      service.webUrl,
      new Date()
    );
    try {
      await sendSuggestion(suggestionFlowUrl.trim(), payload);
    } catch (error: unknown) {
      logger.log('error', 'Sugestão', error instanceof Error ? error.message : 'Falha no envio');
      throw error;
    }
    logger.log('info', 'Sugestão', 'Sugestão enviada ao fluxo');
    setSuggestOpen(false);
    announce('Sugestão enviada. Obrigado!');
  };

  // Mesma barra das demais WPs: "Ordenar" e "+" aparecem para Administradores. Sugestão é um recurso à parte.
  const toolbar: React.ReactNode = (
    <div className={styles.toolbar}>
      {suggestionReady && (
        <DefaultButton
          iconProps={{ iconName: 'Mail' }}
          text="Sugerir nova pergunta"
          title="Sugerir nova pergunta"
          onClick={() => setSuggestOpen(true)}
          styles={secondaryButtonStyles}
        />
      )}
      {faq.toolbar}
    </div>
  );

  let content: React.ReactNode;
  if (!configured) {
    content = <div className={styles.empty}>Escolha a lista de perguntas nas configurações da Web Part.</div>;
  } else if (faq.hasError) {
    content = <div className={styles.message} role="alert">Não foi possível carregar as perguntas.</div>;
  } else if (items === undefined) {
    content = <div className={styles.skeleton} aria-busy="true" aria-label="Carregando perguntas" />;
  } else if (items.length === 0) {
    content = <div className={styles.empty}>Nenhuma pergunta cadastrada.</div>;
  } else if (visible === undefined || visible.length === 0) {
    content = <div className={styles.empty}>Nenhuma pergunta encontrada para &quot;{searchText.trim()}&quot;.</div>;
  } else {
    content = (
      <ul className={styles.list}>
        {visible.map((item: IPergunta) => (
          <li key={item.Id}>
            <FaqItem
              item={item}
              open={openIds.indexOf(item.Id) !== -1}
              onToggle={() => toggle(item.Id)}
              onCopyLink={() => {
                copyLink(item).catch(() => undefined);
              }}
              actions={faq.renderActions(item)}
            />
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
            <Icon iconName="Help" className={coreStyles.wpIcon} aria-hidden="true" />
            {title}
          </h2>
        )}
        {toolbar}
      </header>
      {configured && (
        <div className={styles.searchRow}>
          <TextField
            value={searchText}
            onChange={(_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, value?: string) =>
              setSearchText(value ?? '')
            }
            placeholder="Pesquisar perguntas"
            ariaLabel="Pesquisar perguntas"
            iconProps={{ iconName: 'Search' }}
          />
        </div>
      )}
      <div role="status" aria-live="polite" className={styles.notice}>
        {notice}
      </div>
      {content}
      <DiagnosticsPanel logger={logger} />
      {faq.modals}
      {suggestOpen && (
        <SuggestionModal
          contextLabel={contextLabel}
          themeStyle={themeStyle}
          onDismiss={() => setSuggestOpen(false)}
          onSend={sendToFlow}
        />
      )}
    </section>
  );
};

export default Faq;
