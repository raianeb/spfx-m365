import * as React from 'react';
import { IPropertyPaneField, PropertyPaneDropdown } from '@microsoft/sp-property-pane';
import { WebPartBase } from '../../core/WebPartBase';
import { IWebPartBaseProps, IWebPartCommonProps } from '../../core/config';
import Documentos from './components/Documentos';
import { DocumentosLayout } from './components/IDocumentosProps';

export interface IDocumentosViewWebPartProps extends IWebPartBaseProps {
  layout?: DocumentosLayout;
}

export default class DocumentosViewWebPart extends WebPartBase<IDocumentosViewWebPartProps> {
  protected get defaultTitle(): string {
    return 'Documentos';
  }

  /** Quantidade máxima não se aplica: pastas e arquivos são navegados, não paginados pela WP. */
  protected get showTopSlider(): boolean {
    return false;
  }

  protected createContent(common: IWebPartCommonProps): React.ReactElement {
    const props: IDocumentosViewWebPartProps = this.properties;
    return React.createElement(Documentos, {
      ...common,
      libraryName: props.libraryName ?? '',
      layout: props.layout ?? 'grade'
    });
  }

  /** A biblioteca é escolhida logo após o site de dados. */
  protected getSourceFields(): IPropertyPaneField<unknown>[] {
    return [this.listPickerField('libraryName', 'Biblioteca de documentos', 'biblioteca')];
  }

  protected getDisplayFields(): IPropertyPaneField<unknown>[] {
    return [
      PropertyPaneDropdown('layout', {
        label: 'Visualização inicial',
        selectedKey: this.properties.layout ?? 'grade',
        options: [
          { key: 'grade', text: 'Grade de ícones' },
          { key: 'lista', text: 'Lista' }
        ]
      })
    ];
  }
}
