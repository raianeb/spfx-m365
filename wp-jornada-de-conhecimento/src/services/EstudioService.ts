// Skills aplicadas: sharepoint-dados-listas, spfx-codigo-performance, spfx-implementacao-base. Escopo, seção 5
// ("Publicar com aprovação nativa"): o Apoio envia; o Gestor aprova com o nível Design (Aprovar itens).
import { SPFI } from '@pnp/sp';
import { IItem } from '@pnp/sp/items';
import { IListItemFormUpdateValue } from '@pnp/sp/lists';
import { sanitizarConteudo } from '../comum/richText';
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

/** Biblioteca de documentos do site que o usuário logado consegue ler. */
export interface IBiblioteca {
  titulo: string;
  /** Caminho relativo ao servidor da pasta raiz. */
  raiz: string;
  /** Biblioteca de conteúdos da própria área. */
  daArea: boolean;
}

/** Pasta ou arquivo dentro de uma biblioteca. */
export interface IItemPasta {
  nome: string;
  caminho: string;
  url: string;
  pasta: boolean;
  tamanho?: number;
  modificado?: string;
}

interface IListaBibliotecaInfo {
  Title: string;
  RootFolder?: { ServerRelativeUrl?: string };
}

/** Pasta da biblioteca da área onde ficam capas e imagens dos conteúdos. */
export const PASTA_IMAGENS: string = 'Imagens';

/** Pastas de sistema que não aparecem na navegação. */
const PASTAS_OCULTAS: string[] = ['Forms', '_t', '_w', '_cts'];

/** URL absoluta de um caminho relativo ao servidor, com cada segmento codificado (nomes com #, ?, %). */
export const urlAbsoluta = (origem: string, caminho: string): string =>
  `${origem}${caminho
    .split('/')
    .map((segmento: string) => encodeURIComponent(segmento))
    .join('/')}`;

/** Nome de arquivo seguro para o SharePoint: sem caracteres proibidos, sem ponto no início/fim. */
export const nomeArquivoSeguro = (nome: string): string => {
  const limpo: string = nome
    .replace(/["*:<>?/\\|#%~&{}]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .trim();
  return limpo || 'arquivo';
};

/** Acrescenta um sufixo antes da extensão: aula.mp4 → aula-1712345678.mp4. */
const comSufixo = (nome: string, sufixo: string): string => {
  const ponto: number = nome.lastIndexOf('.');
  return ponto > 0 ? `${nome.slice(0, ponto)}-${sufixo}${nome.slice(ponto)}` : `${nome}-${sufixo}`;
};

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
  // Etapa de conteúdo: o HTML (já sanitizado pelo editor) vai na coluna Url, que é texto multilinha simples.
  // Quiz: o JSON (com as marcas das respostas) também vai na coluna Url.
  Url: etapa.tipo === 'Conteudo' ? sanitizarConteudo(etapa.conteudo ?? '') : etapa.tipo === 'Quiz' ? etapa.conteudo ?? '' : etapa.url.trim(),
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
  /** Bibliotecas de documentos visíveis para o usuário; a da área vem primeiro. */
  public async bibliotecas(area: IArea): Promise<IBiblioteca[]> {
    const nomeDaArea: string = this._jornadas.lista(area, 'Conteudos');
    const listas: IListaBibliotecaInfo[] = await this._sp.web.lists
      .filter('BaseTemplate eq 101 and Hidden eq false')
      .select('Title', 'RootFolder/ServerRelativeUrl')
      .expand('RootFolder')
      .orderBy('Title', true)<IListaBibliotecaInfo[]>();
    return listas
      .filter((lista: IListaBibliotecaInfo) => !!lista.RootFolder?.ServerRelativeUrl)
      .map((lista: IListaBibliotecaInfo) => ({
        titulo: lista.Title,
        raiz: lista.RootFolder?.ServerRelativeUrl ?? '',
        daArea: lista.Title === nomeDaArea
      }))
      .sort((a: IBiblioteca, b: IBiblioteca) => Number(b.daArea) - Number(a.daArea));
  }

  /** Subpastas e arquivos de uma pasta (sem as pastas de sistema), pastas primeiro. */
  public async conteudoDaPasta(caminho: string, origem: string): Promise<IItemPasta[]> {
    const pasta = this._sp.web.getFolderByServerRelativePath(caminho);
    const [pastas, arquivos] = await Promise.all([
      pasta.folders.select('Name', 'ServerRelativeUrl')<{ Name: string; ServerRelativeUrl: string }[]>(),
      pasta.files.select('Name', 'ServerRelativeUrl', 'Length', 'TimeLastModified')<
        { Name: string; ServerRelativeUrl: string; Length?: string | number; TimeLastModified?: string }[]
      >()
    ]);
    const porNome = (a: IItemPasta, b: IItemPasta): number => a.nome.localeCompare(b.nome, 'pt-BR');
    return [
      ...pastas
        .filter((p) => PASTAS_OCULTAS.indexOf(p.Name) === -1)
        .map((p) => ({ nome: p.Name, caminho: p.ServerRelativeUrl, url: urlAbsoluta(origem, p.ServerRelativeUrl), pasta: true }))
        .sort(porNome),
      ...arquivos
        .map((a) => ({
          nome: a.Name,
          caminho: a.ServerRelativeUrl,
          url: urlAbsoluta(origem, a.ServerRelativeUrl),
          pasta: false,
          tamanho: Number(a.Length ?? 0),
          modificado: a.TimeLastModified
        }))
        .sort(porNome)
    ];
  }

  /**
   * Envia um arquivo para a pasta (em partes, para vídeos grandes). Se já existir um arquivo com o mesmo
   * nome, grava com um sufixo em vez de sobrescrever o que está em uso por outras etapas.
   */
  public async enviarArquivo(pasta: string, arquivo: File, origem: string, progresso?: (percentual: number) => void): Promise<IItemPasta> {
    const destino = this._sp.web.getFolderByServerRelativePath(pasta);
    const base: string = nomeArquivoSeguro(arquivo.name);
    const existe: boolean = await this._sp.web
      .getFileByServerRelativePath(`${pasta}/${base}`)
      .select('Exists')<{ Exists?: boolean }>()
      .then((info: { Exists?: boolean }) => info.Exists !== false)
      .catch(() => false);
    const nome: string = existe ? comSufixo(base, String(Date.now())) : base;
    const info: { ServerRelativeUrl: string; Name: string; Length?: string | number } = await destino.files.addChunked(nome, arquivo, {
      Overwrite: false,
      progress: (dados: { offset: number }) => progresso?.(Math.min(100, Math.round((dados.offset / Math.max(arquivo.size, 1)) * 100)))
    });
    this._logger.log('info', 'Estúdio', `Arquivo enviado: ${info.Name}`);
    return { nome: info.Name, caminho: info.ServerRelativeUrl, url: urlAbsoluta(origem, info.ServerRelativeUrl), pasta: false, tamanho: Number(info.Length ?? arquivo.size) };
  }

  /** Pasta de imagens da biblioteca da área (criada na primeira vez). */
  public async pastaDeImagens(area: IArea): Promise<string> {
    const raiz: { ServerRelativeUrl: string } = await this._sp.web.lists
      .getByTitle(this._jornadas.lista(area, 'Conteudos'))
      .rootFolder.select('ServerRelativeUrl')<{ ServerRelativeUrl: string }>();
    const caminho: string = `${raiz.ServerRelativeUrl}/${PASTA_IMAGENS}`;
    const existe: boolean = await this._sp.web
      .getFolderByServerRelativePath(caminho)
      .select('Exists')<{ Exists?: boolean }>()
      .then((info: { Exists?: boolean }) => info.Exists !== false)
      .catch(() => false);
    if (!existe) {
      await this._sp.web.getFolderByServerRelativePath(raiz.ServerRelativeUrl).folders.addUsingPath(PASTA_IMAGENS);
    }
    return caminho;
  }

  /** Envia uma imagem (capa ou conteúdo) para a pasta de imagens da área e devolve a URL absoluta. */
  public async enviarImagem(area: IArea, arquivo: File, origem: string): Promise<string> {
    const pasta: string = await this.pastaDeImagens(area);
    return (await this.enviarArquivo(pasta, arquivo, origem)).url;
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
