// Skills aplicadas: spfx-padrao-visual-gti (card de jornada), spfx-acessibilidade-conteudo (link com nome completo,
// atraso em texto), spfx-imagens-midia (capa preguiçosa, decorativa).
import * as React from 'react';
import { urlSegura } from '../../../../jornada/conteudo';
import { Badge, Icon, IRoteador, ProgressBar } from '../gti';
import { IJornadaVisivel, rotaJornada } from '../tipos';
import { Estrelas, IconeArea, PadraoCapa, dataCurta, formatarDuracao, fundoArea } from '../comum/ui';
import { ehNova, situacaoDe } from './dadosCatalogo';
import styles from '../jc.module.scss';

export interface ICardJornadaProps {
  item: IJornadaVisivel;
  roteador: IRoteador;
  siteUrl: string;
  /** Só apresentação (prévia do editor): sem link e fora da ordem de foco. */
  estatico?: boolean;
}

const CardJornada: React.FC<ICardJornadaProps> = ({ item, roteador, siteUrl, estatico }: ICardJornadaProps) => {
  const { area, jornada } = item;
  const situacao = situacaoDe(item);
  const capa: string = urlSegura(jornada.capa, siteUrl);
  const rota: string = rotaJornada(item);
  const conteudo = (
    <>
      <div className={styles.capa} style={fundoArea(area)}>
        {capa ? <img src={capa} alt="" loading="lazy" /> : <PadraoCapa semente={jornada.id} />}
        <span className={styles.capaIcone}>
          <IconeArea area={area} />
        </span>
        <span className={styles.selos}>
          {jornada.obrigatoria && <span>Obrigatória</span>}
          {item.limite && situacao !== 'concluida' && (
            <span className={item.atrasada ? styles.seloAtraso : undefined}>{item.atrasada ? 'Atrasada' : `Prazo ${dataCurta(item.limite)}`}</span>
          )}
          {ehNova(item, new Date()) && <span>Nova</span>}
        </span>
      </div>
      <div className={styles.corpo}>
        <span className={styles.areaNome} style={{ color: area.cor }}>
          {area.nome}
        </span>
        <h3>{jornada.titulo}</h3>
        <span className={styles.meta}>
          <span>
            <Icon nome="camadas" tamanho={13} />
            {item.etapas.length} etapa(s)
          </span>
          <span>
            <Icon nome="relogio" tamanho={13} />
            {formatarDuracao(item.duracaoMin)}
          </span>
        </span>
        <Estrelas nota={item.nota?.media ?? 0} total={item.nota?.total} />
      </div>
      <div className={styles.rodapeCard}>
        {situacao === 'concluida' ? (
          <>
            <Badge tom="success">Concluída</Badge>
            <span style={{ marginLeft: 'auto' }}>{dataCurta(item.matricula?.concluidaEm)}</span>
          </>
        ) : situacao === 'nova' ? (
          <>
            <span>Ainda não iniciada</span>
            <span className={styles.acaoCard}>
              Começar <Icon nome="direita" tamanho={14} />
            </span>
          </>
        ) : (
          <span style={{ flex: 1 }}>
            <ProgressBar percentual={item.percentual} rotulo={`Progresso em ${jornada.titulo}`} />
          </span>
        )}
      </div>
    </>
  );
  return estatico ? (
    <div className={styles.card}>{conteudo}</div>
  ) : (
    <a
      className={styles.card}
      href={roteador.hrefDe(rota)}
      onClick={roteador.aoClicarLink(rota)}
      aria-label={`${jornada.titulo}, ${area.nome}, ${item.percentual}% concluído${item.atrasada ? ', atrasada' : ''}`}
    >
      {conteudo}
    </a>
  );
};

export default CardJornada;
