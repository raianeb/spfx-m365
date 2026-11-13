import * as React from 'react';
import { TextField } from '@fluentui/react/lib/TextField';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import formStyles from '../../../crud/crud.module.scss';
import ModalShell from '../../../crud/ModalShell';
import { primaryButtonStyles, secondaryButtonStyles, textFieldStyles } from '../../../crud/modalStyles';
import { ISuggestionValues, validateSuggestion } from './faqRules';

export interface ISuggestionModalProps {
  contextLabel: string;
  themeStyle?: React.CSSProperties;
  onDismiss: () => void;
  /** Envia a sugestão. Rejeição com mensagem é exibida na própria modal. */
  onSend: (values: ISuggestionValues) => Promise<void>;
  diagnostics?: React.ReactNode;
}

const EMPTY: ISuggestionValues = { pergunta: '', detalhes: '' };

/** Modal para o usuário sugerir uma nova pergunta. Aparece somente quando o fluxo está configurado. */
const SuggestionModal: React.FC<ISuggestionModalProps> = ({ contextLabel, themeStyle, onDismiss, onSend, diagnostics }) => {
  const titleId: string = React.useId();
  const [values, setValues] = React.useState<ISuggestionValues>(EMPTY);
  const [submitted, setSubmitted] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [sending, setSending] = React.useState<boolean>(false);
  const [sendError, setSendError] = React.useState<string | undefined>(undefined);

  const patch = (changes: Partial<ISuggestionValues>): void => {
    const next: ISuggestionValues = { ...values, ...changes };
    setValues(next);
    if (submitted) {
      setErrors(validateSuggestion(next));
    }
  };

  const submit = async (): Promise<void> => {
    setSubmitted(true);
    const found: Record<string, string> = validateSuggestion(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSending(true);
    setSendError(undefined);
    try {
      await onSend(values);
    } catch (error: unknown) {
      setSendError(error instanceof Error ? error.message : 'Não foi possível enviar a sugestão.');
      setSending(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submit().catch(() => undefined);
  };

  return (
    <ModalShell contextLabel={contextLabel} titleId={titleId} firstFocusableClass={formStyles.firstField} onDismiss={onDismiss} themeStyle={themeStyle}>
      <h2 id={titleId} className={formStyles.modalTitle}>
        Sugerir nova pergunta
      </h2>
      <form className={formStyles.modalForm} noValidate onSubmit={handleSubmit}>
        <div className={formStyles.fields}>
          <TextField
            className={formStyles.firstField}
            label="Pergunta sugerida"
            required
            value={values.pergunta}
            errorMessage={errors.pergunta}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ pergunta: text ?? '' })}
          />
          <TextField
            label="Detalhes (opcional)"
            multiline
            rows={4}
            value={values.detalhes}
            errorMessage={errors.detalhes}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ detalhes: text ?? '' })}
          />
        </div>
        {sendError && (
          <div className={formStyles.error} role="alert">
            {sendError}
          </div>
        )}
        <div className={formStyles.footer}>
          <span className={formStyles.helper}>Sua sugestão será encaminhada à equipe responsável.</span>
          <div className={formStyles.footerActions}>
            <DefaultButton text="Cancelar" onClick={onDismiss} disabled={sending} styles={secondaryButtonStyles} />
            <PrimaryButton type="submit" text={sending ? 'Enviando...' : 'Enviar'} disabled={sending} styles={primaryButtonStyles} />
          </div>
        </div>
      </form>
      {diagnostics && <div className={formStyles.diagnosticsArea}>{diagnostics}</div>}
    </ModalShell>
  );
};

export default SuggestionModal;
