// Skills aplicadas: spfx-padrao-visual-gti (detalhe em painel lateral), spfx-acessibilidade-conteudo (estado em texto).
import * as React from 'react';
import { ICelula, IPessoaArea } from '../../../../jornada/gestao';
import { IEtapa, IJornada, IProgressoEtapa, ordenarEtapas } from '../../../../jornada/progresso';
import { Badge, GtiDialog, Icon, ProgressBar } from '../gti';
import { formatarData } from '../comum/ui';
import styles from '../jc.module.scss';

export interface IDetalhePessoaProps {
  id: string;
  pessoa: IPessoaArea;
  jornada: IJornada;
  celula: ICelula;
  etapas: IEtapa[];
  aoLembrar?: () => void;
  /** Libera novas tentativas de um quiz (zera o contador). */
  aoLiberarQuiz?: (etapaId: number) => Promise<void>;
  aoFechar: () => void;
}

const DetalhePessoa: React.FC<IDetalhePessoaProps> = ({ id, pessoa, jornada, celula, etapas, aoLembrar, aoLiberarQuiz, aoFechar }: IDetalhePessoaProps) => {
  const progresso = celula.matricula?.progresso ?? {};
  const [liberando, setLiberando] = React.useState<number | undefined>(undefined);
  const [mensagem, setMensagem] = React.useState<string>('');
  const liberar = async (etapaId: number): Promise<void> => {
    if (!aoLiberarQuiz) {
      return;
    }
    setLiberando(etapaId);
    setMensagem('');
    try {
      await aoLiberarQuiz(etapaId);
      setMensagem('Novas tentativas liberadas. A pessoa já pode refazer o quiz.');
    } catch {
      setMensagem('Não foi possível liberar agora. Tente de novo em instantes.');
    } finally {
      setLiberando(undefined);
    }
  };
  return (
    <GtiDialog
      id={id}
      sobretitulo="Mapa de progresso"
      titulo={pessoa.nome}
      aoFechar={aoFechar}
      textoRodape={pessoa.email}
      rodape={
        <>
          <button type="button" className="pi-btn" onClick={aoFechar}>
            Fechar
          </button>
          {aoLembrar && (
            <button type="button" className="pi-btn primary" onClick={aoLembrar}>
              <Icon nome="email" tamanho={16} />
              Lembrar esta pessoa
            </button>
          )}
        </>
      }
    >
      <h3 style={{ fontSize: 16, margin: '0 0 8px' }}>{jornada.titulo}</h3>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ flex: 1 }}>
          <ProgressBar percentual={celula.percentual} rotulo={`Progresso de ${pessoa.nome}`} />
        </span>
        {celula.atrasada && <Badge tom="danger">Atrasada</Badge>}
        {celula.concluida && <Badge tom="success">Concluída</Badge>}
      </div>
      <p className="pi-hint" style={{ marginBottom: 12 }}>
        {celula.matricula
          ? `Início ${formatarData(celula.matricula.dataInicio)} · último acesso ${formatarData(celula.matricula.ultimoAcesso)}`
          : 'Ainda não iniciou esta jornada.'}
      </p>
      {mensagem && (
        <p className="pi-hint" role="status">
          {mensagem}
        </p>
      )}
      <ol className={styles.etapas}>
        {ordenarEtapas(etapas).map((etapa: IEtapa, i: number) => {
          const item: IProgressoEtapa | undefined = progresso[String(etapa.id)];
          const feita: boolean = item?.s === 'concluida';
          return (
            <li key={etapa.id} className={styles.etapa}>
              <span className={`${styles.numero} ${feita ? styles.numeroFeito : item ? styles.numeroAgora : ''}`} aria-hidden="true">
                {feita ? <Icon nome="check" tamanho={14} /> : i + 1}
              </span>
              <div className={styles.etapaTexto}>
                <b>{etapa.titulo}</b>
                <span>{feita ? `Concluída em ${formatarData(item?.c)}` : item ? `Em andamento${item.pct ? ` · ${item.pct}% assistido` : ''}` : 'Não iniciada'}</span>
                {item?.q && (
                  <span>
                    Quiz: {item.q.t} {item.q.t === 1 ? 'tentativa' : 'tentativas'} desde a última liberação · melhor nota {item.q.n}%
                    {item.q.u !== undefined && item.q.u !== item.q.n ? ` · última ${item.q.u}%` : ''}
                  </span>
                )}
                {item?.q && !feita && item.q.t > 0 && aoLiberarQuiz && (
                  <button type="button" className="pi-link-btn" disabled={liberando !== undefined} onClick={() => liberar(etapa.id)} style={{ alignSelf: 'flex-start' }}>
                    {liberando === etapa.id ? 'Liberando…' : 'Liberar novas tentativas'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </GtiDialog>
  );
};

export default DetalhePessoa;
