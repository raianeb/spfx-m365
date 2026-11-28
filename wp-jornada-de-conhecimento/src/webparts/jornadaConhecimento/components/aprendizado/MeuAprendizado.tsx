// Skills aplicadas: spfx-padrao-visual-gti (histórico com abas de subtela, barras por mês), spfx-acessibilidade-conteudo.
import * as React from 'react';
import { IEtapa } from '../../../../jornada/progresso';
import { Badge, Empty, ErrorBox, Icon, Loading, PageHeader, Panel, ProgressBar, RouteTabs } from '../gti';
import { IContextoTela, IJornadaVisivel, rotaJornada, rotaPlayer } from '../tipos';
import { dataCurta, formatarData, formatarDuracao } from '../comum/ui';
import { situacaoDe } from './dadosCatalogo';
import styles from '../jc.module.scss';

const MESES: string[] = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Minutos concluídos em cada um dos últimos 5 meses. */
const minutosPorMes = (itens: IJornadaVisivel[], agora: Date): { rotulo: string; minutos: number }[] => {
  const meses: { ano: number; mes: number; rotulo: string; minutos: number }[] = [];
  for (let i = 4; i >= 0; i--) {
    const d: Date = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    meses.push({ ano: d.getFullYear(), mes: d.getMonth(), rotulo: MESES[d.getMonth()], minutos: 0 });
  }
  itens.forEach((item: IJornadaVisivel) =>
    item.etapas.forEach((etapa: IEtapa) => {
      const c: string | undefined = item.matricula?.progresso[String(etapa.id)]?.c;
      if (c) {
        const d: Date = new Date(c);
        const alvo = meses.find((m) => m.ano === d.getFullYear() && m.mes === d.getMonth());
        if (alvo) {
          alvo.minutos += etapa.duracaoMin || 0;
        }
      }
    })
  );
  return meses;
};

const MeuAprendizado: React.FC<IContextoTela> = (ctx: IContextoTela) => {
  const { catalogo, roteador } = ctx;
  const aba: string = roteador.parametros[0] ?? 'andamento';
  const cabecalho = (
    <PageHeader idTitulo={ctx.idTitulo} nivel={2} sobretitulo="Aprendizado" titulo="Meu aprendizado" descricao="Histórico das suas jornadas, com progresso, prazos e conclusões." />
  );
  if (catalogo.tipo !== 'pronto') {
    return (
      <>
        {cabecalho}
        {catalogo.tipo === 'carregando' ? <Loading /> : <ErrorBox mensagem={catalogo.mensagem} aoTentarNovamente={ctx.recarregarCatalogo} />}
      </>
    );
  }
  const iniciadas: IJornadaVisivel[] = catalogo.itens.filter((item: IJornadaVisivel) => !!item.matricula);
  const lista: IJornadaVisivel[] = iniciadas
    .filter((item: IJornadaVisivel) => (aba === 'concluidas' ? situacaoDe(item) === 'concluida' : aba === 'todas' ? true : situacaoDe(item) === 'andamento'))
    .sort((a, b) => (b.matricula?.ultimoAcesso ?? '').localeCompare(a.matricula?.ultimoAcesso ?? ''));
  const meses = minutosPorMes(catalogo.itens, new Date());
  const maximo: number = Math.max(1, ...meses.map((m) => m.minutos));
  const concluidas: IJornadaVisivel[] = iniciadas.filter((item: IJornadaVisivel) => situacaoDe(item) === 'concluida');

  return (
    <>
      {cabecalho}
      <div className="pi-grid2" style={{ marginBottom: 22 }}>
        <Panel titulo="Horas por mês" descricao="Etapas concluídas nos últimos cinco meses">
          {meses.map((m) => (
            <div className={styles.barraH} key={m.rotulo}>
              <span>{m.rotulo}</span>
              <span className="pi-bar" aria-hidden="true">
                <i style={{ width: `${(m.minutos / maximo) * 100}%`, background: 'var(--pi-blue)' }} />
              </span>
              <b>{formatarDuracao(m.minutos)}</b>
            </div>
          ))}
        </Panel>
        <Panel titulo="Certificados" descricao="Emitidos pela solução de certificados da instituição" acao={<Badge tom="warning">Fase 4</Badge>}>
          {concluidas.length === 0 ? (
            <p className="pi-hint">Conclua uma jornada para vê-la aqui.</p>
          ) : (
            <div className="pi-rows">
              {concluidas.slice(0, 4).map((item: IJornadaVisivel) => (
                <div className="pi-row" key={`${item.area.id}-${item.jornada.id}`}>
                  <span className="pi-row-icon" style={{ background: 'var(--pi-success-bg)', color: 'var(--pi-success)' }}>
                    <Icon nome="medalha" />
                  </span>
                  <div className="pi-row-text">
                    <b>{item.jornada.titulo}</b>
                    <span>Concluída em {formatarData(item.matricula?.concluidaEm)} · certificado quando a integração for ativada</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <RouteTabs
        rotulo="Situação"
        roteador={roteador}
        abas={[
          { rota: 'aprendizado', rotulo: 'Em andamento' },
          { rota: 'aprendizado/concluidas', rotulo: 'Concluídas' },
          { rota: 'aprendizado/todas', rotulo: 'Todas iniciadas' }
        ]}
      />
      {lista.length === 0 ? (
        <div className="pi-card">
          <Empty
            icone="livro"
            titulo={aba === 'concluidas' ? 'Nenhuma jornada concluída ainda' : 'Nada em andamento'}
            descricao="Escolha uma jornada no catálogo para começar."
            acao={
              <a className="pi-btn primary" href={roteador.hrefDe('catalogo')} onClick={roteador.aoClicarLink('catalogo')}>
                Explorar catálogo
              </a>
            }
          />
        </div>
      ) : (
        <div className="pi-card pi-table-wrap">
          <table className="pi-table">
            <caption className="pi-sr">Jornadas iniciadas</caption>
            <thead>
              <tr>
                <th scope="col">Jornada</th>
                <th scope="col">Progresso</th>
                <th scope="col">Último acesso</th>
                <th scope="col">Prazo</th>
                <th scope="col">
                  <span className="pi-sr">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.map((item: IJornadaVisivel) => {
                const concluida: boolean = situacaoDe(item) === 'concluida';
                const feitas: number = item.etapas.filter((e: IEtapa) => item.matricula?.progresso[String(e.id)]?.s === 'concluida').length;
                return (
                  <tr key={`${item.area.id}-${item.jornada.id}`}>
                    <td>
                      <a className="pi-link-btn" href={roteador.hrefDe(rotaJornada(item))} onClick={roteador.aoClicarLink(rotaJornada(item))}>
                        {item.jornada.titulo}
                      </a>
                      <div className="pi-hint">
                        {item.area.nome} · {feitas} de {item.etapas.length} etapas
                      </div>
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <ProgressBar percentual={item.percentual} rotulo={`Progresso em ${item.jornada.titulo}`} />
                    </td>
                    <td>{dataCurta(item.matricula?.ultimoAcesso)}</td>
                    <td>
                      {concluida ? (
                        <Badge tom="success">Concluída</Badge>
                      ) : item.atrasada ? (
                        <Badge tom="danger">Atrasada</Badge>
                      ) : item.limite ? (
                        formatarData(item.limite)
                      ) : (
                        '–'
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <a className="pi-btn" href={roteador.hrefDe(rotaPlayer(item))} onClick={roteador.aoClicarLink(rotaPlayer(item))}>
                        {concluida ? 'Rever' : 'Continuar'}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default MeuAprendizado;
