import * as React from 'react';
import { TextField } from '@fluentui/react/lib/TextField';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import formStyles from '../../../crud/crud.module.scss';
import ModalShell from '../../../crud/ModalShell';
import { primaryButtonStyles, secondaryButtonStyles, textFieldStyles } from '../../../crud/modalStyles';
import { ICrudFormContext } from '../../../crud/useCrudList';
import { ICategoria } from './IComunicadosProps';

export interface ICategoriaFormProps extends ICrudFormContext<ICategoria> {
  /** Categorias já cadastradas, para impedir nomes repetidos. */
  existing: ICategoria[];
}

/** Valida o nome da categoria: obrigatório, até 100 caracteres e sem repetir outra categoria. */
export const validateCategoria = (name: string, currentId: number | undefined, existing: ICategoria[]): string | undefined => {
  const value: string = name.trim();
  if (!value) {
    return 'Informe o nome da categoria.';
  }
  if (value.length > 100) {
    return 'Use no máximo 100 caracteres.';
  }
  const lower: string = value.toLowerCase();
  const duplicated: boolean = existing.some((category: ICategoria) => category.Id !== currentId && category.Title.trim().toLowerCase() === lower);
  return duplicated ? 'Já existe uma categoria com este nome.' : undefined;
};

/** Formulário de inclusão e edição de categoria (lista auxiliar de comunicados). */
const CategoriaForm: React.FC<ICategoriaFormProps> = ({ mode, item, contextLabel, themeStyle, diagnostics, onDismiss, save, existing }) => {
  const titleId: string = React.useId();
  const [name, setName] = React.useState<string>(item?.Title ?? '');
  const [submitted, setSubmitted] = React.useState<boolean>(false);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [saveError, setSaveError] = React.useState<string | undefined>(undefined);
  const error: string | undefined = submitted ? validateCategoria(name, item?.Id, existing) : undefined;

  const submit = async (): Promise<void> => {
    setSubmitted(true);
    if (validateCategoria(name, item?.Id, existing)) {
      return;
    }
    setSaving(true);
    setSaveError(undefined);
    try {
      await save({ Title: name.trim() });
    } catch {
      setSaveError('Não foi possível salvar a categoria. Tente novamente.');
      setSaving(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submit().catch(() => undefined);
  };

  return (
    <ModalShell contextLabel={contextLabel} titleId={titleId} firstFocusableClass={formStyles.firstField} onDismiss={onDismiss} themeStyle={themeStyle}>
      <h2 id={titleId} className={formStyles.modalTitle}>
        {mode === 'add' ? 'Nova categoria' : 'Editar categoria'}
      </h2>
      <form className={formStyles.modalForm} noValidate onSubmit={handleSubmit}>
        <div className={formStyles.fields}>
          <TextField
            className={formStyles.firstField}
            label="Nome da categoria"
            required
            value={name}
            errorMessage={error}
            styles={textFieldStyles}
            onChange={(_event, text) => setName(text ?? '')}
          />
        </div>
        {saveError && (
          <div className={formStyles.error} role="alert">
            {saveError}
          </div>
        )}
        <div className={formStyles.footer}>
          <span className={formStyles.helper}>Categorias em uso por comunicados não podem ser excluídas.</span>
          <div className={formStyles.footerActions}>
            <DefaultButton text="Cancelar" onClick={onDismiss} disabled={saving} styles={secondaryButtonStyles} />
            <PrimaryButton type="submit" text={saving ? 'Salvando...' : 'Salvar'} disabled={saving} styles={primaryButtonStyles} />
          </div>
        </div>
      </form>
      {diagnostics && <div className={formStyles.diagnosticsArea}>{diagnostics}</div>}
    </ModalShell>
  );
};

export default CategoriaForm;
