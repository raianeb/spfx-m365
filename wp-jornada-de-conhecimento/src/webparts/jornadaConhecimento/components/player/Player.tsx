// Skills aplicadas: spfx-padrao-visual-gti (receita "Fluxo passo a passo": progresso, linha do tempo recolhível, palco,
// rodapé de ações, comemoração), spfx-acessibilidade-conteudo (etapa atual anunciada, bloqueio explicado, foco no
// título ao trocar de etapa, atalho N), spfx-codigo-performance (progresso gravado a cada 15 s e ao sair; curtida
// otimista). Escopo, seções 3 e 6.2.
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toSafeHtml } from '../../../../comum/richText';
import {
  EstadoEtapa,
  IEtapa,
  IMatricula,
  PERCENTUAL_MINIMO_PADRAO,
  concluirEtapa,
  estadosEtapas,
  etapaParaContinuar,
  novidade,
  ordenarEtapas,
  podeConcluir,
  proximaEtapa,
  recalcular,
  registrarAbertura,
  registrarPosicao
} from '../../../../jornada/progresso';
import { ICurtidas } from '../../../../services/EngajamentoService';
import { mensagemDeErro } from '../../../../services/sp';
import { Empty, ErrorBox, GtiDialog, Icon, Loading, ProgressBar, useToast } from '../gti';
import { IContextoTela, IJornadaVisivel, rotaJornada, rotaPlayer } from '../tipos';
import { ICONE_TIPO, ROTULO_TIPO, formatarDuracao, textoErro } from '../comum/ui';
import { encontrarJornada } from '../aprendizado/DetalheJornada';
import ConteudoEtapa from './ConteudoEtapa';
import { EscolhaNota } from './Avaliacoes';
import styles from '../jc.module.scss';

const ROTULO_ESTADO: Record<EstadoEtapa, string> = {
  concluida: 'concluída',
  disponivel: 'disponível',
  bloqueada: 'bloqueada até concluir a anterior'
};

interface IPlayerProps {
  ctx: IContextoTela;
  item: IJornadaVisivel;
}

const PlayerJornada: React.FC<IPlayerProps> = ({ ctx, item }: IPlayerProps) => {
  const { servicos, roteador, perfil, props } = ctx;
  const { area, jornada } = item;
  const usuarioId: number = perfil.usuarioId;
  const etapaPedida: number | undefined = roteador.parametros[2] ? Number(roteador.parametros[2]) : undefined;
  const { avisar } = useToast();
  const [etapas, setEtapas] = useState<IEtapa[] | undefined>(undefined);
  const [matricula, setMatricula] = useState<IMatricula | undefined>(undefined);
  const [curtidas, setCurtidas] = useState<ICurtidas | undefined>(undefined);
  const [linhaTempo, setLinhaTempo] = useState<boolean>(true);
  const [erro, setErro] = useState<string>('');
  const [aviso, setAviso] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [comemorar, setComemorar] = useState<boolean>(false);
  const [nota, setNota] = useState<number>(0);
  const [comentario, setComentario] = useState<string>('');
  const titulo = useRef<HTMLHeadingElement>(null);
  const matriculaAtual = useRef<IMatricula | undefined>(undefined);
  const alterou = useRef<boolean>(false);

  const atualId: number | undefined = useMemo(() => {
    if (!etapas) {
      return undefined;
    }
    if (etapaPedida && etapas.some((e: IEtapa) => e.id === etapaPedida)) {
      return etapaPedida;
    }
    return etapaParaContinuar(etapas, matricula)?.id;
  }, [etapas, etapaPedida, matricula?.id]);

  const atualizar = useCallback(
    (proxima: IMatricula, gravarAgora: boolean): Promise<void> => {
      matriculaAtual.current = proxima;
      alterou.current = true;
      setMatricula(proxima);
      if (gravarAgora) {
        return servicos.matriculas.salvar(area, proxima);
      }
      servicos.matriculas.agendar(area, proxima);
      return Promise.resolve();
    },
    [servicos, area]
  );

  // Carga: etapas completas e matrícula (criada na primeira abertura).
  useEffect(() => {
    let ativo: boolean = true;
    (async (): Promise<void> => {
      const lidas: IEtapa[] = ordenarEtapas(await servicos.jornadas.etapasDaJornada(area, jornada.id));
      const garantida: IMatricula = await servicos.matriculas.garantir(area, jornada.id, usuarioId, lidas[0]?.id);
      if (ativo) {
        matriculaAtual.current = garantida;
        setEtapas(lidas);
        setMatricula(garantida);
      }
    })().catch((falha: unknown) => ativo && setErro(mensagemDeErro(falha, 'Abrir a jornada')));
    return () => {
      ativo = false;
    };
  }, [servicos, area, jornada.id, usuarioId]);

  // Ao sair da página, esconder a aba ou fechar o player, grava o pendente e atualiza o catálogo.
  useEffect(() => {
    const descarregar = (): void => {
      servicos.matriculas.descarregar().catch(() => undefined);
    };
    const aoMudarVisibilidade = (): void => {
      if (document.visibilityState === 'hidden') {
        descarregar();
      }
    };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    window.addEventListener('pagehide', descarregar);
    return () => {
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      window.removeEventListener('pagehide', descarregar);
      descarregar();
      if (alterou.current) {
        ctx.recarregarCatalogo();
      }
    };
  }, [servicos]);

  // Etapa atual: grava a posição na matrícula, carrega curtidas e leva o foco ao título.
  useEffect(() => {
    let ativo: boolean = true;
    setCurtidas(undefined);
    setAviso('');
    if (atualId === undefined) {
      return undefined;
    }
    const atual: IMatricula | undefined = matriculaAtual.current;
    if (atual && atual.etapaAtualId !== atualId) {
      atualizar({ ...atual, etapaAtualId: atualId, ultimoAcesso: new Date().toISOString() }, false).catch(() => undefined);
    }
    servicos.engajamento
      .curtidas(area, atualId, usuarioId)
      .then((r: ICurtidas) => ativo && setCurtidas(r))
      .catch(() => ativo && setCurtidas({ total: 0 }));
    titulo.current?.focus({ preventScroll: true });
    return () => {
      ativo = false;
    };
  }, [atualId]);

  const estados: EstadoEtapa[] = useMemo(
    () => (etapas && matricula ? estadosEtapas(etapas, matricula.progresso, jornada.ordemLivre) : []),
    [etapas, matricula, jornada.ordemLivre]
  );

  const aoProgresso = useCallback(
    (posicao: number, percentual: number): void => {
      const atual: IMatricula | undefined = matriculaAtual.current;
      if (atual && atualId !== undefined) {
        atualizar({ ...atual, progresso: registrarPosicao(atual.progresso, atualId, posicao, percentual), ultimoAcesso: new Date().toISOString() }, false).catch(
          () => undefined
        );
      }
    },
    [atualId, atualizar]
  );

  const aoAbrir = useCallback((): void => {
    const atual: IMatricula | undefined = matriculaAtual.current;
    if (atual && atualId !== undefined && !atual.progresso[String(atualId)]) {
      atualizar({ ...atual, progresso: registrarAbertura(atual.progresso, atualId) }, false).catch(() => undefined);
    }
  }, [atualId, atualizar]);

  const irPara = useCallback(
    (etapaId: number): void => {
      servicos.matriculas.descarregar().catch(() => undefined);
      roteador.navegar(rotaPlayer(item, etapaId));
    },
    [servicos, roteador, item]
  );

  // Atalho N: próxima etapa liberada.
  const proxima: IEtapa | undefined = etapas && atualId !== undefined ? proximaEtapa(etapas, atualId) : undefined;
  const indiceAtual: number = etapas ? Math.max(0, etapas.findIndex((e: IEtapa) => e.id === atualId)) : 0;
  const proximaLiberada: boolean = !!proxima && estados[indiceAtual + 1] !== 'bloqueada';
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent): void => {
      const alvo: HTMLElement | null = e.target as HTMLElement | null;
      if (!alvo || /input|textarea|select/i.test(alvo.tagName) || alvo.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      if (e.key.toLowerCase() === 'n' && proxima && proximaLiberada) {
        irPara(proxima.id);
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [proxima, proximaLiberada, irPara]);

  if (erro) {
    return <ErrorBox mensagem={erro} />;
  }
  if (!etapas || !matricula || atualId === undefined) {
    return etapas && etapas.length === 0 ? (
      <div className="pi-card">
        <Empty icone="camadas" titulo={jornada.titulo} descricao="Esta jornada ainda não tem etapas." />
      </div>
    ) : (
      <Loading texto="Abrindo a jornada…" />
    );
  }

  const etapa: IEtapa = etapas[indiceAtual];
  const estadoAtual: EstadoEtapa = estados[indiceAtual] ?? 'disponivel';
  const progressoEtapa = matricula.progresso[String(etapa.id)];
  const percentual: number = matricula.status === 'Concluida' ? 100 : matricula.percentual;
  const pctEtapa: number = progressoEtapa?.pct ?? 0;
  const minimo: number = etapa.percentualMinimo || PERCENTUAL_MINIMO_PADRAO;
  const instrucoes: string = toSafeHtml(etapa.instrucoes);
  const regraTexto: string =
    etapa.regra === 'PercentualAssistido'
      ? `Assista ${minimo}% para concluir · ${pctEtapa}% assistido`
      : etapa.regra === 'AbrirConteudo'
        ? etapa.tipo === 'Conteudo'
          ? progressoEtapa
            ? 'Conteúdo lido'
            : 'Leia até o fim para concluir'
          : progressoEtapa
            ? 'Conteúdo aberto'
            : 'Abra o conteúdo para concluir'
        : 'Marque quando terminar';

  const concluir = async (): Promise<void> => {
    const atual: IMatricula | undefined = matriculaAtual.current;
    if (!atual) {
      return;
    }
    setSalvando(true);
    setAviso('');
    const agora: Date = new Date();
    const depois: IMatricula = recalcular({ ...atual, progresso: concluirEtapa(atual.progresso, etapa.id, agora) }, etapas, agora);
    try {
      await atualizar(depois, true);
      if (atual.status !== 'Concluida' && depois.status === 'Concluida') {
        setComemorar(true);
      } else if (proxima && depois.etapaAtualId === proxima.id) {
        avisar('Etapa concluída. Seguindo para a próxima.');
        irPara(proxima.id);
      } else {
        avisar('Etapa concluída.');
      }
    } catch (falha: unknown) {
      // Mantém a conclusão na tela e agenda nova tentativa com a versão mais recente (não perde posições).
      const ultima: IMatricula | undefined = matriculaAtual.current;
      if (ultima) {
        servicos.matriculas.agendar(area, ultima);
      }
      setAviso(`${mensagemDeErro(falha, 'Salvar a conclusão')} Uma nova tentativa será feita em instantes.`);
    } finally {
      setSalvando(false);
    }
  };

  const alternarCurtida = async (): Promise<void> => {
    if (!curtidas) {
      return;
    }
    const anterior: ICurtidas = curtidas;
    setCurtidas(anterior.minhaId ? { total: Math.max(0, anterior.total - 1) } : { total: anterior.total + 1, minhaId: -1 });
    try {
      if (anterior.minhaId) {
        await servicos.engajamento.descurtir(area, anterior.minhaId);
      } else {
        const id: number = await servicos.engajamento.curtir(area, etapa, usuarioId);
        setCurtidas({ total: anterior.total + 1, minhaId: id });
      }
    } catch (falha: unknown) {
      setCurtidas(anterior);
      setAviso(mensagemDeErro(falha, 'Registrar a curtida'));
    }
  };

  const enviarAvaliacao = async (): Promise<void> => {
    setSalvando(true);
    try {
      const atual = await servicos.engajamento.avaliacoes(area, jornada.id, usuarioId);
      await servicos.engajamento.salvarAvaliacao(area, jornada.id, usuarioId, nota, comentario, atual.minha?.id);
      setComemorar(false);
      avisar('Avaliação salva. Obrigado!');
    } catch (falha: unknown) {
      setAviso(textoErro(falha, (e: unknown) => mensagemDeErro(e, 'Salvar a avaliação')));
      setComemorar(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className={styles.playerTopo}>
        <a className="pi-btn" href={roteador.hrefDe(rotaJornada(item))} onClick={roteador.aoClicarLink(rotaJornada(item))} aria-label="Voltar para a jornada">
          <Icon nome="esquerda" tamanho={16} />
        </a>
        <button
          type="button"
          className="pi-btn"
          aria-pressed={linhaTempo}
          aria-label={linhaTempo ? 'Ocultar a lista de etapas' : 'Mostrar a lista de etapas'}
          onClick={() => setLinhaTempo(!linhaTempo)}
        >
          <Icon nome="lateral" tamanho={16} />
        </button>
        <div className={styles.playerTitulo}>
          <span>
            {area.nome} · Etapa {indiceAtual + 1} de {etapas.length}
          </span>
          <h2>{jornada.titulo}</h2>
        </div>
        <div className={styles.playerProgresso}>
          <ProgressBar percentual={percentual} rotulo="Progresso na jornada" />
        </div>
      </div>

      <div className={`${styles.player} ${linhaTempo ? '' : styles.playerSemLinha}`}>
        {linhaTempo && (
          <nav className={`pi-card ${styles.linhaTempo}`} aria-label="Etapas da jornada">
            <h2>Etapas</h2>
            <ol>
              {etapas.map((e: IEtapa, i: number) => {
                const estado: EstadoEtapa = estados[i];
                const atual: boolean = e.id === etapa.id;
                return (
                  <li key={e.id} className={estado === 'concluida' ? styles.liFeito : undefined}>
                    <button
                      type="button"
                      aria-current={atual ? 'step' : undefined}
                      aria-disabled={estado === 'bloqueada'}
                      aria-label={`Etapa ${i + 1}: ${e.titulo}, ${ROTULO_ESTADO[estado]}`}
                      onClick={() => estado !== 'bloqueada' && !atual && irPara(e.id)}
                    >
                      <span className={`${styles.ponto} ${estado === 'concluida' ? styles.pontoFeito : ''} ${atual ? styles.pontoAtual : ''}`} aria-hidden="true">
                        <Icon nome={estado === 'concluida' ? 'check' : estado === 'bloqueada' ? 'cadeado' : ICONE_TIPO[e.tipo]} tamanho={15} />
                      </span>
                      <span className={styles.pontoTexto}>
                        <b>{e.titulo}</b>
                        <span>
                          {ROTULO_TIPO[e.tipo]}
                          {e.duracaoMin ? ` · ${formatarDuracao(e.duracaoMin)}` : ''}
                          {novidade(e, matricula) ? ' · Novo' : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <section className={`pi-card ${styles.palco}`} aria-labelledby={`${ctx.idTitulo}-etapa`}>
          <div className={styles.palcoTopo}>
            <h3 id={`${ctx.idTitulo}-etapa`} ref={titulo} tabIndex={-1}>
              {etapa.titulo}
            </h3>
            <span className={styles.palcoTipo}>
              <Icon nome={ICONE_TIPO[etapa.tipo]} tamanho={14} />
              {ROTULO_TIPO[etapa.tipo]}
              {etapa.duracaoMin ? ` · ${formatarDuracao(etapa.duracaoMin)}` : ''}
            </span>
          </div>
          {estadoAtual === 'bloqueada' ? (
            <Empty icone="cadeado" titulo="Etapa bloqueada" descricao="Conclua a etapa anterior para liberar esta." />
          ) : (
            <ConteudoEtapa key={etapa.id} etapa={etapa} siteUrl={props.siteUrl} inicioSeg={progressoEtapa?.p ?? 0} aoProgresso={aoProgresso} aoAbrir={aoAbrir} />
          )}
          {instrucoes && (
            <div className={styles.instrucoes}>
              <b className={styles.rotulo}>Instruções</b>
              <div dangerouslySetInnerHTML={{ __html: instrucoes }} />
            </div>
          )}
          <div className={styles.palcoRodape}>
            <button
              type="button"
              className={`pi-btn ${styles.curtir}`}
              aria-pressed={!!curtidas?.minhaId}
              disabled={!curtidas}
              aria-label={`${curtidas?.minhaId ? 'Descurtir' : 'Curtir'} esta etapa, ${curtidas?.total ?? 0} curtida(s)`}
              onClick={alternarCurtida}
            >
              <Icon nome="curtir" tamanho={16} />
              {curtidas?.total ?? '–'}
            </button>
            {estadoAtual === 'concluida' ? (
              <span className="pi-badge success" style={{ fontSize: 11, padding: '6px 10px' }}>
                Etapa concluída
              </span>
            ) : (
              <>
                <button
                  type="button"
                  className="pi-btn primary"
                  disabled={salvando || estadoAtual === 'bloqueada' || !podeConcluir(etapa, matricula.progresso)}
                  onClick={concluir}
                >
                  <Icon nome="check" tamanho={16} />
                  {salvando ? 'Salvando…' : 'Concluir etapa'}
                </button>
                <span className={styles.regra}>
                  <Icon nome={etapa.regra === 'PercentualAssistido' ? 'video' : etapa.regra === 'AbrirConteudo' ? 'olho' : 'checkCirculo'} tamanho={14} />
                  {regraTexto}
                </span>
              </>
            )}
            {proxima && (
              <button
                type="button"
                className="pi-btn"
                disabled={!proximaLiberada}
                title={proximaLiberada ? undefined : 'Conclua esta etapa para liberar a próxima'}
                onClick={() => irPara(proxima.id)}
              >
                Próxima <Icon nome="direita" tamanho={16} />
              </button>
            )}
            <span className={styles.atalhos}>
              <kbd>N</kbd> próxima etapa
            </span>
            {aviso && (
              <span className={styles.erroInline} role="alert">
                {aviso}
              </span>
            )}
          </div>
        </section>
      </div>

      {comemorar && (
        <GtiDialog
          id={`${ctx.idTitulo}-fim`}
          variante="central"
          titulo="Jornada concluída!"
          aoFechar={() => setComemorar(false)}
          bloquearFechamento={salvando}
          rodape={
            <>
              <button type="button" className="pi-btn" disabled={salvando} onClick={() => setComemorar(false)}>
                Agora não
              </button>
              <button type="button" className="pi-btn primary" disabled={salvando || nota === 0} onClick={enviarAvaliacao}>
                {salvando ? 'Enviando…' : 'Enviar avaliação'}
              </button>
            </>
          }
        >
          <div className={styles.comemoracao}>
            <span className={styles.medalha} aria-hidden="true">
              <Icon nome="medalha" tamanho={40} />
            </span>
            <p className="pi-hint">
              Você concluiu <b>{jornada.titulo}</b>. Que tal contar como foi? Sua avaliação ajuda quem cria as jornadas.
            </p>
          </div>
          <b style={{ color: 'var(--pi-navy)', fontSize: 13 }}>Como foi esta jornada?</b>
          <div style={{ marginTop: 8 }}>
            <EscolhaNota nota={nota} aoEscolher={setNota} desabilitado={salvando} />
          </div>
          <div className="pi-field" style={{ marginTop: 12 }}>
            <label htmlFor={`${ctx.idTitulo}-fim-coment`}>Comentário (opcional)</label>
            <textarea id={`${ctx.idTitulo}-fim-coment`} maxLength={1000} value={comentario} onChange={(e) => setComentario(e.target.value)} />
          </div>
        </GtiDialog>
      )}
    </>
  );
};

/** Rota player/<área>/<jornada>[/<etapa>]: encontra a jornada no catálogo do usuário. */
const Player: React.FC<IContextoTela> = (ctx: IContextoTela) => {
  if (ctx.catalogo.tipo === 'carregando') {
    return <Loading texto="Abrindo a jornada…" />;
  }
  if (ctx.catalogo.tipo === 'erro') {
    return <ErrorBox mensagem={ctx.catalogo.mensagem} aoTentarNovamente={ctx.recarregarCatalogo} />;
  }
  const item: IJornadaVisivel | undefined = encontrarJornada(ctx);
  if (!item) {
    return (
      <div className="pi-card">
        <Empty icone="busca" titulo="Jornada não encontrada" descricao="Ela pode ter sido arquivada ou não estar disponível para você." />
      </div>
    );
  }
  return <PlayerJornada key={`${item.area.id}-${item.jornada.id}`} ctx={ctx} item={item} />;
};

export default Player;
