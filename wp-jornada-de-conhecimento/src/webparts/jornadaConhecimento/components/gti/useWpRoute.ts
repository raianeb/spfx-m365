// Modelo: rotas internas da web part (skill spfx-padrao-visual-gti).
// A troca de telas acontece dentro da WP. Com sincronizarHash, a rota vai para o endereço
// (#<prefixo>/<rota>), o que permite link direto e o botão Voltar do navegador.
// O prefixo isola a instância: duas WPs na mesma página não disputam o mesmo hash.
import * as React from 'react';

export interface IRotaAtual {
  /** Rota completa, por exemplo "jornada/12". */
  rota: string;
  /** Primeiro segmento, por exemplo "jornada". */
  tela: string;
  /** Demais segmentos, por exemplo ["12"]. */
  parametros: string[];
}

export interface IOpcoesRota {
  rotaInicial: string;
  /** Prefixo curto e único por WP, por exemplo "jc". */
  prefixo: string;
  /** Liga link direto e histórico. Desligue quando houver mais de uma instância da mesma WP na página. */
  sincronizarHash: boolean;
}

export interface IRoteador extends IRotaAtual {
  navegar: (rota: string) => void;
  /** Use em <a href>. Links navegam; botões executam ações. */
  hrefDe: (rota: string) => string;
  /** Use em onClick dos links quando a rota não estiver no hash. */
  aoClicarLink: (rota: string) => (evento: React.MouseEvent) => void;
}

function decompor(rota: string): IRotaAtual {
  const partes = rota.split('/').filter((p) => p !== '');
  return { rota: partes.join('/'), tela: partes[0] ?? '', parametros: partes.slice(1) };
}

function lerHash(prefixo: string): string | undefined {
  const marca = `#${prefixo}/`;
  const hash = window.location.hash;
  return hash.indexOf(marca) === 0 ? decodeURIComponent(hash.slice(marca.length)) : undefined;
}

export function useWpRoute(opcoes: IOpcoesRota): IRoteador {
  const { rotaInicial, prefixo, sincronizarHash } = opcoes;
  const [rota, setRota] = React.useState<string>(() => (sincronizarHash && lerHash(prefixo)) || rotaInicial);

  React.useEffect(() => {
    if (!sincronizarHash) return undefined;
    const aoMudar = (): void => {
      const doHash = lerHash(prefixo);
      if (doHash !== undefined) setRota(doHash);
    };
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, [prefixo, sincronizarHash]);

  const navegar = React.useCallback((nova: string): void => {
    if (sincronizarHash) {
      window.location.hash = `${prefixo}/${encodeURIComponent(nova).replace(/%2F/g, '/')}`;
    } else {
      setRota(nova);
    }
  }, [prefixo, sincronizarHash]);

  const hrefDe = React.useCallback((alvo: string): string => (sincronizarHash ? `#${prefixo}/${alvo}` : '#'), [prefixo, sincronizarHash]);

  const aoClicarLink = React.useCallback((alvo: string) => (evento: React.MouseEvent): void => {
    if (evento.ctrlKey || evento.metaKey || evento.shiftKey) return; // abre em nova aba normalmente
    evento.preventDefault();
    navegar(alvo);
  }, [navegar]);

  return { ...decompor(rota), navegar, hrefDe, aoClicarLink };
}
