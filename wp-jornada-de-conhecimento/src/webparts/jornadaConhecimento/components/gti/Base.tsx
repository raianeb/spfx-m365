// Modelo: componentes básicos do padrão GTI (skill spfx-padrao-visual-gti).
// Todos dependem da raiz GtiRoot (classe .gti) para receber os tokens e as classes pi-*.
import * as React from 'react';
import styles from './gti.module.scss';
import { Icon, NomeIcone } from './Icon';
import { ITemaDoSite, tokensDoTema } from './tema';

// ---------------------------------------------------------------- raiz
export interface IGtiRootProps {
  /** Tema do site quando "Herdar tema = Sim"; ausente usa a paleta GTI. */
  tema?: ITemaDoSite;
  /** Variáveis já calculadas pelo contêiner (por exemplo, tokens do tema do site). */
  estilo?: React.CSSProperties;
  children: React.ReactNode;
}

/** Raiz local da web part: tokens, fonte, fundo e responsividade pela largura do contêiner. */
export function GtiRoot(props: IGtiRootProps): React.ReactElement {
  return (
    <div className={styles.gti} style={{ ...tokensDoTema(props.tema), ...props.estilo }}>
      {props.children}
    </div>
  );
}

// ---------------------------------------------------------------- cabeçalho de tela
export interface IPageHeaderProps {
  /** Rótulo curto de contexto (área, módulo). Vai em caixa alta. */
  sobretitulo?: string;
  titulo: string;
  descricao?: string;
  /** Botões à direita. A ação principal usa a classe "pi-btn primary". */
  acoes?: React.ReactNode;
  /**
   * Nível do título. Use 1 quando a tela ocupa a página; use 2 quando a página
   * já tem um título acima da web part (o título principal aparece uma vez).
   */
  nivel?: 1 | 2;
  /** Id do título, para mover o foco ao trocar de tela. */
  idTitulo?: string;
}

export function PageHeader(props: IPageHeaderProps): React.ReactElement {
  const Titulo = props.nivel === 2 ? 'h2' : 'h1';
  return (
    <div className="pi-page-head">
      <div>
        {props.sobretitulo && <span className="pi-eyebrow">{props.sobretitulo}</span>}
        <Titulo id={props.idTitulo} tabIndex={-1} className={props.nivel === 2 ? 'pi-title' : undefined}>
          {props.titulo}
        </Titulo>
        {props.descricao && <p>{props.descricao}</p>}
      </div>
      {props.acoes && <div className="pi-actions">{props.acoes}</div>}
    </div>
  );
}

export function SectionTitle(props: { titulo: string; acao?: React.ReactNode }): React.ReactElement {
  return (
    <div className="pi-section-title">
      <h2>{props.titulo}</h2>
      {props.acao}
    </div>
  );
}

// ---------------------------------------------------------------- painel
export interface IPanelProps {
  titulo?: string;
  descricao?: string;
  acao?: React.ReactNode;
  /** Remove o preenchimento interno (tabelas e listas que encostam na borda). */
  semPreenchimento?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Panel(props: IPanelProps): React.ReactElement {
  return (
    <section className={`pi-card ${props.semPreenchimento ? '' : 'pi-panel'} ${props.className ?? ''}`}>
      {props.titulo && (
        <div className="pi-panel-head">
          <div>
            <h2>{props.titulo}</h2>
            {props.descricao && <p>{props.descricao}</p>}
          </div>
          {props.acao}
        </div>
      )}
      {props.children}
    </section>
  );
}

// ---------------------------------------------------------------- indicadores
export interface IMetricProps {
  nome: string;
  valor: string | number;
  explicacao?: React.ReactNode;
  icone?: NomeIcone;
  tom?: 'normal' | 'danger';
  /** Quando o indicador abre outra visão. Valor só informativo fica sem ação. */
  aoClicar?: () => void;
}

export function Metric(props: IMetricProps): React.ReactElement {
  const conteudo = (
    <>
      <span className="pi-metric-top">
        {props.nome}
        {props.icone && <Icon nome={props.icone} tamanho={18} />}
      </span>
      <strong>{props.valor}</strong>
      {props.explicacao && <small>{props.explicacao}</small>}
    </>
  );
  const classe = `pi-card pi-metric ${props.tom === 'danger' ? 'danger' : ''}`;
  return props.aoClicar ? (
    <button type="button" className={classe} onClick={props.aoClicar}>{conteudo}</button>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

/** Grade de 4 colunas (2 em coluna estreita). Não invente números para completar a grade. */
export function MetricGrid(props: { children: React.ReactNode }): React.ReactElement {
  return <div className="pi-metrics">{props.children}</div>;
}

// ---------------------------------------------------------------- hero
export interface IHeroProps {
  sobretitulo?: string;
  titulo: string;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  /** Conteúdo à direita (anel de progresso, número de destaque). Some em coluna estreita. */
  lateral?: React.ReactNode;
  /** Frase curta de marca, discreta no canto superior direito (ex.: lema institucional). */
  lema?: string;
  rotulo: string;
}

/** Destaque do topo da tela inicial. Use quando ajuda o processo; não é obrigatório em toda tela. */
export function Hero(props: IHeroProps): React.ReactElement {
  return (
    <section className="pi-hero" aria-label={props.rotulo}>
      <svg className="pi-hero-deco" viewBox="0 0 1000 240" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-20 200 C 180 120, 320 230, 520 150 S 860 40, 1020 90" fill="none" stroke="#7fd1c7" strokeWidth="2" strokeDasharray="3 10" strokeLinecap="round" />
      </svg>
      <div className="pi-hero-body">
        {props.sobretitulo && <span className="pi-eyebrow">{props.sobretitulo}</span>}
        <h2>{props.titulo}</h2>
        {props.descricao && <p>{props.descricao}</p>}
        {props.acoes && <div className="pi-actions">{props.acoes}</div>}
      </div>
      {props.lateral && <div className="pi-hero-aside">{props.lateral}</div>}
      {props.lema && <p className="pi-hero-lema">{props.lema}</p>}
    </section>
  );
}

/** Anel de progresso para o hero ou cartões. */
export function ProgressRing(props: { percentual: number; tamanho?: number; rotulo?: string }): React.ReactElement {
  const tamanho = props.tamanho ?? 140;
  const raio = tamanho / 2 - 9;
  const circ = 2 * Math.PI * raio;
  const pct = Math.max(0, Math.min(100, props.percentual));
  return (
    <div role="img" aria-label={`${pct}% ${props.rotulo ?? 'concluído'}`} style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden="true">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} fill="none" stroke="#ffffff2b" strokeWidth="9" />
        <circle
          cx={tamanho / 2} cy={tamanho / 2} r={raio} fill="none" stroke="#7fd1c7" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        />
      </svg>
      <strong style={{ position: 'absolute', fontSize: 26, fontWeight: 650 }}>{pct}%</strong>
    </div>
  );
}

// ---------------------------------------------------------------- situação e progresso
export type TomBadge = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

/** Variante pelo significado do estado. A cor nunca substitui o rótulo. */
export function Badge(props: { tom?: TomBadge; children: React.ReactNode }): React.ReactElement {
  return <span className={`pi-badge ${props.tom && props.tom !== 'info' ? props.tom : ''}`}>{props.children}</span>;
}

export function ProgressBar(props: { percentual: number; rotulo: string; mostrarValor?: boolean }): React.ReactElement {
  const pct = Math.max(0, Math.min(100, Math.round(props.percentual)));
  return (
    <div className="pi-progress">
      <span className="pi-bar" role="progressbar" aria-label={props.rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <i style={{ width: `${pct}%` }} />
      </span>
      {props.mostrarValor !== false && <b>{pct}%</b>}
    </div>
  );
}

// ---------------------------------------------------------------- estados
export function Loading(props: { texto?: string }): React.ReactElement {
  return (
    <div className="pi-loading" role="status">
      <span aria-hidden="true" />
      {props.texto ?? 'Carregando informações…'}
    </div>
  );
}

export interface IEmptyProps {
  icone?: NomeIcone;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}

/** Vazio, nenhum resultado de filtro ou primeiro uso: sempre com o próximo passo. */
export function Empty(props: IEmptyProps): React.ReactElement {
  return (
    <div className="pi-empty">
      <Icon nome={props.icone ?? 'arquivo'} tamanho={30} />
      <h3>{props.titulo}</h3>
      {props.descricao && <p>{props.descricao}</p>}
      {props.acao}
    </div>
  );
}

/** Erro não é vazio: diga o que aconteceu e ofereça nova tentativa quando fizer sentido. */
export function ErrorBox(props: { mensagem: string; aoTentarNovamente?: () => void }): React.ReactElement {
  return (
    <div className="pi-error" role="alert">
      <span>{props.mensagem}</span>
      {props.aoTentarNovamente && (
        <button type="button" className="pi-link-btn" onClick={props.aoTentarNovamente}>Tentar novamente</button>
      )}
    </div>
  );
}

/** Rota que o perfil não pode ver. A interface complementa as permissões do SharePoint, não as substitui. */
export function NoAccess(props: { aoVoltar?: () => void }): React.ReactElement {
  return (
    <div className="pi-card">
      <Empty
        icone="cadeado"
        titulo="Acesso insuficiente"
        descricao="Esta tela é de outro perfil. A web part reflete as permissões do seu usuário no SharePoint."
        acao={props.aoVoltar && <button type="button" className="pi-btn" onClick={props.aoVoltar}>Ir para o início</button>}
      />
    </div>
  );
}

// ---------------------------------------------------------------- campo de formulário
export interface IFieldProps {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  dica?: string;
  erro?: string;
  inteiro?: boolean;
  /** Recebe os atributos de acessibilidade para aplicar no controle. */
  children: (aria: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string; required?: boolean }) => React.ReactNode;
}

export function Field(props: IFieldProps): React.ReactElement {
  const idAjuda = props.erro || props.dica ? `${props.id}-ajuda` : undefined;
  return (
    <div className={`pi-field ${props.erro ? 'invalid' : ''} ${props.inteiro ? 'full' : ''}`}>
      <label htmlFor={props.id}>{props.rotulo}{props.obrigatorio && ' *'}</label>
      {props.children({ id: props.id, 'aria-invalid': props.erro ? true : undefined, 'aria-describedby': idAjuda, required: props.obrigatorio })}
      {props.erro ? (
        <span className="pi-field-error" id={idAjuda}>{props.erro}</span>
      ) : props.dica ? (
        <span className="pi-hint" id={idAjuda}>{props.dica}</span>
      ) : null}
    </div>
  );
}
