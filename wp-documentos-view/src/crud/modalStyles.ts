import * as React from 'react';
import { IconButton, IButtonStyles } from '@fluentui/react/lib/Button';
import { IModalStyles } from '@fluentui/react/lib/Modal';
import { IDropdownStyles } from '@fluentui/react/lib/Dropdown';
import { ITextFieldStyles } from '@fluentui/react/lib/TextField';

/**
 * Contêiner do Fluent Modal: o Fluent aplica overflow próprio em main e scrollableContent.
 * Zerar ambos aqui garante uma única rolagem, dentro da área de conteúdo (ver ModalShell).
 */
export const modalContainerStyles: Partial<IModalStyles> = {
  main: {
    width: 'min(800px, 92vw)',
    maxWidth: '92vw',
    maxHeight: '90vh',
    borderRadius: 8,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  scrollableContent: {
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    minHeight: 0,
  },
};

export const primaryButtonStyles: IButtonStyles = {
  root: {
    background: 'var(--cc-primary, #E45900)',
    borderColor: 'var(--cc-primary, #E45900)',
    borderRadius: 4,
    height: 36,
    minWidth: 96,
    padding: '0 16px',
    fontWeight: 500,
  },
  rootHovered: {
    background: 'var(--cc-primary-alt, #F08C00)',
    borderColor: 'var(--cc-primary-alt, #F08C00)',
    color: '#fff',
  },
  rootPressed: {
    background: 'var(--cc-primary-alt, #F08C00)',
    borderColor: 'var(--cc-primary-alt, #F08C00)',
  },
  rootDisabled: {
    background: '#c8c6c4',
    borderColor: '#c8c6c4',
    color: '#fff',
  },
};

export const secondaryButtonStyles: IButtonStyles = {
  root: {
    background: '#fff',
    borderRadius: 4,
    borderColor: '#c8c6c4',
    color: 'var(--cc-text, #1F1F1F)',
    height: 36,
    minWidth: 96,
    padding: '0 16px',
  },
  rootHovered: {
    background: '#fff',
    borderColor: 'var(--cc-primary, #E45900)',
    color: 'var(--cc-primary, #E45900)',
  },
};

export const dangerButtonStyles: IButtonStyles = {
  root: {
    background: '#a4262c',
    borderColor: '#a4262c',
    borderRadius: 4,
    height: 36,
    minWidth: 96,
    padding: '0 16px',
    fontWeight: 500,
  },
  rootHovered: {
    background: '#8a1f24',
    borderColor: '#8a1f24',
    color: '#fff',
  },
  rootPressed: {
    background: '#8a1f24',
    borderColor: '#8a1f24',
  },
};

export const closeButtonStyles: React.ComponentProps<typeof IconButton>['styles'] = {
  root: {
    color: 'var(--cc-muted, #5F5F5F)',
    borderRadius: 4,
    width: 32,
    height: 32,
  },
  rootHovered: {
    color: 'var(--cc-text, #1F1F1F)',
    background: '#f3f2f1',
  },
};

export const textFieldStyles: Partial<ITextFieldStyles> = {
  fieldGroup: { borderRadius: 4 },
};

export const dropdownStyles: Partial<IDropdownStyles> = {
  title: { borderRadius: 4 },
};
