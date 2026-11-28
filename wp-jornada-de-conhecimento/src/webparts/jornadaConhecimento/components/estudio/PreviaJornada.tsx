// Skills aplicadas: spfx-padrao-visual-gti (painel lateral amplo), spfx-acessibilidade-conteudo.
// Pré-visualização como o usuário verá, com os mesmos adaptadores do player e sem gravar progresso.
import * as React from 'react';
import { useState } from 'react';
import { toSafeHtml } from '../../../../comum/richText';
import { IEtapa, ordenarEtapas } from '../../../../jornada/progresso';
import { Empty, GtiDialog, Icon } from '../gti';
import { ICONE_TIPO, ROTULO_TIPO, formatarDuracao } from '../comum/ui';
import ConteudoEtapa from '../player/ConteudoEtapa';
import styles from '../jc.module.scss';

export interface IPreviaJornadaProps {
  id: string;
  titulo: string;
  descricao: string;
  etapas: IEtapa[];
  siteUrl: string;
  aoFechar: () => void;
}

const nada = (): void => undefined;

const PreviaJornada: React.FC<IPreviaJornadaProps> = (props: IPreviaJornadaProps) => {
  const etapas: IEtapa[] = ordenarEtapas(props.etapas);
  const [indice, setIndice] = useState<number>(0);
  const etapa: IEtapa | undefined = etapas[indice];
  return (
    <GtiDialog
      id={props.id}
      variante="lateral-ampla"
      sobretitulo="Pré-visualização · nada é gravado"
      titulo={props.titulo || 'Jornada sem nome'}
      aoFechar={props.aoFechar}
      rodape={
        <button type="button" className="pi-btn" onClick={props.aoFechar}>
          Fechar
        </button>
      }
    >
      {props.descricao && (
        <p className="pi-hint" style={{ marginBottom: 16, fontSize: 13 }}>
          {props.descricao}
        </p>
      )}
      {!etapa ? (
        <Empty icone="camadas" titulo="Sem etapas" descricao="Adicione etapas para pré-visualizar." />
      ) : (
        <>
          <div className="pi-chips" role="group" aria-label="Etapas" style={{ marginBottom: 14 }}>
            {etapas.map((e: IEtapa, i: number) => (
              <button key={e.id} type="button" className="pi-chip" aria-pressed={i === indice} onClick={() => setIndice(i)}>
                <Icon nome={ICONE_TIPO[e.tipo]} tamanho={14} />
                {i + 1}. {e.titulo}
              </button>
            ))}
          </div>
          <section className={`pi-card ${styles.palco}`} aria-label={etapa.titulo}>
            <div className={styles.palcoTopo}>
              <h3>{etapa.titulo}</h3>
              <span className={styles.palcoTipo}>
                {ROTULO_TIPO[etapa.tipo]}
                {etapa.duracaoMin ? ` · ${formatarDuracao(etapa.duracaoMin)}` : ''}
              </span>
            </div>
            <ConteudoEtapa key={etapa.id} etapa={etapa} siteUrl={props.siteUrl} inicioSeg={0} aoProgresso={nada} aoAbrir={nada} />
            {etapa.instrucoes && (
              <div className={styles.instrucoes}>
                <b className={styles.rotulo}>Instruções</b>
                <div dangerouslySetInnerHTML={{ __html: toSafeHtml(etapa.instrucoes) }} />
              </div>
            )}
          </section>
        </>
      )}
    </GtiDialog>
  );
};

export default PreviaJornada;
