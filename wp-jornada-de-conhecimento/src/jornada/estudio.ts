// Skills aplicadas: spfx-implementacao-base (regras puras e testáveis), spfx-design-base (validação com mensagem
// por campo). Escopo, seções 3 (Estúdio) e 5 (aprovação nativa). Módulo puro.
import { IEtapa, IJornada, RegraConclusao, TipoEtapa } from './progresso';
import { idDoYoutube, mesmoHost, urlSegura } from './conteudo';

/** Status próprio da jornada. A visibilidade para os Usuários vem da Aprovação de Conteúdo nativa. */
export type StatusJornada = 'Rascunho' | 'EmAprovacao' | 'Publicada' | 'Arquivada';
export const STATUS_JORNADA: StatusJornada[] = ['Rascunho', 'EmAprovacao', 'Publicada', 'Arquivada'];

/** SP.ModerationStatusType. */
export enum Moderacao {
  Aprovado = 0,
  Rejeitado = 1,
  Pendente = 2,
  Rascunho = 3,
  Agendado = 4
}

export type SituacaoPublicacao = 'rascunho' | 'emAprovacao' | 'devolvida' | 'publicada' | 'alteracoesPendentes' | 'arquivada';

export const ROTULO_SITUACAO: Record<SituacaoPublicacao, string> = {
  rascunho: 'Rascunho',
  emAprovacao: 'Aguardando aprovação',
  devolvida: 'Devolvida',
  publicada: 'Publicada',
  alteracoesPendentes: 'Publicada, com alterações aguardando aprovação',
  arquivada: 'Arquivada'
};

export const statusJornadaDe = (valor: string | undefined): StatusJornada =>
  STATUS_JORNADA.indexOf(valor as StatusJornada) !== -1 ? (valor as StatusJornada) : 'Rascunho';

/** Situação exibida no Estúdio, combinando o Status da jornada com o estado de aprovação do item. */
export const situacaoPublicacao = (status: StatusJornada, moderacao: Moderacao, jaPublicada: boolean): SituacaoPublicacao => {
  if (status === 'Arquivada') {
    return 'arquivada';
  }
  if (moderacao === Moderacao.Rejeitado) {
    return 'devolvida';
  }
  if (status === 'EmAprovacao') {
    return jaPublicada ? 'alteracoesPendentes' : 'emAprovacao';
  }
  if (status === 'Publicada') {
    return moderacao === Moderacao.Aprovado ? 'publicada' : 'alteracoesPendentes';
  }
  return 'rascunho';
};

export interface IPessoaPublico {
  loginName: string;
  nome: string;
}

/** Público específico com nomes, para o editor (aceita também a lista simples de logins). */
export const lerPublicoDetalhado = (json: string | undefined): IPessoaPublico[] => {
  if (!json) {
    return [];
  }
  try {
    const bruto: unknown = JSON.parse(json);
    if (!Array.isArray(bruto)) {
      return [];
    }
    return bruto
      .map((item: unknown): IPessoaPublico | undefined => {
        if (typeof item === 'string') {
          return { loginName: item, nome: item };
        }
        const objeto: { loginName?: unknown; nome?: unknown } = item as { loginName?: unknown; nome?: unknown };
        return typeof objeto?.loginName === 'string'
          ? { loginName: objeto.loginName, nome: typeof objeto.nome === 'string' ? objeto.nome : objeto.loginName }
          : undefined;
      })
      .filter((item: IPessoaPublico | undefined): item is IPessoaPublico => !!item);
  } catch {
    return [];
  }
};

export interface IJornadaEstudio extends IJornada {
  status: StatusJornada;
  moderacao: Moderacao;
  comentarioModeracao: string;
  emiteCertificado: boolean;
  modeloCertificado: string;
  modificadaEm?: string;
  autor: string;
  publicoDetalhado: IPessoaPublico[];
}

/** Erros por campo; vazio = válido. */
export type ErrosFormulario = Record<string, string>;

export const validarJornada = (jornada: Pick<IJornadaEstudio, 'titulo' | 'capa' | 'prazoDias'>, siteUrl: string): ErrosFormulario => {
  const erros: ErrosFormulario = {};
  if (jornada.titulo.trim() === '') {
    erros.titulo = 'Informe o nome da jornada.';
  } else if (jornada.titulo.length > 255) {
    erros.titulo = 'Use no máximo 255 caracteres.';
  }
  if (jornada.capa.trim() !== '' && urlSegura(jornada.capa, siteUrl) === '') {
    erros.capa = 'Use um endereço https.';
  }
  if (jornada.prazoDias !== undefined && (!Number.isInteger(jornada.prazoDias) || jornada.prazoDias < 1 || jornada.prazoDias > 3650)) {
    erros.prazoDias = 'Informe um número de dias entre 1 e 3650, ou deixe vazio para sem prazo.';
  }
  return erros;
};

export const validarEtapa = (etapa: Pick<IEtapa, 'titulo' | 'tipo' | 'url' | 'duracaoMin' | 'regra' | 'percentualMinimo'>, siteUrl: string): ErrosFormulario => {
  const erros: ErrosFormulario = {};
  if (etapa.titulo.trim() === '') {
    erros.titulo = 'Informe o nome da etapa.';
  }
  const url: string = urlSegura(etapa.url, siteUrl);
  if (etapa.url.trim() === '') {
    erros.url = 'Informe o endereço do conteúdo.';
  } else if (etapa.tipo === 'YouTube' && idDoYoutube(etapa.url) === '') {
    erros.url = 'Cole um link do YouTube (youtube.com ou youtu.be).';
  } else if (!url) {
    erros.url = 'Use um endereço https.';
  } else if (etapa.tipo === 'Video' && !mesmoHost(url, siteUrl)) {
    erros.url = 'O vídeo precisa estar numa biblioteca deste SharePoint.';
  }
  if (!Number.isFinite(etapa.duracaoMin) || etapa.duracaoMin < 0 || etapa.duracaoMin > 1440) {
    erros.duracaoMin = 'Informe a duração em minutos (0 a 1440).';
  }
  if (etapa.regra === 'PercentualAssistido') {
    if (etapa.tipo !== 'YouTube' && etapa.tipo !== 'Video') {
      erros.regra = 'Percentual assistido só vale para vídeos.';
    } else if (!Number.isInteger(etapa.percentualMinimo) || etapa.percentualMinimo < 1 || etapa.percentualMinimo > 100) {
      erros.percentualMinimo = 'Informe um percentual entre 1 e 100.';
    }
  }
  return erros;
};

/** Regra sugerida para o tipo: vídeo pede percentual assistido; documento e link, abrir o conteúdo. */
export const regraPadrao = (tipo: TipoEtapa): RegraConclusao => (tipo === 'YouTube' || tipo === 'Video' ? 'PercentualAssistido' : 'AbrirConteudo');

/** Renumera a Ordem de 10 em 10 (deixa espaço para inserções). */
export const renumerar = <T extends { ordem: number }>(etapas: T[]): T[] =>
  etapas.map((etapa: T, indice: number) => ({ ...etapa, ordem: (indice + 1) * 10 }));

/** Move a etapa uma posição e renumera a Ordem. */
export const moverEtapa = <T extends { ordem: number }>(etapas: T[], indice: number, direcao: -1 | 1): T[] => {
  const destino: number = indice + direcao;
  if (indice < 0 || indice >= etapas.length || destino < 0 || destino >= etapas.length) {
    return etapas;
  }
  const copia: T[] = etapas.slice();
  const [item] = copia.splice(indice, 1);
  copia.splice(destino, 0, item);
  return renumerar(copia);
};

/** Extensões aceitas ao escolher um arquivo da biblioteca da área, por tipo de etapa. */
export const EXTENSOES_POR_TIPO: Partial<Record<TipoEtapa, string[]>> = {
  Video: ['mp4', 'webm', 'm4v', 'mov'],
  Documento: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
};

export const arquivoCombina = (nome: string, tipo: TipoEtapa): boolean => {
  const extensoes: string[] | undefined = EXTENSOES_POR_TIPO[tipo];
  const extensao: string = nome.slice(nome.lastIndexOf('.') + 1).toLowerCase();
  return !!extensoes && extensoes.indexOf(extensao) !== -1;
};
