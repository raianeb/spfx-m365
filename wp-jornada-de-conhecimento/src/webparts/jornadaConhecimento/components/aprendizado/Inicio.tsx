// Skills aplicadas: spfx-padrao-visual-gti (receita "Início pessoal": hero, indicadores, pendências, gráfico curto),
// spfx-acessibilidade-conteudo (gráfico com rótulo em texto). Escopo, seção 3 (Minhas Jornadas).
import * as React from 'react';
import { IEtapa, IMatricula, etapaParaContinuar, minutosConcluidos } from '../../../../jornada/progresso';
import { Empty, ErrorBox, Hero, Icon, Loading, Metric, MetricGrid, Panel, ProgressRing, SectionTitle } from '../gti';
import { IContextoTela, IJornadaVisivel, rotaPlayer, rotaJornada } from '../tipos';
import { formatarData, formatarDuracao } from '../comum/ui';
import { situacaoDe } from './dadosCatalogo';
import CardJornada from './CardJornada';
import styles from '../jc.module.scss';

const MS_DIA: number = 24 * 3600 * 1000;
const DIAS: string[] = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Minutos concluídos por dia nos últimos 7 dias, a partir das datas de conclusão de cada etapa. */
export const minutosPorDia = (itens: IJornadaVisivel[], agora: Date): { dia: Date; minutos: number }[] => {
  const inicioHoje: number = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const dias: { dia: Date; minutos: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    dias.push({ dia: new Date(inicioHoje - i * MS_DIA), minutos: 0 });
  }
  itens.forEach((item: IJornadaVisivel) => {
    const matricula: IMatricula | undefined = item.matricula;
    if (!matricula) {
      return;
    }
    item.etapas.forEach((etapa: IEtapa) => {
      const concluidaEm: string | undefined = matricula.progresso[String(etapa.id)]?.c;
      if (!concluidaEm) {
        return;
      }
      const data: Date = new Date(concluidaEm);
      const indice: number = Math.floor((new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime() - dias[0].dia.getTime()) / MS_DIA);
      if (indice >= 0 && indice < 7) {
        dias[indice].minutos += etapa.duracaoMin || 0;
      }
    });
  });
  return dias;
};

const Inicio: React.FC<IContextoTela> = (ctx: IContextoTela) => {
  const { catalogo, roteador, props } = ctx;
  const LEMA: string = 'Só o conhecimento liberta';
  const primeiroNome: string = props.nomeUsuario.split(' ')[0] || '';
  // Sem cabeçalho de tela: o banner abre a página. O título fica só para leitor de tela (foco ao trocar de tela).
  const cabecalho = (
    <h2 id={ctx.idTitulo} tabIndex={-1} className="pi-sr">
      Início{primeiroNome ? ` de ${primeiroNome}` : ''}
    </h2>
  );

  if (catalogo.tipo === 'carregando') {
    return (
      <>
        {cabecalho}
        <Loading texto="Carregando suas jornadas…" />
      </>
    );
  }
  if (catalogo.tipo === 'erro') {
    return (
      <>
        {cabecalho}
        <ErrorBox mensagem={catalogo.mensagem} aoTentarNovamente={ctx.recarregarCatalogo} />
      </>
    );
  }

  const itens: IJornadaVisivel[] = catalogo.itens;
  if (itens.length === 0) {
    return (
      <>
        {cabecalho}
        <div className="pi-card">
          <Empty
            icone="livro"
            titulo="Nenhuma jornada para você ainda"
            descricao="Quando o gestor da sua área publicar jornadas, elas aparecem aqui. Se você ainda não participa de nenhuma área, fale com o gestor."
          />
        </div>
      </>
    );
  }

  const agora: Date = new Date();
  const andamento: IJornadaVisivel[] = itens
    .filter((item: IJornadaVisivel) => situacaoDe(item) === 'andamento')
    .sort((a, b) => (b.matricula?.ultimoAcesso ?? '').localeCompare(a.matricula?.ultimoAcesso ?? ''));
  const concluidas: number = itens.filter((item: IJornadaVisivel) => situacaoDe(item) === 'concluida').length;
  const minutos: number = itens.reduce((t: number, item: IJornadaVisivel) => t + (item.matricula ? minutosConcluidos(item.etapas, item.matricula.progresso) : 0), 0);
  const obrigatorias: IJornadaVisivel[] = itens
    .filter((item: IJornadaVisivel) => item.jornada.obrigatoria && situacaoDe(item) !== 'concluida')
    .sort((a, b) => (a.limite?.getTime() ?? Infinity) - (b.limite?.getTime() ?? Infinity));
  const atrasadas: number = obrigatorias.filter((item: IJornadaVisivel) => item.atrasada).length;
  const recomendadas: IJornadaVisivel[] = itens.filter((item: IJornadaVisivel) => situacaoDe(item) === 'nova').slice(0, 4);
  const semana = minutosPorDia(itens, agora);
  const maximo: number = Math.max(1, ...semana.map((d) => d.minutos));
  const totalSemana: number = semana.reduce((t: number, d) => t + d.minutos, 0);

  const continuar: IJornadaVisivel | undefined = andamento[0];
  const proxima: IEtapa | undefined = continuar ? etapaParaContinuar(continuar.etapas, continuar.matricula) : undefined;
  const posicao: number | undefined = continuar && proxima ? continuar.matricula?.progresso[String(proxima.id)]?.p : undefined;

  return (
    <>
      {cabecalho}
      {continuar ? (
        <Hero
          rotulo="Continue de onde parou"
          sobretitulo={`Continue de onde parou · ${continuar.area.nome}`}
          titulo={continuar.jornada.titulo}
          descricao={
            <>
              {proxima && (
                <>
                  Próxima etapa: <b style={{ color: '#fff' }}>{proxima.titulo}</b>
                  {posicao ? ` · retoma em ${Math.floor(posicao / 60)}:${`0${posicao % 60}`.slice(-2)}` : ''}
                  {proxima.duracaoMin ? ` · ${formatarDuracao(proxima.duracaoMin)}` : ''}
                </>
              )}
            </>
          }
          acoes={
            <>
              <span className={styles.heroPassos} aria-hidden="true" style={{ width: '100%' }}>
                {continuar.etapas.map((etapa: IEtapa) => (
                  <span
                    key={etapa.id}
                    className={
                      continuar.matricula?.progresso[String(etapa.id)]?.s === 'concluida' ? styles.feito : etapa.id === proxima?.id ? styles.agora : undefined
                    }
                  />
                ))}
              </span>
              <a className={`pi-btn lg ${styles.botaoClaro}`} href={roteador.hrefDe(rotaPlayer(continuar))} onClick={roteador.aoClicarLink(rotaPlayer(continuar))}>
                <Icon nome="play" tamanho={16} />
                Continuar
              </a>
              <a className="pi-btn lg on-dark" href={roteador.hrefDe(rotaJornada(continuar))} onClick={roteador.aoClicarLink(rotaJornada(continuar))}>
                Ver etapas
              </a>
            </>
          }
          lateral={<ProgressRing percentual={continuar.percentual} />}
          lema={LEMA}
        />
      ) : (
        <Hero
          rotulo="Comece agora"
          sobretitulo="Comece agora"
          titulo="Escolha sua próxima jornada"
          descricao="Vídeos, documentos e links organizados em etapas, no seu ritmo."
          lema={LEMA}
          acoes={
            <a className={`pi-btn lg ${styles.botaoClaro}`} href={roteador.hrefDe('catalogo')} onClick={roteador.aoClicarLink('catalogo')}>
              Explorar catálogo
            </a>
          }
        />
      )}

      <MetricGrid>
        <Metric nome="Em andamento" valor={andamento.length} icone="alvo" explicacao="Jornadas iniciadas" aoClicar={() => roteador.navegar('aprendizado')} />
        <Metric nome="Concluídas" valor={concluidas} icone="checkCirculo" explicacao="Desde o início" aoClicar={() => roteador.navegar('aprendizado/concluidas')} />
        <Metric
          nome="Horas de aprendizado"
          valor={(minutos / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
          icone="relogio"
          explicacao="Etapas concluídas"
        />
        <Metric
          nome="Obrigatórias pendentes"
          valor={obrigatorias.length}
          icone="bandeira"
          tom={atrasadas ? 'danger' : 'normal'}
          explicacao={atrasadas ? `${atrasadas} em atraso` : 'Nenhuma em atraso'}
        />
      </MetricGrid>

      <div className="pi-grid2">
        <Panel titulo="Obrigatórias e prazos" descricao="O prazo conta a partir da publicação da jornada">
          {obrigatorias.length === 0 ? (
            <Empty icone="checkCirculo" titulo="Tudo em dia" descricao="Você não tem jornadas obrigatórias pendentes." />
          ) : (
            <div className="pi-rows">
              {obrigatorias.slice(0, 6).map((item: IJornadaVisivel) => {
                const dias: number | undefined = item.limite ? Math.ceil((item.limite.getTime() - agora.getTime()) / MS_DIA) : undefined;
                return (
                  <div className="pi-row" key={`${item.area.id}-${item.jornada.id}`}>
                    <span className={`pi-row-icon ${item.atrasada ? styles.iconeAtraso : styles.iconePrazo}`}>
                      <Icon nome={item.atrasada ? 'alerta' : 'calendario'} tamanho={18} />
                    </span>
                    <div className="pi-row-text">
                      <b>{item.jornada.titulo}</b>
                      <span>
                        {item.limite
                          ? item.atrasada
                            ? `Venceu em ${formatarData(item.limite)} · ${Math.abs(dias ?? 0)} dia(s) em atraso`
                            : `Vence em ${dias} dia(s) · ${formatarData(item.limite)}`
                          : 'Sem prazo'}{' '}
                        · {item.percentual}%
                      </span>
                    </div>
                    <a className="pi-btn" href={roteador.hrefDe(rotaPlayer(item))} onClick={roteador.aoClicarLink(rotaPlayer(item))}>
                      {item.matricula ? 'Continuar' : 'Começar'}
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel titulo="Sua semana" descricao="Minutos de etapas concluídas por dia" acao={<span className="pi-badge neutral">{totalSemana} min</span>}>
          <div className={styles.semana} role="img" aria-label={`Minutos por dia nos últimos 7 dias: ${semana.map((d) => d.minutos).join(', ')}`}>
            {semana.map((d, i: number) => (
              <div key={i}>
                <span>{d.minutos || ''}</span>
                <i
                  className={i === 6 ? styles.hoje : d.minutos ? undefined : styles.vazio}
                  style={{ height: `${Math.max(4, (d.minutos / maximo) * 100)}%` }}
                />
                <span>{DIAS[d.dia.getDay()]}</span>
              </div>
            ))}
          </div>
          <p className="pi-hint" style={{ marginTop: 14 }}>
            Dica: 15 minutos por dia completam uma jornada média em poucas semanas.
          </p>
        </Panel>
      </div>

      {recomendadas.length > 0 && (
        <>
          <SectionTitle
            titulo="Para você começar"
            acao={
              <a className="pi-link-btn" href={roteador.hrefDe('catalogo')} onClick={roteador.aoClicarLink('catalogo')}>
                Ver todas
              </a>
            }
          />
          <ul className={styles.grade}>
            {recomendadas.map((item: IJornadaVisivel) => (
              <li key={`${item.area.id}-${item.jornada.id}`}>
                <CardJornada item={item} roteador={roteador} siteUrl={props.siteUrl} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
};

export default Inicio;
