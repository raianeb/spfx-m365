// Skills aplicadas: spfx-padrao-visual-gti (indicadores, tabela com situação, ações por perfil, confirmação central),
// spfx-acessibilidade-conteudo (tabela com cabeçalhos, situação em texto). Escopo, seção 6.4: Gestores e Apoio.
import * as React from 'react';
import { useEffect, useState } from 'react';
import { IArea } from '../../../../jornada/modelo';
import { IEtapa, IResumoAvaliacoes } from '../../../../jornada/progresso';
import { IJornadaEstudio, ROTULO_SITUACAO, SituacaoPublicacao, situacaoPublicacao } from '../../../../jornada/estudio';
import { IAreaComPapel } from '../../../../services/PerfilService';
import { mensagemDeErro } from '../../../../services/sp';
import { Badge, Empty, ErrorBox, GtiDialog, Icon, Loading, Metric, MetricGrid, PageHeader, ProgressBar, TomBadge } from '../gti';
import { IContextoTela } from '../tipos';
import { Estrelas, dataCurta, textoErro } from '../comum/ui';
import EditorJornada from './EditorJornada';
import PreviaJornada from './PreviaJornada';

export const TOM_SITUACAO: Record<SituacaoPublicacao, TomBadge> = {
  rascunho: 'neutral',
  emAprovacao: 'warning',
  devolvida: 'danger',
  publicada: 'success',
  alteracoesPendentes: 'warning',
  arquivada: 'neutral'
};

/** Áreas em que o usuário logado é Gestor ou Apoio. */
export const areasDaEquipe = (ctx: IContextoTela): IAreaComPapel[] =>
  ctx.perfil.areas.filter((item: IAreaComPapel) => item.area.status === 'Ativa' && (item.papeis.gestor || item.papeis.apoio));

const NoArea: React.FC = () => (
  <div className="pi-card">
    <Empty icone="lapis" titulo="Estúdio" descricao="Você não está como Gestor ou Apoio em nenhuma área ativa." />
  </div>
);

const ListaEstudio: React.FC<{ ctx: IContextoTela; areaId: number | undefined }> = ({ ctx, areaId }: { ctx: IContextoTela; areaId: number | undefined }) => {
  const { servicos, roteador } = ctx;
  const minhas: IAreaComPapel[] = areasDaEquipe(ctx);
  const atual: IAreaComPapel | undefined = minhas.find((item: IAreaComPapel) => item.area.id === areaId) ?? minhas[0];
  const area: IArea | undefined = atual?.area;
  const gestor: boolean = !!atual?.papeis.gestor;
  const [jornadas, setJornadas] = useState<IJornadaEstudio[] | undefined>(undefined);
  const [notas, setNotas] = useState<Map<number, IResumoAvaliacoes>>(new Map<number, IResumoAvaliacoes>());
  const [conclusao, setConclusao] = useState<Map<number, { iniciadas: number; concluidas: number }>>(new Map());
  const [previa, setPrevia] = useState<{ jornada: IJornadaEstudio; etapas: IEtapa[] } | undefined>(undefined);
  const [arquivando, setArquivando] = useState<IJornadaEstudio | undefined>(undefined);
  const [ocupado, setOcupado] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');
  const [versao, setVersao] = useState<number>(0);

  useEffect(() => {
    if (!area) {
      return undefined;
    }
    let ativo: boolean = true;
    setJornadas(undefined);
    setErro('');
    servicos.estudio
      .listar(area)
      .then((lista: IJornadaEstudio[]) => {
        if (!ativo) {
          return;
        }
        setJornadas(lista);
        const ids: number[] = lista.map((j: IJornadaEstudio) => j.id);
        servicos.engajamento.resumosDosCards(area, ids).then((mapa) => ativo && setNotas(mapa)).catch(() => undefined);
        if (gestor) {
          servicos.gestao.conclusaoPorJornada(area, ids).then((mapa) => ativo && setConclusao(mapa)).catch(() => undefined);
        }
      })
      .catch((falha: unknown) => ativo && setErro(mensagemDeErro(falha, 'Carregar as jornadas da área')));
    return () => {
      ativo = false;
    };
  }, [servicos, area, gestor, versao]);

  if (!area) {
    return <NoArea />;
  }

  const abrirPrevia = (jornada: IJornadaEstudio): void => {
    servicos.jornadas
      .etapasDaJornada(area, jornada.id)
      .then((etapas: IEtapa[]) => setPrevia({ jornada, etapas }))
      .catch((falha: unknown) => setErro(mensagemDeErro(falha, 'Abrir a pré-visualização')));
  };

  const arquivar = async (): Promise<void> => {
    if (!arquivando) {
      return;
    }
    setOcupado(true);
    try {
      await servicos.estudio.arquivar(area, arquivando.id);
      ctx.avisar(`"${arquivando.titulo}" foi arquivada. Dados e histórico continuam guardados.`);
      setArquivando(undefined);
      setVersao((v: number) => v + 1);
      ctx.recarregarCatalogo();
    } catch (falha: unknown) {
      setErro(textoErro(falha, (e: unknown) => mensagemDeErro(e, 'Arquivar')));
      setArquivando(undefined);
    } finally {
      setOcupado(false);
    }
  };

  const situacoes: SituacaoPublicacao[] = (jornadas ?? []).map((j: IJornadaEstudio) => situacaoPublicacao(j.status, j.moderacao, !!j.dataPublicacao));
  const contar = (...tipos: SituacaoPublicacao[]): number => situacoes.filter((s: SituacaoPublicacao) => tipos.indexOf(s) !== -1).length;
  const avaliadas: IResumoAvaliacoes[] = Array.from(notas.values()).filter((n: IResumoAvaliacoes) => n.total > 0);
  const notaMedia: number = avaliadas.length ? avaliadas.reduce((t: number, n: IResumoAvaliacoes) => t + n.media, 0) / avaliadas.length : 0;
  const novaRota: string = `editor/${area.id}/novo`;

  return (
    <>
      <PageHeader
        idTitulo={ctx.idTitulo}
        nivel={2}
        sobretitulo={`Estúdio · ${area.nome}`}
        titulo="Estúdio de jornadas"
        descricao={gestor ? 'Crie, edite e publique as jornadas da área.' : 'Crie e edite jornadas. Um gestor da área revisa e publica.'}
        acoes={
          <>
            {minhas.length > 1 && (
              <select className="pi-select" aria-label="Área" value={area.id} onChange={(e) => roteador.navegar(`estudio/${e.target.value}`)}>
                {minhas.map((item: IAreaComPapel) => (
                  <option key={item.area.id} value={item.area.id}>
                    {item.area.nome}
                  </option>
                ))}
              </select>
            )}
            <a className="pi-btn primary" href={roteador.hrefDe(novaRota)} onClick={roteador.aoClicarLink(novaRota)}>
              <Icon nome="mais" tamanho={16} />
              Nova jornada
            </a>
          </>
        }
      />
      {erro && <ErrorBox mensagem={erro} aoTentarNovamente={() => setVersao((v: number) => v + 1)} />}
      {jornadas === undefined ? (
        !erro && <Loading texto="Carregando as jornadas da área…" />
      ) : (
        <>
          <MetricGrid>
            <Metric nome="Publicadas" valor={contar('publicada', 'alteracoesPendentes')} icone="checkCirculo" explicacao="Visíveis para a área" />
            <Metric
              nome="Aguardando aprovação"
              valor={contar('emAprovacao', 'alteracoesPendentes')}
              icone="caixaEntrada"
              explicacao={gestor ? 'Revise em Gestão da área' : 'Com os gestores'}
              aoClicar={gestor ? () => roteador.navegar('gestao/aprovacoes') : undefined}
            />
            <Metric nome="Rascunhos e devolvidas" valor={contar('rascunho', 'devolvida')} icone="lapis" explicacao="Ainda não publicadas" />
            <Metric nome="Nota média" valor={notaMedia ? notaMedia.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '–'} icone="estrela" explicacao={`${avaliadas.length} jornada(s) avaliada(s)`} />
          </MetricGrid>
          {jornadas.length === 0 ? (
            <div className="pi-card">
              <Empty
                icone="lapis"
                titulo="Nenhuma jornada nesta área"
                descricao="Crie a primeira jornada em cinco passos: dados gerais, etapas, público, regras e publicação."
                acao={
                  <a className="pi-btn primary" href={roteador.hrefDe(novaRota)} onClick={roteador.aoClicarLink(novaRota)}>
                    Nova jornada
                  </a>
                }
              />
            </div>
          ) : (
            <div className="pi-card pi-table-wrap">
              <table className="pi-table">
                <caption className="pi-sr">Jornadas da área {area.nome}</caption>
                <thead>
                  <tr>
                    <th scope="col">Jornada</th>
                    <th scope="col">Situação</th>
                    <th scope="col">{gestor ? 'Conclusão' : 'Atualizada'}</th>
                    <th scope="col">Nota</th>
                    <th scope="col">
                      <span className="pi-sr">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jornadas.map((jornada: IJornadaEstudio, i: number) => {
                    const situacao: SituacaoPublicacao = situacoes[i];
                    const contagem = conclusao.get(jornada.id);
                    const nota: IResumoAvaliacoes | undefined = notas.get(jornada.id);
                    const rota: string = `editor/${area.id}/${jornada.id}`;
                    return (
                      <tr key={jornada.id}>
                        <td>
                          <a className="pi-link-btn" href={roteador.hrefDe(rota)} onClick={roteador.aoClicarLink(rota)}>
                            {jornada.titulo}
                          </a>
                          <div className="pi-hint">
                            {jornada.categoria ? `${jornada.categoria} · ` : ''}
                            {jornada.autor}
                            {jornada.obrigatoria ? ' · obrigatória' : ''}
                          </div>
                        </td>
                        <td>
                          <Badge tom={TOM_SITUACAO[situacao]}>{ROTULO_SITUACAO[situacao]}</Badge>
                          {situacao === 'devolvida' && jornada.comentarioModeracao && (
                            <div className="pi-hint" style={{ color: 'var(--pi-danger)', marginTop: 4 }}>
                              {jornada.comentarioModeracao}
                            </div>
                          )}
                        </td>
                        <td style={{ minWidth: 140 }}>
                          {gestor ? (
                            contagem && contagem.iniciadas ? (
                              <>
                                <ProgressBar percentual={(contagem.concluidas / contagem.iniciadas) * 100} rotulo={`Conclusão de ${jornada.titulo}`} />
                                <span className="pi-hint">
                                  {contagem.concluidas} de {contagem.iniciadas} iniciadas
                                </span>
                              </>
                            ) : (
                              <span className="pi-hint">Ninguém iniciou</span>
                            )
                          ) : (
                            dataCurta(jornada.modificadaEm)
                          )}
                        </td>
                        <td>
                          <Estrelas nota={nota?.media ?? 0} total={nota?.total} />
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button type="button" className="pi-btn ghost" aria-label={`Pré-visualizar ${jornada.titulo}`} onClick={() => abrirPrevia(jornada)}>
                            <Icon nome="olho" tamanho={16} />
                          </button>
                          <a className="pi-btn" href={roteador.hrefDe(rota)} onClick={roteador.aoClicarLink(rota)} aria-label={`Editar ${jornada.titulo}`}>
                            Editar
                          </a>
                          {gestor && situacao !== 'arquivada' && (
                            <button type="button" className="pi-btn ghost" aria-label={`Arquivar ${jornada.titulo}`} onClick={() => setArquivando(jornada)}>
                              Arquivar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {previa && (
        <PreviaJornada
          id={`${ctx.idTitulo}-previa`}
          titulo={previa.jornada.titulo}
          descricao={previa.jornada.descricao}
          etapas={previa.etapas}
          siteUrl={ctx.props.siteUrl}
          aoFechar={() => setPrevia(undefined)}
        />
      )}
      {arquivando && (
        <GtiDialog
          id={`${ctx.idTitulo}-arquivar`}
          variante="central"
          titulo={`Arquivar "${arquivando.titulo}"?`}
          bloquearFechamento={ocupado}
          aoFechar={() => setArquivando(undefined)}
          rodape={
            <>
              <button type="button" className="pi-btn" disabled={ocupado} onClick={() => setArquivando(undefined)}>
                Cancelar
              </button>
              <button type="button" className="pi-btn primary" disabled={ocupado} onClick={arquivar}>
                {ocupado ? 'Arquivando…' : 'Arquivar'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13 }}>A jornada sai do catálogo das pessoas. Matrículas, avaliações e histórico continuam guardados.</p>
        </GtiDialog>
      )}
    </>
  );
};

/** Rotas estudio[/<área>] e editor/<área>/<jornada|novo>. */
const Estudio: React.FC<IContextoTela> = (ctx: IContextoTela) => {
  const [areaParam, jornadaParam] = ctx.roteador.parametros;
  const areaId: number | undefined = areaParam ? Number(areaParam) : undefined;
  if (ctx.roteador.tela === 'editor') {
    const atual: IAreaComPapel | undefined = areasDaEquipe(ctx).find((item: IAreaComPapel) => item.area.id === areaId);
    if (!atual) {
      return <NoArea />;
    }
    return (
      <EditorJornada
        key={`${areaId}-${jornadaParam}`}
        ctx={ctx}
        area={atual.area}
        gestor={atual.papeis.gestor}
        jornadaId={jornadaParam === 'novo' ? 0 : Number(jornadaParam)}
      />
    );
  }
  return <ListaEstudio ctx={ctx} areaId={areaId} />;
};

export default Estudio;
