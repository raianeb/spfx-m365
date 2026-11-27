// Skills aplicadas: sharepoint-dados-listas (filtro por coluna indexada, top, paginação), spfx-codigo-performance
// (cache em sessionStorage para as notas dos cards). Curtidas e avaliações: cada um cria e edita só as próprias.
import { SPFI } from '@pnp/sp';
import { DiagnosticsLogger } from '../core/diagnostics';
import { IArea } from '../jornada/modelo';
import { IEtapa, IResumoAvaliacoes, LIMITE_COMENTARIO, chaveCurtida, chaveMatricula, resumirAvaliacoes } from '../jornada/progresso';
import { JornadaService } from './JornadaService';

/** Área Geral: até ~4.000 pessoas, então uma página de 5.000 cobre curtidas por etapa e avaliações por jornada. */
const LIMITE_PAGINA: number = 5000;
const VALIDADE_CACHE_MS: number = 10 * 60 * 1000;

export interface ICurtidas {
  total: number;
  minhaId?: number;
}

export interface IAvaliacao {
  id: number;
  nota: number;
  comentario: string;
  oculto: boolean;
  autorId: number;
  autorNome: string;
  autorEmail: string;
  data: string;
}

interface IAvaliacaoItem {
  Id: number;
  Title?: string;
  Nota?: number;
  Comentario?: string;
  Oculto?: boolean;
  AuthorId?: number;
  Author?: { Title?: string; EMail?: string };
  Modified?: string;
}

interface ICurtidaItem {
  Id: number;
  Title?: string;
}

const avaliacaoDe = (item: IAvaliacaoItem): IAvaliacao => ({
  id: item.Id,
  nota: item.Nota ?? 0,
  comentario: item.Comentario ?? '',
  oculto: item.Oculto === true,
  autorId: item.AuthorId ?? 0,
  autorNome: item.Author?.Title ?? '',
  autorEmail: item.Author?.EMail ?? '',
  data: item.Modified ?? ''
});

const lerCache = <T>(chave: string): T | undefined => {
  try {
    const bruto: string | null = window.sessionStorage.getItem(chave);
    if (!bruto) {
      return undefined;
    }
    const valor: { em: number; dado: T } = JSON.parse(bruto);
    return Date.now() - valor.em < VALIDADE_CACHE_MS ? valor.dado : undefined;
  } catch {
    return undefined;
  }
};

const gravarCache = <T>(chave: string, dado: T): void => {
  try {
    window.sessionStorage.setItem(chave, JSON.stringify({ em: Date.now(), dado }));
  } catch {
    // Armazenamento cheio ou bloqueado: a tela funciona sem cache.
  }
};

export class EngajamentoService {
  constructor(
    private readonly _sp: SPFI,
    private readonly _jornadas: JornadaService,
    private readonly _logger: DiagnosticsLogger
  ) {}

  // ---------------------------------------------------------------- Curtidas

  public async curtidas(area: IArea, etapaId: number, usuarioId: number): Promise<ICurtidas> {
    const itens: ICurtidaItem[] = await this._sp.web.lists
      .getByTitle(this._jornadas.lista(area, 'Curtidas'))
      .items.select('Id', 'Title')
      .filter(`EtapaId eq ${etapaId}`)
      .top(LIMITE_PAGINA)<ICurtidaItem[]>();
    const chave: string = chaveCurtida(etapaId, usuarioId);
    return { total: itens.length, minhaId: itens.find((item: ICurtidaItem) => item.Title === chave)?.Id };
  }

  public async curtir(area: IArea, etapa: IEtapa, usuarioId: number): Promise<number> {
    const criado: { Id: number } = await this._sp.web.lists.getByTitle(this._jornadas.lista(area, 'Curtidas')).items.add({
      Title: chaveCurtida(etapa.id, usuarioId),
      EtapaId: etapa.id,
      JornadaId: etapa.jornadaId
    });
    return criado.Id;
  }

  /** Descurtir exclui o próprio item. */
  public async descurtir(area: IArea, curtidaId: number): Promise<void> {
    await this._sp.web.lists.getByTitle(this._jornadas.lista(area, 'Curtidas')).items.getById(curtidaId).delete();
  }

  // ---------------------------------------------------------------- Avaliações

  /** Avaliações da jornada. Comentários ocultos pelo gestor só aparecem para o próprio autor. */
  public async avaliacoes(area: IArea, jornadaId: number, usuarioId: number): Promise<{ lista: IAvaliacao[]; resumo: IResumoAvaliacoes; minha?: IAvaliacao }> {
    const itens: IAvaliacaoItem[] = await this._sp.web.lists
      .getByTitle(this._jornadas.lista(area, 'Avaliacoes'))
      .items.select('Id', 'Title', 'Nota', 'Comentario', 'Oculto', 'AuthorId', 'Author/Title', 'Author/EMail', 'Modified')
      .expand('Author')
      .filter(`JornadaId eq ${jornadaId}`)
      .orderBy('Modified', false)
      .top(LIMITE_PAGINA)<IAvaliacaoItem[]>();
    const todas: IAvaliacao[] = itens.map(avaliacaoDe);
    const resumo: IResumoAvaliacoes = resumirAvaliacoes(todas.map((avaliacao: IAvaliacao) => avaliacao.nota));
    gravarCache(this._chaveNota(area, jornadaId), resumo);
    return {
      lista: todas.filter((avaliacao: IAvaliacao) => !avaliacao.oculto || avaliacao.autorId === usuarioId),
      resumo,
      minha: todas.find((avaliacao: IAvaliacao) => avaliacao.autorId === usuarioId)
    };
  }

  /** Cria ou altera a avaliação do usuário (uma por pessoa e jornada). */
  public async salvarAvaliacao(area: IArea, jornadaId: number, usuarioId: number, nota: number, comentario: string, existenteId?: number): Promise<void> {
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      throw new Error('Escolha uma nota de 1 a 5 estrelas.');
    }
    const dados: Record<string, unknown> = { Nota: nota, Comentario: comentario.trim().slice(0, LIMITE_COMENTARIO) };
    const lista = this._sp.web.lists.getByTitle(this._jornadas.lista(area, 'Avaliacoes'));
    if (existenteId) {
      await lista.items.getById(existenteId).update(dados);
    } else {
      await lista.items.add({ Title: chaveMatricula(jornadaId, usuarioId), JornadaId: jornadaId, ...dados });
    }
    this._limparCache(area, jornadaId);
    this._logger.log('info', 'Avaliação', `Salva na jornada ${jornadaId}`);
  }

  public async excluirAvaliacao(area: IArea, jornadaId: number, avaliacaoId: number): Promise<void> {
    await this._sp.web.lists.getByTitle(this._jornadas.lista(area, 'Avaliacoes')).items.getById(avaliacaoId).delete();
    this._limparCache(area, jornadaId);
  }

  /** Nota média dos cards: cache de 10 minutos; o que falta é lido em lote, só a coluna Nota. */
  public async resumosDosCards(area: IArea, jornadaIds: number[]): Promise<Map<number, IResumoAvaliacoes>> {
    const resumos: Map<number, IResumoAvaliacoes> = new Map<number, IResumoAvaliacoes>();
    const faltam: number[] = [];
    jornadaIds.forEach((id: number) => {
      const cache: IResumoAvaliacoes | undefined = lerCache<IResumoAvaliacoes>(this._chaveNota(area, id));
      if (cache) {
        resumos.set(id, cache);
      } else {
        faltam.push(id);
      }
    });
    if (faltam.length === 0) {
      return resumos;
    }
    const [lote, executar] = this._sp.batched();
    faltam.forEach((id: number) => {
      lote.web.lists
        .getByTitle(this._jornadas.lista(area, 'Avaliacoes'))
        .items.select('Nota')
        .filter(`JornadaId eq ${id}`)
        .top(LIMITE_PAGINA)<{ Nota?: number }[]>()
        .then((itens: { Nota?: number }[]) => {
          const resumo: IResumoAvaliacoes = resumirAvaliacoes(itens.map((item: { Nota?: number }) => item.Nota ?? 0));
          resumos.set(id, resumo);
          gravarCache(this._chaveNota(area, id), resumo);
        })
        .catch(() => undefined);
    });
    await executar();
    return resumos;
  }

  private _chaveNota(area: IArea, jornadaId: number): string {
    return `jc:nota:${this._jornadas.lista(area, 'Avaliacoes')}:${jornadaId}`;
  }

  private _limparCache(area: IArea, jornadaId: number): void {
    try {
      window.sessionStorage.removeItem(this._chaveNota(area, jornadaId));
    } catch {
      // Sem armazenamento: nada a limpar.
    }
  }
}
