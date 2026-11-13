import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { IconButton } from '@fluentui/react/lib/Button';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import styles from './Documentos.module.scss';
import coreStyles from '../../../core/core.module.scss';
import sharedStyles from './shared.module.scss';
import { DiagnosticsPanel } from '../../../core/diagnostics';
import { resolveListTitle } from '../../../core/config';
import { IFileEntry, IFolderContent, IFolderEntry, ISearchFileEntry, ISearchResult } from '../../../services/SpListService';
import { categoryOf, DocumentosLayout, FileCategory, formatBytes, ICON_BY_CATEGORY, IDocumentosProps, isOfficeCategory } from './IDocumentosProps';

/** Um nível de navegação: nome exibido e caminho do servidor. */
interface IPathItem {
  name: string;
  path: string;
}

/** Item exibido: pasta, ou arquivo (com a pasta onde está, quando vem da busca). */
type IEntry =
  | { kind: 'folder'; key: string; name: string; folder: IFolderEntry }
  | { kind: 'file'; key: string; name: string; file: IFileEntry; location?: string };

/** Pasta de sistema da raiz das bibliotecas, que não interessa ao usuário. */
const SYSTEM_FOLDER: string = 'Forms';
const NOTICE_MS: number = 4000;
const SEARCH_DEBOUNCE_MS: number = 350;
/** Limites da busca recursiva: resultados e pastas percorridas. Ao atingi-los, a tela avisa que a busca foi limitada. */
const SEARCH_LIMIT: number = 200;
const SEARCH_FOLDER_LIMIT: number = 200;
/** Contagens de arquivos por pasta são feitas em lotes pequenos, para não sobrecarregar a conexão. */
const COUNT_CONCURRENCY: number = 4;

const CATEGORY_CLASS: Record<FileCategory, string> = {
  pdf: styles.catPdf,
  word: styles.catWord,
  excel: styles.catExcel,
  powerpoint: styles.catPowerpoint,
  texto: styles.catTexto,
  imagem: styles.catImagem,
  video: styles.catVideo,
  audio: styles.catAudio,
  compactado: styles.catCompactado,
  onenote: styles.catOnenote,
  outro: styles.catOutro
};

/** Monta a lista do nível atual: pastas primeiro, depois arquivos carregados, ambos em ordem alfabética. */
const buildEntries = (content: IFolderContent | undefined, isRoot: boolean): IEntry[] => {
  if (!content) {
    return [];
  }
  const folders: IEntry[] = content.folders
    .filter((folder: IFolderEntry) => !(isRoot && folder.Name === SYSTEM_FOLDER))
    .sort((a: IFolderEntry, b: IFolderEntry) => a.Name.localeCompare(b.Name, 'pt-BR'))
    .map((folder: IFolderEntry): IEntry => ({ kind: 'folder', key: `f:${folder.ServerRelativeUrl}`, name: folder.Name, folder }));
  const files: IEntry[] = content.files
    .filter((file: IFileEntry) => file.Name.indexOf('~$') !== 0)
    .sort((a: IFileEntry, b: IFileEntry) => a.Name.localeCompare(b.Name, 'pt-BR'))
    .map((file: IFileEntry): IEntry => ({ kind: 'file', key: `d:${file.ServerRelativeUrl}`, name: file.Name, file }));
  return [...folders, ...files];
};

/** Resultados da busca recursiva: somente arquivos, cada um com a pasta onde está. */
const buildSearchEntries = (results: ISearchFileEntry[]): IEntry[] =>
  results
    .filter((file: ISearchFileEntry) => file.Name.indexOf('~$') !== 0)
    .map((file: ISearchFileEntry): IEntry => ({
      kind: 'file',
      key: `d:${file.ServerRelativeUrl}`,
      name: file.Name,
      file,
      location: file.location
    }));

/**
 * Navegador de biblioteca de documentos. Pastas abrem em um nível e o caminho fica no topo, como migalhas de pão.
 * Arquivos abrem em nova aba (Office no visualizador do SharePoint) e podem ser compartilhados por link.
 * Bibliotecas grandes: a pasta carrega por páginas (botão "Carregar mais") e a busca percorre as subpastas uma a uma.
 */
const Documentos: React.FC<IDocumentosProps> = ({ service, logger, environment, title, themeStyle, libraryName, layout: initialLayout, adminGroupIds }) => {
  const base: string = libraryName.trim();
  const libraryTitle: string = base === '' || base.indexOf('HML_') === 0 ? '' : resolveListTitle(base, environment);
  const configured: boolean = libraryTitle !== '';
  const displayName: string = base || 'Documentos';
  const contextLabel: string = title || 'Documentos';
  const origin: string = React.useMemo((): string => new URL(service.webUrl).origin, [service.webUrl]);
  const webBase: string = service.webUrl.replace(/\/+$/, '');
  const groupsKey: string = adminGroupIds.join(',');

  const [layout, setLayout] = React.useState<DocumentosLayout>(initialLayout);
  const [rootPath, setRootPath] = React.useState<string | undefined>(undefined);
  const [rootError, setRootError] = React.useState<boolean>(false);
  const [trail, setTrail] = React.useState<IPathItem[]>([]);
  const [content, setContent] = React.useState<IFolderContent | undefined>(undefined);
  const [contentError, setContentError] = React.useState<boolean>(false);
  const [loadingMore, setLoadingMore] = React.useState<boolean>(false);
  const [fileCounts, setFileCounts] = React.useState<Record<string, number>>({});
  const [searchResult, setSearchResult] = React.useState<ISearchResult | undefined>(undefined);
  const [searching, setSearching] = React.useState<boolean>(false);
  const [searchError, setSearchError] = React.useState<boolean>(false);
  const [canOpenLibrary, setCanOpenLibrary] = React.useState<boolean>(false);
  const [reloadKey, setReloadKey] = React.useState<number>(0);
  const [query, setQuery] = React.useState<string>('');
  const [notice, setNotice] = React.useState<string>('');
  const cacheRef: React.MutableRefObject<Map<string, IFolderContent>> = React.useRef<Map<string, IFolderContent>>(new Map());
  const countsRef: React.MutableRefObject<Map<string, number>> = React.useRef<Map<string, number>>(new Map());

  const currentPath: string | undefined = trail.length > 0 ? trail[trail.length - 1].path : undefined;
  const term: string = query.trim();
  const isRoot: boolean = currentPath !== undefined && currentPath === rootPath;

  // Raiz da biblioteca: obtida uma vez por biblioteca escolhida.
  React.useEffect((): (() => void) | undefined => {
    setRootPath(undefined);
    setRootError(false);
    setTrail([]);
    setContent(undefined);
    setFileCounts({});
    cacheRef.current = new Map<string, IFolderContent>();
    countsRef.current = new Map<string, number>();
    if (!configured) {
      return undefined;
    }
    let active: boolean = true;
    service
      .getLibraryRootPath(libraryTitle)
      .then((path: string) => {
        if (active) {
          setRootPath(path);
          setTrail([{ name: displayName, path }]);
        }
      })
      .catch((error: unknown) => {
        logger.log('warn', 'Biblioteca', error instanceof Error ? error.message : 'Falha ao acessar a biblioteca.');
        if (active) {
          setRootError(true);
        }
      });
    return (): void => {
      active = false;
    };
  }, [service, logger, libraryTitle, configured, displayName]);

  // Primeira página do conteúdo do nível atual, com cache por caminho enquanto a WP estiver aberta.
  React.useEffect((): (() => void) | undefined => {
    if (!configured || !currentPath) {
      return undefined;
    }
    const key: string = `${libraryTitle}|${currentPath}`;
    const cached: IFolderContent | undefined = cacheRef.current.get(key);
    if (cached && reloadKey === 0) {
      setContent(cached);
      setContentError(false);
      return undefined;
    }
    let active: boolean = true;
    setContent(undefined);
    setContentError(false);
    service
      .getFolderContent(currentPath)
      .then((result: IFolderContent) => {
        cacheRef.current.set(key, result);
        if (active) {
          setContent(result);
        }
      })
      .catch((error: unknown) => {
        logger.log('warn', 'Pasta', error instanceof Error ? error.message : 'Falha ao consultar a pasta.');
        if (active) {
          setContentError(true);
        }
      });
    return (): void => {
      active = false;
    };
  }, [service, logger, libraryTitle, configured, currentPath, reloadKey]);

  // Quantidade de arquivos de cada subpasta visível. Carregada depois da lista, em lotes pequenos.
  React.useEffect((): (() => void) | undefined => {
    if (!configured || !content) {
      return undefined;
    }
    const pending: string[] = content.folders
      .map((folder: IFolderEntry) => folder.ServerRelativeUrl)
      .filter((path: string) => !countsRef.current.has(path));
    if (pending.length === 0) {
      return undefined;
    }
    let active: boolean = true;
    const load = async (): Promise<void> => {
      for (let start: number = 0; start < pending.length; start += COUNT_CONCURRENCY) {
        const batch: string[] = pending.slice(start, start + COUNT_CONCURRENCY);
        const settled: ({ path: string; count: number } | undefined)[] = await Promise.all(
          batch.map((path: string) =>
            service
              .getFileCount(path)
              .then((count: number) => ({ path, count }))
              .catch(() => undefined)
          )
        );
        if (!active) {
          return;
        }
        settled.forEach((item) => {
          if (item) {
            countsRef.current.set(item.path, item.count);
          }
        });
        setFileCounts((previous: Record<string, number>) => {
          const next: Record<string, number> = { ...previous };
          settled.forEach((item) => {
            if (item) {
              next[item.path] = item.count;
            }
          });
          return next;
        });
      }
    };
    load().catch(() => undefined);
    return (): void => {
      active = false;
    };
  }, [service, configured, content]);

  // Busca recursiva na pasta aberta. Espera a digitação parar antes de consultar.
  React.useEffect((): (() => void) | undefined => {
    if (!configured || currentPath === undefined || term === '') {
      setSearchResult(undefined);
      setSearching(false);
      setSearchError(false);
      return undefined;
    }
    let active: boolean = true;
    setSearching(true);
    setSearchError(false);
    setSearchResult(undefined);
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      service
        .searchFolderTree(libraryTitle, currentPath, term, SEARCH_LIMIT, SEARCH_FOLDER_LIMIT)
        .then((found: ISearchResult) => {
          if (active) {
            setSearchResult(found);
            setSearching(false);
          }
        })
        .catch((error: unknown) => {
          logger.log('warn', 'Busca', error instanceof Error ? error.message : 'Falha na busca.');
          if (active) {
            setSearchError(true);
            setSearching(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);
    return (): void => {
      active = false;
      clearTimeout(timer);
    };
  }, [service, logger, configured, currentPath, term, reloadKey]);

  // Ícone da biblioteca: aparece só para quem está em um dos grupos administradores configurados na WP.
  React.useEffect((): (() => void) | undefined => {
    if (!configured || adminGroupIds.length === 0) {
      setCanOpenLibrary(false);
      return undefined;
    }
    let active: boolean = true;
    service
      .getCurrentUserGroupIds()
      .then((ids: number[]) => {
        if (active) {
          setCanOpenLibrary(ids.some((id: number) => adminGroupIds.indexOf(id) !== -1));
        }
      })
      .catch(() => {
        if (active) {
          setCanOpenLibrary(false);
        }
      });
    return (): void => {
      active = false;
    };
    // groupsKey representa adminGroupIds; a lista muda de referência a cada renderização.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, configured, groupsKey]);

  // Aviso de cópia some sozinho depois de alguns segundos.
  React.useEffect((): (() => void) | undefined => {
    if (notice === '') {
      return undefined;
    }
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => setNotice(''), NOTICE_MS);
    return (): void => clearTimeout(timer);
  }, [notice]);

  const entries: IEntry[] = React.useMemo(
    (): IEntry[] => (term !== '' ? buildSearchEntries(searchResult?.items ?? []) : buildEntries(content, isRoot)),
    [term, searchResult, content, isRoot]
  );

  const absoluteUrl = (path: string): string => new URL(path, origin).href;

  /** Office abre no visualizador do SharePoint; os demais tipos abrem diretamente pelo link do arquivo. */
  const fileHref = (file: IFileEntry): string => {
    const category: FileCategory = categoryOf(file.Name);
    if (isOfficeCategory(category) && file.UniqueId) {
      return `${webBase}/_layouts/15/WopiFrame.aspx?sourcedoc=${encodeURIComponent(`{${file.UniqueId}}`)}&file=${encodeURIComponent(file.Name)}&action=view`;
    }
    return absoluteUrl(file.ServerRelativeUrl);
  };

  const openFile = (file: IFileEntry): void => {
    window.open(fileHref(file), '_blank', 'noopener,noreferrer');
  };

  const openFolder = (folder: IFolderEntry): void => {
    setQuery('');
    setTrail((previous: IPathItem[]) => [...previous, { name: folder.Name, path: folder.ServerRelativeUrl }]);
  };

  const goTo = (index: number): void => {
    setQuery('');
    setTrail((previous: IPathItem[]) => previous.slice(0, index + 1));
  };

  /** Carrega a próxima página de arquivos da pasta atual e acrescenta ao que já está na tela. */
  const loadMore = (): void => {
    const next: string | undefined = content?.nextFilesUrl;
    if (!content || next === undefined || currentPath === undefined || loadingMore) {
      return;
    }
    const key: string = `${libraryTitle}|${currentPath}`;
    const loaded: IFolderContent = content;
    setLoadingMore(true);
    service
      .getMoreFiles(next)
      .then((page) => {
        const updated: IFolderContent = { folders: loaded.folders, files: [...loaded.files, ...page.files], nextFilesUrl: page.nextFilesUrl };
        cacheRef.current.set(key, updated);
        setContent(updated);
        setLoadingMore(false);
      })
      .catch((error: unknown) => {
        logger.log('warn', 'Pasta', error instanceof Error ? error.message : 'Falha ao carregar mais arquivos.');
        setNotice('Não foi possível carregar mais arquivos. Tente novamente.');
        setLoadingMore(false);
      });
  };

  /** Copia o link do item. Se o navegador bloquear a cópia, mostra o link para copiar manualmente. */
  const share = async (name: string, path: string): Promise<void> => {
    const link: string = absoluteUrl(path);
    try {
      await navigator.clipboard.writeText(link);
      setNotice(`Link de "${name}" copiado.`);
    } catch {
      setNotice(`Não foi possível copiar automaticamente. Link: ${link}`);
    }
  };

  const activate = (entry: IEntry): void => {
    if (entry.kind === 'folder') {
      openFolder(entry.folder);
    } else {
      openFile(entry.file);
    }
  };

  const iconOf = (entry: IEntry): string => (entry.kind === 'folder' ? 'FabricFolderFill' : ICON_BY_CATEGORY[categoryOf(entry.name)]);
  const iconClassOf = (entry: IEntry): string => (entry.kind === 'folder' ? styles.catFolder : CATEGORY_CLASS[categoryOf(entry.name)]);
  const metaOf = (entry: IEntry): string => {
    if (entry.kind === 'folder') {
      const count: number | undefined = fileCounts[entry.folder.ServerRelativeUrl];
      if (count === undefined) {
        return '';
      }
      return count === 1 ? '1 arquivo' : `${count} arquivos`;
    }
    return entry.location !== undefined ? `Local: ${entry.location}` : formatBytes(entry.file.Length);
  };
  const sharePath = (entry: IEntry): string => (entry.kind === 'folder' ? entry.folder.ServerRelativeUrl : entry.file.ServerRelativeUrl);

  const openLibrary = (): void => {
    if (rootPath !== undefined) {
      window.open(absoluteUrl(rootPath), '_blank', 'noopener,noreferrer');
    }
  };

  const renderEntries = (): React.ReactNode => {
    if (layout === 'grade') {
      return (
        <ul className={styles.grid}>
          {entries.map((entry: IEntry) => (
            <li key={entry.key} className={styles.tile}>
              <button type="button" className={styles.tileMain} onClick={() => activate(entry)} aria-label={`${entry.kind === 'folder' ? 'Abrir pasta' : 'Abrir'} ${entry.name}`}>
                <Icon iconName={iconOf(entry)} className={`${styles.icon} ${iconClassOf(entry)}`} aria-hidden="true" />
                <span className={styles.name}>{entry.name}</span>
                <span className={styles.meta}>{metaOf(entry)}</span>
              </button>
              <IconButton
                iconProps={{ iconName: 'Share' }}
                ariaLabel={`Compartilhar ${entry.name}`}
                title="Copiar link"
                className={styles.shareButton}
                onClick={() => {
                  share(entry.name, sharePath(entry)).catch(() => undefined);
                }}
              />
            </li>
          ))}
        </ul>
      );
    }
    return (
      <ul className={styles.list}>
        {entries.map((entry: IEntry) => (
          <li key={entry.key} className={styles.row}>
            <button type="button" className={styles.rowMain} onClick={() => activate(entry)} aria-label={`${entry.kind === 'folder' ? 'Abrir pasta' : 'Abrir'} ${entry.name}`}>
              <Icon iconName={iconOf(entry)} className={`${styles.icon} ${styles.iconSmall} ${iconClassOf(entry)}`} aria-hidden="true" />
              <span className={styles.name}>{entry.name}</span>
              <span className={styles.meta}>{metaOf(entry)}</span>
            </button>
            <IconButton
              iconProps={{ iconName: 'Share' }}
              ariaLabel={`Compartilhar ${entry.name}`}
              title="Copiar link"
              className={styles.shareButton}
              onClick={() => {
                share(entry.name, sharePath(entry)).catch(() => undefined);
              }}
            />
          </li>
        ))}
      </ul>
    );
  };

  let body: React.ReactNode;
  if (!configured) {
    body = <div className={sharedStyles.empty}>Escolha a biblioteca de documentos nas configurações da Web Part.</div>;
  } else if (rootError) {
    body = <div className={sharedStyles.message} role="alert">Não foi possível acessar a biblioteca. Verifique se você tem permissão de leitura.</div>;
  } else if (term !== '') {
    if (searchError) {
      body = <div className={sharedStyles.message} role="alert">Não foi possível concluir a busca. Tente novamente em instantes.</div>;
    } else if (searching || searchResult === undefined) {
      body = <div className={sharedStyles.skeleton} aria-busy="true" aria-label="Buscando documentos" />;
    } else if (entries.length === 0) {
      body = <div className={sharedStyles.empty}>{`Nenhum arquivo encontrado para "${term}" nesta pasta e nas subpastas.`}</div>;
    } else {
      body = renderEntries();
    }
  } else if (contentError) {
    body = (
      <div className={sharedStyles.message} role="alert">
        Não foi possível carregar esta pasta.{' '}
        <button type="button" className={styles.linkButton} onClick={() => setReloadKey((value: number) => value + 1)}>
          Tentar novamente
        </button>
      </div>
    );
  } else if (!content || rootPath === undefined) {
    body = <div className={sharedStyles.skeleton} aria-busy="true" aria-label="Carregando documentos" />;
  } else if (entries.length === 0) {
    body = <div className={sharedStyles.empty}>Esta pasta está vazia.</div>;
  } else {
    body = renderEntries();
  }

  return (
    <section className={sharedStyles.root} style={themeStyle} aria-label={contextLabel}>
      <div className={styles.header}>
        <header className={coreStyles.wpHeader}>
          {title && (
            <h2 className={coreStyles.wpTitle}>
              <Icon iconName="OpenFolderHorizontal" className={coreStyles.wpIcon} aria-hidden="true" />
              {title}
            </h2>
          )}
        </header>
        {canOpenLibrary && rootPath !== undefined && (
          <IconButton
            iconProps={{ iconName: 'Library' }}
            ariaLabel="Abrir biblioteca em nova aba"
            title="Abrir biblioteca"
            className={styles.libraryLink}
            onClick={openLibrary}
          />
        )}
      </div>

      {configured && rootPath !== undefined && (
        <>
          <nav className={styles.breadcrumb} aria-label="Caminho da pasta">
            {trail.map((item: IPathItem, index: number) => {
              const last: boolean = index === trail.length - 1;
              if (index === 0) {
                // A casinha é a raiz: fica sem ação quando já está na raiz e volta para ela nos níveis abaixo.
                return last ? (
                  <span key={item.path} className={styles.crumbCurrent} aria-current="page" aria-label="Raiz da biblioteca" title="Raiz da biblioteca">
                    <Icon iconName="Home" className={styles.crumbIcon} aria-hidden="true" />
                  </span>
                ) : (
                  <button key={item.path} type="button" className={styles.crumb} onClick={() => goTo(0)} aria-label="Voltar para a raiz da biblioteca" title="Voltar para a raiz">
                    <Icon iconName="Home" className={styles.crumbIcon} aria-hidden="true" />
                  </button>
                );
              }
              return (
                <React.Fragment key={item.path}>
                  <Icon iconName="ChevronRight" className={styles.separator} aria-hidden="true" />
                  {last ? (
                    <span className={styles.crumbCurrent} aria-current="page">
                      {item.name}
                    </span>
                  ) : (
                    <button type="button" className={styles.crumb} onClick={() => goTo(index)}>
                      {item.name}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          <div className={styles.toolbar}>
            <SearchBox
              className={styles.search}
              placeholder="Buscar nesta pasta e subpastas"
              ariaLabel="Buscar nesta pasta e subpastas"
              value={query}
              onChange={(_event, value) => setQuery(value ?? '')}
              onClear={() => setQuery('')}
            />
            <div className={styles.viewButtons} role="group" aria-label="Modo de exibição">
              <IconButton
                iconProps={{ iconName: 'GridViewMedium' }}
                ariaLabel="Exibir em grade"
                title="Grade"
                aria-pressed={layout === 'grade'}
                className={layout === 'grade' ? styles.viewActive : undefined}
                onClick={() => setLayout('grade')}
              />
              <IconButton
                iconProps={{ iconName: 'List' }}
                ariaLabel="Exibir em lista"
                title="Lista"
                aria-pressed={layout === 'lista'}
                className={layout === 'lista' ? styles.viewActive : undefined}
                onClick={() => setLayout('lista')}
              />
              <IconButton
                iconProps={{ iconName: 'Refresh' }}
                ariaLabel="Atualizar pasta"
                title="Atualizar"
                onClick={() => {
                  cacheRef.current.delete(`${libraryTitle}|${currentPath ?? ''}`);
                  countsRef.current.clear();
                  setFileCounts({});
                  setReloadKey((value: number) => value + 1);
                }}
              />
            </div>
          </div>
        </>
      )}

      {term !== '' && searchResult !== undefined && (searchResult.truncated || searchResult.failedFolders > 0) && (
        <div className={styles.notice} role="status">
          {searchResult.truncated ? 'Busca limitada: há mais pastas ou resultados. Refine o termo para ver outros arquivos.' : ''}
          {searchResult.failedFolders > 0 ? ` ${searchResult.failedFolders} pasta(s) não puderam ser pesquisadas.` : ''}
        </div>
      )}

      {body}

      {term === '' && content?.nextFilesUrl !== undefined && (
        <div className={styles.loadMore}>
          <span className={styles.meta}>{`Mostrando ${content.files.length} arquivo(s) desta pasta`}</span>
          <button type="button" className={styles.loadMoreButton} onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Carregando...' : 'Carregar mais arquivos'}
          </button>
        </div>
      )}

      {notice && (
        <div className={styles.notice} role="status">
          {notice}
        </div>
      )}
      <DiagnosticsPanel logger={logger} />
    </section>
  );
};

export default Documentos;
