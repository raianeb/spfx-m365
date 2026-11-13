import * as React from 'react';
import { MSGraphClientV3 } from '@microsoft/sp-http';
import { IPropertyPaneField, PropertyPaneDropdown, PropertyPaneTextField } from '@microsoft/sp-property-pane';
import { WebPartBase } from '../../core/WebPartBase';
import { IWebPartBaseProps, IWebPartCommonProps } from '../../core/config';
import Calendario from './components/Calendario';
import { CalendarTemplate, CalendarView } from './components/IEventoProps';

/** Lista padrão enquanto a WP não tiver lista escolhida. */
const DEFAULT_LIST: string = 'Calendario';

export interface ICalendarioWebPartProps extends IWebPartBaseProps {
  template?: CalendarTemplate;
  defaultView?: CalendarView;
  /** E-mail ou ID do grupo/equipe Microsoft 365. Vazio: somente a lista. */
  identifier?: string;
}

export default class CalendarioWebPart extends WebPartBase<ICalendarioWebPartProps> {
  /** Fábrica estável do cliente Graph do SPFx. O token vem da sessão do usuário, sem app próprio. */
  private readonly graphClientFactory = (): Promise<MSGraphClientV3> => this.context.msGraphClientFactory.getClient('3');

  protected get defaultTitle(): string {
    return 'Calendário';
  }

  /** Calendário não usa quantidade máxima de itens: o período exibido define a consulta. */
  protected get showTopSlider(): boolean {
    return false;
  }

  protected createContent(common: IWebPartCommonProps): React.ReactElement {
    const props: ICalendarioWebPartProps = this.properties;
    return React.createElement(Calendario, {
      ...common,
      listName: props.listName ?? DEFAULT_LIST,
      template: props.template ?? 'completo',
      defaultView: props.defaultView ?? 'mes',
      identifier: props.identifier ?? '',
      getClient: this.graphClientFactory
    });
  }

  /**
   * Fontes do calendário. A lista é o calendário central: criar, editar e excluir acontecem nela.
   * O grupo ou equipe, quando informado, é exibido junto e recebe a replicação.
   */
  protected getSourceFields(): IPropertyPaneField<unknown>[] {
    return [
      this.listPickerField('listName', 'Lista de eventos (calendário central)'),
      PropertyPaneTextField('identifier', {
        label: 'Grupo ou equipe Microsoft 365 (identificador)',
        description:
          'E-mail ou ID do grupo/equipe. Os eventos dele aparecem junto com os da lista, e os criados na lista são replicados para lá. Vazio: somente a lista.',
        value: this.properties.identifier ?? '',
        placeholder: 'grupo@seudominio.com.br'
      })
    ];
  }

  /** Template e visualização inicial. Na miniatura a visualização é sempre o mês. */
  protected getDisplayFields(): IPropertyPaneField<unknown>[] {
    return [
      PropertyPaneDropdown('template', {
        label: 'Template',
        selectedKey: this.properties.template ?? 'completo',
        options: [
          { key: 'miniatura', text: 'Miniatura de calendário' },
          { key: 'completo', text: 'Calendário completo' }
        ]
      }),
      PropertyPaneDropdown('defaultView', {
        label: 'Visualização inicial (calendário completo)',
        selectedKey: this.properties.defaultView ?? 'mes',
        options: [
          { key: 'dia', text: 'Dia' },
          { key: 'semana', text: 'Semana' },
          { key: 'mes', text: 'Mês' }
        ]
      })
    ];
  }
}
