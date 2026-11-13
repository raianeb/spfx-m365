import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Modal } from '@fluentui/react/lib/Modal';
import { MODAL_STYLES, buttonStyles, dropdownStyles } from './controlStyles';
import styles from './ListaFiltro.module.scss';
import ChartView, { CHART_LABELS, ChartType } from './ChartView';
import { ICondition } from '../../../services/camlBuilder';
import {
  GRANULARITY_LABELS,
  Granularity,
  IAggregation,
  IBucket,
  METRIC_LABELS,
  Metric,
  aggregateRows
} from '../../../services/aggregate';
import { IListField } from '../../../services/fieldSchema';
import { ListRow, ListQueryService } from '../../../services/ListQueryService';
import { IScanToken, isScanCancelled, scanItems } from '../../../services/scanService';
import { IPdfKpi, exportChartPdf, svgToPng } from '../../../services/exportPdf';

/** Teto de linhas lidas para o gráfico. Acima disso a tela avisa que o resultado é parcial. */
const CHART_MAX_ROWS: number = 200000;
const DIMENSION_TYPES: ReadonlySet<string> = new Set<string>([
  'Text',
  'Choice',
  'Boolean',
  'DateTime',
  'Number',
  'Currency',
  'Integer',
  'Counter'
]);
const NUMERIC_TYPES: ReadonlySet<string> = new Set<string>(['Number', 'Currency', 'Integer', 'Counter']);
const INT_FORMAT: Intl.NumberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const DEC_FORMAT: Intl.NumberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
/** Rosca mostra até seis fatias: acima disso, os menores grupos são agrupados em "Outros". */
const MAX_DONUT: number = 6;
const DONUT_KEEP: number = 5;

/** Agrupa as fatias excedentes da rosca em "Outros". Só vale para quantidade e soma (partes de um todo). */
const foldForDonut = (buckets: IBucket[]): IBucket[] => {
  if (buckets.length <= MAX_DONUT) {
    return buckets;
  }
  const kept: IBucket[] = buckets.slice(0, DONUT_KEEP);
  const rest: IBucket[] = buckets.slice(DONUT_KEEP);
  const value: number = rest.reduce((sum: number, bucket: IBucket) => sum + bucket.value, 0);
  const others: IBucket = { key: '__resto', label: `Outros (${rest.length})`, acc: rest[0].acc, value, folded: true };
  return [...kept, others];
};

const CHART_OPTIONS: IDropdownOption[] = (Object.keys(CHART_LABELS) as ChartType[]).map((key: ChartType) => ({
  key,
  text: CHART_LABELS[key]
}));
const METRIC_OPTIONS: IDropdownOption[] = (Object.keys(METRIC_LABELS) as Metric[]).map((key: Metric) => ({
  key,
  text: METRIC_LABELS[key]
}));
const GRANULARITY_OPTIONS: IDropdownOption[] = (Object.keys(GRANULARITY_LABELS) as Granularity[]).map((key: Granularity) => ({
  key,
  text: GRANULARITY_LABELS[key]
}));

export interface IChartsModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  service: ListQueryService;
  listTitle: string;
  itemCount: number;
  fields: IListField[];
  /** Condições da consulta aplicada na tela: o gráfico usa os mesmos filtros. */
  conditions: ICondition[];
  contextLabel: string;
  /** Valores preenchidos na tela no momento da abertura: vazio = lista inteira. */
  hasFilter: boolean;
}

interface IScanState {
  status: 'idle' | 'running' | 'done' | 'error';
  scanned: number;
  rows: ListRow[];
  truncated: boolean;
}

const IDLE: IScanState = { status: 'idle', scanned: 0, rows: [], truncated: false };

/**
 * Painel de visualização dos registros filtrados: indicadores, gráfico e tabela de valores.
 * A varredura lê apenas as duas colunas escolhidas; trocar só o tipo de gráfico ou a métrica não relê a lista.
 */
const ChartsModal: React.FC<IChartsModalProps> = ({
  isOpen,
  onDismiss,
  service,
  listTitle,
  itemCount,
  fields,
  conditions,
  contextLabel,
  hasFilter
}) => {
  const dimensions: IListField[] = React.useMemo(
    (): IListField[] => fields.filter((field: IListField) => DIMENSION_TYPES.has(field.type)),
    [fields]
  );
  const numbers: IListField[] = React.useMemo(
    (): IListField[] => fields.filter((field: IListField) => NUMERIC_TYPES.has(field.type)),
    [fields]
  );

  const [chartType, setChartType] = React.useState<ChartType>('barH');
  const [dimensionName, setDimensionName] = React.useState<string>('');
  const [granularity, setGranularity] = React.useState<Granularity>('mes');
  const [metric, setMetric] = React.useState<Metric>('count');
  const [valueName, setValueName] = React.useState<string>('');
  const [scan, setScan] = React.useState<IScanState>(IDLE);
  const [pdfBusy, setPdfBusy] = React.useState<boolean>(false);
  const [pdfError, setPdfError] = React.useState<string>('');
  const chartRef: React.RefObject<HTMLDivElement> = React.useRef<HTMLDivElement>(null);

  const dimension: IListField | undefined =
    dimensions.find((field: IListField) => field.name === dimensionName) ?? dimensions[0];
  const valueField: IListField | undefined =
    numbers.find((field: IListField) => field.name === valueName) ?? numbers[0];
  const needsValue: boolean = metric !== 'count';
  const valueReady: boolean = !needsValue || valueField !== undefined;

  // Varredura: lê a lista filtrada com as colunas escolhidas. Mudança de colunas ou filtro cancela a anterior.
  React.useEffect((): (() => void) | undefined => {
    if (!isOpen || !dimension || !valueReady) {
      setScan(IDLE);
      return undefined;
    }
    const token: IScanToken = { cancelled: false };
    const viewFields: string[] = [dimension.name];
    if (needsValue && valueField) {
      viewFields.push(valueField.name);
    }
    setScan({ status: 'running', scanned: 0, rows: [], truncated: false });
    scanItems({
      service,
      listTitle,
      listItemCount: itemCount,
      conditions,
      viewFields,
      collect: true,
      maxRows: CHART_MAX_ROWS,
      token,
      onProgress: (scanned: number): void => {
        if (!token.cancelled) {
          setScan((current: IScanState) => ({ ...current, scanned }));
        }
      }
    })
      .then((result) => {
        if (!token.cancelled) {
          setScan({ status: 'done', scanned: result.total, rows: result.rows, truncated: result.truncated });
        }
      })
      .catch((error: unknown) => {
        if (!token.cancelled && !isScanCancelled(error)) {
          setScan({ status: 'error', scanned: 0, rows: [], truncated: false });
        }
      });
    return (): void => {
      token.cancelled = true;
    };
    // Métrica e tipo de gráfico não entram aqui: agregam sobre as linhas já lidas.
  }, [isOpen, listTitle, itemCount, conditions, dimension?.name, valueField?.name, needsValue, valueReady, service]);

  const aggregation: IAggregation | undefined = React.useMemo((): IAggregation | undefined => {
    if (scan.status !== 'done' || !dimension) {
      return undefined;
    }
    return aggregateRows(scan.rows, {
      dimension,
      valueField: needsValue ? valueField : undefined,
      granularity: dimension.type === 'DateTime' ? granularity : undefined,
      metric
    });
  }, [scan, dimension, valueField, needsValue, granularity, metric]);

  const format = (value: number): string => (metric === 'count' ? INT_FORMAT.format(value) : DEC_FORMAT.format(value));

  let effectiveType: ChartType = chartType;
  let typeNote: string = '';
  if (aggregation) {
    if (effectiveType === 'line' && !aggregation.timeSeries) {
      effectiveType = 'barV';
      typeNote = 'Linha só se aplica a datas. Exibindo barras verticais.';
    }
    if (effectiveType === 'donut' && (metric === 'avg' || metric === 'min' || metric === 'max')) {
      effectiveType = 'barH';
      typeNote = 'Rosca só para quantidade e soma (partes de um todo). Exibindo barras horizontais.';
    } else if (effectiveType === 'donut' && aggregation.buckets.length > MAX_DONUT) {
      typeNote = `Rosca com até ${MAX_DONUT} fatias: os menores grupos foram agrupados em "Outros".`;
    }
  }

  const buckets: IBucket[] = aggregation ? aggregation.buckets : [];
  const categories: number = aggregation ? aggregation.buckets.filter((b: IBucket) => !b.folded).length : 0;
  const top: IBucket | undefined = buckets.filter((b: IBucket) => !b.folded).reduce(
    (best: IBucket | undefined, b: IBucket) => (best === undefined || b.value > best.value ? b : best),
    undefined
  );
  const grandTotal: number = aggregation ? buckets.reduce((sum: number, b: IBucket) => sum + b.value, 0) : 0;
  /** Percentual do grupo sobre o total. Média, mínimo e máximo não são partes de um todo. */
  const shareOf = (bucket: IBucket): string =>
    grandTotal > 0 && metric !== 'avg' && metric !== 'min' && metric !== 'max'
      ? `${DEC_FORMAT.format((bucket.value / grandTotal) * 100)}%`
      : '—';
  const description: string = aggregation
    ? `${METRIC_LABELS[metric]} por ${dimension?.title ?? ''}: ${buckets.length} grupo(s)`
    : '';

  /** PDF do que está na tela: gráfico (PNG), indicadores e tabela de valores. */
  const exportPdf = async (): Promise<void> => {
    if (!aggregation || !dimension || pdfBusy) {
      return;
    }
    setPdfBusy(true);
    setPdfError('');
    try {
      const svg: SVGSVGElement | null = chartRef.current?.querySelector('svg') ?? null;
      const chart = svg ? await svgToPng(svg) : undefined;
      const kpis: IPdfKpi[] = [{ label: 'Registros no filtro', value: INT_FORMAT.format(aggregation.overall.rows) }];
      if (metric !== 'count') {
        kpis.push({ label: `${METRIC_LABELS[metric]}${valueField ? ` · ${valueField.title}` : ''}`, value: format(aggregation.overallValue) });
      }
      kpis.push({ label: aggregation.timeSeries ? 'Períodos' : 'Grupos', value: INT_FORMAT.format(aggregation.timeSeries ? buckets.length : categories) });
      if (top && !aggregation.timeSeries) {
        kpis.push({ label: 'Maior grupo', value: `${top.label} (${format(top.value)})` });
      }
      const headers: string[] = [dimension.title, 'Registros'];
      if (metric !== 'count') {
        headers.push(METRIC_LABELS[metric]);
      }
      headers.push('% do total');
      const rows: string[][] = buckets.map((bucket: IBucket) => {
        const cells: string[] = [bucket.label, INT_FORMAT.format(bucket.acc.rows)];
        if (metric !== 'count') {
          cells.push(format(bucket.value));
        }
        cells.push(shareOf(bucket));
        return cells;
      });
      const stamp: string = new Date().toISOString().slice(0, 10);
      await exportChartPdf({
        fileName: `${listTitle}-graficos-${stamp}.pdf`,
        title: `Visualização · ${contextLabel}`,
        subtitle: `${description}. ${hasFilter ? 'Filtros aplicados na tela.' : 'Sem filtro: todos os registros da lista.'} Gerado em ${new Date().toLocaleString('pt-BR')}.`,
        kpis,
        chart,
        headers,
        rows
      });
    } catch {
      setPdfError('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={onDismiss}
      isBlocking={false}
      styles={MODAL_STYLES}
      titleAriaId="lista-filtro-graficos-titulo"
    >
      <div className={styles.chartsHeader}>
        <h2 id="lista-filtro-graficos-titulo" className={styles.chartsTitle}>
          Visualização · {contextLabel}
        </h2>
        <div className={styles.resultsActions}>
          <DefaultButton
            text={pdfBusy ? 'Gerando PDF…' : 'Exportar PDF'}
            iconProps={{ iconName: 'PDF' }}
            disabled={!aggregation || buckets.length === 0 || pdfBusy}
            onClick={(): void => {
              exportPdf().catch(() => undefined);
            }}
            styles={buttonStyles}
          />
          <DefaultButton text="Fechar" onClick={onDismiss} styles={buttonStyles} />
        </div>
      </div>
      {pdfError !== '' && <div className={styles.message} role="alert">{pdfError}</div>}

      <p className={styles.chartsHint}>
        {hasFilter ? 'Usa os mesmos filtros aplicados na tela.' : 'Sem filtro: considera todos os registros da lista.'}
      </p>

      <div className={styles.chartControls}>
        <Dropdown
          styles={dropdownStyles}
          label="Visualização"
          options={CHART_OPTIONS}
          selectedKey={chartType}
          onChange={(_event, option) => option && setChartType(option.key as ChartType)}
        />
        <Dropdown
          styles={dropdownStyles}
          label="Agrupar por"
          options={dimensions.map((field: IListField): IDropdownOption => ({ key: field.name, text: field.title }))}
          selectedKey={dimension?.name ?? null}
          onChange={(_event, option) => option && setDimensionName(String(option.key))}
        />
        {dimension?.type === 'DateTime' && (
          <Dropdown
          styles={dropdownStyles}
            label="Período"
            options={GRANULARITY_OPTIONS}
            selectedKey={granularity}
            onChange={(_event, option) => option && setGranularity(option.key as Granularity)}
          />
        )}
        <Dropdown
          styles={dropdownStyles}
          label="Medida"
          options={METRIC_OPTIONS}
          selectedKey={metric}
          onChange={(_event, option) => option && setMetric(option.key as Metric)}
        />
        {needsValue && (
          <Dropdown
          styles={dropdownStyles}
            label="Campo numérico"
            options={numbers.map((field: IListField): IDropdownOption => ({ key: field.name, text: field.title }))}
            selectedKey={valueField?.name ?? null}
            placeholder={numbers.length === 0 ? 'Sem campos numéricos' : 'Escolha um campo'}
            onChange={(_event, option) => option && setValueName(String(option.key))}
          />
        )}
      </div>

      {!valueReady && <div className={styles.message} role="status">Esta lista não tem campo numérico para essa medida.</div>}

      {scan.status === 'running' && (
        <div className={styles.skeleton} aria-busy="true" aria-live="polite" aria-label={`Calculando: ${scan.scanned} registro(s) lidos`}>
          <span className={styles.srOnly}>Calculando: {INT_FORMAT.format(scan.scanned)} registro(s) lidos</span>
        </div>
      )}
      {scan.status === 'error' && <div className={styles.message} role="alert">Não foi possível calcular a visualização. Tente novamente.</div>}

      {scan.status === 'done' && aggregation && (
        <>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Registros no filtro</span>
              <span className={styles.kpiValue}>{INT_FORMAT.format(aggregation.overall.rows)}</span>
            </div>
            {metric !== 'count' && (
              <div className={styles.kpi}>
                <span className={styles.kpiLabel}>{METRIC_LABELS[metric]}{valueField ? ` · ${valueField.title}` : ''}</span>
                <span className={styles.kpiValue}>{format(aggregation.overallValue)}</span>
              </div>
            )}
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>{aggregation.timeSeries ? 'Períodos' : 'Grupos'}</span>
              <span className={styles.kpiValue}>{INT_FORMAT.format(aggregation.timeSeries ? buckets.length : categories)}</span>
            </div>
            {top && !aggregation.timeSeries && (
              <div className={styles.kpi}>
                <span className={styles.kpiLabel}>Maior grupo</span>
                <span className={styles.kpiValue}>{top.label}</span>
                <span className={styles.kpiSub}>{format(top.value)}</span>
              </div>
            )}
          </div>

          {scan.truncated && (
            <div className={styles.message} role="status">
              O gráfico considera os primeiros {INT_FORMAT.format(CHART_MAX_ROWS)} registros. Refine o filtro para ver o total completo.
            </div>
          )}
          {typeNote !== '' && <div className={styles.chartsHint}>{typeNote}</div>}

          {buckets.length === 0 ? (
            <div className={styles.empty}>Nenhum registro encontrado para este filtro.</div>
          ) : (
            <div ref={chartRef} className={styles.chartArea}>
              <ChartView
                type={effectiveType}
                buckets={effectiveType === 'donut' ? foldForDonut(buckets) : buckets}
                format={format}
                description={description}
              />
            </div>
          )}

          {buckets.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>{description}</caption>
                <thead>
                  <tr>
                    <th scope="col">{dimension?.title}</th>
                    <th scope="col">Registros</th>
                    {metric !== 'count' && <th scope="col">{METRIC_LABELS[metric]}</th>}
                    <th scope="col">% do total</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((bucket: IBucket) => (
                    <tr key={bucket.key}>
                      <td data-label={dimension?.title}>{bucket.label}</td>
                      <td data-label="Registros">{INT_FORMAT.format(bucket.acc.rows)}</td>
                      {metric !== 'count' && <td data-label={METRIC_LABELS[metric]}>{format(bucket.value)}</td>}
                      <td data-label="% do total">{shareOf(bucket)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default ChartsModal;
