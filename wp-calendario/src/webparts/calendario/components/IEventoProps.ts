import { MSGraphClientV3 } from '@microsoft/sp-http';
import { IWebPartCommonProps } from '../../../core/config';

/** Opções da coluna Tipo. Escolha simples (sem Lookup), gravada como texto. */
export const TIPOS_EVENTO: string[] = ['Reunião', 'Evento', 'Treinamento', 'Lembrete'];

/**
 * Evento do calendário. Datas são gravadas em ISO (UTC) e exibidas no horário local do navegador.
 * Dia inteiro: DataInicio é 00:00 do primeiro dia e DataFim é 23:59:59 do último dia.
 */
export interface IEvento {
  Id: number;
  Title: string;
  Local?: string;
  DataInicio: string;
  DataFim: string;
  DiaInteiro: boolean;
  Descricao?: string;
  Organizador?: string;
  Tipo?: string;
  /** Lista do SharePoint (padrão) ou evento do grupo/equipe Microsoft 365, somente leitura. */
  Origem?: 'lista' | 'microsoft';
  /** ID do evento replicado no grupo/equipe (coluna da lista) ou ID do próprio evento Microsoft. */
  IdEventoMicrosoft?: string;
  LinkReuniao?: string;
  LinkOutlook?: string;
}

/** Templates da WP: miniatura (mês compacto com detalhes do dia em modal) ou completo (dia, semana e mês). */
export type CalendarTemplate = 'miniatura' | 'completo';

export type CalendarView = 'dia' | 'semana' | 'mes';

export interface ICalendarioProps extends IWebPartCommonProps {
  /** Nome base da lista de eventos, escolhida no site de dados. Vazio = não configurada. */
  listName: string;
  template: CalendarTemplate;
  /** Visualização inicial do template completo. */
  defaultView: CalendarView;
  /** E-mail ou ID do grupo/equipe Microsoft 365. Vazio: somente a lista. */
  identifier: string;
  /** Fábrica do cliente Graph do SPFx (token da sessão do usuário). */
  getClient: () => Promise<MSGraphClientV3>;
}
