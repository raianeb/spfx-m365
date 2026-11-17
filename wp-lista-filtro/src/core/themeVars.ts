import * as React from 'react';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

type ColorMap = Partial<Record<string, string>>;

/** Origem de uma variável --wp-*: cor semântica do tema e, na falta dela, cor da paleta. */
interface IThemeVarSource {
  cssVar: string;
  semantic?: string;
  palette?: string;
}

/**
 * Mapa de tokens (skill spfx-tema-marca): fundo, superfície, texto, borda, link e ação.
 * A cor semântica vem primeiro porque acompanha a variante da seção (fundo neutro, suave ou forte)
 * e já traz pares com contraste definido pelo tema, como o fundo e o texto do botão principal.
 * Sem tema, ou sem o token, vale o valor de reserva declarado em ListaFiltro.module.scss.
 */
const THEME_VAR_SOURCES: ReadonlyArray<IThemeVarSource> = [
  { cssVar: '--wp-primary', palette: 'themePrimary' },
  { cssVar: '--wp-primary-alt', palette: 'themeSecondary' },
  { cssVar: '--wp-primary-hover', palette: 'themeDarkAlt' },
  { cssVar: '--wp-action-bg', semantic: 'primaryButtonBackground', palette: 'themePrimary' },
  { cssVar: '--wp-action-bg-hover', semantic: 'primaryButtonBackgroundHovered', palette: 'themeDarkAlt' },
  { cssVar: '--wp-action-text', semantic: 'primaryButtonText', palette: 'white' },
  { cssVar: '--wp-link', semantic: 'link', palette: 'themePrimary' },
  { cssVar: '--wp-text', semantic: 'bodyText', palette: 'neutralPrimary' },
  { cssVar: '--wp-muted', semantic: 'bodySubtext', palette: 'neutralSecondary' },
  { cssVar: '--wp-background', semantic: 'bodyBackground', palette: 'white' },
  { cssVar: '--wp-surface', palette: 'neutralLighter' },
  { cssVar: '--wp-surface-alt', palette: 'neutralLighterAlt' },
  { cssVar: '--wp-border', semantic: 'bodyDivider', palette: 'neutralLight' },
  { cssVar: '--wp-input-bg', semantic: 'inputBackground', palette: 'white' },
  { cssVar: '--wp-input-border', semantic: 'inputBorder', palette: 'neutralSecondary' },
  { cssVar: '--wp-error', semantic: 'errorText', palette: 'redDark' }
];

const pick = (map: ColorMap | undefined, key: string | undefined): string | undefined => (map && key ? map[key] : undefined);

/** Converte o tema do site nas variáveis --wp-* usadas pelos componentes. */
export const themeToCssVars = (theme: IReadonlyTheme | undefined): React.CSSProperties => {
  if (!theme) {
    return {};
  }
  const palette: ColorMap | undefined = theme.palette as ColorMap | undefined;
  const semantic: ColorMap | undefined = theme.semanticColors as ColorMap | undefined;
  if (!palette && !semantic) {
    return {};
  }
  const vars: Record<string, string> = {};
  THEME_VAR_SOURCES.forEach((source: IThemeVarSource) => {
    const color: string | undefined = pick(semantic, source.semantic) ?? pick(palette, source.palette);
    if (color) {
      vars[source.cssVar] = color;
    }
  });
  return vars as unknown as React.CSSProperties;
};
