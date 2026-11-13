import * as React from 'react';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import formStyles from '../../../crud/crud.module.scss';
import ModalShell from '../../../crud/ModalShell';
import { dropdownStyles, primaryButtonStyles, secondaryButtonStyles, textFieldStyles } from '../../../crud/modalStyles';
import { ICrudFormContext } from '../../../crud/useCrudList';
import { ICategoria, IComunicado } from './IComunicadosProps';
import RichTextEditor from './RichTextEditor';
import { sanitizeRichText, toPlainText } from './richText';

export interface IComunicadoFormProps extends ICrudFormContext<IComunicado> {
  categories: ICategoria[];
}

/** Valores do formulário. A data é texto local (datetime-local), como o navegador entrega. */
export interface IComunicadoValues {
  title: string;
  date: string;
  categoryId: string;
  message: string;
  author: string;
}

const pad = (value: number): string => (value < 10 ? `0${value}` : String(value));

/** ISO (UTC) para o valor datetime-local no horário local. */
export const toLocalInput = (iso?: string): string => {
  const date: Date = iso ? new Date(iso) : new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toValues = (item: IComunicado | undefined): IComunicadoValues => ({
  title: item?.Title ?? '',
  date: toLocalInput(item?.DataComunicado),
  categoryId: typeof item?.CategoriaId === 'number' ? String(item.CategoriaId) : '',
  message: item?.Mensagem ?? '',
  author: item?.Autor ?? ''
});

/**
 * Regras do comunicado: título, data, categoria e mensagem são obrigatórios.
 * A categoria precisa existir na lista auxiliar. Autor é opcional.
 */
export const validateComunicado = (values: IComunicadoValues, categories: ICategoria[]): Record<string, string> => {
  const errors: Record<string, string> = {};
  const title: string = values.title.trim();
  if (!title) {
    errors.title = 'Informe o título.';
  } else if (title.length > 255) {
    errors.title = 'Use no máximo 255 caracteres.';
  }
  if (!values.date || isNaN(new Date(values.date).getTime())) {
    errors.date = 'Informe a data e hora do comunicado.';
  }
  const categoryId: number = Number(values.categoryId);
  if (!values.categoryId || categories.every((category: ICategoria) => category.Id !== categoryId)) {
    errors.categoryId = 'Selecione uma categoria cadastrada.';
  }
  // Limite e obrigatoriedade valem para o texto visível, sem as tags do formato.
  const message: string = toPlainText(values.message);
  if (!message) {
    errors.message = 'Informe a mensagem.';
  } else if (message.length > 4000) {
    errors.message = 'Use no máximo 4000 caracteres.';
  }
  if (values.author.trim().length > 255) {
    errors.author = 'Use no máximo 255 caracteres.';
  }
  return errors;
};

const toBody = (values: IComunicadoValues): Record<string, unknown> => ({
  Title: values.title.trim(),
  DataComunicado: new Date(values.date).toISOString(),
  CategoriaId: Number(values.categoryId),
  Mensagem: sanitizeRichText(values.message),
  Autor: values.author.trim() ? values.author.trim() : null
});

/** Formulário de inclusão e edição de comunicado, no layout padrão de modais. */
const ComunicadoForm: React.FC<IComunicadoFormProps> = ({
  mode,
  item,
  contextLabel,
  themeStyle,
  diagnostics,
  onDismiss,
  save,
  categories
}) => {
  const titleId: string = React.useId();
  const initial: IComunicadoValues = React.useMemo((): IComunicadoValues => toValues(item), [item]);
  const [values, setValues] = React.useState<IComunicadoValues>(initial);
  const [submitted, setSubmitted] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState<boolean>(false);
  const [saveError, setSaveError] = React.useState<string | undefined>(undefined);

  const patch = (changes: Partial<IComunicadoValues>): void => {
    const next: IComunicadoValues = { ...values, ...changes };
    setValues(next);
    if (submitted) {
      setErrors(validateComunicado(next, categories));
    }
  };

  const options: IDropdownOption[] = categories.map((category: ICategoria) => ({ key: String(category.Id), text: category.Title }));

  const submit = async (): Promise<void> => {
    setSubmitted(true);
    const found: Record<string, string> = validateComunicado(values, categories);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSaving(true);
    setSaveError(undefined);
    try {
      await save(toBody(values));
    } catch {
      setSaveError('Não foi possível salvar. Verifique os dados e tente novamente.');
      setSaving(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submit().catch(() => undefined);
  };

  return (
    <ModalShell
      contextLabel={contextLabel}
      titleId={titleId}
      firstFocusableClass={formStyles.firstField}
      onDismiss={onDismiss}
      themeStyle={themeStyle}
    >
      <h2 id={titleId} className={formStyles.modalTitle}>
        {mode === 'add' ? 'Novo comunicado' : 'Editar comunicado'}
      </h2>
      <form className={formStyles.modalForm} noValidate onSubmit={handleSubmit}>
        <div className={formStyles.fields}>
          <TextField
            className={formStyles.firstField}
            label="Título"
            required
            value={values.title}
            errorMessage={errors.title}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ title: text ?? '' })}
          />
          <TextField
            label="Data e hora"
            type="datetime-local"
            required
            value={values.date}
            errorMessage={errors.date}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ date: text ?? '' })}
          />
          <Dropdown
            label="Categoria"
            required
            placeholder={options.length > 0 ? 'Selecione a categoria' : 'Nenhuma categoria cadastrada'}
            options={options}
            selectedKey={values.categoryId || undefined}
            disabled={options.length === 0}
            errorMessage={errors.categoryId}
            styles={dropdownStyles}
            onChange={(_event, option) => patch({ categoryId: option ? String(option.key) : '' })}
          />
          <RichTextEditor
            label="Mensagem *"
            value={values.message}
            errorMessage={errors.message}
            onChange={(html: string) => patch({ message: html })}
          />
          <TextField
            label="Autor (opcional)"
            value={values.author}
            errorMessage={errors.author}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ author: text ?? '' })}
          />
        </div>
        {saveError && (
          <div className={formStyles.error} role="alert">
            {saveError}
          </div>
        )}
        <div className={formStyles.footer}>
          <span className={formStyles.helper}>Campos marcados com * são obrigatórios.</span>
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

export default ComunicadoForm;
