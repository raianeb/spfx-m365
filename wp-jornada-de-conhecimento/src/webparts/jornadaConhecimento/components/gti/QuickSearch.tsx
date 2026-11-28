// Modelo: busca rápida (Ctrl+K) por telas e registros da web part (skill spfx-padrao-visual-gti).
// Os itens vêm de dados já carregados ou de uma consulta com debounce no pai; o componente só apresenta.
import * as React from 'react';
import styles from './gti.module.scss';
import { Icon, NomeIcone } from './Icon';

export interface IResultadoBusca {
  chave: string;
  grupo: string;
  titulo: string;
  detalhe?: string;
  icone: NomeIcone;
  rota: string;
}

export interface IQuickSearchProps {
  id: string;
  /** Resultados para o texto atual. O pai filtra (local) ou consulta (servidor). */
  buscar: (texto: string) => IResultadoBusca[];
  /** Diga onde a busca procura, para não parecer que pesquisa a lista inteira. */
  dica: string;
  aoEscolher: (rota: string) => void;
  aoFechar: () => void;
}

export function QuickSearch(props: IQuickSearchProps): React.ReactElement {
  const ref = React.useRef<HTMLDialogElement>(null);
  const [texto, setTexto] = React.useState('');
  const [indice, setIndice] = React.useState(0);
  const resultados = React.useMemo(() => props.buscar(texto).slice(0, 12), [props.buscar, texto]);

  React.useEffect(() => {
    const dialogo = ref.current;
    if (dialogo && !dialogo.open && typeof dialogo.showModal === 'function') dialogo.showModal();
    return () => { if (dialogo?.open) dialogo.close(); };
  }, []);
  React.useEffect(() => setIndice(0), [texto]);

  const escolher = (r?: IResultadoBusca): void => {
    if (!r) return;
    props.aoFechar();
    props.aoEscolher(r.rota);
  };

  let grupoAnterior = '';
  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles.dialogCenter}`}
      style={{ marginTop: '12vh', width: 'min(620px, 94vw)' }}
      aria-label="Busca rápida"
      onCancel={(e) => { e.preventDefault(); props.aoFechar(); }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--pi-border)' }}>
        <Icon nome="busca" tamanho={18} />
        <input
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIndice((i) => Math.min(resultados.length - 1, i + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIndice((i) => Math.max(0, i - 1)); }
            if (e.key === 'Enter') { e.preventDefault(); escolher(resultados[indice]); }
          }}
          placeholder={props.dica}
          aria-label="Buscar"
          aria-controls={`${props.id}-lista`}
          aria-activedescendant={resultados[indice] ? `${props.id}-${resultados[indice].chave}` : undefined}
          role="combobox"
          aria-expanded="true"
          style={{ border: 0, outline: 0, flex: 1, fontSize: 15 }}
        />
      </div>
      <ul id={`${props.id}-lista`} role="listbox" style={{ listStyle: 'none', margin: 0, padding: 8, maxHeight: '52vh', overflow: 'auto' }}>
        {resultados.length === 0 && <li className="pi-hint" style={{ padding: 14 }}>Nada encontrado.</li>}
        {resultados.map((r, i) => {
          const cabecalho = r.grupo !== grupoAnterior ? r.grupo : '';
          grupoAnterior = r.grupo;
          return (
            <React.Fragment key={r.chave}>
              {cabecalho && <li role="presentation" className="pi-eyebrow" style={{ padding: '8px 12px 4px', margin: 0 }}>{cabecalho}</li>}
              <li
                id={`${props.id}-${r.chave}`}
                role="option"
                aria-selected={i === indice}
                onClick={() => escolher(r)}
                onMouseEnter={() => setIndice(i)}
                style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: i === indice ? 'var(--pi-soft)' : undefined }}
              >
                <Icon nome={r.icone} tamanho={18} />
                <span>
                  <b style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--pi-navy)' }}>{r.titulo}</b>
                  {r.detalhe && <span style={{ fontSize: 11, color: 'var(--pi-muted)' }}>{r.detalhe}</span>}
                </span>
              </li>
            </React.Fragment>
          );
        })}
      </ul>
    </dialog>
  );
}
