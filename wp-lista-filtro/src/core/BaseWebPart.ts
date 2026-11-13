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
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { ListQueryService } from '../services/ListQueryService';
import {
  EMPTY_ADMIN_GROUPS,
  ENVIRONMENT_OPTIONS,
  Environment,
  IAdminGroups,
  IBaseWebPartProps,
  ICommonProps,
  IGroupRef,
  getAdminGroupIds,
  resolveListTitle
} from './config';
import { DiagnosticsLogger } from './diagnostics';
import { GroupPickerField, ListPickerField, SitePickerField } from './PropertyFields';
import { ISiteRef, SiteDirectoryService } from './siteDirectory';
import { mountField, unmountField } from './mountField';
import { themeToCssVars } from './themeVars';

/** Avisa o painel de que uma propriedade mudou (marca a página como alterada). */
export type NotifyChange = (targetProperty?: string, newValue?: unknown) => void;

type FieldFactory = (notify: NotifyChange) => React.ReactElement;

interface IMountedField {
  element: HTMLElement;
  notify: NotifyChange;
  factory: FieldFactory;
}

const SITE_FIELD: string = 'wpDataSite';
const LIST_FIELD: string = 'wpListName';
const GROUPS_FIELD: string = 'wpAdminGroups';

/**
 * Base de Web Parts que leem uma lista escolhida. Concentra as configurações obrigatórias:
 * título, site de dados, lista, ambiente, grupos por perfil, herança de tema e log.
 */
export abstract class BaseWebPart<TProps extends IBaseWebPartProps> extends BaseClientSideWebPart<TProps> {
  private _root: Root | undefined;
  private _service: ListQueryService | undefined;
  private _siteDirectory: SiteDirectoryService | undefined;
  private _contextKey: string | undefined;
  private readonly _logger: DiagnosticsLogger = new DiagnosticsLogger();
  private _themeProvider: ThemeProvider | undefined;
  private _theme: IReadonlyTheme | undefined;
  private readonly _fields: Map<string, IMountedField> = new Map<string, IMountedField>();

  protected abstract get defaultTitle(): string;
  protected abstract createContent(common: ICommonProps): React.ReactElement;
  /** Campos extras do grupo "Geral". */
  protected abstract getDisplayFields(): IPropertyPaneField<any>[];

  /** Campos extras de origem de dados, exibidos logo após a lista. */
  protected getSourceFields(): IPropertyPaneField<any>[] {
    return [];
  }

  /** Chamado quando a lista escolhida muda (inclusive ao trocar o site). Limpe aqui o que depende da lista. */
  protected onListChanged(): void {
    // Sem ação por padrão.
  }

  /** Site de dados em uso: o escolhido ou, na falta dele, o site da página. */
  protected get dataSiteUrl(): string {
    return this.properties.dataSiteUrl || this.context.pageContext.web.absoluteUrl;
  }

  /** Nome físico da lista no ambiente ativo. Vazio enquanto não houver lista escolhida. */
  protected get resolvedListTitle(): string {
    return resolveListTitle(this.properties.listName, this.properties.environment ?? 'PROD');
  }

  protected get siteDirectory(): SiteDirectoryService {
    if (!this._siteDirectory) {
      this._siteDirectory = new SiteDirectoryService(this.context.spHttpClient, this.context.pageContext.web.absoluteUrl);
    }
    return this._siteDirectory;
  }

  protected onInit(): Promise<void> {
    this._themeProvider = this.context.serviceScope.consume(ThemeProvider.serviceKey);
    this._theme = this._themeProvider.tryGetTheme();
    this._themeProvider.themeChangedEvent.add(this, this._onThemeChanged);

    const properties: IBaseWebPartProps = this.properties;
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
    const service: ListQueryService = this._ensureService();
    const environment: Environment = this.properties.environment ?? 'PROD';
    const common: ICommonProps = {
      service,
      logger: this._logger,
      environment,
      adminGroupIds: getAdminGroupIds(this.properties.adminGroups, environment),
      title: this.properties.title,
      themeStyle: this.properties.inheritSiteTheme ? themeToCssVars(this._theme) : {}
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
    this._fields.forEach((field: IMountedField) => unmountField(field.element));
    this._fields.clear();
    this._logger.clear();
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  /** Trocar o ambiente muda a lista física: os controles que dependem dela são recarregados. */
  protected onPropertyPaneFieldChanged(propertyPath: string, oldValue: unknown, newValue: unknown): void {
    super.onPropertyPaneFieldChanged(propertyPath, oldValue, newValue);
    if (propertyPath === 'environment' && oldValue !== newValue) {
      this.refreshFields();
    }
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          groups: [
            {
              groupName: 'Geral',
              groupFields: [
                PropertyPaneTextField('title', { label: 'Título da Web Part', value: this.properties.title }),
                ...this.getDisplayFields()
              ]
            },
            {
              groupName: 'Dados e ambiente',
              groupFields: [
                this.reactField(SITE_FIELD, () => this._siteElement()),
                PropertyPaneDropdown('environment', {
                  label: 'Ambiente',
                  options: ENVIRONMENT_OPTIONS.map((option) => ({ key: option.key, text: option.text })),
                  selectedKey: this.properties.environment ?? 'PROD'
                }),
                this.reactField(LIST_FIELD, (notify: NotifyChange) => this._listElement(notify)),
                ...this.getSourceFields()
              ]
            },
            {
              groupName: 'Acesso',
              groupFields: [this.reactField(GROUPS_FIELD, (notify: NotifyChange) => this._groupsElement(notify))]
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

  /**
   * Campo do painel renderizado por um controle React. A fábrica é chamada a cada atualização,
   * por isso deve ler as propriedades no momento da chamada.
   */
  protected reactField(key: string, factory: FieldFactory): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
    return {
      type: PropertyPaneFieldType.Custom,
      targetProperty: key,
      properties: {
        key,
        onRender: (element: HTMLElement, _context: unknown, changeCallback?: NotifyChange) => {
          this._fields.set(key, { element, notify: changeCallback ?? ((): void => undefined), factory });
          this.refreshField(key);
        },
        onDispose: (element: HTMLElement) => {
          unmountField(element);
          this._fields.delete(key);
        }
      } as unknown as IPropertyPaneCustomFieldProps
    };
  }

  protected refreshField(key: string): void {
    const field: IMountedField | undefined = this._fields.get(key);
    if (field) {
      mountField(field.element, field.factory(field.notify));
    }
  }

  protected refreshFields(): void {
    Array.from(this._fields.keys()).forEach((key: string) => this.refreshField(key));
  }

  private _ensureService(): ListQueryService {
    const siteUrl: string = this.dataSiteUrl;
    const environment: Environment = this.properties.environment ?? 'PROD';
    const key: string = `${siteUrl}|${environment}`;

    this._logger.setEnabled(this.properties.showLog === true);
    if (!this._service || this._service.webUrl !== siteUrl) {
      this._service = new ListQueryService(this.context.spHttpClient, siteUrl, this._logger);
    }
    if (this._contextKey !== key) {
      this._logger.clear();
      this._logger.log('info', 'Web Part', `Site de dados: ${siteUrl}`);
      this._logger.log('info', 'Web Part', `Ambiente ativo: ${environment}`);
      this._contextKey = key;
    }
    return this._service;
  }

  private _siteElement(): React.ReactElement {
    const current: ISiteRef = {
      url: this.context.pageContext.web.absoluteUrl,
      title: this.context.pageContext.web.title
    };
    const value: ISiteRef | undefined = this.properties.dataSiteUrl
      ? { url: this.properties.dataSiteUrl, title: this.properties.dataSiteTitle ?? this.properties.dataSiteUrl }
      : undefined;
    return React.createElement(SitePickerField, {
      value,
      currentSite: current,
      service: this.siteDirectory,
      onChange: (site: ISiteRef) => this._setDataSite(site)
    });
  }

  private _listElement(notify: NotifyChange): React.ReactElement {
    const siteUrl: string = this.dataSiteUrl;
    return React.createElement(ListPickerField, {
      key: siteUrl,
      label: 'Lista',
      siteUrl,
      service: this.siteDirectory,
      value: this.properties.listName ?? '',
      onChange: (name: string) => this._setList(name, notify)
    });
  }

  private _groupsElement(notify: NotifyChange): React.ReactElement {
    const siteUrl: string = this.dataSiteUrl;
    const groups: IAdminGroups = this.properties.adminGroups ?? EMPTY_ADMIN_GROUPS;
    const picker = (environment: Environment): React.ReactElement =>
      React.createElement(GroupPickerField, {
        key: `${siteUrl}|${environment}`,
        label: `Administradores — ${environment}`,
        siteUrl,
        service: this.siteDirectory,
        value: groups[environment],
        onChange: (next: IGroupRef[]) => this._setAdminGroups(environment, next, notify)
      });
    return React.createElement(React.Fragment, null, picker('PROD'), picker('HML'));
  }

  /** Trocar o site invalida grupos e lista: IDs e nomes não são transferidos entre sites. */
  private _setDataSite(site: ISiteRef): void {
    const props: IBaseWebPartProps = this.properties;
    props.dataSiteUrl = site.url;
    props.dataSiteTitle = site.title;
    props.adminGroups = { PROD: [], HML: [] };
    props.listName = '';
    this.onListChanged();
    this._fields.get(SITE_FIELD)?.notify('dataSiteUrl', site.url);
    this.refreshFields();
    this.render();
  }

  private _setList(name: string, notify: NotifyChange): void {
    const props: IBaseWebPartProps = this.properties;
    if (props.listName === name) {
      return;
    }
    props.listName = name;
    this.onListChanged();
    notify('listName', name);
    this.refreshFields();
    this.render();
  }

  private _setAdminGroups(environment: Environment, groups: IGroupRef[], notify: NotifyChange): void {
    const next: IAdminGroups = { ...(this.properties.adminGroups ?? EMPTY_ADMIN_GROUPS), [environment]: groups };
    this.properties.adminGroups = next;
    notify('adminGroups', next);
    this.render();
  }

  private _onThemeChanged(args: ThemeChangedEventArgs): void {
    this._theme = args.theme;
    this.render();
  }
}
