// Skills aplicadas: spfx-design-base (pré-visualização como o usuário verá), spfx-acessibilidade-conteudo.
// Usa os mesmos adaptadores do player, sem gravar progresso.
import * as React from 'react';
import { useState } from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import ModalShell from '../../../../crud/ModalShell';
import crud from '../../../../crud/crud.module.scss';
import { secondaryButtonStyles } from '../../../../crud/modalStyles';
import { toSafeHtml } from '../../../../comum/richText';
import { IEtapa, ordenarEtapas } from '../../../../jornada/progresso';
import ConteudoEtapa from '../player/ConteudoEtapa';
import { NOME_SOLUCAO } from '../tipos';
import styles from '../player/Player.module.scss';

export interface IPreviaJornadaProps {
  titulo: string;
  descricao: string;
  etapas: IEtapa[];
  siteUrl: string;
  themeStyle?: React.CSSProperties;
  aoFechar: () => void;
}

const nada = (): void => undefined;

const PreviaJornada: React.FC<IPreviaJornadaProps> = (props: IPreviaJornadaProps) => {
  const tituloId: string = React.useId();
  const etapas: IEtapa[] = ordenarEtapas(props.etapas);
  const [indice, setIndice] = useState<number>(0);
  const etapa: IEtapa | undefined = etapas[indice];

  return (
    <ModalShell contextLabel={`${NOME_SOLUCAO} · Pré-visualização`} titleId={tituloId} onDismiss={props.aoFechar} themeStyle={props.themeStyle}>
      <h2 id={tituloId} className={crud.modalTitle}>
        {props.titulo || 'Jornada sem nome'}
      </h2>
      {props.descricao && <p className={crud.modalText}>{props.descricao}</p>}
      {!etapa ? (
        <p className={styles.aviso}>Adicione etapas para pré-visualizar.</p>
      ) : (
        <div className={styles.corpo}>
          <nav className={styles.linhaTempo} aria-label="Etapas da jornada">
            <ol>
              {etapas.map((item: IEtapa, posicao: number) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`${styles.etapa} ${posicao === indice ? styles.etapaAtual : ''}`}
                    aria-current={posicao === indice ? 'step' : undefined}
                    onClick={() => setIndice(posicao)}
                  >
                    <Icon iconName="CircleRing" className={styles.etapaIcone} aria-hidden="true" />
                    <span className={styles.etapaTexto}>
                      <span>{item.titulo}</span>
                      <span className={styles.meta}>{item.duracaoMin ? `${item.duracaoMin} min` : item.tipo}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <section className={styles.conteudo} aria-label={etapa.titulo}>
            <h3 className={styles.etapaTitulo}>{etapa.titulo}</h3>
            <ConteudoEtapa key={etapa.id} etapa={etapa} siteUrl={props.siteUrl} inicioSeg={0} aoProgresso={nada} aoAbrir={nada} />
            {etapa.instrucoes && <div className={styles.instrucoes} dangerouslySetInnerHTML={{ __html: toSafeHtml(etapa.instrucoes) }} />}
          </section>
        </div>
      )}
      <footer className={crud.footer}>
        <span className={crud.helper}>Na pré-visualização nada é gravado.</span>
        <div className={crud.footerActions}>
          <DefaultButton text="Fechar" onClick={props.aoFechar} styles={secondaryButtonStyles} />
        </div>
      </footer>
    </ModalShell>
  );
};

export default PreviaJornada;
