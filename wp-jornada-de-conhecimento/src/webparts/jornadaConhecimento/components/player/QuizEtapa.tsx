// Skills aplicadas: spfx-padrao-visual-gti (fluxo passo a passo: abertura, uma pergunta por vez, resultado com
// anel de nota), spfx-acessibilidade-conteudo (fieldset/legend por pergunta, radio e checkbox nativos, resultado
// anunciado, foco levado ao título de cada passo).
// Usado no player (grava a tentativa) e no Estúdio em "Testar como participante" (não grava nada).
import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IOpcaoQuiz,
  IPerguntaQuiz,
  IQuiz,
  IResultadoPergunta,
  IResultadoQuiz,
  RespostasQuiz,
  acertosNecessarios,
  corrigir,
  embaralhar,
  tentativasRestantes
} from '../../../../jornada/quiz';
import { IProgressoQuiz } from '../../../../jornada/progresso';
import { Icon, ProgressRing } from '../gti';
import styles from '../jc.module.scss';

export interface IQuizEtapaProps {
  id: string;
  quiz: IQuiz;
  /** Tentativas e notas já registradas (player). */
  progresso?: IProgressoQuiz;
  /** Etapa já concluída (aprovada antes): refazer vira prática, sem gravar. */
  aprovadaAntes?: boolean;
  /** Estúdio: tentativa de teste, sem limite e sem gravar. */
  modoTeste?: boolean;
  /** Grava a tentativa. Ausente no modo de teste e na prática. */
  aoEnviar?: (resultado: IResultadoQuiz) => Promise<void>;
  /** Depois de aprovar: seguir para a próxima etapa. */
  aoContinuar?: () => void;
}

type Passo = 'inicio' | 'perguntas' | 'resultado';

const letra = (indice: number): string => String.fromCharCode(65 + indice);

/** Confete decorativo da aprovação (posições fixas: nada de aleatório a cada render). */
const CORES_CONFETE: string[] = ['#7fd1c7', '#f2c14e', '#ffffff', '#8ab4f8', '#f28b82'];
const CONFETES: { x: number; cor: string; atraso: number; giro: number }[] = Array.from({ length: 22 }, (_: unknown, i: number) => ({
  x: (i * 37) % 100,
  cor: CORES_CONFETE[i % CORES_CONFETE.length],
  atraso: (i * 53) % 600,
  giro: (i * 47) % 180
}));

const QuizEtapa: React.FC<IQuizEtapaProps> = (props: IQuizEtapaProps) => {
  const { quiz, id } = props;
  const [passo, setPasso] = useState<Passo>('inicio');
  const [rodada, setRodada] = useState<string>('');
  const [indice, setIndice] = useState<number>(0);
  const [respostas, setRespostas] = useState<RespostasQuiz>({});
  const [resultado, setResultado] = useState<IResultadoQuiz | undefined>(undefined);
  const [enviando, setEnviando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');
  const [pratica, setPratica] = useState<boolean>(false);
  /** A última tentativa contou (foi gravada). Fixado no envio: a aprovação muda as props logo depois. */
  const [contou, setContou] = useState<boolean>(false);
  const [restantesAoEnviar, setRestantesAoEnviar] = useState<number>(Infinity);
  const tituloPasso = useRef<HTMLHeadingElement>(null);

  const usadas: number = props.progresso?.t ?? 0;
  const restantes: number = props.modoTeste ? Infinity : tentativasRestantes(quiz, usadas);
  const total: number = quiz.perguntas.length;
  const necessarios: number = acertosNecessarios(quiz.notaMinima, total);
  const gravaTentativa: boolean = !props.modoTeste && !pratica && !props.aprovadaAntes;

  // Ordem da rodada: embaralhada por semente própria, estável enquanto a tentativa estiver aberta.
  const perguntas: IPerguntaQuiz[] = useMemo(() => {
    if (!quiz.embaralhar || !rodada) {
      return quiz.perguntas;
    }
    return embaralhar(quiz.perguntas, rodada).map((p: IPerguntaQuiz) => ({ ...p, opcoes: embaralhar(p.opcoes, `${rodada}-${p.id}`) }));
  }, [quiz, rodada]);

  useEffect(() => {
    tituloPasso.current?.focus({ preventScroll: false });
  }, [passo, indice]);

  const comecar = (comoPratica: boolean): void => {
    setPratica(comoPratica);
    setRodada(`${quiz.semente}-${usadas}-${Date.now()}`);
    setRespostas({});
    setResultado(undefined);
    setIndice(0);
    setErro('');
    setPasso('perguntas');
  };

  const marcar = (pergunta: IPerguntaQuiz, opcao: IOpcaoQuiz, ligado: boolean): void => {
    setRespostas((atuais: RespostasQuiz) => {
      const marcadas: string[] = atuais[pergunta.id] ?? [];
      const proximas: string[] =
        pergunta.tipo === 'unica' ? [opcao.id] : ligado ? [...marcadas.filter((x: string) => x !== opcao.id), opcao.id] : marcadas.filter((x: string) => x !== opcao.id);
      return { ...atuais, [pergunta.id]: proximas };
    });
  };

  const respondidas: number = perguntas.filter((p: IPerguntaQuiz) => (respostas[p.id] ?? []).length > 0).length;

  const enviar = async (): Promise<void> => {
    const corrigido: IResultadoQuiz = corrigir(quiz, respostas);
    setContou(gravaTentativa);
    setRestantesAoEnviar(restantes);
    setEnviando(true);
    setErro('');
    try {
      if (gravaTentativa && props.aoEnviar) {
        await props.aoEnviar(corrigido);
      }
    } catch {
      setErro('Não foi possível salvar o resultado agora. Uma nova tentativa de gravação será feita em instantes.');
    } finally {
      setEnviando(false);
      setResultado(corrigido);
      setPasso('resultado');
    }
  };

  // ---------------------------------------------------------------- abertura
  if (passo === 'inicio') {
    const esgotadas: boolean = !props.aprovadaAntes && restantes === 0;
    return (
      <div className={styles.quiz}>
        <div className={styles.quizAbertura}>
          <span className={styles.quizSelo} aria-hidden="true">
            <Icon nome={props.aprovadaAntes ? 'trofeu' : 'quiz'} tamanho={30} />
          </span>
          <h4 ref={tituloPasso} tabIndex={-1}>
            {props.modoTeste ? 'Teste do quiz (nada é gravado)' : props.aprovadaAntes ? `Você foi aprovado com ${props.progresso?.n ?? 100}%` : 'Hora de testar o que você aprendeu'}
          </h4>
          <ul className={styles.quizFatos}>
            <li>
              <b>{total}</b> {total === 1 ? 'pergunta' : 'perguntas'}
            </li>
            <li>
              <b>{quiz.notaMinima}%</b> para aprovar ({necessarios} de {total})
            </li>
            <li>
              <b>{quiz.tentativas === 0 || props.modoTeste ? '∞' : restantes}</b>{' '}
              {quiz.tentativas === 0 || props.modoTeste ? 'tentativas' : restantes === 1 ? 'tentativa restante' : 'tentativas restantes'}
            </li>
          </ul>
          {!props.aprovadaAntes && usadas > 0 && !props.modoTeste && (
            <p className="pi-hint">
              Sua melhor nota até agora: <b>{props.progresso?.n ?? 0}%</b>. As próximas etapas liberam quando você atingir {quiz.notaMinima}%.
            </p>
          )}
          {!props.aprovadaAntes && usadas === 0 && !props.modoTeste && (
            <p className="pi-hint">As próximas etapas da jornada liberam quando você for aprovado neste quiz.</p>
          )}
          {esgotadas ? (
            <div className={styles.quizBloqueio} role="status">
              <Icon nome="cadeado" tamanho={18} />
              <span>
                Você usou as {quiz.tentativas} tentativas sem atingir a nota mínima. Fale com a gestão da área para liberar novas tentativas.
              </span>
            </div>
          ) : (
            <button type="button" className="pi-btn primary lg" onClick={() => comecar(!!props.aprovadaAntes)}>
              {props.aprovadaAntes ? 'Refazer para praticar' : usadas > 0 ? 'Tentar de novo' : 'Começar o quiz'}
              <Icon nome="direita" tamanho={16} />
            </button>
          )}
          {props.aprovadaAntes && <p className="pi-hint">Refazer não altera sua aprovação.</p>}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- perguntas
  if (passo === 'perguntas') {
    const pergunta: IPerguntaQuiz = perguntas[indice];
    const marcadas: string[] = respostas[pergunta.id] ?? [];
    const ultima: boolean = indice === perguntas.length - 1;
    return (
      <div className={styles.quiz}>
        <div className={styles.quizTopo}>
          <span>
            Pergunta {indice + 1} de {perguntas.length}
            {pratica && ' · prática'}
          </span>
          <span className="pi-hint">
            {respondidas} de {perguntas.length} respondidas
          </span>
        </div>
        <ol className={styles.quizTrilha} aria-label="Perguntas">
          {perguntas.map((p: IPerguntaQuiz, i: number) => {
            const feita: boolean = (respostas[p.id] ?? []).length > 0;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-current={i === indice ? 'step' : undefined}
                  aria-label={`Pergunta ${i + 1}${feita ? ', respondida' : ', sem resposta'}`}
                  className={`${feita ? styles.quizTrilhaFeita : ''} ${i === indice ? styles.quizTrilhaAtual : ''}`}
                  onClick={() => setIndice(i)}
                />
              </li>
            );
          })}
        </ol>
        <fieldset className={styles.quizPergunta}>
          <legend>
            <h4 ref={tituloPasso} tabIndex={-1}>
              {pergunta.enunciado}
            </h4>
            <span className="pi-hint">{pergunta.tipo === 'multipla' ? 'Marque todas as opções corretas.' : 'Escolha uma opção.'}</span>
          </legend>
          <div className={styles.quizOpcoes}>
            {pergunta.opcoes.map((opcao: IOpcaoQuiz, i: number) => {
              const marcada: boolean = marcadas.indexOf(opcao.id) !== -1;
              return (
                <label key={opcao.id} className={`${styles.quizOpcao} ${marcada ? styles.quizOpcaoMarcada : ''}`}>
                  <input
                    type={pergunta.tipo === 'multipla' ? 'checkbox' : 'radio'}
                    name={`${id}-${pergunta.id}`}
                    checked={marcada}
                    onChange={(e) => marcar(pergunta, opcao, e.target.checked)}
                  />
                  <span className={styles.quizLetra} aria-hidden="true">
                    {letra(i)}
                  </span>
                  <span>{opcao.texto}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className={styles.quizAcoes}>
          <button type="button" className="pi-btn" disabled={indice === 0} onClick={() => setIndice(indice - 1)}>
            <Icon nome="esquerda" tamanho={16} /> Anterior
          </button>
          {!ultima && (
            <button type="button" className="pi-btn primary" onClick={() => setIndice(indice + 1)}>
              Próxima <Icon nome="direita" tamanho={16} />
            </button>
          )}
          {ultima && (
            <button type="button" className="pi-btn primary" disabled={enviando || respondidas < perguntas.length} onClick={enviar}>
              <Icon nome="enviar" tamanho={16} />
              {enviando ? 'Corrigindo…' : 'Enviar respostas'}
            </button>
          )}
          {ultima && respondidas < perguntas.length && (
            <span className="pi-hint">Responda todas as perguntas para enviar ({perguntas.length - respondidas} sem resposta).</span>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- resultado
  const r: IResultadoQuiz = resultado as IResultadoQuiz;
  const restantesDepois: number = contou ? (quiz.tentativas === 0 ? Infinity : Math.max(0, restantesAoEnviar - 1)) : Infinity;
  const mostrarGabarito: boolean = props.modoTeste || quiz.gabarito === 'sempre' || (quiz.gabarito === 'aposAprovar' && (r.aprovado || !!props.aprovadaAntes));
  const mostrarCertoErrado: boolean = mostrarGabarito || quiz.gabarito === 'aposAprovar';
  const porId: Map<string, IResultadoPergunta> = new Map(r.perguntas.map((x: IResultadoPergunta) => [x.id, x]));
  return (
    <div className={styles.quiz}>
      <div className={`${styles.quizResultado} ${r.aprovado ? styles.quizAprovado : styles.quizReprovado}`} role="status">
        {r.aprovado && (
          <span className={styles.confete} aria-hidden="true">
            {CONFETES.map((c, i: number) => (
              <i key={i} style={{ left: `${c.x}%`, background: c.cor, animationDelay: `${c.atraso}ms`, transform: `rotate(${c.giro}deg)` }} />
            ))}
          </span>
        )}
        <ProgressRing percentual={r.nota} tamanho={120} rotulo={`Nota ${r.nota}%`} />
        <div>
          <h4 ref={tituloPasso} tabIndex={-1}>
            {r.aprovado ? (pratica ? 'Mandou bem de novo!' : 'Aprovado!') : 'Ainda não foi desta vez'}
          </h4>
          <p>
            Você acertou <b>{r.acertos}</b> de <b>{r.total}</b> ({r.nota}%). Nota mínima: {quiz.notaMinima}%.
          </p>
          {!r.aprovado && contou && (
            <p className="pi-hint">
              {restantesDepois === Infinity
                ? 'Revise o conteúdo das etapas anteriores e tente de novo quando quiser.'
                : restantesDepois > 0
                  ? `Você ainda tem ${restantesDepois} ${restantesDepois === 1 ? 'tentativa' : 'tentativas'}.`
                  : 'Você usou todas as tentativas. Fale com a gestão da área para liberar novas.'}
            </p>
          )}
          {r.aprovado && contou && <p className="pi-hint">Etapa concluída: as próximas etapas foram liberadas.</p>}
        </div>
      </div>
      {erro && (
        <p className={styles.erroInline} role="alert">
          {erro}
        </p>
      )}

      {mostrarCertoErrado && (
        <ol className={styles.quizRevisao} aria-label="Revisão das respostas">
          {quiz.perguntas.map((p: IPerguntaQuiz, i: number) => {
            const rp: IResultadoPergunta | undefined = porId.get(p.id);
            const certa: boolean = !!rp?.certa;
            return (
              <li key={p.id} className={certa ? styles.revisaoCerta : styles.revisaoErrada}>
                <span className={styles.revisaoIcone} aria-hidden="true">
                  <Icon nome={certa ? 'check' : 'fechar'} tamanho={14} />
                </span>
                <div>
                  <b>
                    {i + 1}. {p.enunciado}
                  </b>
                  <span className="pi-sr">{certa ? 'Resposta certa.' : 'Resposta errada.'}</span>
                  {mostrarGabarito && (
                    <ul>
                      {p.opcoes.map((o: IOpcaoQuiz) => {
                        const correta: boolean = !!rp && rp.corretasIds.indexOf(o.id) !== -1;
                        const sua: boolean = !!rp && rp.marcadasIds.indexOf(o.id) !== -1;
                        if (!correta && !sua) {
                          return null;
                        }
                        return (
                          <li key={o.id} className={correta ? styles.opcaoCorreta : styles.opcaoErrada}>
                            {o.texto}
                            <em>{correta && sua ? ' — sua resposta, correta' : correta ? ' — correta' : ' — sua resposta'}</em>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {mostrarGabarito && p.explicacao && <p className={styles.revisaoExplicacao}>{p.explicacao}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className={styles.quizAcoes}>
        {r.aprovado && props.aoContinuar && !props.modoTeste && (
          <button type="button" className="pi-btn primary" onClick={props.aoContinuar}>
            Seguir para a próxima etapa <Icon nome="direita" tamanho={16} />
          </button>
        )}
        {(!r.aprovado || !contou) && restantesDepois > 0 && (
          <button type="button" className={`pi-btn ${r.aprovado ? '' : 'primary'}`} onClick={() => comecar(!contou && (pratica || !!props.aprovadaAntes))}>
            <Icon nome="atualizar" tamanho={16} /> {r.aprovado ? 'Refazer' : 'Tentar de novo'}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizEtapa;
