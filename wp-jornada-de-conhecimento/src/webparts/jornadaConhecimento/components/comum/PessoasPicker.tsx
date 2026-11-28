// Skills aplicadas: spfx-padrao-visual-gti (pessoas por consulta com autopreenchimento), spfx-acessibilidade-conteudo
// (combobox com teclado e resultado anunciado), sharepoint-dados-listas (debounce, sem carregar o diretório inteiro).
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { AreaService, IPessoa } from '../../../../services/AreaService';
import { Icon } from '../gti';
import { iniciais } from './ui';
import styles from '../jc.module.scss';

export interface IPessoasPickerProps {
  id: string;
  rotulo: string;
  servico: AreaService;
  selecionadas: IPessoa[];
  aoAlterar: (pessoas: IPessoa[]) => void;
  /** Permite escolher grupos do Entra ID além de pessoas. */
  incluirGrupos?: boolean;
  desabilitado?: boolean;
  dica?: string;
  erro?: string;
}

const ATRASO_MS: number = 400;
const MINIMO: number = 3;

type Busca = { tipo: 'parado' } | { tipo: 'buscando' } | { tipo: 'pronto'; itens: IPessoa[] } | { tipo: 'falha' };

const PessoasPicker: React.FC<IPessoasPickerProps> = (props: IPessoasPickerProps) => {
  const { servico, incluirGrupos, selecionadas, aoAlterar } = props;
  const [termo, setTermo] = useState<string>('');
  const [busca, setBusca] = useState<Busca>({ tipo: 'parado' });
  const [indice, setIndice] = useState<number>(0);
  const sequencia = useRef<number>(0);

  useEffect(() => {
    const texto: string = termo.trim();
    if (texto.length < MINIMO) {
      setBusca({ tipo: 'parado' });
      return undefined;
    }
    const minha: number = ++sequencia.current;
    setBusca({ tipo: 'buscando' });
    const timer: number = window.setTimeout(() => {
      servico
        .pesquisarPessoas(texto, incluirGrupos === true)
        .then((itens: IPessoa[]) => {
          // Respostas fora de ordem são descartadas.
          if (minha === sequencia.current) {
            const ja: string[] = selecionadas.map((p: IPessoa) => p.loginName);
            setBusca({ tipo: 'pronto', itens: itens.filter((p: IPessoa) => ja.indexOf(p.loginName) === -1).slice(0, 8) });
            setIndice(0);
          }
        })
        .catch(() => minha === sequencia.current && setBusca({ tipo: 'falha' }));
    }, ATRASO_MS);
    return () => window.clearTimeout(timer);
  }, [termo, servico, incluirGrupos]);

  const escolher = (pessoa: IPessoa | undefined): void => {
    if (!pessoa) {
      return;
    }
    aoAlterar([...selecionadas, pessoa]);
    setTermo('');
    setBusca({ tipo: 'parado' });
  };

  const aberta: boolean = busca.tipo !== 'parado';
  const itens: IPessoa[] = busca.tipo === 'pronto' ? busca.itens : [];
  const idLista: string = `${props.id}-lista`;
  const idAjuda: string = `${props.id}-ajuda`;

  return (
    <div className={`pi-field ${props.erro ? 'invalid' : ''}`}>
      <label htmlFor={props.id}>{props.rotulo}</label>
      <div className={styles.pessoas}>
        <div className="pi-search">
          <Icon nome="busca" tamanho={16} />
          <input
            id={props.id}
            role="combobox"
            aria-expanded={aberta}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-describedby={idAjuda}
            aria-activedescendant={itens[indice] ? `${props.id}-op-${indice}` : undefined}
            autoComplete="off"
            value={termo}
            disabled={props.desabilitado}
            placeholder={`Digite ${MINIMO} letras do nome ou do e-mail`}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTermo(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndice((i: number) => Math.min(itens.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndice((i: number) => Math.max(0, i - 1));
              } else if (e.key === 'Enter' && aberta) {
                e.preventDefault();
                escolher(itens[indice]);
              } else if (e.key === 'Escape') {
                setTermo('');
              }
            }}
          />
        </div>
        {aberta && (
          <ul id={idLista} role="listbox" className={styles.sugestoes}>
            {busca.tipo === 'buscando' && <li aria-disabled="true">Pesquisando…</li>}
            {busca.tipo === 'falha' && <li aria-disabled="true">A pesquisa falhou. Tente de novo em instantes.</li>}
            {busca.tipo === 'pronto' && itens.length === 0 && <li aria-disabled="true">Nenhuma pessoa encontrada no diretório.</li>}
            {itens.map((pessoa: IPessoa, i: number) => (
              <li
                key={pessoa.loginName}
                id={`${props.id}-op-${i}`}
                role="option"
                aria-selected={i === indice}
                onMouseEnter={() => setIndice(i)}
                onMouseDown={(e: React.MouseEvent) => {
                  e.preventDefault();
                  escolher(pessoa);
                }}
              >
                <span className="pi-avatar" style={{ width: 30, height: 30, fontSize: 11 }} aria-hidden="true">
                  {iniciais(pessoa.nome)}
                </span>
                <span>
                  <b>{pessoa.nome}</b>
                  <span>{pessoa.email || pessoa.loginName}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {props.erro ? (
        <span className="pi-field-error" id={idAjuda}>
          {props.erro}
        </span>
      ) : (
        <span className="pi-hint" id={idAjuda}>
          {props.dica ?? (incluirGrupos ? 'Aceita pessoas e grupos do Entra ID.' : 'Pesquisa no diretório da organização.')}
        </span>
      )}
      {selecionadas.length > 0 && (
        <div className={styles.escolhidas}>
          {selecionadas.map((pessoa: IPessoa) => (
            <span key={pessoa.loginName} className={styles.escolhida}>
              {pessoa.nome}
              <button
                type="button"
                aria-label={`Remover ${pessoa.nome}`}
                disabled={props.desabilitado}
                onClick={() => aoAlterar(selecionadas.filter((p: IPessoa) => p.loginName !== pessoa.loginName))}
              >
                <Icon nome="fechar" tamanho={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PessoasPicker;
