// Modelo: ponto único de importação dos componentes do padrão GTI (skill spfx-padrao-visual-gti).
// Copie a pasta inteira para src/<webpart>/components/gti/ no projeto e importe daqui.
export { Icon } from './Icon';
export type { NomeIcone } from './Icon';
export { tokensDoTema } from './tema';
export type { ITemaDoSite } from './tema';
export {
  GtiRoot, PageHeader, SectionTitle, Panel, Metric, MetricGrid, Hero, ProgressRing,
  Badge, ProgressBar, Loading, Empty, ErrorBox, NoAccess, Field
} from './Base';
export type { TomBadge } from './Base';
export { useWpRoute } from './useWpRoute';
export type { IRoteador, IRotaAtual } from './useWpRoute';
export { WpNav, RouteTabs } from './WpNav';
export type { IItemNav, IGrupoNav } from './WpNav';
export { GtiDialog } from './GtiDialog';
export { ToastProvider, useToast, Diagnostics } from './Feedback';
export type { IEventoLog } from './Feedback';
export { QuickSearch } from './QuickSearch';
export type { IResultadoBusca } from './QuickSearch';
