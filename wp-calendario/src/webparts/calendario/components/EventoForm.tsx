import * as React from 'react';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import formStyles from '../../../crud/crud.module.scss';
import calendarioStyles from './Calendario.module.scss';
import ModalShell from '../../../crud/ModalShell';
import { dropdownStyles, primaryButtonStyles, secondaryButtonStyles, textFieldStyles } from '../../../crud/modalStyles';
import { ICrudFormContext } from '../../../crud/useCrudList';
import { IEvento, TIPOS_EVENTO } from './IEventoProps';
import { toDateInput, toTimeInput } from './calendarUtils';
import { isSyncError } from '../calendarSync';

/** Valores do formulário. Data e hora são separados, como no formulário de evento do Outlook. */
export interface IEventoValues {
  title: string;
  local: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  tipo: string;
  descricao: string;
  organizador: string;
  /** Somente na inclusão: cria a reunião do Teams ao replicar para o grupo ou equipe. */
  reuniaoTeams: boolean;
}

const HOUR_MS: number = 60 * 60 * 1000;

/** Valores iniciais: evento existente, ou novo evento começando na próxima hora cheia. */
const toValues = (item: IEvento | undefined): IEventoValues => {
  if (item) {
    const start: Date = new Date(item.DataInicio);
    const end: Date = new Date(item.DataFim);
    return {
      title: item.Title,
      local: item.Local ?? '',
      allDay: item.DiaInteiro,
      startDate: toDateInput(start),
      startTime: toTimeInput(start),
      endDate: toDateInput(end),
      endTime: toTimeInput(end),
      tipo: item.Tipo ?? '',
      descricao: item.Descricao ?? '',
      organizador: item.Organizador ?? '',
      reuniaoTeams: false
    };
  }
  const now: Date = new Date();
  const start: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
  const end: Date = new Date(start.getTime() + HOUR_MS);
  return {
    title: '',
    local: '',
    allDay: false,
    startDate: toDateInput(start),
    startTime: toTimeInput(start),
    endDate: toDateInput(end),
    endTime: toTimeInput(end),
    tipo: '',
    descricao: '',
    organizador: '',
    reuniaoTeams: false
  };
};

/** Início e fim em Date local. Dia inteiro usa 00:00 do primeiro dia e 23:59:59 do último. */
const toBounds = (values: IEventoValues): { start: Date; end: Date } => {
  const startTime: string = values.allDay ? '00:00' : values.startTime;
  const endTime: string = values.allDay ? '23:59:59' : values.endTime;
  return {
    start: new Date(`${values.startDate}T${startTime}`),
    end: new Date(`${values.endDate}T${endTime}`)
  };
};

/**
 * Regras do evento: assunto e início são obrigatórios; o término não pode ser anterior ao início.
 * Campos de texto respeitam os limites de coluna do SharePoint.
 */
export const validateEvento = (values: IEventoValues): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!values.title.trim()) {
    errors.title = 'Informe o assunto.';
  } else if (values.title.trim().length > 255) {
    errors.title = 'Use no máximo 255 caracteres.';
  }
  if (!values.startDate) {
    errors.startDate = 'Informe a data de início.';
  }
  if (!values.allDay && !values.startTime) {
    errors.startTime = 'Informe a hora de início.';
  }
  if (!values.endDate) {
    errors.endDate = 'Informe a data de término.';
  }
  if (!values.allDay && !values.endTime) {
    errors.endTime = 'Informe a hora de término.';
  }
  if (!values.startDate || !values.endDate || (!values.allDay && (!values.startTime || !values.endTime))) {
    return errors;
  }
  const { start, end } = toBounds(values);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    errors.endDate = 'Data ou hora inválida.';
  } else if (end.getTime() < start.getTime()) {
    errors.endDate = 'O término não pode ser anterior ao início.';
  }
  if (values.local.trim().length > 255) {
    errors.local = 'Use no máximo 255 caracteres.';
  }
  if (values.descricao.trim().length > 4000) {
    errors.descricao = 'Use no máximo 4000 caracteres.';
  }
  if (values.organizador.trim().length > 255) {
    errors.organizador = 'Use no máximo 255 caracteres.';
  }
  return errors;
};

const toBody = (values: IEventoValues): Record<string, unknown> => {
  const { start, end } = toBounds(values);
  return {
    Title: values.title.trim(),
    Local: values.local.trim() ? values.local.trim() : null,
    DataInicio: start.toISOString(),
    DataFim: end.toISOString(),
    DiaInteiro: values.allDay,
    Descricao: values.descricao.trim() ? values.descricao.trim() : null,
    Organizador: values.organizador.trim() ? values.organizador.trim() : null,
    Tipo: values.tipo ? values.tipo : null
  };
};

type IEventoFormProps = ICrudFormContext<IEvento> & {
  /** Verdadeiro quando há grupo ou equipe configurado: o evento é replicado para lá. */
  syncEnabled: boolean;
};

/** Formulário de evento no padrão de modais da WP, com campos semelhantes ao do Outlook. */
const EventoForm: React.FC<IEventoFormProps> = ({ mode, item, contextLabel, themeStyle, diagnostics, onDismiss, save, syncEnabled }) => {
  const titleId: string = React.useId();
  const initial: IEventoValues = React.useMemo((): IEventoValues => toValues(item), [item]);
  const [values, setValues] = React.useState<IEventoValues>(initial);
  const [submitted, setSubmitted] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState<boolean>(false);
  const [saveError, setSaveError] = React.useState<string | undefined>(undefined);

  const patch = (changes: Partial<IEventoValues>): void => {
    const next: IEventoValues = { ...values, ...changes };
    setValues(next);
    if (submitted) {
      setErrors(validateEvento(next));
    }
  };

  const tipoOptions: IDropdownOption[] = TIPOS_EVENTO.map((tipo: string) => ({ key: tipo, text: tipo }));

  const submit = async (): Promise<void> => {
    setSubmitted(true);
    const found: Record<string, string> = validateEvento(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSaving(true);
    setSaveError(undefined);
    try {
      await save(toBody(values), { reuniaoTeams: values.reuniaoTeams });
    } catch (error: unknown) {
      setSaveError(isSyncError(error) ? (error as Error).message : 'Não foi possível salvar o evento. Verifique os dados e tente novamente.');
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
        {mode === 'add' ? 'Novo evento' : 'Editar evento'}
      </h2>
      <form className={formStyles.modalForm} noValidate onSubmit={handleSubmit}>
        <div className={formStyles.fields}>
          <TextField
            className={formStyles.firstField}
            label="Assunto"
            required
            value={values.title}
            errorMessage={errors.title}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ title: text ?? '' })}
          />
          <TextField
            label="Local"
            value={values.local}
            errorMessage={errors.local}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ local: text ?? '' })}
          />
          <Checkbox
            label="Dia inteiro"
            checked={values.allDay}
            onChange={(_event, checked) => patch({ allDay: checked === true })}
          />
          {mode === 'add' && syncEnabled && (
            <Checkbox
              label="Criar reunião do Microsoft Teams no grupo ou equipe"
              checked={values.reuniaoTeams}
              onChange={(_event, checked) => patch({ reuniaoTeams: checked === true })}
            />
          )}
          <div className={calendarioStyles.formRow}>
            <TextField
              label="Início (data)"
              type="date"
              required
              value={values.startDate}
              errorMessage={errors.startDate}
              styles={textFieldStyles}
              onChange={(_event, text) => patch({ startDate: text ?? '' })}
            />
            {!values.allDay && (
              <TextField
                label="Início (hora)"
                type="time"
                required
                value={values.startTime}
                errorMessage={errors.startTime}
                styles={textFieldStyles}
                onChange={(_event, text) => patch({ startTime: text ?? '' })}
              />
            )}
          </div>
          <div className={calendarioStyles.formRow}>
            <TextField
              label="Término (data)"
              type="date"
              required
              value={values.endDate}
              errorMessage={errors.endDate}
              styles={textFieldStyles}
              onChange={(_event, text) => patch({ endDate: text ?? '' })}
            />
            {!values.allDay && (
              <TextField
                label="Término (hora)"
                type="time"
                required
                value={values.endTime}
                errorMessage={errors.endTime}
                styles={textFieldStyles}
                onChange={(_event, text) => patch({ endTime: text ?? '' })}
              />
            )}
          </div>
          <Dropdown
            label="Tipo"
            placeholder="Selecione o tipo"
            options={tipoOptions}
            selectedKey={values.tipo || undefined}
            styles={dropdownStyles}
            onChange={(_event, option) => patch({ tipo: option ? String(option.key) : '' })}
          />
          <TextField
            label="Descrição"
            multiline
            rows={5}
            value={values.descricao}
            errorMessage={errors.descricao}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ descricao: text ?? '' })}
          />
          <TextField
            label="Organizador (opcional)"
            value={values.organizador}
            errorMessage={errors.organizador}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ organizador: text ?? '' })}
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

export default EventoForm;
