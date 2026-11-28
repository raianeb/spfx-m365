// Modelo: painel lateral e diálogo central do padrão GTI (skill spfx-padrao-visual-gti).
// Baseado em <dialog> + showModal(): foco preso, Escape e camada superior nativos.
// Renderize DENTRO da raiz GtiRoot (sem portal): o <dialog> herda os tokens pela árvore DOM.
import * as React from 'react';
import styles from './gti.module.scss';
import { Icon } from './Icon';

export interface IGtiDialogProps {
  /** Id único por instância, para o título e o aria-labelledby. */
  id: string;
  titulo: string;
  sobretitulo?: string;
  /** lateral (padrão, 620px), lateral-ampla (780px) ou central (confirmações e comemorações). */
  variante?: 'lateral' | 'lateral-ampla' | 'central';
  /** Ações à direita do rodapé. Ação principal por último. */
  rodape?: React.ReactNode;
  /** Texto auxiliar à esquerda do rodapé. */
  textoRodape?: React.ReactNode;
  /** Enquanto grava, o pai passa true: Escape e Fechar ficam bloqueados. */
  bloquearFechamento?: boolean;
  aoFechar: () => void;
  children: React.ReactNode;
}

export function GtiDialog(props: IGtiDialogProps): React.ReactElement {
  const ref = React.useRef<HTMLDialogElement>(null);
  const aoFecharRef = React.useRef(props.aoFechar);
  aoFecharRef.current = props.aoFechar;

  React.useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const dialogo = ref.current;
    if (dialogo && !dialogo.open && typeof dialogo.showModal === 'function') dialogo.showModal();
    return () => {
      if (dialogo?.open) dialogo.close();
      anterior?.focus(); // devolve o foco a quem abriu
    };
  }, []);

  const classes = [styles.dialog];
  if (props.variante === 'lateral-ampla') classes.push(styles.dialogWide);
  if (props.variante === 'central') classes.push(styles.dialogCenter);

  return (
    <dialog
      ref={ref}
      className={classes.join(' ')}
      aria-labelledby={`${props.id}-titulo`}
      onCancel={(e) => {
        e.preventDefault();
        if (!props.bloquearFechamento) aoFecharRef.current();
      }}
    >
      <header className={styles.dialogHeader}>
        <div>
          {props.sobretitulo && <span className={styles.dialogEyebrow}>{props.sobretitulo}</span>}
          <h2 id={`${props.id}-titulo`}>{props.titulo}</h2>
        </div>
        <button type="button" className={styles.dialogClose} aria-label="Fechar" disabled={props.bloquearFechamento} onClick={() => aoFecharRef.current()}>
          <Icon nome="fechar" />
        </button>
      </header>
      <div className={styles.dialogBody}>{props.children}</div>
      {(props.rodape || props.textoRodape) && (
        <footer className={styles.dialogFooter}>
          {props.textoRodape && <span className="pi-hint" style={{ marginRight: 'auto', alignSelf: 'center' }}>{props.textoRodape}</span>}
          {props.rodape}
        </footer>
      )}
    </dialog>
  );
}
