import * as React from 'react';
import { useEffect, useState } from 'react';
import styles from './core.module.scss';
import { IGroupRef } from './config';
import { ISiteRef, SiteDirectoryService } from './siteDirectory';

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
                name="carreiras-site-de-dados"
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
