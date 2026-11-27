// Skills aplicadas: spfx-design-base (modal padrão), spfx-acessibilidade-conteudo (estado da etapa em texto).
import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import ModalShell from '../../../../crud/ModalShell';
import crud from '../../../../crud/crud.module.scss';
import { secondaryButtonStyles } from '../../../../crud/modalStyles';
import { ICelula, IPessoaArea } from '../../../../jornada/gestao';
import { IEtapa, IJornada, IProgressoEtapa, ordenarEtapas } from '../../../../jornada/progresso';
import { NOME_SOLUCAO } from '../tipos';
import styles from './Gestao.module.scss';

export interface IDetalhePessoaProps {
  pessoa: IPessoaArea;
  jornada: IJornada;
  celula: ICelula;
  etapas: IEtapa[];
  themeStyle?: React.CSSProperties;
  aoFechar: () => void;
}

const dataCurta = (valor?: string): string => (valor ? new Date(valor).toLocaleDateString('pt-BR') : '–');

const DetalhePessoa: React.FC<IDetalhePessoaProps> = ({ pessoa, jornada, celula, etapas, themeStyle, aoFechar }: IDetalhePessoaProps) => {
  const tituloId: string = React.useId();
  const progresso = celula.matricula?.progresso ?? {};
  return (
    <ModalShell contextLabel={NOME_SOLUCAO} titleId={tituloId} onDismiss={aoFechar} themeStyle={themeStyle}>
      <h2 id={tituloId} className={crud.modalTitle}>
        {pessoa.nome}
      </h2>
      <p className={crud.modalText}>
        {jornada.titulo}: {celula.concluida ? 'concluída' : celula.iniciada ? `${celula.percentual}% concluído` : 'não iniciada'}
        {celula.atrasada ? ' · atrasada' : ''}
        {celula.matricula && ` · início ${dataCurta(celula.matricula.dataInicio)} · último acesso ${dataCurta(celula.matricula.ultimoAcesso)}`}
      </p>
      <ol className={styles.detalheEtapas}>
        {ordenarEtapas(etapas).map((etapa: IEtapa) => {
          const item: IProgressoEtapa | undefined = progresso[String(etapa.id)];
          const texto: string = item?.s === 'concluida' ? `concluída em ${dataCurta(item.c)}` : item ? `iniciada${item.pct ? ` · ${item.pct}% assistido` : ''}` : 'não iniciada';
          return (
            <li key={etapa.id} className={styles.detalheEtapa}>
              <Icon iconName={item?.s === 'concluida' ? 'CompletedSolid' : item ? 'CircleHalfFull' : 'CircleRing'} aria-hidden="true" />
              <span>
                <strong>{etapa.titulo}</strong> <span className={styles.ajuda}>{texto}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <footer className={crud.footer}>
        <span className={crud.helper}>{pessoa.email}</span>
        <div className={crud.footerActions}>
          <DefaultButton text="Fechar" onClick={aoFechar} styles={secondaryButtonStyles} />
        </div>
      </footer>
    </ModalShell>
  );
};

export default DetalhePessoa;
