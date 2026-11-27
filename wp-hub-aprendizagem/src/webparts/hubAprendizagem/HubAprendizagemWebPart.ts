// Skills aplicadas: spfx-hub-ux, spfx-configuracao-webpart, spfx-implementacao-base.
import * as React from 'react';
import { IPropertyPaneField } from '@microsoft/sp-property-pane';
import { WebPartBase } from '../../core/WebPartBase';
import { IWebPartBaseProps, IWebPartCommonProps } from '../../core/config';
import HubAprendizagem from './components/HubAprendizagem';

export type IHubAprendizagemWebPartProps = IWebPartBaseProps;

export default class HubAprendizagemWebPart extends WebPartBase<IHubAprendizagemWebPartProps> {
  protected get defaultTitle(): string {
    return 'Hub de Aprendizagem';
  }

  /** As jornadas são listadas por área; não há quantidade máxima a configurar. */
  protected get showTopSlider(): boolean {
    return false;
  }

  protected createContent(common: IWebPartCommonProps): React.ReactElement {
    return React.createElement(HubAprendizagem, common);
  }

  protected getDisplayFields(): IPropertyPaneField<unknown>[] {
    return [];
  }
}
