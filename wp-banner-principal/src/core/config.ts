import * as React from 'react';
import { SpListService } from '../services/SpListService';
import { DiagnosticsLogger } from './diagnostics';

/** Ambiente técnico persistido. Listas de HML recebem o prefixo HML_. */
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
  adminGroups: IAdminGroups;
  inheritSiteTheme: boolean;
  showLog: boolean;
}

/** Dados que a Web Part passa para o componente de conteúdo. */
export interface IWebPartCommonProps {
  service: SpListService;
  logger: DiagnosticsLogger;
  environment: Environment;
  adminGroupIds: number[];
  title: string;
  themeStyle: React.CSSProperties;
  top: number;
}

/** Nome físico da lista: o catálogo guarda o nome base; HML acrescenta o prefixo. */
export const resolveListTitle = (baseName: string, environment: Environment): string => {
  if (!baseName || baseName.indexOf('HML_') === 0) {
    throw new Error('O catálogo deve conter o nome base sem HML_.');
  }
  return environment === 'HML' ? `HML_${baseName}` : baseName;
};

export const getAdminGroupIds = (groups: IAdminGroups | undefined, environment: Environment): number[] => {
  const source: IAdminGroups = groups ?? EMPTY_ADMIN_GROUPS;
  return (source[environment] ?? []).map((group: IGroupRef) => group.id);
};
