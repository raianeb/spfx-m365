// Skills aplicadas: spfx-padrao-visual-gti (receita "Detalhe": hero do registro, cartão lateral com a ação principal,
// abas de subtela), spfx-acessibilidade-conteudo (estado de cada etapa em texto).
import * as React from 'react';
import { EstadoEtapa, IEtapa, avaliacaoLiberada, estadosEtapas } from '../../../../jornada/progresso';
import { urlSegura } from '../../../../jornada/conteudo';
import { Empty, ErrorBox, Icon, Loading, Panel, ProgressBar, RouteTabs } from '../gti';
import { IContextoTela, IJornadaVisivel, rotaJornada, rotaPlayer } from '../tipos';
import { ICONE_TIPO, PadraoCapa, ROTULO_TIPO, formatarData, formatarDuracao, fundoArea, rotuloRegra } from '../comum/ui';
import Avaliacoes from '../player/Avaliacoes';
import styles from '../jc.module.scss';

export const encontrarJornada = (ctx: IContextoTela): IJornadaVisivel | undefined => {
  if (ctx.catalogo.tipo !== 'pronto') {
    return undefined;
  }
  const [areaId, jornadaId] = ctx.roteador.parametros.map(Number);
  return ctx.catalogo.itens.find((item: IJornadaVisivel) => item.area.id === areaId && item.jornada.id === jornadaId);
};

const DetalheJornada: React.FC<IContextoTela> = (ctx: IContextoTela) => {
  const { catalogo, roteador, props } = ctx;
  const voltar = (
    <a className={`pi-link-btn ${styles.voltar}`} href={roteador.hrefDe('catalogo')} onClick={roteador.aoClicarLink('catalogo')}>
      <Icon nome="esquerda" tamanho={14} />
      Catálogo
    </a>
  );
  if (catalogo.tipo === 'carregando') {
    return <Loading texto="Abrindo a jornada…" />;
  }
  if (catalogo.tipo === 'erro') {
    return <ErrorBox mensagem={catalogo.mensagem} aoTentarNovamente={ctx.recarregarCatalogo} />;
  }
  const item: IJornadaVisivel | undefined = encontrarJornada(ctx);
  if (!item) {
    return (
      <>
        {voltar}
        <div className="pi-card">
          <Empty icone="busca" titulo="Jornada não encontrada" descricao="Ela pode ter sido arquivada ou não estar disponível para você." />
        </div>
      </>
    );
  }

  const { area, jornada, matricula } = item;
  const aba: string = roteador.parametros[2] ?? 'conteudo';
  const base: string = rotaJornada(item);
  const estados: EstadoEtapa[] = estadosEtapas(item.etapas, matricula?.progresso ?? {}, jornada.ordemLivre);
  const atual: number | undefined = matricula?.etapaAtualId;
  const capa: string = urlSegura(jornada.capa, props.siteUrl);
  const acao: string = matricula?.status === 'Concluida' ? 'Rever conteúdo' : matricula ? 'Continuar' : 'Começar jornada';
  const feitas: number = estados.filter((e: EstadoEtapa) => e === 'concluida').length;

  return (
    <>
      {voltar}
      <section className={styles.jhero} style={fundoArea(area)}>
        {capa ? <img className={styles.jheroImagem} src={capa} alt="" /> : <PadraoCapa semente={jornada.id + 3} />}
        <div>
          <span className="pi-eyebrow" style={{ color: '#cfe0ec' }}>
            {area.nome}
            {jornada.categoria ? ` · ${jornada.categoria}` : ''}
          </span>
          <h2 id={ctx.idTitulo} tabIndex={-1}>
            {jornada.titulo}
          </h2>
          {jornada.descricao && <p>{jornada.descricao}</p>}
          <div className={styles.fatos}>
            <span>
              <Icon nome="camadas" tamanho={15} />
              {item.etapas.length} etapa(s)
            </span>
            <span>
              <Icon nome="relogio" tamanho={15} />
              {formatarDuracao(item.duracaoMin)}
            </span>
            {item.limite && (
              <span>
                <Icon nome="calendario" tamanho={15} />
                Prazo {formatarData(item.limite)}
              </span>
            )}
            <span>
              <Icon nome="estrela" tamanho={15} />
              {item.nota?.total ? `${item.nota.media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} (${item.nota.total})` : 'Sem avaliações'}
            </span>
            {jornada.obrigatoria && (
              <span>
                <Icon nome="bandeira" tamanho={15} />
                Obrigatória
              </span>
            )}
          </div>
        </div>
        <aside className={styles.jheroLado}>
          {matricula ? (
            <>
              <span>Seu progresso</span>
              <ProgressBar percentual={item.percentual} rotulo="Seu progresso nesta jornada" />
              <span>{matricula.status === 'Concluida' ? `Concluída em ${formatarData(matricula.concluidaEm)}` : `${feitas} de ${item.etapas.length} etapas`}</span>
            </>
          ) : (
            <span>Você ainda não começou esta jornada.</span>
          )}
          <a className={`pi-btn lg ${styles.botaoClaro}`} href={roteador.hrefDe(rotaPlayer(item))} onClick={roteador.aoClicarLink(rotaPlayer(item))}>
            <Icon nome="play" tamanho={16} />
            {acao}
          </a>
          {item.atrasada && <span className="pi-badge danger">Atrasada</span>}
        </aside>
      </section>

      <RouteTabs
        rotulo="Seções da jornada"
        roteador={roteador}
        abas={[
          { rota: base, rotulo: 'Conteúdo' },
          { rota: `${base}/avaliacoes`, rotulo: `Avaliações${item.nota?.total ? ` (${item.nota.total})` : ''}` },
          { rota: `${base}/sobre`, rotulo: 'Sobre' }
        ]}
      />

      {aba === 'avaliacoes' ? (
        <Avaliacoes
          servico={ctx.servicos.engajamento}
          area={area}
          jornadaId={jornada.id}
          usuarioId={ctx.perfil.usuarioId}
          siteUrl={props.siteUrl}
          liberada={avaliacaoLiberada(item.etapas, matricula?.progresso ?? {})}
          aoSalvar={ctx.recarregarCatalogo}
        />
      ) : aba === 'sobre' ? (
        <Panel>
          <div className={styles.sobre}>
            <div>
              <span className="pi-eyebrow">Público</span>
              <p>{jornada.publico.length ? 'Pessoas específicas da área' : `Todos os Usuários da área ${area.nome}`}</p>
            </div>
            <div>
              <span className="pi-eyebrow">Ordem</span>
              <p>{jornada.ordemLivre ? 'Livre: faça as etapas em qualquer ordem' : 'Sequencial: cada etapa libera a próxima'}</p>
            </div>
            <div>
              <span className="pi-eyebrow">Prazo</span>
              <p>{jornada.prazoDias && jornada.dataPublicacao ? `${jornada.prazoDias} dias a partir da publicação (${formatarData(jornada.dataPublicacao)})` : 'Sem prazo'}</p>
            </div>
            <div>
              <span className="pi-eyebrow">Avaliação</span>
              <p>Liberada depois de concluir ao menos metade das etapas.</p>
            </div>
          </div>
        </Panel>
      ) : (
        <Panel>
          <ol className={styles.etapas}>
            {item.etapas.map((etapa: IEtapa, i: number) => {
              const estado: EstadoEtapa = estados[i];
              const agora: boolean = estado !== 'concluida' && etapa.id === atual;
              return (
                <li key={etapa.id} className={styles.etapa}>
                  <span className={`${styles.numero} ${estado === 'concluida' ? styles.numeroFeito : agora ? styles.numeroAgora : ''}`} aria-hidden="true">
                    {estado === 'concluida' ? <Icon nome="check" tamanho={15} /> : estado === 'bloqueada' ? <Icon nome="cadeado" tamanho={14} /> : i + 1}
                  </span>
                  <div className={styles.etapaTexto}>
                    <b>{etapa.titulo}</b>
                    <span>
                      <Icon nome={ICONE_TIPO[etapa.tipo]} tamanho={13} />
                      {ROTULO_TIPO[etapa.tipo]}
                      {etapa.duracaoMin ? ` · ${formatarDuracao(etapa.duracaoMin)}` : ''} · {rotuloRegra(etapa)}
                      <span className="pi-sr">
                        , {estado === 'concluida' ? 'concluída' : estado === 'bloqueada' ? 'bloqueada até concluir a anterior' : 'disponível'}
                      </span>
                    </span>
                  </div>
                  {estado === 'bloqueada' ? (
                    <span className="pi-hint">Libera após a anterior</span>
                  ) : (
                    <a
                      className="pi-btn ghost"
                      href={roteador.hrefDe(rotaPlayer(item, etapa.id))}
                      onClick={roteador.aoClicarLink(rotaPlayer(item, etapa.id))}
                      aria-label={`${estado === 'concluida' ? 'Rever' : 'Abrir'} ${etapa.titulo}`}
                    >
                      {estado === 'concluida' ? 'Rever' : 'Abrir'} <Icon nome="direita" tamanho={14} />
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </Panel>
      )}
    </>
  );
};

export default DetalheJornada;
