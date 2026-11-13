import * as React from 'react';
import { IPropertyPaneField, PropertyPaneDropdown, PropertyPaneSlider, PropertyPaneToggle } from '@microsoft/sp-property-pane';
import { CarreirasWebPartBase } from '../../core/CarreirasWebPartBase';
import { ICarreirasBaseProps, ICarreirasCommonProps } from '../../core/config';
import Comunicados from './components/Comunicados';
import { ComunicadoLayout } from './components/IComunicadosProps';

/** Nomes padrão usados enquanto a WP ainda não tiver listas escolhidas. */
const DEFAULT_LIST: string = 'Carreiras - Comunicados';
const DEFAULT_CATEGORIES_LIST: string = 'Carreiras - Categorias Comunicados';
const DEFAULT_COLUMNS: number = 2;
const MAX_COLUMNS: number = 4;

export interface IComunicadosWebPartProps extends ICarreirasBaseProps {
  layout?: ComunicadoLayout;
  columns?: number;
  showMessage?: boolean;
  showCategory?: boolean;
  showAuthor?: boolean;
}

export default class ComunicadosWebPart extends CarreirasWebPartBase<IComunicadosWebPartProps> {
  protected get defaultTitle(): string {
    return 'Comunicados';
  }

  /** Comunicados não usam quantidade máxima: a página exibe 3 e carrega mais no próprio lugar. */
  protected get showTopSlider(): boolean {
    return false;
  }

  protected createContent(common: ICarreirasCommonProps): React.ReactElement {
    const props: IComunicadosWebPartProps = this.properties;
    const columns: number = Math.min(MAX_COLUMNS, Math.max(1, Math.round(props.columns ?? DEFAULT_COLUMNS)));
    return React.createElement(Comunicados, {
      ...common,
      listName: props.listName ?? DEFAULT_LIST,
      categoriesListName: props.categoriesListName ?? DEFAULT_CATEGORIES_LIST,
      layout: props.layout ?? 'cards',
      columns,
      showMessage: props.showMessage ?? true,
      showCategory: props.showCategory ?? true,
      showAuthor: props.showAuthor ?? true
    });
  }

  /** Lista de comunicados e de categorias são escolhidas logo após o site de dados. */
  protected getSourceFields(): IPropertyPaneField<unknown>[] {
    return [
      this.listPickerField('listName', 'Lista de comunicados'),
      this.listPickerField('categoriesListName', 'Lista de categorias')
    ];
  }

  /** Layout e campos exibidos. A paginação é fixa: 3 itens e "Carregar mais" no próprio lugar. */
  protected getDisplayFields(): IPropertyPaneField<unknown>[] {
    return [
      PropertyPaneDropdown('layout', {
        label: 'Layout',
        selectedKey: this.properties.layout ?? 'cards',
        options: [
          { key: 'cards', text: 'Cartões em grade' },
          { key: 'compact', text: 'Lista compacta' },
          { key: 'featured', text: 'Destaque + grade' }
        ]
      }),
      PropertyPaneSlider('columns', {
        label: 'Colunas (cartões e destaque)',
        min: 1,
        max: MAX_COLUMNS,
        step: 1,
        value: this.properties.columns ?? DEFAULT_COLUMNS,
        showValue: true
      }),
      PropertyPaneToggle('showMessage', {
        label: 'Exibir mensagem',
        checked: this.properties.showMessage ?? true
      }),
      PropertyPaneToggle('showCategory', {
        label: 'Exibir categoria',
        checked: this.properties.showCategory ?? true
      }),
      PropertyPaneToggle('showAuthor', {
        label: 'Exibir autor',
        checked: this.properties.showAuthor ?? true
      })
    ];
  }
}
