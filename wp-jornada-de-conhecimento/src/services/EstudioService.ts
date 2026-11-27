// Skills aplicadas: sharepoint-dados-listas, spfx-codigo-performance, spfx-implementacao-base. Escopo, seção 5
// ("Publicar com aprovação nativa"): o Apoio envia; o Gestor aprova com o nível Design (Aprovar itens).
import { SPFI } from '@pnp/sp';
import { IItem } from '@pnp/sp/items';
import { IListItemFormUpdateValue } from '@pnp/sp/lists';
import { DiagnosticsLogger } from '../core/diagnostics';
import { IArea } from '../jornada/modelo';
import { IEtapa } from '../jornada/progresso';
import { IJornadaEstudio, Moderacao, StatusJornada, lerPublicoDetalhado, statusJornadaDe } from '../jornada/estudio';
import { jornadaDe, JornadaService } from './JornadaService';

interface IJornadaEstudioItem {
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
  EmiteCertificado?: boolean;
  ModeloCertificado?: string;
  Status?: string;
  OData__ModerationStatus?: number;
  OData__ModerationComments?: string;
  Modified?: string;
  Author?: { Title?: string };
}

export interface IArquivoBiblioteca {
  nome: string;
  url: string;
}

const CAMPOS: string[] = [
  'Id',
  'Title',
  'Descricao',
  'Capa',
  'Categoria',
  'PublicoEspecifico',
  'Obrigatoria',
  'PrazoDias',
  'OrdemLivre',
  'DataPublicacao',
  'EmiteCertificado',
  'ModeloCertificado',
  'Status',
  'OData__ModerationStatus',
  'OData__ModerationComments',
  'Modified',
  'Author/Title'
];

const paraJornadaItem = (jornada: IJornadaEstudio): Record<string, unknown> => ({
  Title: jornada.titulo.trim(),
  Descricao: jornada.descricao,
  Capa: jornada.capa.trim(),
  Categoria: jornada.categoria.trim(),
  PublicoEspecifico: jornada.publicoDetalhado.length > 0 ? JSON.stringify(jornada.publicoDetalhado) : '',
  Obrigatoria: jornada.obrigatoria,
  PrazoDias: jornada.prazoDias ?? null,
  OrdemLivre: jornada.ordemLivre,
  EmiteCertificado: jornada.emiteCertificado,
  ModeloCertificado: jornada.modeloCertificado.trim()
});

const paraEtapaItem = (etapa: IEtapa, jornadaId: number): Record<string, unknown> => ({
  Title: etapa.titulo.trim(),
  JornadaId: jornadaId,
  Ordem: etapa.ordem,
  Tipo: etapa.tipo,
  Url: etapa.url.trim(),
  DuracaoMin: etapa.duracaoMin,
  Instrucoes: etapa.instrucoes,
  RegraConclusao: etapa.regra,
  PercentualMinimo: etapa.percentualMinimo
});

export class EstudioService {
  constructor(
    private readonly _sp: SPFI,
    private readonly _jornadas: JornadaService,
    private readonly _logger: DiagnosticsLogger
  ) {}

  /** Jornadas da área. O SharePoint mostra rascunhos não aprovados só a quem aprova e ao autor. */
  public async listar(area: IArea): Promise<IJornadaEstudio[]> {
    const itens: IJornadaEstudioItem[] = await this._sp.web.lists
      .getByTitle(this._jornadas.lista(area, 'Jornadas'))
      .items.select(...CAMPOS)
      .expand('Author')
      .orderBy('Modified', false)
      .top(500)<IJornadaEstudioItem[]>();
    return itens.map((item: IJornadaEstudioItem) => ({
      ...jornadaDe(item, area.id),
      status: statusJornadaDe(item.Status),
      moderacao: (item.OData__ModerationStatus ?? Moderacao.Pendente) as Moderacao,
      comentarioModeracao: item.OData__ModerationComments ?? '',
      emiteCertificado: item.EmiteCertificado === true,
      modeloCertificado: item.ModeloCertificado ?? '',
      modificadaEm: item.Modified,
      autor: item.Author?.Title ?? '',
      publicoDetalhado: lerPublicoDetalhado(item.PublicoEspecifico)
    }));
  }

  /**
   * Grava a jornada e as etapas. Etapas removidas vão para a lixeira do site (recuperáveis).
   * Devolve o ID da jornada.
   */
  public async salvar(area: IArea, jornada: IJornadaEstudio, etapas: IEtapa[], removidas: number[], status: StatusJornada): Promise<number> {
    const listaJornadas = this._sp.web.lists.getByTitle(this._jornadas.lista(area, 'Jornadas'));
    const dados: Record<string, unknown> = { ...paraJornadaItem(jornada), Status: status };
    let id: number = jornada.id;
    if (id > 0) {
      await listaJornadas.items.getById(id).update(dados);
    } else {
      id = (await listaJornadas.items.add(dados)).Id;
    }

    const listaEtapas = this._sp.web.lists.getByTitle(this._jornadas.lista(area, 'Etapas'));
    for (const etapa of etapas) {
      if (etapa.id > 0) {
        await listaEtapas.items.getById(etapa.id).update(paraEtapaItem(etapa, id));
      } else {
        await listaEtapas.items.add(paraEtapaItem(etapa, id));
      }
    }
    for (const etapaId of removidas) {
      await listaEtapas.items.getById(etapaId).recycle();
    }
    this._logger.log('info', `Estúdio ${area.sigla}`, `Jornada ${id} salva (${status}), ${etapas.length} etapa(s)`);
    return id;
  }

  /** Publica: Status Publicada, data de publicação na primeira vez (base do prazo) e aprovação nativa. */
  public async publicar(area: IArea, jornada: IJornadaEstudio): Promise<void> {
    const item: IItem = this._item(area, jornada.id);
    await item.update({ Status: 'Publicada', ...(jornada.dataPublicacao ? {} : { DataPublicacao: new Date().toISOString() }) });
    await this._moderar(item, Moderacao.Aprovado, '');
    this._logger.log('info', `Estúdio ${area.sigla}`, `Jornada ${jornada.id} publicada`);
  }

  /** Devolve com comentário: volta a Rascunho e marca como rejeitada na aprovação nativa. */
  public async devolver(area: IArea, jornadaId: number, comentario: string): Promise<void> {
    const item: IItem = this._item(area, jornadaId);
    await item.update({ Status: 'Rascunho' });
    await this._moderar(item, Moderacao.Rejeitado, comentario.trim().slice(0, 1000));
    this._logger.log('info', `Estúdio ${area.sigla}`, `Jornada ${jornadaId} devolvida`);
  }

  /** Arquiva (Gestor): sai da tela dos Usuários; dados e histórico ficam. */
  public async arquivar(area: IArea, jornadaId: number): Promise<void> {
    const item: IItem = this._item(area, jornadaId);
    await item.update({ Status: 'Arquivada' });
    await this._moderar(item, Moderacao.Aprovado, '');
  }

  /** Curtidas por etapa de uma jornada (todas as páginas). */
  public async curtidasPorEtapa(area: IArea, jornadaId: number): Promise<Map<number, number>> {
    const contagem: Map<number, number> = new Map<number, number>();
    const consulta = this._sp.web.lists
      .getByTitle(this._jornadas.lista(area, 'Curtidas'))
      .items.select('EtapaId')
      .filter(`JornadaId eq ${jornadaId}`)
      .top(5000);
    for await (const pagina of consulta) {
      (pagina as { EtapaId?: number }[]).forEach((item: { EtapaId?: number }) => {
        if (item.EtapaId) {
          contagem.set(item.EtapaId, (contagem.get(item.EtapaId) ?? 0) + 1);
        }
      });
    }
    return contagem;
  }

  /** Arquivos da biblioteca da área, para escolher o conteúdo de uma etapa. */
  public async arquivosDaBiblioteca(area: IArea, origem: string): Promise<IArquivoBiblioteca[]> {
    const itens: { FileLeafRef?: string; FileRef?: string }[] = await this._sp.web.lists
      .getByTitle(this._jornadas.lista(area, 'Conteudos'))
      .items.select('FileLeafRef', 'FileRef')
      .filter('FSObjType eq 0')
      .orderBy('FileLeafRef', true)
      .top(1000)<{ FileLeafRef?: string; FileRef?: string }[]>();
    return itens
      .filter((item) => item.FileLeafRef && item.FileRef)
      .map((item) => ({ nome: item.FileLeafRef ?? '', url: `${origem}${encodeURI(item.FileRef ?? '')}` }));
  }

  private _item(area: IArea, id: number): IItem {
    return this._sp.web.lists.getByTitle(this._jornadas.lista(area, 'Jornadas')).items.getById(id);
  }

  /** Aprovação nativa pelo formulário do item (exige "Aprovar itens"; o SharePoint recusa para quem não tem). */
  private async _moderar(item: IItem, estado: Moderacao, comentario: string): Promise<void> {
    const valores: IListItemFormUpdateValue[] = [{ FieldName: '_ModerationStatus', FieldValue: String(estado) }];
    if (comentario) {
      valores.push({ FieldName: '_ModerationComments', FieldValue: comentario });
    }
    const resultado: IListItemFormUpdateValue[] = await item.validateUpdateListItem(valores);
    const falha: IListItemFormUpdateValue | undefined = resultado.find((valor: IListItemFormUpdateValue) => valor.HasException);
    if (falha) {
      throw new Error(`O SharePoint recusou a aprovação: ${falha.ErrorMessage ?? 'sem detalhes'}`);
    }
  }
}
