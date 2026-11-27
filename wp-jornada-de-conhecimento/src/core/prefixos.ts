/**
 * Prefixos dos nomes físicos das listas. Cada instância da Web Part guarda os próprios valores;
 * o script de provisionamento pergunta os mesmos prefixos na execução.
 * Vazio significa sem prefixo. Este módulo não depende de outros arquivos.
 */

export type AmbienteLista = 'PROD' | 'HML';

export interface IPrefixosListas {
  PROD: string;
  HML: string;
}

interface IPrefixosConfiguraveis {
  prefixoProd?: string;
  prefixoHml?: string;
}

const limpar = (valor: string | undefined): string => (valor ?? '').trim();

/** Lê os prefixos guardados nas propriedades da Web Part. */
export const prefixosDe = (propriedades: IPrefixosConfiguraveis): IPrefixosListas => ({
  PROD: limpar(propriedades.prefixoProd),
  HML: limpar(propriedades.prefixoHml)
});

/** HML só é válido com prefixo próprio, diferente do de PROD (senão as listas colidem). */
export const prefixosValidos = (prefixos: IPrefixosListas): boolean =>
  prefixos.HML !== '' && prefixos.HML !== prefixos.PROD;

/** Cópia de HML é a lista cujo título começa com o prefixo de HML. */
const eCopiaHml = (titulo: string, prefixos: IPrefixosListas): boolean =>
  prefixos.HML !== '' && titulo.indexOf(prefixos.HML) === 0;

/** Nome físico da lista no ambiente. Vazio enquanto não houver lista ou se o HML não estiver configurado. */
export const nomeFisico = (nomeBase: string | undefined, ambiente: AmbienteLista, prefixos: IPrefixosListas): string => {
  const base: string = limpar(nomeBase);
  if (base === '' || eCopiaHml(base, prefixos)) {
    return '';
  }
  if (ambiente === 'HML') {
    return prefixosValidos(prefixos) ? `${prefixos.HML}${base}` : '';
  }
  return `${prefixos.PROD}${base}`;
};

/** Nome base de um título do site. Undefined para cópias de HML e para listas que não seguem o prefixo de PROD. */
const nomeBaseDe = (titulo: string, prefixos: IPrefixosListas): string | undefined => {
  if (eCopiaHml(titulo, prefixos)) {
    return undefined;
  }
  if (prefixos.PROD === '') {
    return titulo;
  }
  return titulo.indexOf(prefixos.PROD) === 0 ? titulo.substring(prefixos.PROD.length) : undefined;
};

/** Converte os títulos do site em nomes base para escolha na Web Part, sem cópias de HML e sem vazios. */
export const nomesBase = (titulos: string[], prefixos: IPrefixosListas): string[] =>
  titulos
    .map((titulo: string) => nomeBaseDe(titulo, prefixos))
    .filter((nome: string | undefined): nome is string => nome !== undefined && nome !== '');
