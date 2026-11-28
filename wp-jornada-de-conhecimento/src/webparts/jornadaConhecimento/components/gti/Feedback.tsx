// Modelo: toast de confirmação e diagnóstico expansível (skill spfx-padrao-visual-gti).
import * as React from 'react';
import { Icon } from './Icon';

// ---------------------------------------------------------------- toast
interface IToastContexto {
  /** Confirmação curta depois que a operação terminou. Erros importantes ficam na tela, não no toast. */
  avisar: (mensagem: string) => void;
}

const ContextoToast = React.createContext<IToastContexto>({ avisar: () => undefined });

export function ToastProvider(props: { children: React.ReactNode }): React.ReactElement {
  const [mensagem, setMensagem] = React.useState<string | undefined>(undefined);
  const timer = React.useRef<number | undefined>(undefined);

  const avisar = React.useCallback((texto: string): void => {
    setMensagem(texto);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMensagem(undefined), 3200);
  }, []);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  const valor = React.useMemo(() => ({ avisar }), [avisar]);

  return (
    <ContextoToast.Provider value={valor}>
      {props.children}
      <div role="status" aria-live="polite">
        {mensagem && (
          <div className="pi-toast">
            <Icon nome="checkCirculo" tamanho={16} />
            <span>{mensagem}</span>
          </div>
        )}
      </div>
    </ContextoToast.Provider>
  );
}

export function useToast(): IToastContexto {
  return React.useContext(ContextoToast);
}

// ---------------------------------------------------------------- diagnóstico
export interface IEventoLog {
  /** Momento do evento (Date) ou hora já formatada pelo logger. */
  quando: Date | string;
  escopo: string;
  mensagem: string;
  duracaoMs?: number;
  erro?: boolean;
}

/**
 * Diagnóstico expansível, visível só com "Exibir log = Sim" (skill spfx-configuracao-webpart).
 * Recebe eventos já sem dados sensíveis, vindos do logger da instância (skill spfx-implementacao-base).
 */
export function Diagnostics(props: { visivel: boolean; eventos: IEventoLog[]; ambiente: string }): React.ReactElement {
  if (!props.visivel) return <></>;
  return (
    <details className="pi-diagnostics">
      <summary>Diagnóstico · {props.ambiente} · {props.eventos.length} evento(s)</summary>
      <ol>
        {props.eventos.map((ev, i) => (
          <li key={i} style={ev.erro ? { color: 'var(--pi-danger)' } : undefined}>
            {typeof ev.quando === 'string' ? ev.quando : ev.quando.toLocaleTimeString('pt-BR')} · {ev.escopo} · {ev.mensagem}
            {ev.duracaoMs !== undefined && ` · ${ev.duracaoMs} ms`}
          </li>
        ))}
      </ol>
    </details>
  );
}
