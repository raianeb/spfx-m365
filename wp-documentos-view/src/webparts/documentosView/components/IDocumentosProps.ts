import { IWebPartCommonProps } from '../../../core/config';

export type DocumentosLayout = 'grade' | 'lista';

export interface IDocumentosProps extends IWebPartCommonProps {
  /** Nome base da biblioteca escolhida no site de dados. Vazio = não configurada. */
  libraryName: string;
  layout: DocumentosLayout;
}

/** Categoria visual do arquivo: define ícone e cor, sem exibir metadados. */
export type FileCategory = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'texto' | 'imagem' | 'video' | 'audio' | 'compactado' | 'onenote' | 'outro';

const CATEGORY_BY_EXTENSION: Record<string, FileCategory> = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  xls: 'excel',
  xlsx: 'excel',
  csv: 'excel',
  ppt: 'powerpoint',
  pptx: 'powerpoint',
  txt: 'texto',
  md: 'texto',
  jpg: 'imagem',
  jpeg: 'imagem',
  png: 'imagem',
  gif: 'imagem',
  webp: 'imagem',
  svg: 'imagem',
  mp4: 'video',
  mov: 'video',
  avi: 'video',
  webm: 'video',
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  zip: 'compactado',
  rar: 'compactado',
  '7z': 'compactado',
  one: 'onenote'
};

export const categoryOf = (fileName: string): FileCategory => {
  const dot: number = fileName.lastIndexOf('.');
  const extension: string = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
  return CATEGORY_BY_EXTENSION[extension] ?? 'outro';
};

/** Documentos do Office abrem no visualizador do SharePoint, em vez de baixar o arquivo. */
export const isOfficeCategory = (category: FileCategory): boolean =>
  category === 'word' || category === 'excel' || category === 'powerpoint';

/** Ícone do Fluent para cada categoria. */
export const ICON_BY_CATEGORY: Record<FileCategory, string> = {
  pdf: 'PDF',
  word: 'WordDocument',
  excel: 'ExcelDocument',
  powerpoint: 'PowerPointDocument',
  texto: 'TextDocument',
  imagem: 'FileImage',
  video: 'Video',
  audio: 'Audio',
  compactado: 'ZipFolder',
  onenote: 'OneNoteLogo',
  outro: 'Page'
};

export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes < 1024) {
    return `${bytes || 0} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
};
