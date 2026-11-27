// Skills aplicadas: sharepoint-dados-listas, sharepoint-provisionamento (formato do definicao.json).
// Cópia de definicao.json → listasPorArea. O teste catalogoArea.test.ts garante que as duas fontes não divergem.

export type TipoCampo = 'Text' | 'Note' | 'Number' | 'DateTime' | 'Boolean' | 'User';

export interface ICampoCatalogo {
  nome: string;
  rotulo: string;
  tipo: TipoCampo;
  nativo?: boolean;
  indexado?: boolean;
  linhas?: number;
  formatacao?: boolean;
}

export interface IConfiguracaoLista {
  aprovacaoConteudo?: boolean;
  rascunhoVisivel?: 'aprovadoresEAutor';
  leitura?: 'todos' | 'proprios';
  edicao?: 'todos' | 'proprios';
}

export interface IListaCatalogo {
  base: BaseListaArea;
  modelo: 100 | 101;
  versionamento: boolean;
  configuracao?: IConfiguracaoLista;
  campos: ICampoCatalogo[];
}

export type BaseListaArea = 'Jornadas' | 'Etapas' | 'Matriculas' | 'Curtidas' | 'Avaliacoes' | 'Conteudos';

const titulo = (rotulo: string, indexado?: boolean): ICampoCatalogo => ({
  nome: 'Title',
  rotulo,
  tipo: 'Text',
  nativo: true,
  ...(indexado ? { indexado: true } : {})
});
const autor: ICampoCatalogo = { nome: 'Author', rotulo: 'Usuário', tipo: 'User', nativo: true, indexado: true };

export const CATALOGO_AREA: IListaCatalogo[] = [
  {
    base: 'Jornadas',
    modelo: 100,
    versionamento: true,
    configuracao: { aprovacaoConteudo: true, rascunhoVisivel: 'aprovadoresEAutor' },
    campos: [
      titulo('Nome da jornada'),
      { nome: 'Descricao', rotulo: 'Descrição', tipo: 'Note', linhas: 6 },
      { nome: 'Capa', rotulo: 'Capa (URL da imagem)', tipo: 'Note', linhas: 2 },
      { nome: 'Categoria', rotulo: 'Categoria', tipo: 'Text', indexado: true },
      { nome: 'PublicoEspecifico', rotulo: 'Público específico (JSON)', tipo: 'Note', linhas: 6 },
      { nome: 'Obrigatoria', rotulo: 'Obrigatória', tipo: 'Boolean' },
      { nome: 'PrazoDias', rotulo: 'Prazo (dias)', tipo: 'Number' },
      { nome: 'OrdemLivre', rotulo: 'Ordem livre', tipo: 'Boolean' },
      { nome: 'EmiteCertificado', rotulo: 'Emite certificado', tipo: 'Boolean' },
      { nome: 'ModeloCertificado', rotulo: 'Modelo de certificado', tipo: 'Text' },
      { nome: 'Status', rotulo: 'Status', tipo: 'Text', indexado: true },
      { nome: 'DataPublicacao', rotulo: 'Data de publicação', tipo: 'DateTime', indexado: true }
    ]
  },
  {
    base: 'Etapas',
    modelo: 100,
    versionamento: true,
    campos: [
      titulo('Nome da etapa'),
      { nome: 'JornadaId', rotulo: 'ID da jornada', tipo: 'Number', indexado: true },
      { nome: 'Ordem', rotulo: 'Ordem', tipo: 'Number' },
      { nome: 'Tipo', rotulo: 'Tipo', tipo: 'Text' },
      { nome: 'Url', rotulo: 'URL do conteúdo', tipo: 'Note', linhas: 2 },
      { nome: 'DuracaoMin', rotulo: 'Duração (min)', tipo: 'Number' },
      { nome: 'Instrucoes', rotulo: 'Instruções', tipo: 'Note', linhas: 6, formatacao: true },
      { nome: 'RegraConclusao', rotulo: 'Regra de conclusão', tipo: 'Text' },
      { nome: 'PercentualMinimo', rotulo: 'Percentual mínimo', tipo: 'Number' }
    ]
  },
  {
    base: 'Matriculas',
    modelo: 100,
    versionamento: true,
    configuracao: { leitura: 'proprios', edicao: 'proprios' },
    campos: [
      titulo('Chave (jornada-usuário)', true),
      autor,
      { nome: 'JornadaId', rotulo: 'ID da jornada', tipo: 'Number', indexado: true },
      { nome: 'EtapaAtualId', rotulo: 'ID da etapa atual', tipo: 'Number' },
      { nome: 'ProgressoEtapas', rotulo: 'Progresso por etapa (JSON)', tipo: 'Note', linhas: 6 },
      { nome: 'PercentualConcluido', rotulo: 'Percentual concluído', tipo: 'Number' },
      { nome: 'Status', rotulo: 'Status', tipo: 'Text', indexado: true },
      { nome: 'DataInicio', rotulo: 'Data de início', tipo: 'DateTime' },
      { nome: 'UltimoAcesso', rotulo: 'Último acesso', tipo: 'DateTime' },
      { nome: 'ConcluidaEm', rotulo: 'Concluída em', tipo: 'DateTime' },
      { nome: 'CertificadoEmitido', rotulo: 'Certificado emitido', tipo: 'Boolean' }
    ]
  },
  {
    base: 'Curtidas',
    modelo: 100,
    versionamento: false,
    configuracao: { leitura: 'todos', edicao: 'proprios' },
    campos: [
      titulo('Chave (etapa-usuário)', true),
      autor,
      { nome: 'EtapaId', rotulo: 'ID da etapa', tipo: 'Number', indexado: true },
      { nome: 'JornadaId', rotulo: 'ID da jornada', tipo: 'Number', indexado: true }
    ]
  },
  {
    base: 'Avaliacoes',
    modelo: 100,
    versionamento: true,
    configuracao: { leitura: 'todos', edicao: 'proprios' },
    campos: [
      titulo('Chave (jornada-usuário)', true),
      autor,
      { nome: 'JornadaId', rotulo: 'ID da jornada', tipo: 'Number', indexado: true },
      { nome: 'Nota', rotulo: 'Nota (1 a 5)', tipo: 'Number' },
      { nome: 'Comentario', rotulo: 'Comentário', tipo: 'Note', linhas: 6 },
      { nome: 'Oculto', rotulo: 'Oculto', tipo: 'Boolean' }
    ]
  },
  {
    base: 'Conteudos',
    modelo: 101,
    versionamento: true,
    campos: [titulo('Título')]
  }
];

/** Listas e biblioteca de uma área, na ordem do catálogo. */
export const BASES_AREA: BaseListaArea[] = CATALOGO_AREA.map((lista: IListaCatalogo) => lista.base);

const escaparXml = (valor: string): string =>
  valor.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Esquema XML de um campo novo. O atributo Name fixa o nome interno; DisplayName nasce igual ao nome
 * interno e o rótulo é aplicado depois, em passo separado (regra 5 de sharepoint-provisionamento).
 */
export const xmlDoCampo = (campo: ICampoCatalogo): string => {
  const nome: string = escaparXml(campo.nome);
  const base: string = `Name="${nome}" StaticName="${nome}" DisplayName="${nome}"`;
  switch (campo.tipo) {
    case 'Text':
      return `<Field Type="Text" ${base} MaxLength="255" />`;
    case 'Note': {
      const linhas: number = campo.linhas ?? 6;
      return campo.formatacao
        ? `<Field Type="Note" ${base} NumLines="${linhas}" RichText="TRUE" RichTextMode="Compatible" />`
        : `<Field Type="Note" ${base} NumLines="${linhas}" RichText="FALSE" />`;
    }
    case 'Number':
      return `<Field Type="Number" ${base} />`;
    case 'DateTime':
      return `<Field Type="DateTime" ${base} Format="DateTime" />`;
    case 'Boolean':
      return `<Field Type="Boolean" ${base}><Default>0</Default></Field>`;
    default:
      throw new Error(`Tipo de campo sem criação prevista: ${campo.tipo} (${campo.nome}).`);
  }
};
