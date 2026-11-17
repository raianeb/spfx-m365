import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import styles from './ListaFiltro.module.scss';
import { DiagnosticsLogger } from '../../../core/diagnostics';
import { ICondition } from '../../../services/camlBuilder';
import {
  DASHBOARD_PERIODS,
  DEFAULT_DASHBOARD_PERIOD,
  DashboardPeriod,
  IDashboardData,
  IRanking,
  IRankingItem,
  ITrendPoint
} from '../../../services/dashboard';
import { IPdfKpi, exportChartPdf } from '../../../services/exportPdf';
import { IListInfo, ListQueryService } from '../../../services/ListQueryService';
import { activeButtonStyles, buttonStyles } from './controlStyles';
import { DashboardCache, IDashboardState, useDashboard } from './useDashboard';

export interface IDashboardViewProps {
  service: ListQueryService;
  logger: DiagnosticsLogger;
  listTitle: string;
  list: IListInfo;
  /** Campos de agrupamento configurados na Web Part. */
  dimensionNames: string[];
  /** Condições da consulta aplicada na tela. Vazio = nenhuma consulta com filtro. */
  queryConditions: ICondition[];
  contextLabel: string;
  cache: DashboardCache;
}

interface IKpi {
  label: string;
  value: string;
  sub: string;
}

const INT_FORMAT: Intl.NumberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const DEC_FORMAT: Intl.NumberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const NO_CONDITIONS: ICondition[] = [];
/** Altura útil das colunas da evolução, em px. */
const TREND_HEIGHT: number = 160;
/** Com muitos pontos (mês em dias), só parte dos rótulos do eixo aparece. */
const TREND_LABEL_EVERY: number = 5;
const TREND_DENSE: number = 16;

const displayDate = (iso: string): string => {
  const parts: string[] = iso.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
};

const share = (value: number, total: number): string => (total > 0 ? `${DEC_FORMAT.format((value / total) * 100)}%` : '—');

const barWidth = (value: number, max: number): string => (max > 0 && value > 0 ? `${Math.max(1, Math.round((value / max) * 100))}%` : '0');

const buildKpis = (listItemCount: number, data: IDashboardData, state: IDashboardState): IKpi[] => {
  const periodText: string = state.dateField ? `${displayDate(state.range.from)} a ${displayDate(state.range.to)}` : 'Lista inteira';
  const kpis: IKpi[] = [
    { label: 'Total de registros na lista', value: INT_FORMAT.format(listItemCount), sub: 'Todos os períodos' },
    { label: 'Registros no período', value: INT_FORMAT.format(data.total), sub: periodText }
  ];
  if (data.today !== undefined) {
    kpis.push({ label: 'Registros hoje', value: INT_FORMAT.format(data.today), sub: displayDate(state.range.to) });
    if (data.days > 1) {
      kpis.push({ label: 'Média por dia', value: DEC_FORMAT.format(data.total / data.days), sub: `${INT_FORMAT.format(data.days)} dias no período` });
    }
  }
  data.rankings.forEach((ranking: IRanking) => {
    kpis.push({ label: `${ranking.field.title}: valores distintos`, value: INT_FORMAT.format(ranking.distinct), sub: 'No período' });
  });
  return kpis;
};

const Trend: React.FC<{ points: ITrendPoint[]; byMonth: boolean }> = ({ points, byMonth }) => {
  const max: number = points.reduce((best: number, point: ITrendPoint) => Math.max(best, point.value), 0);
  const peak: ITrendPoint | undefined = points.find((point: ITrendPoint) => point.value === max && max > 0);
  const last: ITrendPoint = points[points.length - 1];
  const dense: boolean = points.length > TREND_DENSE;
  const partial: boolean = points.some((point: ITrendPoint) => point.partial);
  const summary: string = peak
    ? `Registros por ${byMonth ? 'mês' : 'dia'}, de ${points[0].fullLabel} a ${last.fullLabel}. Maior volume em ${peak.fullLabel}: ${INT_FORMAT.format(peak.value)}.`
    : 'Nenhum registro no período.';
  const columns: React.CSSProperties = { gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` };
  return (
    <section className={styles.dashCard} aria-label={`Registros por ${byMonth ? 'mês' : 'dia'}`}>
      <div className={styles.dashCardHead}>
        <h3 className={styles.dashCardTitle}>Registros por {byMonth ? 'mês' : 'dia'}</h3>
        {partial && <span className={styles.dashNote}>Mês atual parcial</span>}
      </div>
      <div className={styles.trendScroll}>
        <div className={styles.trendPlot} style={{ ...columns, height: TREND_HEIGHT + 24 }} role="img" aria-label={summary}>
          {points.map((point: ITrendPoint) => {
            // Rótulo direto só no pico e no ponto mais recente: os demais valores ficam na dica.
            const direct: boolean = point.value > 0 && (point === peak || point === last);
            return (
              <div key={point.key} className={styles.trendColumn} title={`${point.fullLabel}: ${INT_FORMAT.format(point.value)}${point.partial ? ' (parcial)' : ''}`}>
                {direct && <span className={styles.trendValue}>{INT_FORMAT.format(point.value)}</span>}
                <div
                  className={point.partial ? `${styles.trendBar} ${styles.trendBarPartial}` : styles.trendBar}
                  style={{ height: max > 0 ? Math.round((point.value / max) * TREND_HEIGHT) : 0 }}
                />
              </div>
            );
          })}
        </div>
        <div className={styles.trendAxis} style={columns} aria-hidden="true">
          {points.map((point: ITrendPoint, index: number) => (
            <span key={point.key}>{!dense || index % TREND_LABEL_EVERY === 0 || index === points.length - 1 ? point.label : ''}</span>
          ))}
        </div>
      </div>
      <ol className={styles.srOnly}>
        {points.map((point: ITrendPoint) => (
          <li key={point.key}>
            {point.fullLabel}: {INT_FORMAT.format(point.value)}
          </li>
        ))}
      </ol>
    </section>
  );
};

const Ranking: React.FC<{ ranking: IRanking; total: number }> = ({ ranking, total }) => {
  const max: number = ranking.items.reduce((best: number, item: IRankingItem) => Math.max(best, item.value), 0);
  return (
    <section className={styles.dashCard} aria-label={`Registros por ${ranking.field.title}`}>
      <div className={styles.dashCardHead}>
        <h3 className={styles.dashCardTitle}>Por {ranking.field.title}</h3>
        <span className={styles.dashNote}>{INT_FORMAT.format(ranking.distinct)} valores distintos</span>
      </div>
      {ranking.items.length === 0 ? (
        <p className={styles.dashNote}>Nenhum registro com este campo preenchido no período.</p>
      ) : (
        <ul className={styles.rankList}>
          {ranking.items.map((item: IRankingItem) => (
            <li key={item.key} className={styles.rankItem} title={`${item.label}: ${INT_FORMAT.format(item.value)} (${share(item.value, total)} do período)`}>
              <span className={styles.rankLabel}>{item.label}</span>
              <span className={styles.rankValue}>
                <strong>{INT_FORMAT.format(item.value)}</strong> · {share(item.value, total)}
              </span>
              <span className={styles.rankTrack}>
                <span className={item.folded ? `${styles.rankBar} ${styles.rankBarOther}` : styles.rankBar} style={{ width: barWidth(item.value, max) }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const Completeness: React.FC<{ rankings: IRanking[]; total: number }> = ({ rankings, total }) => (
  <section className={styles.dashCard} aria-label="Preenchimento dos campos">
    <div className={styles.dashCardHead}>
      <h3 className={styles.dashCardTitle}>Preenchimento dos campos</h3>
      <span className={styles.dashNote}>Registros com o campo vazio, sobre o total do período</span>
    </div>
    <ul className={styles.completenessGrid}>
      {rankings.map((ranking: IRanking) => (
        <li key={ranking.field.name} className={styles.rankItem}>
          <span className={styles.rankLabel}>Sem {ranking.field.title}</span>
          <span className={styles.rankValue}>
            <strong>{share(ranking.empty, total)}</strong> · {INT_FORMAT.format(ranking.empty)}
          </span>
          <span className={styles.rankTrack}>
            <span className={`${styles.rankBar} ${styles.rankBarOther}`} style={{ width: barWidth(ranking.empty, total) }} />
          </span>
        </li>
      ))}
    </ul>
  </section>
);

/**
 * Gestão à vista: indicadores, evolução e distribuição por campo dos registros do período.
 * Skills aplicadas: spfx-design-base (estados e barras), spfx-tema-marca (cores por token),
 * sharepoint-dados-listas (leitura paginada, só as colunas necessárias, cache com validade).
 */
const DashboardView: React.FC<IDashboardViewProps> = ({ service, logger, listTitle, list, dimensionNames, queryConditions, contextLabel, cache }) => {
  const [period, setPeriod] = React.useState<DashboardPeriod>(DEFAULT_DASHBOARD_PERIOD);
  const [useQueryFilters, setUseQueryFilters] = React.useState<boolean>(false);
  const [refreshId, setRefreshId] = React.useState<number>(0);
  const [pdfBusy, setPdfBusy] = React.useState<boolean>(false);
  const [pdfError, setPdfError] = React.useState<string>('');
  const filterToggleId: string = React.useId();
  const canUseQueryFilters: boolean = queryConditions.length > 0;

  const state: IDashboardState = useDashboard({
    service,
    logger,
    listTitle,
    itemCount: list.itemCount,
    fields: list.fields,
    dimensionNames,
    period,
    extraConditions: useQueryFilters && canUseQueryFilters ? queryConditions : NO_CONDITIONS,
    refreshId,
    cache
  });
  const { data } = state;
  const loading: boolean = state.status === 'loading';
  const kpis: IKpi[] = data ? buildKpis(list.itemCount, data, state) : [];

  const exportPdf = async (): Promise<void> => {
    if (!data || pdfBusy) {
      return;
    }
    setPdfBusy(true);
    setPdfError('');
    try {
      const pdfKpis: IPdfKpi[] = kpis.map((kpi: IKpi) => ({ label: kpi.label, value: kpi.value }));
      const rows: string[][] = [];
      data.rankings.forEach((ranking: IRanking) => {
        ranking.items.forEach((item: IRankingItem) => {
          rows.push([ranking.field.title, item.label, INT_FORMAT.format(item.value), share(item.value, data.total)]);
        });
      });
      const periodText: string = state.dateField ? `Período de ${displayDate(state.range.from)} a ${displayDate(state.range.to)}.` : 'Lista inteira.';
      await exportChartPdf({
        fileName: `${listTitle}-gestao-a-vista-${new Date().toISOString().slice(0, 10)}.pdf`,
        title: `Gestão à vista · ${contextLabel}`,
        subtitle: `${periodText} ${useQueryFilters && canUseQueryFilters ? 'Com os filtros da consulta.' : 'Sem filtros da consulta.'} Gerado em ${new Date().toLocaleString('pt-BR')}.`,
        kpis: pdfKpis,
        headers: ['Campo', 'Valor', 'Registros', '% do período'],
        rows
      });
    } catch (failure: unknown) {
      logger.log('error', 'Gestão à vista', failure instanceof Error ? failure.message : 'Falha ao gerar o PDF');
      setPdfError('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashToolbar}>
        <div className={styles.dashToolbarGroup}>
          {state.dateField && (
            <div className={styles.dashPeriods} role="group" aria-label="Período">
              {DASHBOARD_PERIODS.map((option) => (
                <DefaultButton
                  key={option.key}
                  text={option.text}
                  aria-pressed={period === option.key}
                  styles={period === option.key ? activeButtonStyles : buttonStyles}
                  onClick={(): void => setPeriod(option.key)}
                />
              ))}
            </div>
          )}
          {canUseQueryFilters && (
            <label htmlFor={filterToggleId} className={styles.dashToggle}>
              <input id={filterToggleId} type="checkbox" checked={useQueryFilters} onChange={(event): void => setUseQueryFilters(event.target.checked)} />
              Aplicar os filtros da consulta
            </label>
          )}
        </div>
        <div className={styles.dashToolbarGroup}>
          <span className={styles.dashNote} role="status" aria-live="polite">
            {loading
              ? `Lendo registros… ${INT_FORMAT.format(state.scanned)}`
              : state.loadedAt
                ? `Atualizado às ${state.loadedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : ''}
          </span>
          <DefaultButton
            text="Atualizar"
            iconProps={{ iconName: 'Refresh' }}
            disabled={loading}
            onClick={(): void => setRefreshId((current: number) => current + 1)}
            styles={buttonStyles}
          />
          <DefaultButton
            text={pdfBusy ? 'Gerando PDF…' : 'Exportar PDF'}
            iconProps={{ iconName: 'PDF' }}
            disabled={!data || pdfBusy}
            onClick={(): void => {
              exportPdf().catch(() => undefined);
            }}
            styles={buttonStyles}
          />
        </div>
      </div>

      {pdfError !== '' && (
        <div className={styles.message} role="alert">
          {pdfError}
        </div>
      )}
      {state.fullScan && (
        <div className={styles.dashNote} role="status">
          O campo {state.dateField?.title ?? 'de data'} não tem índice nesta lista: o painel lê a lista inteira antes de recortar o período. Solicite o índice
          ao administrador para acelerar a abertura.
        </div>
      )}
      {loading && <div className={styles.skeleton} aria-busy="true" aria-label="Calculando os números do painel" />}
      {state.status === 'error' && (
        <div className={styles.message} role="alert">
          Não foi possível calcular o painel. Selecione Atualizar para tentar novamente.
        </div>
      )}

      {data && (
        <>
          {data.truncated && (
            <div className={styles.message} role="status">
              Resultado parcial: o período tem mais registros do que o painel lê de uma vez. Escolha um período menor.
            </div>
          )}
          <ul className={styles.dashKpis} aria-label="Indicadores">
            {kpis.map((kpi: IKpi) => (
              <li key={kpi.label} className={styles.kpi}>
                <span className={styles.kpiLabel}>{kpi.label}</span>
                <span className={styles.kpiValue}>{kpi.value}</span>
                <span className={styles.kpiSub}>{kpi.sub}</span>
              </li>
            ))}
          </ul>
          {data.trend.length > 1 && <Trend points={data.trend} byMonth={data.trendGranularity === 'mes'} />}
          {data.rankings.length === 0 ? (
            <div className={styles.empty}>
              Para ver os números por campo, selecione os campos em &quot;Campos da gestão à vista&quot;, nas configurações da Web Part.
            </div>
          ) : (
            <>
              <div className={styles.dashGrid}>
                {data.rankings.map((ranking: IRanking) => (
                  <Ranking key={ranking.field.name} ranking={ranking} total={data.total} />
                ))}
              </div>
              <Completeness rankings={data.rankings} total={data.total} />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardView;
