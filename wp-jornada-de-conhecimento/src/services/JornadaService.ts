// Skills aplicadas: sharepoint-dados-listas (select explícito, filtro por coluna indexada, top), spfx-codigo-performance
// (uma requisição em lote por carga). Leitura com a sessão do usuário: o SharePoint só devolve o que ele pode ver
// (jornadas aprovadas para quem não aprova; matrículas só as próprias).
import { SPFI } from '@pnp/sp';
import { AmbienteLista, IPrefixosListas } from '../core/prefixos';
import { DiagnosticsLogger } from '../core/diagnostics';
import { BaseListaArea } from '../jornada/catalogoArea';
import { IArea } from '../jornada/modelo';
import { nomeListaDaArea } from '../jornada/nomes';
import {
  IEtapa,
  IJornada,
  IMatricula,
  StatusMatricula,
  lerProgresso,
  lerPublico,
  regraDe,
  tipoEtapaDe
} from '../jornada/progresso';

interface IJornadaItem {
  Id: number;
  Title?: string;
  Descricao?: string;
  Capa?: string;
  Categoria?: string;
  PublicoEspecifico?: string;
  Obrigatoria?: boolean;
  PrazoDias?: number;
  OrdemLivre?: boolean;
  DataPublicacao?: string;
}

interface IEtapaItem {
  Id: number;
  Title?: string;
  JornadaId?: number;
  Ordem?: number;
  Tipo?: string;
  Url?: string;
  DuracaoMin?: number;
  Instrucoes?: string;
  RegraConclusao?: string;
  PercentualMinimo?: number;
  Created?: string;
}

export interface IMatriculaItem {
  Id: number;
  Title?: string;
  JornadaId?: number;
  EtapaAtualId?: number;
  ProgressoEtapas?: string;
  PercentualConcluido?: number;
  Status?: string;
  DataInicio?: string;
  UltimoAcesso?: string;
  ConcluidaEm?: string;
}

const CAMPOS_JORNADA: string[] = [
  'Id',
  'Title',
  'Descricao',
  'Capa',
  'Categoria',
  'PublicoEspecifico',
  'Obrigatoria',
  'PrazoDias',
  'OrdemLivre',
  'DataPublicacao'
];
const CAMPOS_ETAPA_RESUMO: string[] = ['Id', 'Title', 'JornadaId', 'Ordem', 'Tipo', 'DuracaoMin', 'RegraConclusao', 'PercentualMinimo', 'Created'];
const CAMPOS_ETAPA: string[] = [...CAMPOS_ETAPA_RESUMO, 'Url', 'Instrucoes'];
export const CAMPOS_MATRICULA: string[] = [
  'Id',
  'Title',
  'JornadaId',
  'EtapaAtualId',
  'ProgressoEtapas',
  'PercentualConcluido',
  'Status',
  'DataInicio',
  'UltimoAcesso',
  'ConcluidaEm'
];

/** Por área: até ~30 jornadas; etapas e matrículas do usuário ficam bem abaixo do limite de 5.000 itens. */
const LIMITE_JORNADAS: number = 200;
const LIMITE_ETAPAS: number = 5000;
const LIMITE_MATRICULAS: number = 500;

export interface ICatalogoArea {
  area: IArea;
  jornadas: IJornada[];
  /** Etapas sem URL e instruções (resumo para os cards), por jornada. */
  etapas: Map<number, IEtapa[]>;
  /** Matrículas do usuário logado, por jornada. */
  matriculas: Map<number, IMatricula>;
  /** Falha ao ler esta área (as demais continuam). */
  erro?: string;
}

export const jornadaDe = (item: IJornadaItem, areaId: number): IJornada => ({
  id: item.Id,
  areaId,
  titulo: item.Title ?? '',
  descricao: item.Descricao ?? '',
  capa: item.Capa ?? '',
  categoria: item.Categoria ?? '',
  publico: lerPublico(item.PublicoEspecifico),
  obrigatoria: item.Obrigatoria === true,
  prazoDias: typeof item.PrazoDias === 'number' ? item.PrazoDias : undefined,
  ordemLivre: item.OrdemLivre === true,
  dataPublicacao: item.DataPublicacao
});

export const etapaDe = (item: IEtapaItem): IEtapa => ({
  id: item.Id,
  jornadaId: item.JornadaId ?? 0,
  titulo: item.Title ?? '',
  ordem: item.Ordem ?? 0,
  tipo: tipoEtapaDe(item.Tipo),
  url: item.Url ?? '',
  duracaoMin: item.DuracaoMin ?? 0,
  instrucoes: item.Instrucoes ?? '',
  regra: regraDe(item.RegraConclusao),
  percentualMinimo: item.PercentualMinimo ?? 0,
  criadaEm: item.Created
});

export const matriculaDe = (item: IMatriculaItem): IMatricula => ({
  id: item.Id,
  chave: item.Title ?? '',
  jornadaId: item.JornadaId ?? 0,
  etapaAtualId: item.EtapaAtualId,
  progresso: lerProgresso(item.ProgressoEtapas),
  percentual: item.PercentualConcluido ?? 0,
  status: (item.Status === 'Concluida' ? 'Concluida' : 'EmAndamento') as StatusMatricula,
  dataInicio: item.DataInicio,
  ultimoAcesso: item.UltimoAcesso,
  concluidaEm: item.ConcluidaEm
});

const agruparPorJornada = <T extends { jornadaId: number }>(itens: T[]): Map<number, T[]> => {
  const mapa: Map<number, T[]> = new Map<number, T[]>();
  itens.forEach((item: T) => {
    const lista: T[] = mapa.get(item.jornadaId) ?? [];
    lista.push(item);
    mapa.set(item.jornadaId, lista);
  });
  return mapa;
};

export class JornadaService {
  constructor(
    private readonly _sp: SPFI,
    private readonly _ambiente: AmbienteLista,
    private readonly _prefixos: IPrefixosListas,
    private readonly _logger: DiagnosticsLogger
  ) {}

  public lista(area: IArea, base: BaseListaArea): string {
    return nomeListaDaArea(area.sigla, base, this._ambiente, this._prefixos);
  }

  /** Jornadas publicadas, resumo das etapas e matrículas do usuário de todas as áreas, numa requisição em lote. */
  public async carregarCatalogo(areas: IArea[], usuarioId: number): Promise<ICatalogoArea[]> {
    const inicio: number = performance.now();
    const [lote, executar] = this._sp.batched();
    const resultados: ICatalogoArea[] = areas.map((area: IArea) => ({
      area,
      jornadas: [],
      etapas: new Map<number, IEtapa[]>(),
      matriculas: new Map<number, IMatricula>()
    }));
    const falhou = (resultado: ICatalogoArea, lista: string): (() => void) => (): void => {
      resultado.erro = `Não foi possível ler ${lista}.`;
    };

    resultados.forEach((resultado: ICatalogoArea) => {
      const { area } = resultado;
      const jornadas: string = this.lista(area, 'Jornadas');
      const etapas: string = this.lista(area, 'Etapas');
      const matriculas: string = this.lista(area, 'Matriculas');
      lote.web.lists
        .getByTitle(jornadas)
        .items.select(...CAMPOS_JORNADA)
        .filter("Status eq 'Publicada'")
        .orderBy('DataPublicacao', false)
        .top(LIMITE_JORNADAS)<IJornadaItem[]>()
        .then((itens: IJornadaItem[]) => {
          resultado.jornadas = itens.map((item: IJornadaItem) => jornadaDe(item, area.id));
        })
        .catch(falhou(resultado, jornadas));
      lote.web.lists
        .getByTitle(etapas)
        .items.select(...CAMPOS_ETAPA_RESUMO)
        .top(LIMITE_ETAPAS)<IEtapaItem[]>()
        .then((itens: IEtapaItem[]) => {
          resultado.etapas = agruparPorJornada(itens.map(etapaDe));
        })
        .catch(falhou(resultado, etapas));
      lote.web.lists
        .getByTitle(matriculas)
        .items.select(...CAMPOS_MATRICULA)
        .filter(`AuthorId eq ${usuarioId}`)
        .top(LIMITE_MATRICULAS)<IMatriculaItem[]>()
        .then((itens: IMatriculaItem[]) => {
          itens.map(matriculaDe).forEach((matricula: IMatricula) => resultado.matriculas.set(matricula.jornadaId, matricula));
        })
        .catch(falhou(resultado, matriculas));
    });

    await executar();
    const total: number = resultados.reduce((soma: number, item: ICatalogoArea) => soma + item.jornadas.length, 0);
    this._logger.log('info', 'Catálogo', `${areas.length} área(s), ${total} jornada(s) publicada(s)`, performance.now() - inicio);
    resultados
      .filter((resultado: ICatalogoArea) => resultado.erro)
      .forEach((resultado: ICatalogoArea) => this._logger.log('warn', `Área ${resultado.area.sigla}`, resultado.erro ?? ''));
    return resultados;
  }

  /** Etapas completas (com URL e instruções) de uma jornada, para o player. */
  public async etapasDaJornada(area: IArea, jornadaId: number): Promise<IEtapa[]> {
    const itens: IEtapaItem[] = await this._sp.web.lists
      .getByTitle(this.lista(area, 'Etapas'))
      .items.select(...CAMPOS_ETAPA)
      .filter(`JornadaId eq ${jornadaId}`)
      .top(500)<IEtapaItem[]>();
    return itens.map(etapaDe);
  }
}
