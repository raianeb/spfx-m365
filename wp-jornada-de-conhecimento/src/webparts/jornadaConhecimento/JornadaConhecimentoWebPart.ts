// Skills aplicadas: spfx-hub-ux, spfx-configuracao-webpart, spfx-codigo-performance (classe fina), spfx-implementacao-base.
import * as React from 'react';
import { IPropertyPaneField } from '@microsoft/sp-property-pane';
import { SPFI } from '@pnp/sp';
import { WebPartBase } from '../../core/WebPartBase';
import { IWebPartBaseProps, IWebPartCommonProps } from '../../core/config';
import { criarSp } from '../../services/sp';
import JornadaConhecimento from './components/JornadaConhecimento';

export type IJornadaConhecimentoWebPartProps = IWebPartBaseProps;

export default class JornadaConhecimentoWebPart extends WebPartBase<IJornadaConhecimentoWebPartProps> {
  private _sp: SPFI | undefined;
  private _spSite: string | undefined;

  protected get defaultTitle(): string {
    return 'Jornada de Conhecimento';
  }

  /** As jornadas são listadas por área; não há quantidade máxima a configurar. */
  protected get showTopSlider(): boolean {
    return false;
  }

  protected createContent(common: IWebPartCommonProps): React.ReactElement {
    const siteUrl: string = common.service.webUrl;
    if (!this._sp || this._spSite !== siteUrl) {
      this._sp = criarSp(this.context, siteUrl);
      this._spSite = siteUrl;
    }
    return React.createElement(JornadaConhecimento, {
      ...common,
      sp: this._sp,
      siteUrl,
      nomeUsuario: this.context.pageContext.user.displayName ?? '',
      loginUsuario: this.context.pageContext.user.loginName ?? ''
    });
  }

  protected getDisplayFields(): IPropertyPaneField<unknown>[] {
    return [];
  }
}
