import * as React from 'react';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

/** Converte o tema do site nas variáveis --wp-* usadas pelos componentes. */
export const themeToCssVars = (theme: IReadonlyTheme | undefined): React.CSSProperties => {
  if (!theme) {
    return {};
  }
  const palette: Partial<Record<string, string>> | undefined = theme.palette as Partial<Record<string, string>> | undefined;
  if (!palette) {
    return {};
  }
  const vars: Record<string, string> = {};
  if (palette.themePrimary) {
    vars['--wp-primary'] = palette.themePrimary;
  }
  if (palette.themeSecondary) {
    vars['--wp-primary-alt'] = palette.themeSecondary;
  }
  if (palette.neutralPrimary) {
    vars['--wp-text'] = palette.neutralPrimary;
  }
  if (palette.neutralSecondary) {
    vars['--wp-muted'] = palette.neutralSecondary;
  }
  if (palette.neutralLighter) {
    vars['--wp-surface'] = palette.neutralLighter;
  }
  return vars as unknown as React.CSSProperties;
};
