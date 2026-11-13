import * as React from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { TextField } from '@fluentui/react/lib/TextField';
import styles from './ListaFiltro.module.scss';
import { DateMode, FilterValues, IFilterValue, TextMatch } from '../../../services/camlBuilder';
import { IListField } from '../../../services/fieldSchema';
import { buttonStyles, dropdownStyles, textFieldStyles } from './controlStyles';

export interface IFilterBarProps {
  fields: IListField[];
  values: FilterValues;
  errors: Record<string, string>;
  textMatch: TextMatch;
  busy: boolean;
  onChange: (name: string, value: IFilterValue) => void;
  onApply: () => void;
  onClear: () => void;
}

const ALL_KEY: string = '';
const BOOLEAN_OPTIONS: IDropdownOption[] = [
  { key: ALL_KEY, text: 'Todos' },
  { key: 'sim', text: 'Sim' },
  { key: 'nao', text: 'Não' }
];
const DATE_MODE_OPTIONS: IDropdownOption[] = [
  { key: 'dia', text: 'Dia' },
  { key: 'mes', text: 'Mês' },
  { key: 'ano', text: 'Ano' },
  { key: 'intervalo', text: 'Intervalo' }
];

const isRange = (type: string): boolean => type === 'Number' || type === 'Currency' || type === 'Counter' || type === 'Integer';

/** Filtros gerados a partir do tipo de cada campo. A consulta só roda em "Filtrar" ou Enter. */
const FilterBar: React.FC<IFilterBarProps> = ({ fields, values, errors, textMatch, busy, onChange, onApply, onClear }) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onApply();
  };

  /** Entradas do modo escolhido. Trocar de modo limpa o valor anterior (ver onChange do seletor). */
  const renderDateInputs = (field: IListField, value: IFilterValue, mode: DateMode): React.ReactNode => {
    const change = (patch: Partial<IFilterValue>): void => onChange(field.name, { ...value, dateMode: mode, ...patch });

    if (mode === 'dia') {
      return (
        <TextField
          type="date"
          ariaLabel={`${field.title}: dia`}
          value={value.from ?? ''}
          styles={textFieldStyles}
          onChange={(_event, text) => change({ from: text ?? '' })}
        />
      );
    }
    if (mode === 'mes') {
      return (
        <TextField
          type="month"
          ariaLabel={`${field.title}: mês e ano`}
          value={value.from ?? ''}
          styles={textFieldStyles}
          onChange={(_event, text) => change({ from: text ?? '' })}
        />
      );
    }
    if (mode === 'ano') {
      return (
        <TextField
          type="number"
          ariaLabel={`${field.title}: ano`}
          placeholder="Ano (ex.: 2026)"
          value={value.from ?? ''}
          styles={textFieldStyles}
          onChange={(_event, text) => change({ from: text ?? '' })}
        />
      );
    }
    return (
      <div className={styles.dateStack}>
        <TextField
          type="date"
          ariaLabel={`${field.title}: de`}
          placeholder="de"
          value={value.from ?? ''}
          styles={textFieldStyles}
          onChange={(_event, text) => change({ from: text ?? '' })}
        />
        <TextField
          type="date"
          ariaLabel={`${field.title}: até`}
          placeholder="até"
          value={value.to ?? ''}
          styles={textFieldStyles}
          onChange={(_event, text) => change({ to: text ?? '' })}
        />
      </div>
    );
  };

  const renderField = (field: IListField): React.ReactNode => {
    const value: IFilterValue = values[field.name] ?? {};
    const error: string | undefined = errors[field.name];

    if (field.type === 'Choice') {
      const options: IDropdownOption[] = [{ key: ALL_KEY, text: 'Todos' }, ...field.choices.map((choice: string) => ({ key: choice, text: choice }))];
      return (
        <Dropdown
          label={field.title}
          options={options}
          styles={dropdownStyles}
          selectedKey={value.text ?? ALL_KEY}
          onChange={(_event, option) => onChange(field.name, { text: option ? String(option.key) : '' })}
        />
      );
    }
    if (field.type === 'Boolean') {
      return (
        <Dropdown
          label={field.title}
          options={BOOLEAN_OPTIONS}
          styles={dropdownStyles}
          selectedKey={value.bool ?? ALL_KEY}
          onChange={(_event, option) =>
            onChange(field.name, { bool: option && option.key !== ALL_KEY ? (option.key as 'sim' | 'nao') : undefined })
          }
        />
      );
    }
    if (field.type === 'DateTime') {
      const mode: DateMode = value.dateMode ?? 'intervalo';
      return (
        <fieldset className={styles.range}>
          <legend className={styles.rangeLegend}>{field.title}</legend>
          <div className={styles.dateRow}>
            <div className={styles.dateModeCell}>
              <Dropdown
                ariaLabel={`Tipo de período: ${field.title}`}
                options={DATE_MODE_OPTIONS}
                styles={dropdownStyles}
                selectedKey={mode}
                onChange={(_event, option) => {
                  if (option) {
                    // Só o modo muda: as datas digitadas em outro modo não valem mais.
                    onChange(field.name, { dateMode: option.key as DateMode });
                  }
                }}
              />
            </div>
            <div className={styles.dateInputs}>{renderDateInputs(field, value, mode)}</div>
          </div>
          {error && (
            <span className={styles.fieldError} role="alert">
              {error}
            </span>
          )}
        </fieldset>
      );
    }
    if (isRange(field.type)) {
      return (
        <fieldset className={styles.range}>
          <legend className={styles.rangeLegend}>{field.title}</legend>
          <div className={styles.rangeInputs}>
            <TextField
              type="number"
              ariaLabel={`${field.title}: mínimo`}
              placeholder="mínimo"
              value={value.from ?? ''}
              styles={textFieldStyles}
              onChange={(_event, text) => onChange(field.name, { ...value, from: text ?? '' })}
            />
            <TextField
              type="number"
              ariaLabel={`${field.title}: máximo`}
              placeholder="máximo"
              value={value.to ?? ''}
              styles={textFieldStyles}
              onChange={(_event, text) => onChange(field.name, { ...value, to: text ?? '' })}
            />
          </div>
          {error && (
            <span className={styles.fieldError} role="alert">
              {error}
            </span>
          )}
        </fieldset>
      );
    }
    return (
      <TextField
        label={field.title}
        placeholder={textMatch === 'contem' ? 'Contém' : 'Começa com'}
        value={value.text ?? ''}
        errorMessage={error}
        styles={textFieldStyles}
        onChange={(_event, text) => onChange(field.name, { text: text ?? '' })}
      />
    );
  };

  return (
    <form className={styles.filters} noValidate onSubmit={handleSubmit} aria-label="Filtros">
      {fields.length > 0 && (
        <div className={styles.filterGrid}>
          {fields.map((field: IListField) => (
            <div key={field.name} className={styles.filterCell}>
              {renderField(field)}
            </div>
          ))}
        </div>
      )}
      <div className={styles.filterActions}>
        <PrimaryButton type="submit" text="Filtrar" iconProps={{ iconName: 'Filter' }} disabled={busy} styles={buttonStyles} />
        {fields.length > 0 && (
          <DefaultButton text="Limpar" iconProps={{ iconName: 'ClearFilter' }} disabled={busy} onClick={onClear} styles={buttonStyles} />
        )}
      </div>
    </form>
  );
};

export default FilterBar;
