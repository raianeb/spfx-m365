import * as React from 'react';
import { IconButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './Faq.module.scss';
import { IPergunta, itemAnchor } from './faqRules';
import { toSafeHtml } from './richText';

export interface IFaqItemProps {
  item: IPergunta;
  open: boolean;
  onToggle: () => void;
  onCopyLink: () => void;
  /** Ações de edição e exclusão, quando o usuário pode gerenciar. */
  actions: React.ReactNode;
}

/**
 * Pergunta em formato de acordeão. O botão da pergunta abre e fecha a resposta, com aria-expanded.
 * A resposta chega sanitizada (allowlist de richText.ts), por isso pode ser exibida como HTML.
 */
const FaqItem: React.FC<IFaqItemProps> = ({ item, open, onToggle, onCopyLink, actions }) => {
  const questionId: string = `${itemAnchor(item.Id)}-pergunta`;
  const panelId: string = `${itemAnchor(item.Id)}-resposta`;
  const answerHtml: string = React.useMemo((): string => toSafeHtml(item.Resposta), [item.Resposta]);

  return (
    <article id={itemAnchor(item.Id)} className={styles.item}>
      <header className={styles.itemHeader}>
        <button
          type="button"
          id={questionId}
          className={styles.question}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <Icon iconName={open ? 'ChevronUp' : 'ChevronDown'} className={styles.chevron} aria-hidden="true" />
          <span className={styles.questionText}>{item.Title}</span>
        </button>
        <div className={styles.itemActions}>
          <IconButton
            iconProps={{ iconName: 'Link' }}
            ariaLabel={`Copiar link da pergunta: ${item.Title}`}
            title="Copiar link"
            onClick={onCopyLink}
          />
          {actions}
        </div>
      </header>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={questionId}
          className={styles.answer}
          dangerouslySetInnerHTML={{ __html: answerHtml }}
        />
      )}
    </article>
  );
};

export default FaqItem;
