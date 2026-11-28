// Modelo: navegação interna compacta da web part — modo B (skill spfx-padrao-visual-gti).
// Use quando o site já tem navegação própria (ex-layout-sharepoint ou WP de navegação)
// e a WP tem várias telas. Não cria barra de site, menu lateral nem caminho de pão.
// Sem nomeProduto e sem usuario, a barra mostra só as telas (o cabeçalho do site já traz marca e usuário).
import * as React from 'react';
import { Icon, NomeIcone } from './Icon';
import { IRoteador } from './useWpRoute';

export interface IItemNav {
  /** Rota da tela, por exemplo "catalogo". */
  rota: string;
  rotulo: string;
  icone: NomeIcone;
  /** Pendências (aprovações, tarefas). Zero ou ausente não mostra o contador. */
  contador?: number;
  /** Rotas filhas que mantêm este item ativo, por exemplo ["jornada", "player"]. */
  ativoEm?: string[];
}

export interface IGrupoNav {
  /** Grupos são separados por uma divisória. Filtre por perfil antes de passar. */
  itens: IItemNav[];
}

export interface IWpNavProps {
  /** Marca textual. Omita quando o site já tem cabeçalho (ex-layout-sharepoint). */
  nomeProduto?: string;
  /** Ícone da marca textual. Com logo fornecido, troque o quadrado por <img> com object-fit: contain. */
  iconeProduto?: NomeIcone;
  /** Texto curto abaixo do nome. */
  legenda?: string;
  ambiente: 'PROD' | 'HML';
  grupos: IGrupoNav[];
  roteador: IRoteador;
  /** Omita quando o cabeçalho do site já mostra o usuário. */
  usuario?: { nome: string; papel: string };
  /** Quando houver busca rápida (Ctrl+K). */
  aoBuscar?: () => void;
  rotuloNavegacao: string;
}

function iniciais(nome: string): string {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

export function WpNav(props: IWpNavProps): React.ReactElement {
  const { roteador } = props;
  const ativo = (item: IItemNav): boolean =>
    roteador.tela === item.rota || (item.ativoEm ?? []).indexOf(roteador.tela) > -1;
  const listaRef = React.useRef<HTMLElement>(null);

  // Mantém o item ativo visível quando a barra rola na horizontal (coluna estreita).
  React.useEffect(() => {
    const atual = listaRef.current?.querySelector('[aria-current="page"]') as HTMLElement | null;
    if (atual && typeof atual.scrollIntoView === 'function') atual.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [roteador.tela]);

  React.useEffect(() => {
    if (!props.aoBuscar) return undefined;
    const aoTeclar = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        props.aoBuscar?.();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [props.aoBuscar]);

  return (
    <header className={`pi-wpbar ${props.nomeProduto ? '' : 'compacta'}`}>
      {props.nomeProduto ? (
        <div className="pi-wpbrand">
          <span className="pi-wpbrand-mark"><Icon nome={props.iconeProduto ?? 'grade'} /></span>
          <span>
            <b>{props.nomeProduto}</b>
            <small>
              {props.legenda}
              <span className={`pi-env ${props.ambiente === 'HML' ? 'hml' : ''}`} title="Ambiente configurado no painel da web part">{props.ambiente}</span>
            </small>
          </span>
        </div>
      ) : undefined}
      <nav className="pi-wptabs" aria-label={props.rotuloNavegacao} ref={listaRef}>
        {props.grupos.map((grupo, g) => (
          <React.Fragment key={g}>
            {g > 0 && <span className="pi-wpsep" aria-hidden="true" />}
            {grupo.itens.map((item) => (
              <a
                key={item.rota}
                className="pi-wptab"
                href={roteador.hrefDe(item.rota)}
                onClick={roteador.aoClicarLink(item.rota)}
                aria-current={ativo(item) ? 'page' : undefined}
              >
                <Icon nome={item.icone} tamanho={17} />
                <span>{item.rotulo}</span>
                {!!item.contador && <span className="pi-count" aria-label={`${item.contador} pendente(s)`}>{item.contador}</span>}
              </a>
            ))}
          </React.Fragment>
        ))}
      </nav>
      <div className="pi-wptools">
        {props.aoBuscar && (
          <button type="button" className="pi-search-trigger" onClick={props.aoBuscar} aria-label="Buscar (Ctrl+K)" aria-keyshortcuts="Control+K">
            <Icon nome="busca" tamanho={16} /><span>Buscar</span><kbd>Ctrl K</kbd>
          </button>
        )}
        {!props.nomeProduto && props.ambiente === 'HML' && (
          <span className="pi-env hml" title="Ambiente configurado no painel da web part">HML</span>
        )}
        {props.usuario && (
          <div className="pi-me">
            <span className="pi-avatar" aria-hidden="true">{iniciais(props.usuario.nome)}</span>
            <div><b>{props.usuario.nome}</b><small>{props.usuario.papel}</small></div>
          </div>
        )}
      </div>
    </header>
  );
}

/** Abas de subtelas dentro de uma tela (por exemplo Gestão → Painel, Pessoas, Aprovações). */
export function RouteTabs(props: {
  rotulo: string;
  roteador: IRoteador;
  abas: { rota: string; rotulo: string; contador?: number }[];
}): React.ReactElement {
  return (
    <nav className="pi-tabs" aria-label={props.rotulo}>
      {props.abas.map((aba) => (
        <a
          key={aba.rota}
          className="pi-tab"
          href={props.roteador.hrefDe(aba.rota)}
          onClick={props.roteador.aoClicarLink(aba.rota)}
          aria-current={props.roteador.rota === aba.rota ? 'page' : undefined}
        >
          {aba.rotulo}
          {!!aba.contador && <span className="pi-count">{aba.contador}</span>}
        </a>
      ))}
    </nav>
  );
}
