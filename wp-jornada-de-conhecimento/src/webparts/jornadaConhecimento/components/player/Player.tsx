// Skills aplicadas: spfx-design-base (linha do tempo, ação principal clara, estados), spfx-acessibilidade-conteudo
// (etapa atual anunciada, bloqueio explicado, foco no conteúdo ao trocar de etapa), spfx-codigo-performance
// (progresso gravado a cada 15 s e ao sair; curtida otimista). Escopo, seções 3 e 6.2.
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { toSafeHtml } from '../../../../comum/richText';
import {
  EstadoEtapa,
  IEtapa,
  IMatricula,
  avaliacaoLiberada,
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
import { IJornadaVisivel, IServicosJornada } from '../tipos';
import Estado from '../comum/Estado';
import { AnelProgresso } from '../comum/Indicadores';
import ConteudoEtapa from './ConteudoEtapa';
import Avaliacoes from './Avaliacoes';
import styles from './Player.module.scss';

export interface IPlayerProps {
  item: IJornadaVisivel;
  servicos: IServicosJornada;
  usuarioId: number;
  siteUrl: string;
  aoVoltar: () => void;
}

const ICONE_TIPO: Record<IEtapa['tipo'], string> = {
  YouTube: 'Video',
  Video: 'MSNVideos',
  Documento: 'TextDocument',
  Link: 'Link'
};

const ROTULO_ESTADO: Record<EstadoEtapa, string> = {
  concluida: 'concluída',
  disponivel: 'disponível',
  bloqueada: 'bloqueada até concluir a anterior'
};

const Player: React.FC<IPlayerProps> = (props: IPlayerProps) => {
  const { item, servicos, usuarioId } = props;
  const { area, jornada } = item;
  const [etapas, setEtapas] = useState<IEtapa[] | undefined>(undefined);
  const [matricula, setMatricula] = useState<IMatricula | undefined>(undefined);
  const [atualId, setAtualId] = useState<number | undefined>(undefined);
  const [curtidas, setCurtidas] = useState<ICurtidas | undefined>(undefined);
  const [aba, setAba] = useState<'conteudo' | 'avaliacoes'>('conteudo');
  const [concluiuAgora, setConcluiuAgora] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');
  const [aviso, setAviso] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);
  const tituloConteudo = useRef<HTMLHeadingElement>(null);
  // Versão mais recente da matrícula para os eventos do player e da página (sem fechar sobre estado antigo).
  const matriculaAtual = useRef<IMatricula | undefined>(undefined);

  const atualizar = useCallback(
    (proxima: IMatricula, gravarAgora: boolean): Promise<void> => {
      matriculaAtual.current = proxima;
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
      if (!ativo) {
        return;
      }
      matriculaAtual.current = garantida;
      setEtapas(lidas);
      setMatricula(garantida);
      setAtualId(etapaParaContinuar(lidas, garantida)?.id);
    })().catch((falha: unknown) => ativo && setErro(mensagemDeErro(falha, 'Abrir a jornada')));
    return () => {
      ativo = false;
    };
  }, [servicos, area, jornada.id, usuarioId]);

  // Ao sair da página, esconder a aba ou fechar o player, grava o que estiver pendente.
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
    };
  }, [servicos]);

  // Curtidas da etapa atual.
  useEffect(() => {
    let ativo: boolean = true;
    setCurtidas(undefined);
    if (atualId !== undefined) {
      servicos.engajamento
        .curtidas(area, atualId, usuarioId)
        .then((resultado: ICurtidas) => ativo && setCurtidas(resultado))
        .catch(() => ativo && setCurtidas({ total: 0 }));
    }
    return () => {
      ativo = false;
    };
  }, [servicos, area, atualId, usuarioId]);

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

  if (erro) {
    return (
      <Estado titulo="Não foi possível abrir a jornada" texto={erro} papel="alert">
        <DefaultButton text="Voltar para Minhas Jornadas" onClick={props.aoVoltar} />
      </Estado>
    );
  }
  if (!etapas || !matricula) {
    return <Spinner size={SpinnerSize.medium} label="Abrindo a jornada..." />;
  }
  if (etapas.length === 0) {
    return (
      <Estado titulo={jornada.titulo} texto="Esta jornada ainda não tem etapas.">
        <DefaultButton text="Voltar para Minhas Jornadas" onClick={props.aoVoltar} />
      </Estado>
    );
  }

  const indiceAtual: number = Math.max(0, etapas.findIndex((etapa: IEtapa) => etapa.id === atualId));
  const etapa: IEtapa = etapas[indiceAtual];
  const estadoAtual: EstadoEtapa = estados[indiceAtual] ?? 'disponivel';
  const proxima: IEtapa | undefined = proximaEtapa(etapas, etapa.id);
  const proximaLiberada: boolean = !!proxima && estados[indiceAtual + 1] !== 'bloqueada';
  const liberarAvaliacao: boolean = avaliacaoLiberada(etapas, matricula.progresso);

  const selecionar = (id: number): void => {
    servicos.matriculas.descarregar().catch(() => undefined);
    setAtualId(id);
    setAba('conteudo');
    setAviso('');
    const atual: IMatricula | undefined = matriculaAtual.current;
    if (atual) {
      atualizar({ ...atual, etapaAtualId: id, ultimoAcesso: new Date().toISOString() }, false).catch(() => undefined);
    }
    window.setTimeout(() => tituloConteudo.current?.focus(), 0);
  };

  const concluir = async (): Promise<void> => {
    const atual: IMatricula | undefined = matriculaAtual.current;
    if (!atual) {
      return;
    }
    setSalvando(true);
    setAviso('');
    const agora: Date = new Date();
    const antes: IMatricula = atual;
    const depois: IMatricula = recalcular({ ...atual, progresso: concluirEtapa(atual.progresso, etapa.id, agora) }, etapas, agora);
    try {
      await atualizar(depois, true);
      if (antes.status !== 'Concluida' && depois.status === 'Concluida') {
        // Momento de maior resposta: a tela de conclusão já abre a avaliação.
        setConcluiuAgora(true);
        setAba('avaliacoes');
      } else if (proxima && depois.etapaAtualId === proxima.id) {
        selecionar(proxima.id);
      }
    } catch (falha: unknown) {
      // Não volta ao estado anterior (perderia posições registradas durante a gravação): mantém a conclusão na tela
      // e agenda nova tentativa com a versão mais recente.
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
    // Atualização otimista: a curtida aparece na hora para quem clicou.
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

  const instrucoes: string = toSafeHtml(etapa.instrucoes);
  const progressoEtapa = matricula.progresso[String(etapa.id)];
  const regraTexto: string =
    etapa.regra === 'PercentualAssistido'
      ? `Assista ao menos ${etapa.percentualMinimo || 90}% do vídeo para concluir.`
      : etapa.regra === 'AbrirConteudo'
        ? 'Abra o conteúdo para liberar a conclusão.'
        : '';

  return (
    <div className={styles.player}>
      <div className={styles.cabecalho}>
        <DefaultButton iconProps={{ iconName: 'Back' }} text="Minhas Jornadas" onClick={props.aoVoltar} />
        <div className={styles.cabecalhoTexto}>
          <span className={styles.area} style={{ color: area.cor }}>
            {area.nome}
          </span>
          <h3 className={styles.jornadaTitulo}>{jornada.titulo}</h3>
        </div>
        <AnelProgresso percentual={matricula.status === 'Concluida' ? 100 : matricula.percentual} tamanho={52} />
      </div>

      <Pivot
        selectedKey={aba}
        onLinkClick={(pivo?: PivotItem) => pivo?.props.itemKey && setAba(pivo.props.itemKey as 'conteudo' | 'avaliacoes')}
        headersOnly
        aria-label="Seções da jornada"
      >
        <PivotItem itemKey="conteudo" headerText="Conteúdo" />
        <PivotItem itemKey="avaliacoes" headerText="Avaliações" />
      </Pivot>

      {aba === 'avaliacoes' ? (
        <div className={styles.painelAvaliacoes}>
          {concluiuAgora && (
            <div className={styles.parabens} role="status">
              <Icon iconName="Trophy2" className={styles.parabensIcone} aria-hidden="true" />
              <div>
                <strong>Jornada concluída!</strong>
                <p className={styles.meta}>Que tal contar como foi? Sua avaliação ajuda quem cria as jornadas.</p>
              </div>
            </div>
          )}
          <Avaliacoes
            servico={servicos.engajamento}
            area={area}
            jornadaId={jornada.id}
            usuarioId={usuarioId}
            siteUrl={props.siteUrl}
            liberada={liberarAvaliacao}
            destaque={concluiuAgora}
          />
        </div>
      ) : (
        <div className={styles.corpo}>
          <nav className={styles.linhaTempo} aria-label="Etapas da jornada">
            <ol>
              {etapas.map((item: IEtapa, indice: number) => {
                const estado: EstadoEtapa = estados[indice];
                const atual: boolean = item.id === etapa.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`${styles.etapa} ${atual ? styles.etapaAtual : ''} ${estado === 'concluida' ? styles.etapaFeita : ''}`}
                      aria-current={atual ? 'step' : undefined}
                      aria-disabled={estado === 'bloqueada'}
                      aria-label={`Etapa ${indice + 1}: ${item.titulo}, ${ROTULO_ESTADO[estado]}`}
                      onClick={() => estado !== 'bloqueada' && selecionar(item.id)}
                    >
                      <Icon
                        iconName={estado === 'concluida' ? 'CompletedSolid' : estado === 'bloqueada' ? 'Lock' : ICONE_TIPO[item.tipo]}
                        className={styles.etapaIcone}
                        aria-hidden="true"
                      />
                      <span className={styles.etapaTexto}>
                        <span>{item.titulo}</span>
                        <span className={styles.meta}>
                          {item.duracaoMin ? `${item.duracaoMin} min` : item.tipo}
                          {novidade(item, matricula) ? ' · Novo' : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <section className={styles.conteudo} aria-labelledby={`etapa-${etapa.id}`}>
            <h4 id={`etapa-${etapa.id}`} ref={tituloConteudo} tabIndex={-1} className={styles.etapaTitulo}>
              {etapa.titulo}
            </h4>
            {estadoAtual === 'bloqueada' ? (
              <p className={styles.aviso}>Conclua a etapa anterior para liberar esta.</p>
            ) : (
              <ConteudoEtapa
                key={etapa.id}
                etapa={etapa}
                siteUrl={props.siteUrl}
                inicioSeg={progressoEtapa?.p ?? 0}
                aoProgresso={aoProgresso}
                aoAbrir={aoAbrir}
              />
            )}

            <div className={styles.engajamento}>
              <DefaultButton
                iconProps={{ iconName: curtidas?.minhaId ? 'LikeSolid' : 'Like' }}
                text={`${curtidas?.total ?? '–'}`}
                ariaLabel={`${curtidas?.minhaId ? 'Descurtir' : 'Curtir'} esta etapa. ${curtidas?.total ?? 0} curtida(s)`}
                toggle
                checked={!!curtidas?.minhaId}
                disabled={!curtidas}
                onClick={alternarCurtida}
              />
              {regraTexto && estadoAtual !== 'concluida' && <span className={styles.meta}>{regraTexto}</span>}
            </div>

            {instrucoes && <div className={styles.instrucoes} dangerouslySetInnerHTML={{ __html: instrucoes }} />}

            {aviso && (
              <p className={styles.erro} role="alert">
                {aviso}
              </p>
            )}

            <div className={styles.rodape}>
              {estadoAtual === 'concluida' ? (
                <span className={styles.concluidaTexto}>
                  <Icon iconName="CompletedSolid" aria-hidden="true" /> Etapa concluída
                </span>
              ) : (
                <PrimaryButton
                  text={salvando ? 'Salvando...' : 'Concluir etapa'}
                  onClick={concluir}
                  disabled={salvando || estadoAtual === 'bloqueada' || !podeConcluir(etapa, matricula.progresso)}
                />
              )}
              {proxima && (
                <DefaultButton
                  text="Próxima etapa"
                  iconProps={{ iconName: 'Forward' }}
                  onClick={() => selecionar(proxima.id)}
                  disabled={!proximaLiberada}
                  title={proximaLiberada ? undefined : 'Conclua esta etapa para liberar a próxima'}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Player;
