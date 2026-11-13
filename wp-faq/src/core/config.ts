import { IPrefixosListas } from './prefixos';
import * as React from 'react';
import { SpListService } from '../services/SpListService';
import { DiagnosticsLogger } from './diagnostics';

/** Ambiente técnico persistido. Listas de HML recebem o prefixo de HML configurado na Web Part. */
export type Environment = 'PROD' | 'HML';

export const ENVIRONMENT_OPTIONS: { key: Environment; text: string }[] = [
  { key: 'PROD', text: 'PROD — Produção' },
  { key: 'HML', text: 'HML — Homologação' }
];

export interface IGroupRef {
  id: number;
  title: string;
}

/** Perfil "Administradores", com um conjunto de grupos por ambiente. */
export interface IAdminGroups {
  PROD: IGroupRef[];
  HML: IGroupRef[];
}

export const EMPTY_ADMIN_GROUPS: IAdminGroups = { PROD: [], HML: [] };

/** Propriedades comuns a todas as Web Parts da Equipe M365. */
export interface IWebPartBaseProps {
  title: string;
  top: number;
  dataSiteUrl?: string;
  dataSiteTitle?: string;
  environment: Environment;
  prefixoProd?: string;
  prefixoHml?: string;
  adminGroups: IAdminGroups;
  inheritSiteTheme: boolean;
  showLog: boolean;
  /** Lista principal escolhida no site de dados (nome base, sem prefixo). Usada pelas Web Parts que leem uma lista escolhida. */
  listName?: string;
  /** Lista auxiliar de categorias escolhida no site de dados (nome base, sem prefixo). */
  categoriesListName?: string;
}

/** Dados que a Web Part passa para o componente de conteúdo. */
export interface IWebPartCommonProps {
  service: SpListService;
  logger: DiagnosticsLogger;
  environment: Environment;
  prefixos: IPrefixosListas;
  adminGroupIds: number[];
  title: string;
  themeStyle: React.CSSProperties;
  top: number;
}

export const getAdminGroupIds = (groups: IAdminGroups | undefined, environment: Environment): number[] => {
  const source: IAdminGroups = groups ?? EMPTY_ADMIN_GROUPS;
  return (source[environment] ?? []).map((group: IGroupRef) => group.id);
};
