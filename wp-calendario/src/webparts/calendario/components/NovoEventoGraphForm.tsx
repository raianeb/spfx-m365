import * as React from 'react';
import { TextField } from '@fluentui/react/lib/TextField';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import formStyles from '../../../crud/crud.module.scss';
import calendarioStyles from './Calendario.module.scss';
import ModalShell from '../../../crud/ModalShell';
import { primaryButtonStyles, secondaryButtonStyles, textFieldStyles } from '../../../crud/modalStyles';
import { DiagnosticsLogger, DiagnosticsPanel } from '../../../core/diagnostics';
import { INovoEventoValues, validateNovoEvento } from '../../../services/GraphEventInput';
import { toDateInput, toTimeInput } from './calendarUtils';

export interface INovoEventoGraphFormProps {
  logger: DiagnosticsLogger;
  contextLabel: string;
  themeStyle?: React.CSSProperties;
  onDismiss: () => void;
  /** Grava o evento. Em caso de falha, lança Error com a mensagem a exibir no formulário. */
  save: (values: INovoEventoValues) => Promise<void>;
}

const HOUR_MS: number = 60 * 60 * 1000;

/** Novo evento começando na próxima hora cheia, com duração de uma hora. */
const initialValues = (now: Date): INovoEventoValues => {
  const start: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
  const end: Date = new Date(start.getTime() + HOUR_MS);
  return {
    titulo: '',
    local: '',
    dataInicio: toDateInput(start),
    horaInicio: toTimeInput(start),
    dataFim: toDateInput(end),
    horaFim: toTimeInput(end),
    descricao: '',
    reuniaoTeams: false
  };
};

/** Formulário de criação de evento no calendário do grupo ou equipe, no padrão de modais da WP. */
const NovoEventoGraphForm: React.FC<INovoEventoGraphFormProps> = ({ logger, contextLabel, themeStyle, onDismiss, save }) => {
  const titleId: string = React.useId();
  const [values, setValues] = React.useState<INovoEventoValues>((): INovoEventoValues => initialValues(new Date()));
  const [submitted, setSubmitted] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState<boolean>(false);
  const [saveError, setSaveError] = React.useState<string | undefined>(undefined);

  const patch = (changes: Partial<INovoEventoValues>): void => {
    const next: INovoEventoValues = { ...values, ...changes };
    setValues(next);
    if (submitted) {
      setErrors(validateNovoEvento(next, new Date()));
    }
  };

  const submit = async (): Promise<void> => {
    setSubmitted(true);
    const found: Record<string, string> = validateNovoEvento(values, new Date());
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSaving(true);
    setSaveError(undefined);
    try {
      await save(values);
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível criar o evento.');
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
        Novo evento
      </h2>
      <form className={formStyles.modalForm} noValidate onSubmit={handleSubmit}>
        <div className={formStyles.fields}>
          <TextField
            className={formStyles.firstField}
            label="Assunto"
            required
            value={values.titulo}
            errorMessage={errors.titulo}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ titulo: text ?? '' })}
          />
          <TextField
            label="Local"
            value={values.local}
            errorMessage={errors.local}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ local: text ?? '' })}
          />
          <div className={calendarioStyles.formRow}>
            <TextField
              label="Início (data)"
              type="date"
              required
              value={values.dataInicio}
              errorMessage={errors.dataInicio}
              styles={textFieldStyles}
              onChange={(_event, text) => patch({ dataInicio: text ?? '' })}
            />
            <TextField
              label="Início (hora)"
              type="time"
              required
              value={values.horaInicio}
              errorMessage={errors.horaInicio}
              styles={textFieldStyles}
              onChange={(_event, text) => patch({ horaInicio: text ?? '' })}
            />
          </div>
          <div className={calendarioStyles.formRow}>
            <TextField
              label="Término (data)"
              type="date"
              required
              value={values.dataFim}
              errorMessage={errors.dataFim}
              styles={textFieldStyles}
              onChange={(_event, text) => patch({ dataFim: text ?? '' })}
            />
            <TextField
              label="Término (hora)"
              type="time"
              required
              value={values.horaFim}
              errorMessage={errors.horaFim}
              styles={textFieldStyles}
              onChange={(_event, text) => patch({ horaFim: text ?? '' })}
            />
          </div>
          <TextField
            label="Descrição"
            multiline
            rows={4}
            value={values.descricao}
            errorMessage={errors.descricao}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ descricao: text ?? '' })}
          />
          <Checkbox
            label="Criar reunião do Microsoft Teams"
            checked={values.reuniaoTeams}
            onChange={(_event, checked) => patch({ reuniaoTeams: checked === true })}
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
      <div className={formStyles.diagnosticsArea}>
        <DiagnosticsPanel logger={logger} />
      </div>
    </ModalShell>
  );
};

export default NovoEventoGraphForm;
