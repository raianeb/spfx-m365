import * as React from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { TextField } from '@fluentui/react/lib/TextField';
import styles from './ListaFiltro.module.scss';
import { DateMode, FilterValues, IFilterValue, TextMatch } from '../../../services/camlBuilder';
import { IListField } from '../../../services/fieldSchema';
import { IDateShortcut, getDateShortcuts, isShortcutActive } from '../../../services/filterSummary';
import { activeButtonStyles, buttonStyles, dropdownStyles, primaryButtonStyles, subtleButtonStyles, textFieldStyles } from './controlStyles';

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

/** Data e faixa numérica têm mais de um controle e ocupam a largura do próprio conteúdo. */
const isWide = (type: string): boolean => type === 'DateTime' || isRange(type);

/**
 * Filtros gerados a partir do tipo de cada campo. A consulta só roda em "Filtrar" ou Enter
 * (skill sharepoint-dados-listas: aplicação explícita, sem consulta a cada tecla).
 */
const FilterBar: React.FC<IFilterBarProps> = ({ fields, values, errors, textMatch, busy, onChange, onApply, onClear }) => {
  // Prefixo único por instância: associa rótulo e campo sem colidir com outra Web Part na página.
  const baseId: string = React.useId();
  const shortcuts: IDateShortcut[] = React.useMemo((): IDateShortcut[] => getDateShortcuts(), []);
  const textHint: string = textMatch === 'contem' ? 'contém' : 'começa com';

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
          className={styles.dateSingle}
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
          className={styles.dateSingle}
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
          className={styles.dateSingle}
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
      <div className={styles.rangeInputs}>
        <TextField
          className={styles.rangeInput}
          type="date"
          ariaLabel={`${field.title}: data inicial`}
          value={value.from ?? ''}
          styles={textFieldStyles}
          onChange={(_event, text) => change({ from: text ?? '' })}
        />
        <span className={styles.rangeSeparator} aria-hidden="true">
          até
        </span>
        <TextField
          className={styles.rangeInput}
          type="date"
          ariaLabel={`${field.title}: data final`}
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
            <div className={styles.shortcuts} role="group" aria-label={`Atalhos de período: ${field.title}`}>
              {shortcuts.map((shortcut: IDateShortcut) => {
                const active: boolean = isShortcutActive(value, shortcut);
                return (
                  <DefaultButton
                    key={shortcut.key}
                    text={shortcut.text}
                    aria-pressed={active}
                    styles={active ? activeButtonStyles : buttonStyles}
                    onClick={(): void => onChange(field.name, shortcut.value)}
                  />
                );
              })}
            </div>
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
              className={styles.rangeInput}
              type="number"
              ariaLabel={`${field.title}: mínimo`}
              placeholder="mínimo"
              value={value.from ?? ''}
              styles={textFieldStyles}
              onChange={(_event, text) => onChange(field.name, { ...value, from: text ?? '' })}
            />
            <span className={styles.rangeSeparator} aria-hidden="true">
              até
            </span>
            <TextField
              className={styles.rangeInput}
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
    const inputId: string = `${baseId}-${field.name}`;
    return (
      <TextField
        id={inputId}
        label={field.title}
        // O operador fica no rótulo: continua visível depois que o usuário digita.
        onRenderLabel={(): JSX.Element => (
          <label htmlFor={inputId} className={styles.fieldLabel}>
            {field.title} <span className={styles.labelHint}>({textHint})</span>
          </label>
        )}
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
            <div key={field.name} className={isWide(field.type) ? `${styles.filterCell} ${styles.filterCellWide}` : styles.filterCell}>
              {renderField(field)}
            </div>
          ))}
        </div>
      )}
      <div className={styles.filterActions}>
        {fields.length > 0 && <DefaultButton text="Limpar filtros" disabled={busy} onClick={onClear} styles={subtleButtonStyles} />}
        <PrimaryButton type="submit" text="Filtrar" iconProps={{ iconName: 'Filter' }} disabled={busy} styles={primaryButtonStyles} />
      </div>
    </form>
  );
};

export default FilterBar;
