import { ICarreirasCommonProps } from '../../../core/config';

/**
 * Comunicado. CategoriaId referencia o Id da lista de categorias: a consulta não usa Lookup,
 * e o nome da categoria é obtido em memória a partir da lista auxiliar (carregada uma vez e em cache).
 */
export interface IComunicado {
  Id: number;
  Title: string;
  DataComunicado: string;
  CategoriaId?: number;
  /** HTML do editor de texto rico (coluna Mensagem). Texto antigo, sem tags, também é aceito. */
  Mensagem?: string;
  Autor?: string;
}

/** Categoria de comunicado (lista auxiliar; o nome fica no campo nativo Title). */
export interface ICategoria {
  Id: number;
  Title: string;
}

/** Templates de exibição: cartões em grade, lista compacta ou destaque + grade. */
export type ComunicadoLayout = 'cards' | 'compact' | 'featured';

/** Propriedades que chegam ao componente, já resolvidas pela Web Part. */
export interface IComunicadosProps extends ICarreirasCommonProps {
  /** Nome base da lista de comunicados, escolhida no site de dados. Vazio = ainda não configurada. */
  listName: string;
  /** Nome base da lista de categorias. Vazio = a WP não exibe categorias nem o botão de gerenciá-las. */
  categoriesListName: string;
  layout: ComunicadoLayout;
  /** Colunas no layout de cartões (1 a 4). Não se aplica à lista compacta. */
  columns: number;
  showMessage: boolean;
  showCategory: boolean;
  showAuthor: boolean;
}
