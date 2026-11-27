// Skills aplicadas: spfx-hub-ux, spfx-configuracao-webpart, spfx-implementacao-base.
import * as React from 'react';
import { IPropertyPaneField } from '@microsoft/sp-property-pane';
import { WebPartBase } from '../../core/WebPartBase';
import { IWebPartBaseProps, IWebPartCommonProps } from '../../core/config';
import JornadaConhecimento from './components/JornadaConhecimento';

export type IJornadaConhecimentoWebPartProps = IWebPartBaseProps;

export default class JornadaConhecimentoWebPart extends WebPartBase<IJornadaConhecimentoWebPartProps> {
  protected get defaultTitle(): string {
    return 'Jornada de Conhecimento';
  }

  /** As jornadas são listadas por área; não há quantidade máxima a configurar. */
  protected get showTopSlider(): boolean {
    return false;
  }

  protected createContent(common: IWebPartCommonProps): React.ReactElement {
    return React.createElement(JornadaConhecimento, common);
  }

  protected getDisplayFields(): IPropertyPaneField<unknown>[] {
    return [];
  }
}
