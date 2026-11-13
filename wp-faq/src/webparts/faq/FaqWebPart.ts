import * as React from 'react';
import { IPropertyPaneField, PropertyPaneDropdown, PropertyPaneTextField, PropertyPaneToggle } from '@microsoft/sp-property-pane';
import { CarreirasWebPartBase } from '../../core/CarreirasWebPartBase';
import { ICarreirasBaseProps, ICarreirasCommonProps } from '../../core/config';
import Faq from './components/Faq';
import { FaqOpenMode, FaqSortMode } from './components/faqRules';

/** Lista padrão enquanto a WP não tiver lista escolhida. */
const DEFAULT_LIST: string = 'Carreiras - FAQ';
const DEFAULT_OPEN_MODE: FaqOpenMode = 'fechados';
const DEFAULT_SORT_MODE: FaqSortMode = 'ordem';

export interface IFaqWebPartProps extends ICarreirasBaseProps {
  /** Comportamento inicial dos itens (RF-FAQ-03). */
  openMode?: FaqOpenMode;
  /** Ordenação configurável da lista. */
  sortMode?: FaqSortMode;
  /** Permite sugestões de novas perguntas (RF-FAQ-05). */
  allowSuggestions?: boolean;
  /** URL HTTP Trigger do Power Automate que recebe as sugestões (RF-FAQ-06). */
  suggestionFlowUrl?: string;
}

export default class FaqWebPart extends CarreirasWebPartBase<IFaqWebPartProps> {
  protected get defaultTitle(): string {
    return 'Perguntas Frequentes';
  }

  /** O FAQ exibe todas as perguntas da lista: não há quantidade máxima a configurar. */
  protected get showTopSlider(): boolean {
    return false;
  }

  protected createContent(common: ICarreirasCommonProps): React.ReactElement {
    const props: IFaqWebPartProps = this.properties;
    const user = this.context.pageContext.user;
    return React.createElement(Faq, {
      ...common,
      listName: props.listName ?? DEFAULT_LIST,
      openMode: props.openMode ?? DEFAULT_OPEN_MODE,
      sortMode: props.sortMode ?? DEFAULT_SORT_MODE,
      allowSuggestions: props.allowSuggestions ?? false,
      suggestionFlowUrl: (props.suggestionFlowUrl ?? '').trim(),
      solicitante: { nome: user.displayName ?? '', email: user.email ?? '' }
    });
  }

  /** Lista de perguntas escolhida no site de dados. */
  protected getSourceFields(): IPropertyPaneField<unknown>[] {
    return [this.listPickerField('listName', 'Lista de perguntas frequentes')];
  }

  /** Modo de abertura, ordenação e sugestões. */
  protected getDisplayFields(): IPropertyPaneField<unknown>[] {
    return [
      PropertyPaneDropdown('openMode', {
        label: 'Modo de abertura',
        selectedKey: this.properties.openMode ?? DEFAULT_OPEN_MODE,
        options: [
          { key: 'fechados', text: 'Todos fechados' },
          { key: 'abertos', text: 'Todos abertos' },
          { key: 'primeiro', text: 'Primeiro aberto' }
        ]
      }),
      PropertyPaneDropdown('sortMode', {
        label: 'Ordenação',
        selectedKey: this.properties.sortMode ?? DEFAULT_SORT_MODE,
        options: [
          { key: 'ordem', text: 'Ordem definida (manual)' },
          { key: 'pergunta', text: 'Pergunta (A a Z)' },
          { key: 'recentes', text: 'Mais recentes primeiro' }
        ]
      }),
      PropertyPaneToggle('allowSuggestions', {
        label: 'Permitir envio de sugestões',
        onText: 'Sim',
        offText: 'Não',
        checked: this.properties.allowSuggestions ?? false
      }),
      PropertyPaneTextField('suggestionFlowUrl', {
        label: 'URL do fluxo Power Automate (HTTP Trigger)',
        description:
          'Com sugestões ativas e uma URL https preenchida, o botão "Sugerir nova pergunta" aparece e envia a sugestão ao fluxo.',
        value: this.properties.suggestionFlowUrl ?? '',
        placeholder: 'https://prod-00.region.logic.azure.com/...'
      })
    ];
  }
}
