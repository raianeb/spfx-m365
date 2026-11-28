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
  aoFechar: () => void;
}

const DetalhePessoa: React.FC<IDetalhePessoaProps> = ({ id, pessoa, jornada, celula, etapas, aoLembrar, aoFechar }: IDetalhePessoaProps) => {
  const progresso = celula.matricula?.progresso ?? {};
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
              </div>
            </li>
          );
        })}
      </ol>
    </GtiDialog>
  );
};

export default DetalhePessoa;
