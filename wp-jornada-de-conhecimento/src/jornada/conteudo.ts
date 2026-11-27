// Skills aplicadas: spfx-implementacao-base (validação de URL antes de exibir). Módulo puro.
// Endereços vêm de dado editável: só https chega a iframe, vídeo ou link.

const ID_YOUTUBE: RegExp = /^[A-Za-z0-9_-]{11}$/;
const HOSTS_YOUTUBE: string[] = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com', 'youtube-nocookie.com'];
const EXTENSOES_OFFICE: string[] = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

const lerUrl = (valor: string, base?: string): URL | undefined => {
  try {
    return new URL(valor.trim(), base);
  } catch {
    return undefined;
  }
};

/** Endereço https válido, ou vazio. Relativos são resolvidos a partir do site. */
export const urlSegura = (valor: string | undefined, siteUrl: string): string => {
  if (!valor || valor.trim() === '') {
    return '';
  }
  const url: URL | undefined = lerUrl(valor, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`);
  return url && url.protocol === 'https:' ? url.toString() : '';
};

/** Mesmo host do site: vídeos e documentos da biblioteca da área. */
export const mesmoHost = (url: string, siteUrl: string): boolean => {
  const alvo: URL | undefined = lerUrl(url);
  const site: URL | undefined = lerUrl(siteUrl);
  return !!alvo && !!site && alvo.host === site.host;
};

/** ID do vídeo a partir dos formatos usuais (watch, youtu.be, embed, shorts) ou do próprio ID. */
export const idDoYoutube = (valor: string | undefined): string => {
  const texto: string = (valor ?? '').trim();
  if (ID_YOUTUBE.test(texto)) {
    return texto;
  }
  const url: URL | undefined = lerUrl(texto);
  if (!url || url.protocol !== 'https:' || HOSTS_YOUTUBE.indexOf(url.hostname.toLowerCase()) === -1) {
    return '';
  }
  const candidato: string =
    url.hostname.toLowerCase() === 'youtu.be'
      ? url.pathname.split('/')[1] ?? ''
      : url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? '';
  return ID_YOUTUBE.test(candidato) ? candidato : '';
};

/** Player do YouTube sem cookies de rastreamento, com a API de mensagens habilitada para ler a posição. */
export const urlEmbedYoutube = (id: string, inicioSeg: number, origem: string): string => {
  const parametros: string[] = ['enablejsapi=1', 'rel=0', 'modestbranding=1', `origin=${encodeURIComponent(origem)}`];
  if (inicioSeg > 0) {
    parametros.push(`start=${Math.floor(inicioSeg)}`);
  }
  return `https://www.youtube-nocookie.com/embed/${id}?${parametros.join('&')}`;
};

export const ORIGENS_YOUTUBE: string[] = ['https://www.youtube-nocookie.com', 'https://www.youtube.com'];

export type TipoDocumento = 'pdf' | 'office' | 'outro';

export const tipoDocumento = (url: string): TipoDocumento => {
  const caminho: string = (lerUrl(url)?.pathname ?? '').toLowerCase();
  const extensao: string = caminho.slice(caminho.lastIndexOf('.') + 1);
  if (extensao === 'pdf') {
    return 'pdf';
  }
  return EXTENSOES_OFFICE.indexOf(extensao) !== -1 ? 'office' : 'outro';
};

/** Visualização embutida: PDF no visualizador do navegador; Office no visualizador web do SharePoint. */
export const urlEmbedDocumento = (url: string): string => {
  const tipo: TipoDocumento = tipoDocumento(url);
  if (tipo === 'office') {
    const alvo: URL | undefined = lerUrl(url);
    if (!alvo) {
      return '';
    }
    alvo.searchParams.set('web', '1');
    return alvo.toString();
  }
  return tipo === 'pdf' ? url : '';
};

/** Foto do perfil pelo serviço nativo do SharePoint (sem chamada ao Graph). */
export const urlFoto = (siteUrl: string, email: string): string =>
  email ? `${siteUrl.replace(/\/$/, '')}/_layouts/15/userphoto.aspx?size=S&accountname=${encodeURIComponent(email)}` : '';
