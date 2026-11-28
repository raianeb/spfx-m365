// Modelo: mapeamento do tema do site para os tokens do padrão GTI (skill spfx-padrao-visual-gti).
// Use com "Herdar tema = Sim" (skill spfx-tema-marca). Com "Não", não passe tema: valem os tokens da folha.
// O tipo é estrutural para não acoplar o modelo a uma versão específica do SPFx;
// o IReadonlyTheme de @microsoft/sp-component-base é compatível com ele.
import type * as React from 'react';

export interface ITemaDoSite {
  isInverted?: boolean;
  palette?: { [slot: string]: string | undefined };
  semanticColors?: { [slot: string]: string | undefined };
}

/** Devolve as variáveis CSS que sobrescrevem os tokens na raiz .gti. Slots ausentes ficam com o padrão. */
export function tokensDoTema(tema?: ITemaDoSite): React.CSSProperties {
  if (!tema) return {};
  const p = tema.palette ?? {};
  const s = tema.semanticColors ?? {};
  // Cores de marca vêm sempre do tema. Fundo, superfície, bordas e textos só mudam em tema escuro
  // (isInverted): no tema claro, o cinza de fundo e os cartões brancos do padrão GTI são mantidos.
  const valores: { [token: string]: string | undefined } = {
    '--pi-blue': p.themePrimary,
    '--pi-blue-hover': p.themeDarkAlt,
    '--pi-accent': p.themeSecondary,
    '--pi-soft': p.themeLighterAlt,
    '--pi-hero': p.themeDark,
    ...(tema.isInverted
      ? {
          '--pi-navy': s.bodyText,
          '--pi-ink': s.bodyText,
          '--pi-muted': s.bodySubtext,
          '--pi-border': s.bodyDivider,
          '--pi-bg': s.bodyBackground,
          '--pi-surface': s.bodyStandoutBackground ?? s.bodyBackground,
          '--pi-hover': p.neutralLighter
        }
      : {})
  };
  const estilo: { [token: string]: string } = {};
  Object.keys(valores).forEach((token) => {
    const valor = valores[token];
    if (valor) estilo[token] = valor;
  });
  return estilo as React.CSSProperties;
}
