import { IButtonStyles } from '@fluentui/react/lib/Button';
import { IDropdownStyles } from '@fluentui/react/lib/Dropdown';
import { IModalStyles } from '@fluentui/react/lib/Modal';
import { ITextFieldStyles } from '@fluentui/react/lib/TextField';

/**
 * Padrão visual dos controles (skills spfx-design-base e spfx-tema-marca): campos e botões de barra
 * com 32px de altura, cantos de 4px, texto de 13px e ícones de 16px.
 * Nenhuma cor é fixa aqui: tudo vem das variáveis --wp-*, declaradas em .root e .modalTheme
 * (ListaFiltro.module.scss) e sobrescritas pelo tema do site em themeVars.ts.
 */
export const FIELD_HEIGHT: number = 32;
export const FIELD_RADIUS: number = 4;
const FONT_SIZE: number = 13;
const ICON_SIZE: number = 16;
const LABEL_STYLE: { fontSize: number; padding: string; color: string } = {
  fontSize: FONT_SIZE,
  padding: '0 0 4px',
  color: 'var(--wp-text)'
};

export const textFieldStyles: Partial<ITextFieldStyles> = {
  fieldGroup: {
    height: FIELD_HEIGHT,
    borderRadius: FIELD_RADIUS,
    border: '1px solid var(--wp-input-border)',
    background: 'var(--wp-input-bg)',
    selectors: {
      ':hover': { borderColor: 'var(--wp-text)' },
      '::after': { borderRadius: FIELD_RADIUS, borderColor: 'var(--wp-primary)' }
    }
  },
  field: {
    paddingLeft: 8,
    paddingRight: 8,
    fontSize: FONT_SIZE,
    color: 'var(--wp-text)',
    selectors: {
      '::placeholder': { color: 'var(--wp-muted)' }
    }
  },
  subComponentStyles: {
    label: { root: LABEL_STYLE }
  }
};

export const dropdownStyles: Partial<IDropdownStyles> = {
  label: LABEL_STYLE,
  title: {
    height: FIELD_HEIGHT,
    lineHeight: FIELD_HEIGHT - 2,
    borderRadius: FIELD_RADIUS,
    border: '1px solid var(--wp-input-border)',
    background: 'var(--wp-input-bg)',
    paddingLeft: 8,
    fontSize: FONT_SIZE,
    color: 'var(--wp-text)',
    selectors: {
      ':hover': { borderColor: 'var(--wp-text)' }
    }
  },
  caretDownWrapper: {
    height: FIELD_HEIGHT,
    lineHeight: FIELD_HEIGHT
  },
  dropdown: {
    selectors: {
      '::after': { borderRadius: FIELD_RADIUS, borderColor: 'var(--wp-primary)' }
    }
  }
};

const BUTTON_ROOT: IButtonStyles['root'] = {
  height: FIELD_HEIGHT,
  minWidth: 0,
  padding: '0 12px',
  borderRadius: FIELD_RADIUS,
  fontSize: FONT_SIZE
};
// Ícone de barra na cor do texto do botão: a cor de destaque fica para o estado ativo e o foco.
const BUTTON_ICON: IButtonStyles['icon'] = { fontSize: ICON_SIZE, color: 'inherit' };
const ICON_INHERIT: IButtonStyles['iconHovered'] = { color: 'inherit' };

/** Botão secundário de barra: fundo neutro; hover e foco destacam borda e texto, sem fundo forte. */
export const buttonStyles: IButtonStyles = {
  root: {
    ...BUTTON_ROOT,
    border: '1px solid var(--wp-border)',
    background: 'var(--wp-input-bg)',
    color: 'var(--wp-primary)'
  },
  rootHovered: { borderColor: 'var(--wp-primary)', background: 'var(--wp-input-bg)', color: 'var(--wp-primary)' },
  rootPressed: { borderColor: 'var(--wp-primary)', background: 'var(--wp-surface)', color: 'var(--wp-primary)' },
  label: { fontWeight: 'normal' },
  icon: BUTTON_ICON,
  iconHovered: ICON_INHERIT,
  iconPressed: ICON_INHERIT
};

/** Ação principal: um único botão preenchido por tela. Fundo e texto vêm pareados do tema. */
export const primaryButtonStyles: IButtonStyles = {
  root: {
    ...BUTTON_ROOT,
    border: '1px solid var(--wp-action-bg)',
    background: 'var(--wp-action-bg)',
    color: 'var(--wp-action-text)'
  },
  rootHovered: {
    borderColor: 'var(--wp-action-bg-hover)',
    background: 'var(--wp-action-bg-hover)',
    color: 'var(--wp-action-text)'
  },
  rootPressed: {
    borderColor: 'var(--wp-action-bg-hover)',
    background: 'var(--wp-action-bg-hover)',
    color: 'var(--wp-action-text)'
  },
  label: { fontWeight: 'semibold' },
  icon: BUTTON_ICON,
  iconHovered: ICON_INHERIT,
  iconPressed: ICON_INHERIT
};

/** Ação de baixo peso (Limpar): só texto, sem borda nem fundo. */
export const subtleButtonStyles: IButtonStyles = {
  root: {
    ...BUTTON_ROOT,
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--wp-primary)'
  },
  rootHovered: { borderColor: 'var(--wp-border)', background: 'transparent', color: 'var(--wp-primary)' },
  rootPressed: { borderColor: 'var(--wp-border)', background: 'var(--wp-surface)', color: 'var(--wp-primary)' },
  label: { fontWeight: 'normal' },
  icon: BUTTON_ICON,
  iconHovered: ICON_INHERIT,
  iconPressed: ICON_INHERIT
};

/** Estado ativo de um grupo (atalho de data selecionado): cor primária, texto de contraste, peso 600. */
export const activeButtonStyles: IButtonStyles = {
  ...primaryButtonStyles,
  label: { fontWeight: 'semibold' }
};

/** Botão só com ícone (Anterior e Próximo): 32px, ícone de 16px. */
export const iconButtonStyles: IButtonStyles = {
  root: {
    width: FIELD_HEIGHT,
    height: FIELD_HEIGHT,
    border: '1px solid var(--wp-border)',
    borderRadius: FIELD_RADIUS,
    background: 'var(--wp-input-bg)',
    color: 'var(--wp-primary)'
  },
  rootHovered: { borderColor: 'var(--wp-primary)', background: 'var(--wp-input-bg)', color: 'var(--wp-primary)' },
  rootPressed: { borderColor: 'var(--wp-primary)', background: 'var(--wp-surface)', color: 'var(--wp-primary)' },
  rootDisabled: { border: '1px solid var(--wp-border)', background: 'var(--wp-input-bg)', opacity: 0.45 },
  icon: BUTTON_ICON,
  iconHovered: ICON_INHERIT,
  iconPressed: ICON_INHERIT
};

/**
 * Modal padrão das soluções: uma única rolagem, dentro da altura da janela.
 * O Fluent aplica overflow automático na moldura (main) e na área de conteúdo (scrollableContent);
 * a moldura é zerada aqui para que só o conteúdo role.
 */
export const MODAL_STYLES: Partial<IModalStyles> = {
  main: {
    width: 'min(980px, 96vw)',
    maxWidth: '96vw',
    maxHeight: '92vh',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'hidden',
    padding: 0
  },
  scrollableContent: {
    flexGrow: 1,
    minHeight: 0,
    maxHeight: '92vh',
    overflowY: 'auto',
    padding: '20px 24px',
    boxSizing: 'border-box'
  }
};
