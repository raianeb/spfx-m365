import * as React from 'react';
import { useEffect, useState } from 'react';
import styles from './core.module.scss';

export type DiagnosticLevel = 'info' | 'warn' | 'error';

export interface IDiagnosticEntry {
  time: string;
  level: DiagnosticLevel;
  scope: string;
  message: string;
}

const MAX_ENTRIES: number = 200;
const MAX_MESSAGE_LENGTH: number = 300;

/** Remove segredos e query strings antes de guardar qualquer texto no diagnóstico. */
export const redact = (text: string): string =>
  text
    .replace(/(digest|token|authorization|password|secret|cookie)[^\s,;'"]*/gi, '[oculto]')
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]*/gi, '$1')
    .slice(0, MAX_MESSAGE_LENGTH);

/** Registro de eventos de uma instância. Fica inativo quando o log está desligado. */
export class DiagnosticsLogger {
  private _entries: IDiagnosticEntry[] = [];
  private _enabled: boolean = false;
  private readonly _listeners: Set<() => void> = new Set<() => void>();

  public get enabled(): boolean {
    return this._enabled;
  }

  public setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  public get entries(): IDiagnosticEntry[] {
    return this._entries.slice();
  }

  public log(level: DiagnosticLevel, scope: string, message: string, durationMs?: number): void {
    if (!this._enabled) {
      return;
    }
    const suffix: string = durationMs !== undefined ? ` | ${Math.round(durationMs)} ms` : '';
    this._entries.push({
      time: new Date().toLocaleTimeString('pt-BR'),
      level,
      scope: redact(scope),
      message: redact(message) + suffix
    });
    if (this._entries.length > MAX_ENTRIES) {
      this._entries.splice(0, this._entries.length - MAX_ENTRIES);
    }
    this._listeners.forEach((listener: () => void) => listener());
  }

  public clear(): void {
    this._entries = [];
    this._listeners.forEach((listener: () => void) => listener());
  }

  public subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }
}

export interface IDiagnosticsPanelProps {
  logger: DiagnosticsLogger;
}

/** Bloco recolhível de diagnóstico. Não renderiza nada quando "Exibir log" está desligado. */
export const DiagnosticsPanel: React.FC<IDiagnosticsPanelProps> = ({ logger }) => {
  const [, setTick] = useState<number>(0);

  useEffect(() => logger.subscribe(() => setTick((value: number) => value + 1)), [logger]);

  if (!logger.enabled) {
    return null;
  }

  const entries: IDiagnosticEntry[] = logger.entries;
  const errors: number = entries.filter((entry: IDiagnosticEntry) => entry.level === 'error').length;

  return (
    <details className={styles.diagnostics}>
      <summary>
        Diagnóstico · {entries.length} evento(s){errors > 0 ? ` · ${errors} erro(s)` : ''}
      </summary>
      {entries.length === 0 ? (
        <p className={styles.diagnosticsEmpty}>Nenhum evento registrado.</p>
      ) : (
        <ol className={styles.diagnosticsList}>
          {entries.map((entry: IDiagnosticEntry, index: number) => (
            <li key={index} className={entry.level === 'error' ? styles.diagnosticsError : undefined}>
              <span>{entry.time}</span> <strong>{entry.scope}</strong>: {entry.message}
            </li>
          ))}
        </ol>
      )}
    </details>
  );
};
