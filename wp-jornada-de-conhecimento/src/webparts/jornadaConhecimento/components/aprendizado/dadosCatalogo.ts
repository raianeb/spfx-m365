// Skills aplicadas: spfx-implementacao-base (montagem pura do catálogo), sharepoint-dados-listas (uma carga por área).
import { IResumoAvaliacoes, atrasada, dataLimite, percentualConcluido, publicoInclui } from '../../../../jornada/progresso';
import { ICatalogoArea } from '../../../../services/JornadaService';
import { IAreaComPapel, IPerfil } from '../../../../services/PerfilService';
import { IJornadaVisivel } from '../tipos';

export const chaveNota = (areaId: number, jornadaId: number): string => `${areaId}-${jornadaId}`;

/** Atrasadas primeiro, depois obrigatórias pendentes, depois as mais recentes. */
export const ordenarPorPrioridade = (itens: IJornadaVisivel[]): IJornadaVisivel[] =>
  itens.slice().sort(
    (a: IJornadaVisivel, b: IJornadaVisivel) =>
      Number(b.atrasada) - Number(a.atrasada) ||
      Number(b.jornada.obrigatoria && b.matricula?.status !== 'Concluida') - Number(a.jornada.obrigatoria && a.matricula?.status !== 'Concluida') ||
      (b.jornada.dataPublicacao ?? '').localeCompare(a.jornada.dataPublicacao ?? '')
  );

/** Lista visível: público específico vale para Usuários; Gestores e Apoio veem todas as publicadas da área. */
export const montarVisiveis = (
  catalogo: ICatalogoArea[],
  perfil: IPerfil,
  loginUsuario: string,
  notas: Map<string, IResumoAvaliacoes>,
  agora: Date
): IJornadaVisivel[] => {
  const itens: IJornadaVisivel[] = [];
  catalogo.forEach((area: ICatalogoArea) => {
    const papel: IAreaComPapel | undefined = perfil.areas.find((item: IAreaComPapel) => item.area.id === area.area.id);
    const equipe: boolean = !!papel && (papel.papeis.gestor || papel.papeis.apoio);
    area.jornadas
      .filter((jornada) => equipe || publicoInclui(jornada, loginUsuario))
      .forEach((jornada) => {
        const etapas = area.etapas.get(jornada.id) ?? [];
        const matricula = area.matriculas.get(jornada.id);
        itens.push({
          area: area.area,
          jornada,
          etapas,
          matricula,
          percentual: matricula ? (matricula.status === 'Concluida' ? 100 : percentualConcluido(etapas, matricula.progresso)) : 0,
          atrasada: atrasada(jornada, matricula, agora),
          limite: dataLimite(jornada),
          duracaoMin: etapas.reduce((total: number, etapa) => total + (etapa.duracaoMin || 0), 0),
          nota: notas.get(chaveNota(area.area.id, jornada.id))
        });
      });
  });
  return ordenarPorPrioridade(itens);
};




export type Situacao = 'nova' | 'andamento' | 'concluida';

export const situacaoDe = (item: IJornadaVisivel): Situacao =>
  item.matricula?.status === 'Concluida' ? 'concluida' : item.matricula ? 'andamento' : 'nova';

/** Publicada há até 7 dias e ainda não iniciada. */
export const ehNova = (item: IJornadaVisivel, agora: Date): boolean =>
  !item.matricula && !!item.jornada.dataPublicacao && agora.getTime() - new Date(item.jornada.dataPublicacao).getTime() < 7 * 24 * 3600 * 1000;

/** Texto para busca: título, descrição, categoria, área e nomes das etapas. */
export const textoBusca = (item: IJornadaVisivel): string =>
  [item.jornada.titulo, item.jornada.descricao, item.jornada.categoria, item.area.nome, ...item.etapas.map((etapa) => etapa.titulo)]
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export const normalizarBusca = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
