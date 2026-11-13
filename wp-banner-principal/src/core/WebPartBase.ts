import { prefixosDe } from './prefixos';
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Root, createRoot } from 'react-dom/client';
import { Version } from '@microsoft/sp-core-library';
import { ThemeChangedEventArgs, ThemeProvider, IReadonlyTheme } from '@microsoft/sp-component-base';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import {
  IPropertyPaneConfiguration,
  IPropertyPaneCustomFieldProps,
  IPropertyPaneField,
  PropertyPaneFieldType,
  PropertyPaneDropdown,
  PropertyPaneSlider,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { SpListService } from '../services/SpListService';
import {
  EMPTY_ADMIN_GROUPS,
  ENVIRONMENT_OPTIONS,
  Environment,
  IAdminGroups,
  IWebPartBaseProps,
  IWebPartCommonProps,
  IGroupRef,
  getAdminGroupIds
} from './config';
import { DiagnosticsLogger } from './diagnostics';
import { GroupPickerField, SitePickerField } from './PropertyFields';
import { ISiteRef, SiteDirectoryService } from './siteDirectory';
import { mountField, unmountField } from './mountField';
import { themeToCssVars } from './themeVars';

type ChangeCallback = (targetProperty?: string, newValue?: unknown) => void;

/** Campo customizado do painel de propriedades, renderizado por um controle React. */
const customField = (
  key: string,
  onRender: (element: HTMLElement, changeCallback?: ChangeCallback) => void,
  onDispose: (element: HTMLElement) => void
): IPropertyPaneField<IPropertyPaneCustomFieldProps> => ({
  type: PropertyPaneFieldType.Custom,
  targetProperty: key,
  properties: {
    key,
    onRender: (element: HTMLElement, _context: unknown, changeCallback?: ChangeCallback) =>
      onRender(element, changeCallback),
    onDispose
  } as unknown as IPropertyPaneCustomFieldProps
});

/**
 * Base das Web Parts da Equipe M365. Concentra as seis configurações obrigatórias:
 * título, site de dados, ambiente, grupos por perfil, herança de tema e log.
 */
export abstract class WebPartBase<TProps extends IWebPartBaseProps> extends BaseClientSideWebPart<TProps> {
  private _root: Root | undefined;
  private _service: SpListService | undefined;
  private _siteDirectory: SiteDirectoryService | undefined;
  private _contextKey: string | undefined;
  private readonly _logger: DiagnosticsLogger = new DiagnosticsLogger();
  private _themeProvider: ThemeProvider | undefined;
  private _theme: IReadonlyTheme | undefined;
  private _siteEl: HTMLElement | undefined;
  private _groupEl: HTMLElement | undefined;
  private _changeCallback: ChangeCallback | undefined;

  protected abstract get defaultTitle(): string;
  protected abstract createContent(common: IWebPartCommonProps): React.ReactElement;
  /** Campos extras do grupo "Geral", antes do controle de quantidade. */
  protected abstract getDisplayFields(): IPropertyPaneField<any>[];

  protected onInit(): Promise<void> {
    this._themeProvider = this.context.serviceScope.consume(ThemeProvider.serviceKey);
    this._theme = this._themeProvider.tryGetTheme();
    this._themeProvider.themeChangedEvent.add(this, this._onThemeChanged);

    const properties: IWebPartBaseProps = this.properties;
    // Título em branco é uma escolha válida (oculta o cabeçalho). Só usa o padrão quando nunca foi definido.
    if (properties.title === undefined || properties.title === null) {
      properties.title = this.defaultTitle;
    }
    if (!properties.environment) {
      properties.environment = 'PROD';
    }
    if (!properties.adminGroups) {
      properties.adminGroups = EMPTY_ADMIN_GROUPS;
    }
    if (properties.inheritSiteTheme === undefined) {
      properties.inheritSiteTheme = true;
    }
    if (properties.showLog === undefined) {
      properties.showLog = false;
    }
    return Promise.resolve();
  }

  public render(): void {
    const service: SpListService = this._ensureService();
    const environment: Environment = this.properties.environment ?? 'PROD';

    const common: IWebPartCommonProps = {
      service,
      logger: this._logger,
      environment,
      prefixos: prefixosDe(this.properties),
      adminGroupIds: getAdminGroupIds(this.properties.adminGroups, environment),
      title: this.properties.title,
      themeStyle: this.properties.inheritSiteTheme ? themeToCssVars(this._theme) : {},
      top: this.properties.top || 5
    };

    if (!this._root) {
      this._root = createRoot(this.domElement);
    }
    this._root.render(this.createContent(common));
  }

  protected onDispose(): void {
    this._themeProvider?.themeChangedEvent.remove(this, this._onThemeChanged);
    this._root?.unmount();
    this._root = undefined;
    unmountField(this._siteEl);
    unmountField(this._groupEl);
    this._logger.clear();
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          groups: [
            {
              groupName: 'Geral',
              groupFields: [
                PropertyPaneTextField('title', {
                  label: 'Título da Web Part',
                  value: this.properties.title
                }),
                PropertyPaneSlider('top', {
                  label: 'Quantidade máxima de itens',
                  min: 1,
                  max: 10,
                  step: 1,
                  value: this.properties.top || 5,
                  showValue: true
                }),
                ...this.getDisplayFields()
              ]
            },
            {
              groupName: 'Dados e ambiente',
              groupFields: [
                this._siteField(),
                PropertyPaneDropdown('environment', {
                  label: 'Ambiente',
                  options: ENVIRONMENT_OPTIONS.map((option) => ({ key: option.key, text: option.text })),
                  selectedKey: this.properties.environment ?? 'PROD'
                }),
                PropertyPaneTextField('prefixoProd', {
                  label: 'Prefixo das listas de PROD',
                  description: 'Vazio se as listas de PROD não têm prefixo. Use o mesmo valor do script de provisionamento.',
                  value: this.properties.prefixoProd ?? ''
                }),
                PropertyPaneTextField('prefixoHml', {
                  label: 'Prefixo das listas de HML',
                  description: 'Obrigatório no ambiente HML. Deve ser diferente do prefixo de PROD e igual ao do script de provisionamento.',
                  value: this.properties.prefixoHml ?? ''
                })
              ]
            },
            {
              groupName: 'Acesso',
              groupFields: [this._groupField()]
            },
            {
              groupName: 'Aparência',
              groupFields: [
                PropertyPaneToggle('inheritSiteTheme', {
                  label: 'Herdar tema do site',
                  onText: 'Sim',
                  offText: 'Não',
                  checked: this.properties.inheritSiteTheme
                })
              ]
            },
            {
              groupName: 'Diagnóstico',
              groupFields: [
                PropertyPaneToggle('showLog', {
                  label: 'Exibir log',
                  onText: 'Sim',
                  offText: 'Não',
                  checked: this.properties.showLog
                })
              ]
            }
          ]
        }
      ]
    };
  }

  private _ensureService(): SpListService {
    const siteUrl: string = this.properties.dataSiteUrl || this.context.pageContext.web.absoluteUrl;
    const environment: Environment = this.properties.environment ?? 'PROD';
    const key: string = `${siteUrl}|${environment}`;

    this._logger.setEnabled(this.properties.showLog === true);
    if (!this._service || this._service.webUrl !== siteUrl) {
      this._service = new SpListService(this.context.spHttpClient, siteUrl, this._logger);
    }
    if (this._contextKey !== key) {
      this._logger.clear();
      this._logger.log('info', 'Web Part', `Site de dados: ${siteUrl}`);
      this._logger.log('info', 'Web Part', `Ambiente ativo: ${environment}`);
      this._contextKey = key;
    }
    return this._service;
  }

  private _getSiteDirectory(): SiteDirectoryService {
    if (!this._siteDirectory) {
      this._siteDirectory = new SiteDirectoryService(
        this.context.spHttpClient,
        this.context.pageContext.web.absoluteUrl
      );
    }
    return this._siteDirectory;
  }

  private _siteField(): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
    return customField(
      'dataSiteField',
      (element: HTMLElement, changeCallback?: ChangeCallback) => {
        this._siteEl = element;
        this._changeCallback = changeCallback;
        this._renderSiteField();
      },
      (element: HTMLElement) => {
        unmountField(element);
        this._siteEl = undefined;
      }
    );
  }

  private _groupField(): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
    return customField(
      'adminGroupsField',
      (element: HTMLElement, changeCallback?: ChangeCallback) => {
        this._groupEl = element;
        this._changeCallback = changeCallback;
        this._renderGroupFields();
      },
      (element: HTMLElement) => {
        unmountField(element);
        this._groupEl = undefined;
      }
    );
  }

  private _renderSiteField(): void {
    if (!this._siteEl) {
      return;
    }
    const current: ISiteRef = {
      url: this.context.pageContext.web.absoluteUrl,
      title: this.context.pageContext.web.title
    };
    const value: ISiteRef | undefined = this.properties.dataSiteUrl
      ? { url: this.properties.dataSiteUrl, title: this.properties.dataSiteTitle ?? this.properties.dataSiteUrl }
      : undefined;
    mountField(
      this._siteEl,
      React.createElement(SitePickerField, {
        value,
        currentSite: current,
        service: this._getSiteDirectory(),
        onChange: (site: ISiteRef) => this._setDataSite(site)
      })
    );
  }

  private _renderGroupFields(): void {
    if (!this._groupEl) {
      return;
    }
    const siteUrl: string = this.properties.dataSiteUrl || this.context.pageContext.web.absoluteUrl;
    const groups: IAdminGroups = this.properties.adminGroups ?? EMPTY_ADMIN_GROUPS;
    const service: SiteDirectoryService = this._getSiteDirectory();

    mountField(
      this._groupEl,
      React.createElement(
        React.Fragment,
        null,
        React.createElement(GroupPickerField, {
          key: `${siteUrl}|PROD`,
          label: 'Administradores — PROD',
          siteUrl,
          service,
          value: groups.PROD,
          onChange: (next: IGroupRef[]) => this._setAdminGroups('PROD', next)
        }),
        React.createElement(GroupPickerField, {
          key: `${siteUrl}|HML`,
          label: 'Administradores — HML',
          siteUrl,
          service,
          value: groups.HML,
          onChange: (next: IGroupRef[]) => this._setAdminGroups('HML', next)
        })
      )
    );
  }

  /** Trocar o site invalida os grupos já escolhidos: IDs não são transferidos entre conjuntos de sites. */
  private _setDataSite(site: ISiteRef): void {
    this.properties.dataSiteUrl = site.url;
    this.properties.dataSiteTitle = site.title;
    this.properties.adminGroups = { PROD: [], HML: [] };
    this._changeCallback?.('dataSiteUrl', site.url);
    this._changeCallback?.('dataSiteTitle', site.title);
    this._changeCallback?.('adminGroups', this.properties.adminGroups);
    this._renderSiteField();
    this._renderGroupFields();
    this.render();
  }

  private _setAdminGroups(environment: Environment, groups: IGroupRef[]): void {
    const next: IAdminGroups = { ...(this.properties.adminGroups ?? EMPTY_ADMIN_GROUPS), [environment]: groups };
    this.properties.adminGroups = next;
    this._changeCallback?.('adminGroups', next);
    this.render();
  }

  private _onThemeChanged(args: ThemeChangedEventArgs): void {
    this._theme = args.theme;
    this.render();
  }
}
