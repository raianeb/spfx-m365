// Skills aplicadas: spfx-padrao-visual-gti (receita "Gestão": abas de subtela, indicadores, barras por jornada, atrasados
// com ação em lote, mapa de calor com detalhe em painel lateral), spfx-acessibilidade-conteudo (mapa com percentual em
// texto e rótulo por célula, não só cor), spfx-codigo-performance. Escopo, seção 6.3.
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { IArea } from '../../../../jornada/modelo';
import { IEtapa, IJornada, IResumoAvaliacoes, dataLimite } from '../../../../jornada/progresso';
import { ICelula, IMatriculaPessoa, IPainel, IPessoaArea, calcularPainel, faixaCalor, gerarCsv, juntarPessoas, montarCelulas } from '../../../../jornada/gestao';
import { ICatalogoArea } from '../../../../services/JornadaService';
import { IMembros } from '../../../../services/GestaoService';
import { IAreaComPapel } from '../../../../services/PerfilService';
import { mensagemDeErro } from '../../../../services/sp';
import { Badge, Empty, ErrorBox, GtiDialog, Icon, Loading, Metric, MetricGrid, PageHeader, Panel, RouteTabs } from '../gti';
import { IContextoTela } from '../tipos';
import { Aviso, iniciais } from '../comum/ui';
import Aprovacoes, { aguardando } from './Aprovacoes';
import Moderacao from './Moderacao';
import DetalhePessoa from './DetalhePessoa';
import PessoasDaArea from './PessoasDaArea';
import styles from '../jc.module.scss';

interface IDados {
  catalogo: ICatalogoArea;
  membros: IMembros;
  matriculas: IMatriculaPessoa[];
}

const ROTULO_FAIXA: Record<ReturnType<typeof faixaCalor>, string> = {
  na: 'não se aplica',
  zero: 'não iniciada',
  baixa: 'em andamento',
  media: 'em andamento',
  alta: 'em andamento',
  completa: 'concluída'
};

const baixarCsv = (conteudo: string, nome: string): void => {
  const url: string = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
  const link: HTMLAnchorElement = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Conta as jornadas aguardando aprovação para o contador da aba (sem abrir a aba). */
const ContadorAprovacoes: React.FC<{ ctx: IContextoTela; area: IArea; aoContar: (n: number) => void }> = ({
  ctx,
  area,
  aoContar
}: {
  ctx: IContextoTela;
  area: IArea;
  aoContar: (n: number) => void;
}) => {
  useEffect(() => {
    let ativo: boolean = true;
    ctx.servicos.estudio
      .listar(area)
      .then((lista) => ativo && aoContar(lista.filter(aguardando).length))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [ctx.servicos, area]);
  return <></>;
};

const Gestao: React.FC<IContextoTela> = (ctx: IContextoTela) => {
  const { perfil, servicos, roteador, props } = ctx;
  const minhas: IArea[] = perfil.areas.filter((item: IAreaComPapel) => item.area.status === 'Ativa' && item.papeis.gestor).map((item: IAreaComPapel) => item.area);
  const [areaId, setAreaId] = useState<number | undefined>(minhas[0]?.id);
  const area: IArea | undefined = minhas.find((a: IArea) => a.id === areaId) ?? minhas[0];
  const secao: string = roteador.parametros[0] ?? 'painel';

  const [dados, setDados] = useState<IDados | undefined>(undefined);
  const [notas, setNotas] = useState<Map<number, IResumoAvaliacoes>>(new Map<number, IResumoAvaliacoes>());
  const [erro, setErro] = useState<string>('');
  const [versao, setVersao] = useState<number>(0);
  const [pendentes, setPendentes] = useState<number>(0);
  const [detalhe, setDetalhe] = useState<{ pessoa: IPessoaArea; jornada: IJornada; celula: ICelula } | undefined>(undefined);
  const [lembrete, setLembrete] = useState<{ jornada: IJornada; pessoas: IPessoaArea[] }[] | undefined>(undefined);
  const [enviando, setEnviando] = useState<boolean>(false);
  const [aviso, setAviso] = useState<string>('');
  const [filtroPessoa, setFiltroPessoa] = useState<string>('');

  useEffect(() => {
    if (!area || !area.grupoUsuariosId) {
      return undefined;
    }
    let ativo: boolean = true;
    setDados(undefined);
    setErro('');
    (async (): Promise<void> => {
      const [catalogo] = await servicos.jornadas.carregarCatalogo([area], perfil.usuarioId);
      const [membros, matriculas] = await Promise.all([servicos.gestao.membros(area.grupoUsuariosId ?? 0), servicos.gestao.matriculas(area, catalogo.jornadas)]);
      if (ativo) {
        setDados({ catalogo, membros, matriculas });
      }
      const resumos = await servicos.engajamento.resumosDosCards(area, catalogo.jornadas.map((j: IJornada) => j.id));
      if (ativo) {
        setNotas(resumos);
      }
    })().catch((falha: unknown) => ativo && setErro(mensagemDeErro(falha, 'Carregar a gestão da área')));
    return () => {
      ativo = false;
    };
  }, [servicos, area, perfil.usuarioId, versao]);

  const calculo = useMemo(() => {
    if (!dados) {
      return undefined;
    }
    const pessoas: IPessoaArea[] = juntarPessoas(dados.membros.pessoas, dados.matriculas);
    const celulas: ICelula[][] = montarCelulas(pessoas, dados.catalogo.jornadas, dados.catalogo.etapas, dados.matriculas, new Date());
    return { pessoas, celulas, painel: calcularPainel(celulas, dados.catalogo.etapas) };
  }, [dados]);

  if (!area) {
    return (
      <div className="pi-card">
        <Empty icone="grafico" titulo="Gestão da área" descricao="Você não é Gestor de nenhuma área ativa." />
      </div>
    );
  }

  const exportar = (): void => {
    if (!dados || !calculo) {
      return;
    }
    const linhas: (string | number)[][] = [];
    calculo.pessoas.forEach((pessoa: IPessoaArea, i: number) =>
      dados.catalogo.jornadas.forEach((jornada: IJornada, j: number) => {
        const celula: ICelula = calculo.celulas[i][j];
        if (celula.naoSeAplica) {
          return;
        }
        const limite: Date | undefined = dataLimite(jornada);
        const data = (v?: string): string => (v ? new Date(v).toLocaleDateString('pt-BR') : '');
        linhas.push([
          pessoa.nome,
          pessoa.email,
          jornada.titulo,
          ROTULO_FAIXA[faixaCalor(celula)],
          celula.percentual,
          data(celula.matricula?.dataInicio),
          data(celula.matricula?.ultimoAcesso),
          data(celula.matricula?.concluidaEm),
          limite ? limite.toLocaleDateString('pt-BR') : '',
          celula.atrasada ? 'Sim' : 'Não'
        ]);
      })
    );
    baixarCsv(
      gerarCsv(['Pessoa', 'E-mail', 'Jornada', 'Situação', 'Percentual', 'Início', 'Último acesso', 'Concluída em', 'Prazo', 'Atrasada'], linhas),
      `jornadas-${area.sigla}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    props.logger.log('info', `Gestão ${area.sigla}`, `Exportação: ${linhas.length} linha(s)`);
    ctx.avisar(`Exportação gerada com ${linhas.length} linha(s).`);
  };

  const prepararLembrete = (): void => {
    if (!dados || !calculo) {
      return;
    }
    setLembrete(
      dados.catalogo.jornadas
        .map((jornada: IJornada, j: number) => ({
          jornada,
          pessoas: calculo.pessoas.filter((_p: IPessoaArea, i: number) => calculo.celulas[i][j].atrasada && !calculo.celulas[i][j].naoSeAplica)
        }))
        .filter((grupo) => grupo.pessoas.length > 0)
    );
  };

  const enviarLembretes = async (): Promise<void> => {
    if (!lembrete) {
      return;
    }
    setEnviando(true);
    let enviados: number = 0;
    let falhas: number = 0;
    for (const grupo of lembrete) {
      const resultado = await servicos.gestao.lembrar(grupo.pessoas, grupo.jornada, window.location.href.split('#')[0]);
      enviados += resultado.enviados;
      falhas += resultado.falhas;
    }
    setEnviando(false);
    setLembrete(undefined);
    if (falhas) {
      setAviso(`${enviados} lembrete(s) enviado(s); ${falhas} não puderam ser enviados (pessoa sem e-mail ou falha no envio).`);
    } else {
      ctx.avisar(`${enviados} lembrete(s) enviado(s).`);
    }
  };

  const painel: IPainel | undefined = calculo?.painel;
  const avaliadas: IResumoAvaliacoes[] = Array.from(notas.values()).filter((n: IResumoAvaliacoes) => n.total > 0);
  const notaMedia: number = avaliadas.length ? avaliadas.reduce((t: number, n: IResumoAvaliacoes) => t + n.media, 0) / avaliadas.length : 0;
  const totalAvaliacoes: number = avaliadas.reduce((t: number, n: IResumoAvaliacoes) => t + n.total, 0);

  const conteudoPainel = (): React.ReactNode => {
    if (erro) {
      return <ErrorBox mensagem={erro} aoTentarNovamente={() => setVersao((v: number) => v + 1)} />;
    }
    if (!dados || !calculo || !painel) {
      return <Loading texto="Calculando os indicadores da área…" />;
    }
    const jornadas: IJornada[] = dados.catalogo.jornadas;
    const atrasados: { pessoa: IPessoaArea; jornada: IJornada; celula: ICelula }[] = [];
    calculo.pessoas.forEach((pessoa: IPessoaArea, i: number) =>
      jornadas.forEach((jornada: IJornada, j: number) => {
        const celula: ICelula = calculo.celulas[i][j];
        if (celula.atrasada && !celula.naoSeAplica) {
          atrasados.push({ pessoa, jornada, celula });
        }
      })
    );
    const termo: string = filtroPessoa.trim().toLowerCase();
    const visiveis: number[] = calculo.pessoas.map((_p: IPessoaArea, i: number) => i).filter((i: number) => !termo || calculo.pessoas[i].nome.toLowerCase().indexOf(termo) !== -1);
    return (
      <>
        <MetricGrid>
          <Metric nome="Adesão" valor={`${painel.adesao}%`} icone="pessoas" explicacao={`${painel.pessoas} pessoa(s) na área`} />
          <Metric nome="Conclusão média" valor={`${painel.conclusaoMedia}%`} icone="alvo" explicacao="Nas jornadas que se aplicam" />
          <Metric nome="Atrasos" valor={painel.atrasados} icone="alerta" tom={painel.atrasados ? 'danger' : 'normal'} explicacao="Pessoa × jornada vencida" />
          <Metric
            nome="Horas · nota média"
            valor={`${painel.horas.toLocaleString('pt-BR')} h`}
            icone="relogio"
            explicacao={notaMedia ? `Nota ${notaMedia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} em ${totalAvaliacoes} avaliação(ões)` : 'Sem avaliações ainda'}
          />
        </MetricGrid>
        {dados.membros.gruposExpandidos > 0 && (
          <p className="pi-hint" style={{ marginBottom: 14 }}>
            Inclui as pessoas de {dados.membros.gruposExpandidos} grupo(s) do Entra ID do grupo de Usuários.
          </p>
        )}
        <div className="pi-grid2" style={{ marginBottom: 22 }}>
          <Panel
            titulo="Conclusão por jornada"
            descricao="Percentual de pessoas que concluíram, entre as que a jornada se aplica"
            acao={
              <button type="button" className="pi-btn" onClick={exportar}>
                <Icon nome="baixar" tamanho={16} />
                Exportar CSV
              </button>
            }
          >
            {jornadas.length === 0 ? (
              <p className="pi-hint">Nenhuma jornada publicada nesta área.</p>
            ) : (
              jornadas.map((jornada: IJornada, j: number) => {
                const aplicaveis: ICelula[] = calculo.celulas.map((linha: ICelula[]) => linha[j]).filter((c: ICelula) => !c.naoSeAplica);
                const pct: number = aplicaveis.length ? Math.round((aplicaveis.filter((c: ICelula) => c.concluida).length / aplicaveis.length) * 100) : 0;
                return (
                  <div className={styles.barraH} key={jornada.id}>
                    <span>
                      {jornada.titulo} {jornada.obrigatoria && <Badge tom="warning">Obrig.</Badge>}
                    </span>
                    <span className="pi-bar" aria-hidden="true">
                      <i style={{ width: `${pct}%`, background: pct >= 60 ? 'var(--pi-accent)' : pct >= 30 ? '#c9962f' : '#c4707b' }} />
                    </span>
                    <b>{pct}%</b>
                  </div>
                );
              })
            )}
          </Panel>
          <Panel
            titulo="Atrasados"
            descricao="Jornadas obrigatórias vencidas"
            acao={
              <button type="button" className="pi-btn primary" disabled={atrasados.length === 0} onClick={prepararLembrete}>
                <Icon nome="email" tamanho={16} />
                Lembrar todos
              </button>
            }
          >
            {atrasados.length === 0 ? (
              <Empty icone="checkCirculo" titulo="Ninguém em atraso" descricao="Quando um prazo vencer, as pessoas aparecem aqui." />
            ) : (
              <div className="pi-rows" style={{ maxHeight: 300, overflow: 'auto' }}>
                {atrasados.slice(0, 20).map((a) => (
                  <button
                    type="button"
                    key={`${a.pessoa.loginName}-${a.jornada.id}`}
                    className="pi-row"
                    style={{ border: 0, borderBottom: '1px solid var(--pi-border)', background: 'transparent', textAlign: 'left', width: '100%' }}
                    onClick={() => setDetalhe(a)}
                  >
                    <span className="pi-avatar" aria-hidden="true">
                      {iniciais(a.pessoa.nome)}
                    </span>
                    <span className="pi-row-text">
                      <b>{a.pessoa.nome}</b>
                      <span>
                        {a.jornada.titulo} · {a.celula.percentual}%
                      </span>
                    </span>
                    <Badge tom="danger">Atrasada</Badge>
                  </button>
                ))}
                {atrasados.length > 20 && <p className="pi-hint">+ {atrasados.length - 20} no mapa abaixo</p>}
              </div>
            )}
          </Panel>
        </div>
        <Panel
          titulo="Mapa de progresso"
          descricao="Pessoas × jornadas. Clique numa célula para ver as etapas."
          acao={
            <label className="pi-search" style={{ flex: '0 1 240px', minHeight: 34 }}>
              <Icon nome="busca" tamanho={15} />
              <span className="pi-sr">Filtrar pessoas</span>
              <input placeholder="Filtrar pessoas" value={filtroPessoa} onChange={(e) => setFiltroPessoa(e.target.value)} />
            </label>
          }
        >
          {jornadas.length === 0 || calculo.pessoas.length === 0 ? (
            <Empty icone="grafico" titulo="Sem dados para o mapa" descricao="O mapa aparece quando houver jornadas publicadas e pessoas na área." />
          ) : (
            <>
              <div className={styles.mapaRolagem}>
                <table className={styles.mapa}>
                  <caption className="pi-sr">Progresso por pessoa e jornada</caption>
                  <thead>
                    <tr>
                      <th scope="col" style={{ textAlign: 'left' }}>
                        Pessoa
                      </th>
                      {jornadas.map((j: IJornada) => (
                        <th scope="col" key={j.id}>
                          {j.titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((i: number) => {
                      const pessoa: IPessoaArea = calculo.pessoas[i];
                      return (
                        <tr key={pessoa.loginName}>
                          <th scope="row">{pessoa.nome}</th>
                          {jornadas.map((jornada: IJornada, j: number) => {
                            const celula: ICelula = calculo.celulas[i][j];
                            const faixa = faixaCalor(celula);
                            const classe: string = (styles as unknown as Record<string, string>)[`faixa_${faixa}`] ?? '';
                            return (
                              <td key={jornada.id}>
                                {faixa === 'na' ? (
                                  <span className={classe} aria-label={`${pessoa.nome}, ${jornada.titulo}: não se aplica`}>
                                    –
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className={classe}
                                    aria-label={`${pessoa.nome}, ${jornada.titulo}: ${celula.percentual}%, ${ROTULO_FAIXA[faixa]}${celula.atrasada ? ', atrasada' : ''}`}
                                    onClick={() => setDetalhe({ pessoa, jornada, celula })}
                                  >
                                    {faixa === 'zero' ? 'Não iniciou' : `${celula.percentual}%`}
                                    {celula.atrasada ? ' !' : ''}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.legenda}>
                <span>
                  <i className={styles.faixa_zero} />
                  Não iniciou
                </span>
                <span>
                  <i className={styles.faixa_baixa} />
                  Até 33%
                </span>
                <span>
                  <i className={styles.faixa_media} />
                  34–66%
                </span>
                <span>
                  <i className={styles.faixa_alta} />
                  67–99%
                </span>
                <span>
                  <i className={styles.faixa_completa} />
                  Concluída
                </span>
                <span>! atrasada · – não se aplica (público específico)</span>
              </div>
            </>
          )}
        </Panel>
      </>
    );
  };

  return (
    <>
      <PageHeader
        idTitulo={ctx.idTitulo}
        nivel={2}
        sobretitulo={`Gestão · ${area.nome}`}
        titulo="Gestão da área"
        descricao="Acompanhe as pessoas, aprove jornadas e modere comentários."
        acoes={
          minhas.length > 1 ? (
            <select className="pi-select" aria-label="Área" value={area.id} onChange={(e) => setAreaId(Number(e.target.value))}>
              {minhas.map((a: IArea) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />
      <RouteTabs
        rotulo="Seções da gestão"
        roteador={roteador}
        abas={[
          { rota: 'gestao', rotulo: 'Painel' },
          { rota: 'gestao/pessoas', rotulo: 'Pessoas' },
          { rota: 'gestao/aprovacoes', rotulo: 'Aprovações', contador: pendentes },
          { rota: 'gestao/comentarios', rotulo: 'Comentários' }
        ]}
      />
      {aviso && (
        <Aviso tom="erro" aoFechar={() => setAviso('')}>
          {aviso}
        </Aviso>
      )}
      {secao === 'pessoas' ? (
        <PessoasDaArea ctx={ctx} area={area} aoAlterar={() => setVersao((v: number) => v + 1)} />
      ) : secao === 'aprovacoes' ? (
        <Aprovacoes
          ctx={ctx}
          area={area}
          aoContar={setPendentes}
          aoPublicar={() => {
            setVersao((v: number) => v + 1);
            ctx.recarregarCatalogo();
          }}
        />
      ) : secao === 'comentarios' ? (
        dados ? (
          <Moderacao ctx={ctx} area={area} jornadas={dados.catalogo.jornadas} />
        ) : (
          <Loading />
        )
      ) : (
        conteudoPainel()
      )}
      {secao !== 'aprovacoes' && <ContadorAprovacoes ctx={ctx} area={area} aoContar={setPendentes} />}

      {detalhe && dados && (
        <DetalhePessoa
          id={`${ctx.idTitulo}-pessoa`}
          pessoa={detalhe.pessoa}
          jornada={detalhe.jornada}
          celula={detalhe.celula}
          etapas={dados.catalogo.etapas.get(detalhe.jornada.id) ?? ([] as IEtapa[])}
          aoLembrar={
            detalhe.celula.concluida
              ? undefined
              : () => {
                  setLembrete([{ jornada: detalhe.jornada, pessoas: [detalhe.pessoa] }]);
                  setDetalhe(undefined);
                }
          }
          aoLiberarQuiz={
            detalhe.celula.matricula
              ? async (etapaId: number) => {
                  const matricula = detalhe.celula.matricula;
                  if (!matricula) {
                    return;
                  }
                  const atualizada = await servicos.gestao.liberarTentativas(area, matricula, etapaId);
                  setDados((atual) => atual && { ...atual, matriculas: atual.matriculas.map((m) => (m.id === atualizada.id ? atualizada : m)) });
                  setDetalhe({ ...detalhe, celula: { ...detalhe.celula, matricula: atualizada } });
                }
              : undefined
          }
          aoFechar={() => setDetalhe(undefined)}
        />
      )}
      {lembrete && (
        <GtiDialog
          id={`${ctx.idTitulo}-lembrete`}
          sobretitulo={`Gestão · ${area.nome}`}
          titulo="Lembrar por e-mail"
          bloquearFechamento={enviando}
          aoFechar={() => setLembrete(undefined)}
          textoRodape="Pessoas sem e-mail cadastrado são ignoradas."
          rodape={
            <>
              <button type="button" className="pi-btn" disabled={enviando} onClick={() => setLembrete(undefined)}>
                Cancelar
              </button>
              <button type="button" className="pi-btn primary" disabled={enviando} onClick={enviarLembretes}>
                <Icon nome="enviar" tamanho={16} />
                {enviando ? 'Enviando…' : 'Enviar lembretes'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13, marginBottom: 14 }}>
            Um e-mail por pessoa e jornada, enviado com a sua conta. Ninguém vê os outros destinatários.
          </p>
          <div className="pi-rows">
            {lembrete.map((g) => (
              <div className="pi-row" key={g.jornada.id}>
                <span className="pi-row-icon">
                  <Icon nome="livro" tamanho={18} />
                </span>
                <span className="pi-row-text">
                  <b>{g.jornada.titulo}</b>
                  <span>{g.pessoas.length === 1 ? g.pessoas[0].nome : `${g.pessoas.length} pessoa(s)`}</span>
                </span>
              </div>
            ))}
          </div>
        </GtiDialog>
      )}
    </>
  );
};


export default Gestao;
