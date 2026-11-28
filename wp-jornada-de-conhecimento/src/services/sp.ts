// Skills aplicadas: spfx-codigo-performance (PnPjs pelo serviço de dados), sharepoint-dados-listas.
// Toda chamada usa a sessão do usuário logado (comportamento SPFx do PnPjs). Sem elevação de privilégio.
import { ISPFXContext, SPFI, SPFx, spfi } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/files';
import '@pnp/sp/folders';
import '@pnp/sp/fields';
import '@pnp/sp/site-groups/web';
import '@pnp/sp/site-users/web';
import '@pnp/sp/security';
import '@pnp/sp/sputilities';
import '@pnp/sp/batching';

/** Instância do PnPjs apontada para o site de dados da web part. */
export const criarSp = (contexto: ISPFXContext, siteUrl: string): SPFI => spfi(siteUrl).using(SPFx(contexto));

interface IErroHttp {
  status?: number;
  message?: string;
}

/** Status HTTP de um erro do PnPjs, quando houver. */
export const statusHttp = (erro: unknown): number | undefined => {
  const comStatus: IErroHttp = erro as IErroHttp;
  return typeof comStatus?.status === 'number' ? comStatus.status : undefined;
};

export const naoEncontrado = (erro: unknown): boolean => statusHttp(erro) === 404;

/** Mensagem curta e segura para a tela: sem corpo de resposta, URL ou token. */
export const mensagemDeErro = (erro: unknown, acao: string): string => {
  const status: number | undefined = statusHttp(erro);
  if (status === 401 || status === 403) {
    return `${acao}: você não tem permissão para esta ação no SharePoint.`;
  }
  if (status === 404) {
    return `${acao}: o recurso não foi encontrado no site.`;
  }
  if (status === 429 || status === 503) {
    return `${acao}: o SharePoint está limitando as requisições. Tente de novo em alguns minutos.`;
  }
  return status ? `${acao}: falha no SharePoint (HTTP ${status}).` : `${acao}: falha inesperada.`;
};
