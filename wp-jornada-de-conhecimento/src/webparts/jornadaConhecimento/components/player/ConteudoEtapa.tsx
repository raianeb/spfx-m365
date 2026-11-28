// Skills aplicadas: spfx-padrao-visual-gti (palco do conteúdo), spfx-acessibilidade-conteudo (título em iframes, legenda nativa do player, link alternativo),
// spfx-implementacao-base (PlayerAdapters com interface comum). Endereços validados antes de exibir (conteudo.ts).
import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Icon } from '../gti';
import { IEtapa } from '../../../../jornada/progresso';
import { ORIGENS_YOUTUBE, idDoYoutube, mesmoHost, urlEmbedDocumento, urlEmbedYoutube, urlSegura } from '../../../../jornada/conteudo';
import styles from '../jc.module.scss';

export interface IConteudoEtapaProps {
  etapa: IEtapa;
  siteUrl: string;
  /** Posição salva, em segundos, para retomar o vídeo. */
  inicioSeg: number;
  aoProgresso: (posicaoSeg: number, percentual: number) => void;
  /** Conteúdo aberto (documento exibido ou link acessado). */
  aoAbrir: () => void;
}

/** Intervalo mínimo entre registros de posição vindos do player (a gravação no SharePoint é a cada 15 s). */
const INTERVALO_POSICAO_MS: number = 5000;

const useLimitador = (): ((agir: () => void) => void) => {
  const ultimo = useRef<number>(0);
  return (agir: () => void): void => {
    const agora: number = Date.now();
    if (agora - ultimo.current >= INTERVALO_POSICAO_MS) {
      ultimo.current = agora;
      agir();
    }
  };
};

interface IInfoYoutube {
  currentTime?: number;
  duration?: number;
}

/** YouTube pela API de mensagens do iframe: lê posição e duração sem carregar script externo na página. */
const YouTube: React.FC<IConteudoEtapaProps> = ({ etapa, inicioSeg, aoProgresso }: IConteudoEtapaProps) => {
  const iframe = useRef<HTMLIFrameElement>(null);
  const duracao = useRef<number>(0);
  const limitar = useLimitador();
  const id: string = idDoYoutube(etapa.url);
  const origem: string = window.location.origin;

  useEffect(() => {
    const receber = (evento: MessageEvent): void => {
      if (ORIGENS_YOUTUBE.indexOf(evento.origin) === -1 || evento.source !== iframe.current?.contentWindow || typeof evento.data !== 'string') {
        return;
      }
      let dados: { event?: string; info?: IInfoYoutube };
      try {
        dados = JSON.parse(evento.data);
      } catch {
        return;
      }
      const info: IInfoYoutube | undefined = dados.info;
      if (!info) {
        return;
      }
      if (typeof info.duration === 'number' && info.duration > 0) {
        duracao.current = info.duration;
      }
      if (typeof info.currentTime === 'number' && duracao.current > 0) {
        const posicao: number = info.currentTime;
        limitar(() => aoProgresso(posicao, (posicao / duracao.current) * 100));
      }
    };
    window.addEventListener('message', receber);
    return () => window.removeEventListener('message', receber);
  }, [aoProgresso]);

  const escutar = (): void => {
    // Pede ao player que envie atualizações de estado (infoDelivery) para esta página.
    const alvo: string = ORIGENS_YOUTUBE[0];
    iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: etapa.id, channel: 'widget' }), alvo);
  };

  if (!id) {
    return <p className={styles.avisoConteudo}>O endereço deste vídeo não é um link válido do YouTube.</p>;
  }
  return (
    <div className={styles.video}>
      <iframe
        ref={iframe}
        title={`Vídeo: ${etapa.titulo}`}
        src={urlEmbedYoutube(id, inicioSeg, origem)}
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        onLoad={escutar}
      />
    </div>
  );
};

/** Vídeo da biblioteca da área, no player nativo do navegador. */
const VideoBiblioteca: React.FC<IConteudoEtapaProps> = ({ etapa, siteUrl, inicioSeg, aoProgresso }: IConteudoEtapaProps) => {
  const limitar = useLimitador();
  const url: string = urlSegura(etapa.url, siteUrl);
  if (!url || !mesmoHost(url, siteUrl)) {
    return <p className={styles.avisoConteudo}>O vídeo precisa estar numa biblioteca deste SharePoint.</p>;
  }
  return (
    <div className={styles.video}>
      <video
        controls
        preload="metadata"
        src={url}
        aria-label={`Vídeo: ${etapa.titulo}`}
        onLoadedMetadata={(evento: React.SyntheticEvent<HTMLVideoElement>) => {
          const video: HTMLVideoElement = evento.currentTarget;
          if (inicioSeg > 0 && inicioSeg < video.duration - 5) {
            video.currentTime = inicioSeg;
          }
        }}
        onTimeUpdate={(evento: React.SyntheticEvent<HTMLVideoElement>) => {
          const video: HTMLVideoElement = evento.currentTarget;
          if (video.duration > 0) {
            const posicao: number = video.currentTime;
            limitar(() => aoProgresso(posicao, (posicao / video.duration) * 100));
          }
        }}
        onEnded={(evento: React.SyntheticEvent<HTMLVideoElement>) => aoProgresso(evento.currentTarget.duration, 100)}
      />
    </div>
  );
};

/** Documento: visualização embutida (PDF ou Office deste SharePoint) e link para abrir em nova aba. */
const Documento: React.FC<IConteudoEtapaProps> = ({ etapa, siteUrl, aoAbrir }: IConteudoEtapaProps) => {
  const url: string = urlSegura(etapa.url, siteUrl);
  const embutido: string = url && mesmoHost(url, siteUrl) ? urlEmbedDocumento(url) : '';
  useEffect(() => {
    if (embutido) {
      aoAbrir();
    }
  }, [embutido]);
  if (!url) {
    return <p className={styles.avisoConteudo}>O endereço deste documento não é válido.</p>;
  }
  return (
    <div className={styles.documento}>
      {embutido && <iframe title={`Documento: ${etapa.titulo}`} src={embutido} />}
      <a className="pi-link-btn" href={url} target="_blank" rel="noopener noreferrer" onClick={aoAbrir} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <Icon nome="olho" tamanho={14} /> Abrir o documento em nova aba
      </a>
    </div>
  );
};

/** Link externo: abre em nova aba; a abertura conta para a regra "Abrir conteúdo". */
const Link: React.FC<IConteudoEtapaProps> = ({ etapa, siteUrl, aoAbrir }: IConteudoEtapaProps) => {
  const url: string = urlSegura(etapa.url, siteUrl);
  if (!url) {
    return <p className={styles.avisoConteudo}>O endereço deste link não é válido.</p>;
  }
  return (
    <div className={styles.linkConteudo}>
      <span className={styles.linkIcone}>
        <Icon nome="link" tamanho={26} />
      </span>
      <h4 style={{ margin: 0, color: 'var(--pi-navy)' }}>{etapa.titulo}</h4>
      <p className="pi-hint">Este conteúdo fica em outra página. Ao abrir, a etapa pode ser concluída.</p>
      <a className="pi-btn primary lg" href={url} target="_blank" rel="noopener noreferrer" onClick={aoAbrir}>
        Abrir conteúdo <Icon nome="direita" tamanho={16} />
      </a>
    </div>
  );
};

const ConteudoEtapa: React.FC<IConteudoEtapaProps> = (props: IConteudoEtapaProps) => {
  switch (props.etapa.tipo) {
    case 'YouTube':
      return <YouTube {...props} />;
    case 'Video':
      return <VideoBiblioteca {...props} />;
    case 'Documento':
      return <Documento {...props} />;
    default:
      return <Link {...props} />;
  }
};

export default ConteudoEtapa;
