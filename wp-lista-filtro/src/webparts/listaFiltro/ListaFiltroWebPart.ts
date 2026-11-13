import * as React from 'react';
import { IPropertyPaneField, PropertyPaneDropdown, PropertyPaneSlider, PropertyPaneToggle } from '@microsoft/sp-property-pane';
import { BaseWebPart, NotifyChange } from '../../core/BaseWebPart';
import { IBaseWebPartProps, ICommonProps } from '../../core/config';
import { FieldPickerField } from '../../core/PropertyFields';
import { TextMatch } from '../../services/camlBuilder';
import ListaFiltro from './components/ListaFiltro';

const DEFAULT_PAGE_SIZE: number = 30;
const DEFAULT_TEXT_MATCH: TextMatch = 'inicio';

type FieldListProperty = 'filterFields' | 'displayFields';

export interface IListaFiltroWebPartProps extends IBaseWebPartProps {
  /** Nomes internos dos campos usados como filtro, na ordem de exibição. */
  filterFields?: string[];
  /** Nomes internos das colunas exibidas, na ordem de exibição. */
  displayFields?: string[];
  pageSize?: number;
  textMatch?: TextMatch;
  /** Carrega a primeira página ao abrir, antes de qualquer filtro. */
  loadOnOpen?: boolean;
  /** A primeira coluna abre o item no SharePoint. */
  linkToItem?: boolean;
  /** Sem filtros, mostra os itens mais recentes primeiro. */
  newestFirst?: boolean;
}

export default class ListaFiltroWebPart extends BaseWebPart<IListaFiltroWebPartProps> {
  protected get defaultTitle(): string {
    return 'Consulta';
  }

  protected createContent(common: ICommonProps): React.ReactElement {
    const props: IListaFiltroWebPartProps = this.properties;
    return React.createElement(ListaFiltro, {
      ...common,
      listName: props.listName ?? '',
      filterFields: props.filterFields ?? [],
      displayFields: props.displayFields ?? [],
      pageSize: props.pageSize ?? DEFAULT_PAGE_SIZE,
      textMatch: props.textMatch ?? DEFAULT_TEXT_MATCH,
      loadOnOpen: props.loadOnOpen ?? false,
      linkToItem: props.linkToItem ?? true,
      newestFirst: props.newestFirst ?? true
    });
  }

  /** Campos de filtro e de exibição pertencem à lista: ao trocar a lista, a seleção é limpa. */
  protected onListChanged(): void {
    this.properties.filterFields = [];
    this.properties.displayFields = [];
  }

  /** Depois da lista: campos de filtro e, em seguida, campos de exibição. */
  protected getSourceFields(): IPropertyPaneField<unknown>[] {
    return [
      this.reactField('wpFilterFields', (notify: NotifyChange) =>
        this._fieldPicker(
          'filterFields',
          'filter',
          'Campos de filtro',
          'Somente campos que aceitam índice. Os campos de sistema não aparecem.',
          notify
        )
      ),
      this.reactField('wpDisplayFields', (notify: NotifyChange) =>
        this._fieldPicker('displayFields', 'display', 'Campos de exibição', 'Colunas do resultado, na ordem escolhida.', notify)
      )
    ];
  }

  protected getDisplayFields(): IPropertyPaneField<unknown>[] {
    return [
      PropertyPaneSlider('pageSize', {
        label: 'Registros por página',
        min: 10,
        max: 100,
        step: 10,
        value: this.properties.pageSize ?? DEFAULT_PAGE_SIZE,
        showValue: true
      }),
      PropertyPaneDropdown('textMatch', {
        label: 'Busca em campos de texto',
        selectedKey: this.properties.textMatch ?? DEFAULT_TEXT_MATCH,
        options: [
          { key: 'inicio', text: 'Começa com (usa o índice; indicado para listas grandes)' },
          { key: 'contem', text: 'Contém (não usa o índice)' }
        ]
      }),
      PropertyPaneToggle('loadOnOpen', {
        label: 'Carregar registros ao abrir',
        onText: 'Sim',
        offText: 'Não (somente após filtrar)',
        checked: this.properties.loadOnOpen ?? false
      }),
      PropertyPaneToggle('newestFirst', {
        label: 'Sem filtros, mais recentes primeiro',
        onText: 'Sim',
        offText: 'Não',
        checked: this.properties.newestFirst ?? true
      }),
      PropertyPaneToggle('linkToItem', {
        label: 'Primeira coluna abre o item',
        onText: 'Sim',
        offText: 'Não',
        checked: this.properties.linkToItem ?? true
      })
    ];
  }

  private _fieldPicker(
    property: FieldListProperty,
    mode: 'filter' | 'display',
    label: string,
    hint: string,
    notify: NotifyChange
  ): React.ReactElement {
    const siteUrl: string = this.dataSiteUrl;
    const listTitle: string = this.resolvedListTitle;
    return React.createElement(FieldPickerField, {
      // A chave recria o controle quando o site, o ambiente ou a lista mudam.
      key: `${siteUrl}|${listTitle}`,
      label,
      hint,
      mode,
      siteUrl,
      listTitle,
      service: this.siteDirectory,
      value: this.properties[property] ?? [],
      onChange: (names: string[]) => {
        this.properties[property] = names;
        notify(property, names);
        this.render();
      }
    });
  }
}
