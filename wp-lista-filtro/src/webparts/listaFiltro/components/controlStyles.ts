import { IButtonStyles } from '@fluentui/react/lib/Button';
import { IDropdownStyles } from '@fluentui/react/lib/Dropdown';
import { IModalStyles } from '@fluentui/react/lib/Modal';
import { ITextFieldStyles } from '@fluentui/react/lib/TextField';

/**
 * Padrão visual das controles das soluções: campos e botões arredondados (pílula),
 * na mesma altura. Use estes estilos em qualquer campo, seletor ou botão de ação.
 */
export const FIELD_HEIGHT: number = 36;
export const FIELD_RADIUS: number = 18;
const BORDER: string = '#c8c6c4';
const BORDER_HOVER: string = '#8a8886';

export const textFieldStyles: Partial<ITextFieldStyles> = {
  fieldGroup: {
    height: FIELD_HEIGHT,
    borderRadius: FIELD_RADIUS,
    border: `1px solid ${BORDER}`,
    background: '#ffffff',
    selectors: {
      ':hover': { borderColor: BORDER_HOVER },
      '::after': { borderRadius: FIELD_RADIUS }
    }
  },
  field: {
    paddingLeft: 14,
    paddingRight: 14,
    fontSize: 14,
    color: 'var(--wp-text, #1f1f1f)',
    selectors: {
      '::placeholder': { color: 'var(--wp-muted, #5f5f5f)' }
    }
  }
};

export const dropdownStyles: Partial<IDropdownStyles> = {
  title: {
    height: FIELD_HEIGHT,
    lineHeight: FIELD_HEIGHT - 2,
    borderRadius: FIELD_RADIUS,
    border: `1px solid ${BORDER}`,
    background: '#ffffff',
    paddingLeft: 14,
    selectors: {
      ':hover': { borderColor: BORDER_HOVER }
    }
  },
  dropdown: {
    selectors: {
      '::after': { borderRadius: FIELD_RADIUS }
    }
  }
};

export const buttonStyles: IButtonStyles = {
  root: {
    height: FIELD_HEIGHT,
    minWidth: 0,
    padding: '0 18px',
    borderRadius: FIELD_RADIUS
  },
  label: {
    fontWeight: 'semibold'
  }
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
