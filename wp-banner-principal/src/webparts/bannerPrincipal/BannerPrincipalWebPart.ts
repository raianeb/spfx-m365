import * as React from 'react';
import { IPropertyPaneField, PropertyPaneSlider, PropertyPaneTextField, PropertyPaneToggle } from '@microsoft/sp-property-pane';
import { CarreirasWebPartBase } from '../../core/CarreirasWebPartBase';
import { ICarreirasBaseProps, ICarreirasCommonProps } from '../../core/config';
import BannerPrincipal from './components/BannerPrincipal';

export interface IBannerPrincipalWebPartProps extends ICarreirasBaseProps {
  libraryName: string;
  carouselInterval: number;
  showArrows: boolean;
  showDots: boolean;
  overlayColor: string;
  overlayOpacity: number;
}

export default class BannerPrincipalWebPart extends CarreirasWebPartBase<IBannerPrincipalWebPartProps> {
  protected get defaultTitle(): string {
    return 'Banner principal';
  }

  protected createContent(common: ICarreirasCommonProps): React.ReactElement {
    return React.createElement(BannerPrincipal, {
      ...common,
      libraryName: this.properties.libraryName || 'Banner',
      carouselInterval: this.properties.carouselInterval ?? 6,
      showArrows: this.properties.showArrows ?? true,
      showDots: this.properties.showDots ?? true,
      overlayColor: this.properties.overlayColor || '#000000',
      overlayOpacity: this.properties.overlayOpacity ?? 60
    });
  }

  protected getDisplayFields(): IPropertyPaneField<unknown>[] {
    return [
      PropertyPaneTextField('libraryName', {
        label: 'Biblioteca de imagens dos banners',
        value: this.properties.libraryName || 'Banner'
      }),
      PropertyPaneSlider('carouselInterval', {
        label: 'Intervalo do carrossel (segundos; 0 = troca manual)',
        min: 0,
        max: 30,
        step: 1,
        showValue: true,
        value: this.properties.carouselInterval ?? 6
      }),
      PropertyPaneToggle('showArrows', {
        label: 'Exibir setas de navegação',
        checked: this.properties.showArrows ?? true
      }),
      PropertyPaneToggle('showDots', {
        label: 'Exibir indicadores de posição',
        checked: this.properties.showDots ?? true
      }),
      PropertyPaneTextField('overlayColor', {
        label: 'Cor do overlay sob o título (hexadecimal, ex.: #000000)',
        value: this.properties.overlayColor || '#000000'
      }),
      PropertyPaneSlider('overlayOpacity', {
        label: 'Opacidade do overlay (0 = transparente; 100 = opaco)',
        min: 0,
        max: 100,
        step: 5,
        showValue: true,
        value: this.properties.overlayOpacity ?? 60
      })
    ];
  }
}
