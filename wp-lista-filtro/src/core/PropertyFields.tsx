import { IPrefixosListas } from './prefixos';
import * as React from 'react';
import { useEffect, useState } from 'react';
import styles from './core.module.scss';
import { IGroupRef } from './config';
import { ISiteRef, SiteDirectoryService } from './siteDirectory';
import { IListField, isFilterable, typeLabel } from '../services/fieldSchema';

const SEARCH_DEBOUNCE_MS: number = 400;

/** Seleção de site de dados: pesquisa por nome, mostra nome e URL e valida o acesso antes de aceitar. */
export interface ISitePickerProps {
  value?: ISiteRef;
  currentSite: ISiteRef;
  service: SiteDirectoryService;
  onChange: (site: ISiteRef) => void;
}

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export const SitePickerField: React.FC<ISitePickerProps> = ({ value, currentSite, service, onChange }) => {
  const [term, setTerm] = useState<string>('');
  const [debounced, setDebounced] = useState<string>('');
  const [results, setResults] = useState<ISiteRef[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [attempt, setAttempt] = useState<number>(0);
  const [validating, setValidating] = useState<boolean>(false);
  const [message, setMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    const timer: number = window.setTimeout(() => setDebounced(term.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    let active: boolean = true;
    setStatus('loading');
    service
      .searchSites(debounced)
      .then((sites: ISiteRef[]) => {
        if (active) {
          setResults(sites);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (active) {
          setStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, [debounced, service, attempt]);

  const choose = async (site: ISiteRef): Promise<void> => {
    setValidating(true);
    setMessage(undefined);
    try {
      const validated: ISiteRef = await service.validateSite(site.url);
      onChange(validated);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Site indisponível.');
    } finally {
      setValidating(false);
    }
  };

  const selected: ISiteRef = value ?? currentSite;
  const options: ISiteRef[] = [currentSite, ...results.filter((site: ISiteRef) => site.url !== currentSite.url)];

  return (
    <div className={styles.picker}>
      <span className={styles.pickerLabel}>Site de dados</span>
      <p className={styles.pickerSelected}>
        Selecionado: <strong>{selected.title}</strong> ({selected.url})
      </p>
      <input
        className={styles.pickerInput}
        type="search"
        placeholder="Pesquisar site pelo nome"
        aria-label="Pesquisar site de dados"
        value={term}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTerm(event.target.value)}
      />
      {status === 'loading' && <p className={styles.pickerStatus}>Pesquisando sites…</p>}
      {status === 'error' && (
        <p className={`${styles.pickerStatus} ${styles.pickerError}`} role="alert">
          Não foi possível pesquisar sites.{' '}
          <button type="button" className={styles.pickerButton} onClick={() => setAttempt((n: number) => n + 1)}>
            Tentar novamente
          </button>
        </p>
      )}
      {status === 'ready' && results.length === 0 && <p className={styles.pickerStatus}>Nenhum outro site encontrado.</p>}
      <ul className={styles.pickerOptions} aria-label="Sites encontrados">
        {options.map((site: ISiteRef) => (
          <li key={site.url}>
            <label className={styles.pickerOption}>
              <input
                type="radio"
                name="wp-site-de-dados"
                checked={site.url === selected.url}
                disabled={validating}
                onChange={() => {
                  choose(site).catch(() => undefined);
                }}
              />
              <span>
                <strong>{site.title}</strong>
                <br />
                <small>{site.url}</small>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {validating && <p className={styles.pickerStatus}>Validando acesso ao site…</p>}
      {message && (
        <p className={`${styles.pickerStatus} ${styles.pickerError}`} role="alert">
          {message}
        </p>
      )}
    </div>
  );
};

/** Múltipla seleção de grupos SharePoint de um perfil, para um ambiente. */
export interface IGroupPickerProps {
  label: string;
  siteUrl: string;
  service: SiteDirectoryService;
  value: IGroupRef[];
  onChange: (groups: IGroupRef[]) => void;
}

export const GroupPickerField: React.FC<IGroupPickerProps> = ({ label, siteUrl, service, value, onChange }) => {
  const [groups, setGroups] = useState<IGroupRef[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [attempt, setAttempt] = useState<number>(0);
  const [filter, setFilter] = useState<string>('');
  const [selected, setSelected] = useState<IGroupRef[]>(value);

  useEffect(() => {
    let active: boolean = true;
    setStatus('loading');
    service
      .getSiteGroups(siteUrl)
      .then((result: IGroupRef[]) => {
        if (active) {
          setGroups(result);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (active) {
          setStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, [siteUrl, service, attempt]);

  const update = (next: IGroupRef[]): void => {
    setSelected(next);
    onChange(next);
  };

  const toggle = (group: IGroupRef): void => {
    const exists: boolean = selected.some((item: IGroupRef) => item.id === group.id);
    update(exists ? selected.filter((item: IGroupRef) => item.id !== group.id) : [...selected, group]);
  };

  const visible: IGroupRef[] = groups.filter((group: IGroupRef) =>
    group.title.toLowerCase().indexOf(filter.trim().toLowerCase()) !== -1
  );
  const missing: IGroupRef[] = status === 'ready'
    ? selected.filter((item: IGroupRef) => !groups.some((group: IGroupRef) => group.id === item.id))
    : [];

  return (
    <div className={styles.picker}>
      <span className={styles.pickerLabel}>{label}</span>
      <div className={styles.chips} aria-label={`Grupos selecionados: ${label}`}>
        {selected.length === 0 && <span className={styles.pickerStatus}>Nenhum grupo selecionado.</span>}
        {selected.map((group: IGroupRef) => (
          <span key={group.id} className={styles.chip}>
            {group.title}
            <button type="button" aria-label={`Remover ${group.title}`} onClick={() => toggle(group)}>
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className={styles.pickerInput}
        type="search"
        placeholder="Filtrar grupos"
        aria-label={`Filtrar grupos: ${label}`}
        value={filter}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setFilter(event.target.value)}
      />
      {status === 'loading' && <p className={styles.pickerStatus}>Carregando grupos…</p>}
      {status === 'error' && (
        <p className={`${styles.pickerStatus} ${styles.pickerError}`} role="alert">
          Não foi possível carregar os grupos.{' '}
          <button type="button" className={styles.pickerButton} onClick={() => setAttempt((n: number) => n + 1)}>
            Tentar novamente
          </button>
        </p>
      )}
      {status === 'ready' && visible.length === 0 && <p className={styles.pickerStatus}>Nenhum grupo encontrado.</p>}
      {status === 'ready' && visible.length > 0 && (
        <ul className={styles.pickerOptions} aria-label={`Grupos disponíveis: ${label}`}>
          {visible.map((group: IGroupRef) => (
            <li key={group.id}>
              <label className={styles.pickerOption}>
                <input
                  type="checkbox"
                  checked={selected.some((item: IGroupRef) => item.id === group.id)}
                  onChange={() => toggle(group)}
                />
                {group.title}
              </label>
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 && (
        <p className={`${styles.pickerStatus} ${styles.pickerError}`} role="alert">
          Grupo(s) selecionado(s) não encontrado(s) neste site: {missing.map((item: IGroupRef) => item.title).join(', ')}.
          Remova-o(s) para manter a configuração consistente.
        </p>
      )}
    </div>
  );
};

/** Seleção de uma lista do site de dados. Mostra somente listas de itens, sem as cópias de HML. */
export interface IListPickerProps {
  label: string;
  siteUrl: string;
  prefixos: IPrefixosListas;
  service: SiteDirectoryService;
  value: string;
  onChange: (listName: string) => void;
}

export const ListPickerField: React.FC<IListPickerProps> = ({ label, siteUrl, service, prefixos, value, onChange }) => {
  const [lists, setLists] = useState<string[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [attempt, setAttempt] = useState<number>(0);
  const selectId: string = React.useId();

  const prefixoKey: string = `${prefixos.PROD}|${prefixos.HML}`;
  useEffect(() => {
    let active: boolean = true;
    setStatus('loading');
    service
      .getSiteLists(siteUrl, prefixos)
      .then((result: string[]) => {
        if (active) {
          setLists(result);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (active) {
          setStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, [siteUrl, service, attempt, prefixoKey]);

  const missing: boolean = status === 'ready' && value !== '' && lists.indexOf(value) === -1;

  return (
    <div className={styles.picker}>
      <label className={styles.pickerLabel} htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        className={styles.pickerInput}
        value={value}
        disabled={status !== 'ready'}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
      >
        <option value="">{status === 'loading' ? 'Carregando listas…' : 'Selecione uma lista'}</option>
        {lists.map((name: string) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
        {missing && <option value={value}>{value} (não encontrada)</option>}
      </select>
      {status === 'error' && (
        <p className={`${styles.pickerStatus} ${styles.pickerError}`} role="alert">
          Não foi possível carregar as listas.{' '}
          <button type="button" className={styles.pickerButton} onClick={() => setAttempt((n: number) => n + 1)}>
            Tentar novamente
          </button>
        </p>
      )}
      {status === 'ready' && lists.length === 0 && <p className={styles.pickerStatus}>Nenhuma lista de itens neste site.</p>}
    </div>
  );
};

/** Limite de índices por lista no SharePoint. */
const MAX_LIST_INDEXES: number = 20;

/**
 * Seleção de campos da lista escolhida, sem os campos de sistema.
 * Modo "filter": somente tipos que aceitam índice, com a situação do índice em cada campo.
 * Modo "display": todos os campos legíveis, com ordem das colunas ajustável.
 */
export interface IFieldPickerProps {
  label: string;
  hint: string;
  mode: 'filter' | 'display';
  siteUrl: string;
  /** Nome físico da lista no ambiente ativo. Vazio enquanto não houver lista escolhida. */
  listTitle: string;
  service: SiteDirectoryService;
  value: string[];
  onChange: (names: string[]) => void;
}

export const FieldPickerField: React.FC<IFieldPickerProps> = ({ label, hint, mode, siteUrl, listTitle, service, value, onChange }) => {
  const [fields, setFields] = useState<IListField[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [message, setMessage] = useState<string>('');
  const [attempt, setAttempt] = useState<number>(0);
  const [selected, setSelected] = useState<string[]>(value);

  useEffect(() => {
    let active: boolean = true;
    if (listTitle === '') {
      setStatus('idle');
      return undefined;
    }
    setStatus('loading');
    service
      .getListFields(siteUrl, listTitle)
      .then((result: IListField[]) => {
        if (active) {
          setFields(result);
          setStatus('ready');
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os campos.');
          setStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, [siteUrl, listTitle, service, attempt]);

  const update = (next: string[]): void => {
    setSelected(next);
    onChange(next);
  };

  const toggle = (name: string): void => {
    update(selected.indexOf(name) !== -1 ? selected.filter((item: string) => item !== name) : [...selected, name]);
  };

  const move = (index: number, offset: number): void => {
    const target: number = index + offset;
    if (target < 0 || target >= selected.length) {
      return;
    }
    const next: string[] = selected.slice();
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    update(next);
  };

  const eligible: IListField[] = mode === 'filter' ? fields.filter(isFilterable) : fields;
  const titleOf = (name: string): string => fields.find((field: IListField) => field.name === name)?.title ?? name;
  const missing: string[] = status === 'ready' ? selected.filter((name: string) => !eligible.some((field: IListField) => field.name === name)) : [];
  const unindexed: IListField[] = mode === 'filter' ? eligible.filter((field: IListField) => selected.indexOf(field.name) !== -1 && !field.indexed) : [];
  const indexCount: number = fields.filter((field: IListField) => field.indexed).length;

  return (
    <div className={styles.picker}>
      <span className={styles.pickerLabel}>{label}</span>
      <p className={styles.pickerStatus}>{hint}</p>
      {listTitle === '' && <p className={styles.pickerStatus}>Selecione a lista primeiro.</p>}
      {status === 'loading' && <p className={styles.pickerStatus}>Carregando campos…</p>}
      {status === 'error' && (
        <p className={`${styles.pickerStatus} ${styles.pickerError}`} role="alert">
          {message}{' '}
          <button type="button" className={styles.pickerButton} onClick={() => setAttempt((n: number) => n + 1)}>
            Tentar novamente
          </button>
        </p>
      )}
      {status === 'ready' && selected.length > 0 && (
        <ol className={styles.fieldOrder} aria-label={`Campos selecionados: ${label}`}>
          {selected.map((name: string, index: number) => (
            <li key={name} className={styles.fieldOrderRow}>
              <span className={styles.fieldOrderName}>{titleOf(name)}</span>
              <button type="button" aria-label={`Mover ${titleOf(name)} para cima`} title="Mover para cima" disabled={index === 0} onClick={() => move(index, -1)}>
                ↑
              </button>
              <button
                type="button"
                aria-label={`Mover ${titleOf(name)} para baixo`}
                title="Mover para baixo"
                disabled={index === selected.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button type="button" aria-label={`Remover ${titleOf(name)}`} title="Remover" onClick={() => toggle(name)}>
                ×
              </button>
            </li>
          ))}
        </ol>
      )}
      {status === 'ready' && eligible.length === 0 && <p className={styles.pickerStatus}>Nenhum campo disponível nesta lista.</p>}
      {status === 'ready' && eligible.length > 0 && (
        <ul className={styles.pickerOptions} aria-label={`Campos disponíveis: ${label}`}>
          {eligible.map((field: IListField) => (
            <li key={field.name}>
              <label className={styles.pickerOption}>
                <input type="checkbox" checked={selected.indexOf(field.name) !== -1} onChange={() => toggle(field.name)} />
                <span>
                  {field.title}
                  <br />
                  <small>
                    {typeLabel(field.type)}
                    {mode === 'filter' ? (field.indexed ? ' · indexado' : ' · sem índice') : ''}
                  </small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {unindexed.length > 0 && (
        <p className={`${styles.pickerStatus} ${styles.pickerError}`} role="alert">
          Sem índice: {unindexed.map((field: IListField) => field.title).join(', ')}. Em listas com mais de 5.000 itens, filtros sem
          índice são recusados pelo SharePoint. Crie os índices com o script da pasta provisionamento ({indexCount} de {MAX_LIST_INDEXES}{' '}
          índices em uso nesta lista).
        </p>
      )}
      {missing.length > 0 && (
        <p className={`${styles.pickerStatus} ${styles.pickerError}`} role="alert">
          Campo(s) selecionado(s) não encontrado(s) nesta lista: {missing.join(', ')}. Remova-o(s) para manter a configuração consistente.
        </p>
      )}
    </div>
  );
};
