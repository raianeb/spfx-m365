import * as React from 'react';
import { TextField } from '@fluentui/react/lib/TextField';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import formStyles from '../../../crud/crud.module.scss';
import ModalShell from '../../../crud/ModalShell';
import { primaryButtonStyles, secondaryButtonStyles, textFieldStyles } from '../../../crud/modalStyles';
import { ICrudFormContext } from '../../../crud/useCrudList';
import RichTextEditor from './RichTextEditor';
import { IPergunta, IPerguntaValues, validatePergunta } from './faqRules';
import { sanitizeRichText, toSafeHtml } from './richText';

export interface IFaqFormProps extends ICrudFormContext<IPergunta> {
  /** Posição sugerida para uma pergunta nova: a última da lista mais um. */
  nextOrder: number;
}

const toValues = (item: IPergunta | undefined): IPerguntaValues => ({
  title: item?.Title ?? '',
  answer: toSafeHtml(item?.Resposta)
});

/** Inclusão recebe a última posição + 1. Edição mantém a posição atual, sem alterá-la pelo formulário. */
const toBody = (values: IPerguntaValues, item: IPergunta | undefined, nextOrder: number): Record<string, unknown> => ({
  Title: values.title.trim(),
  Resposta: sanitizeRichText(values.answer),
  Ordem: item?.Ordem ?? nextOrder
});

/** Formulário de inclusão e edição de pergunta, no layout padrão de modais. */
const FaqForm: React.FC<IFaqFormProps> = ({ mode, item, contextLabel, themeStyle, diagnostics, onDismiss, save, nextOrder }) => {
  const titleId: string = React.useId();
  const [values, setValues] = React.useState<IPerguntaValues>(() => toValues(item));
  const [submitted, setSubmitted] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState<boolean>(false);
  const [saveError, setSaveError] = React.useState<string | undefined>(undefined);

  const patch = (changes: Partial<IPerguntaValues>): void => {
    const next: IPerguntaValues = { ...values, ...changes };
    setValues(next);
    if (submitted) {
      setErrors(validatePergunta(next));
    }
  };

  const submit = async (): Promise<void> => {
    setSubmitted(true);
    const found: Record<string, string> = validatePergunta(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSaving(true);
    setSaveError(undefined);
    try {
      await save(toBody(values, item, nextOrder));
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
        {mode === 'add' ? 'Nova pergunta' : 'Editar pergunta'}
      </h2>
      <form className={formStyles.modalForm} noValidate onSubmit={handleSubmit}>
        <div className={formStyles.fields}>
          <TextField
            className={formStyles.firstField}
            label="Pergunta"
            required
            value={values.title}
            errorMessage={errors.title}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ title: text ?? '' })}
          />
          <RichTextEditor
            label="Resposta *"
            value={values.answer}
            errorMessage={errors.answer}
            onChange={(html: string) => patch({ answer: html })}
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

export default FaqForm;
