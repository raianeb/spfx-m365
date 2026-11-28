// Skills aplicadas: spfx-padrao-visual-gti (cartões de pergunta, regras em painel, ações secundárias discretas),
// spfx-acessibilidade-conteudo (cada opção com rótulo próprio, "correta" como botão alternável com estado,
// erros por pergunta ligados ao cartão, contagem anunciada).
// Monta o quiz da etapa: regras de aprovação, perguntas, opções e respostas corretas; importa de texto e
// permite testar como participante sem gravar nada.
import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  ErrosQuiz,
  IOpcaoQuiz,
  IPerguntaEdicao,
  IQuizEdicao,
  LIMITE_OPCOES,
  LIMITE_PERGUNTAS,
  ModoGabarito,
  TipoPergunta,
  acertosNecessarios,
  importarPerguntas,
  lerQuiz,
  novaPergunta,
  novoId,
  paraEdicao,
  paraGravar,
  validarQuiz
} from '../../../../jornada/quiz';
import { Icon } from '../gti';
import { Alternar } from '../comum/ui';
import QuizEtapa from '../player/QuizEtapa';
import styles from '../jc.module.scss';

export interface IEditorQuizProps {
  id: string;
  /** JSON gravado (ou vazio para um quiz novo). Lido só na montagem. */
  valor: string;
  /** Mostra os erros de cada pergunta (depois de tentar aplicar). */
  mostrarErros: boolean;
  aoAlterar: (json: string) => void;
}

const EXEMPLO_IMPORTACAO: string = `Qual canal usar para abrir um chamado?
* Portal de serviços
- E-mail pessoal do analista
- Mensagem no Teams para qualquer pessoa
> O portal registra, prioriza e acompanha o chamado.

Quais dados são pessoais segundo a LGPD?
* Nome
* CPF
- Nome da empresa`;

const GABARITOS: { valor: ModoGabarito; rotulo: string }[] = [
  { valor: 'aposAprovar', rotulo: 'Depois de aprovado (antes, só quais errou)' },
  { valor: 'sempre', rotulo: 'Sempre, ao fim de cada tentativa' },
  { valor: 'nunca', rotulo: 'Nunca (só a nota)' }
];

const TENTATIVAS: number[] = [0, 1, 2, 3, 5, 10];

const EditorQuiz: React.FC<IEditorQuizProps> = (props: IEditorQuizProps) => {
  const { id } = props;
  const [semente] = useState<string>(() => novoId() + novoId());
  const [quiz, setQuiz] = useState<IQuizEdicao>(() => paraEdicao(lerQuiz(props.valor)));
  const [importando, setImportando] = useState<boolean>(false);
  const [textoImportar, setTextoImportar] = useState<string>('');
  const [testando, setTestando] = useState<boolean>(false);
  const [aviso, setAviso] = useState<string>('');

  const erros: ErrosQuiz = validarQuiz(quiz);
  const json: string = paraGravar(quiz, semente);

  // Entrega o JSON inicial ao formulário (quiz novo já nasce com uma pergunta e as regras padrão).
  useEffect(() => {
    props.aoAlterar(json);
  }, []);

  const atualizar = (proximo: IQuizEdicao): void => {
    setQuiz(proximo);
    props.aoAlterar(paraGravar(proximo, semente));
  };

  const alterarPergunta = (perguntaId: string, parcial: Partial<IPerguntaEdicao>): void =>
    atualizar({ ...quiz, perguntas: quiz.perguntas.map((p: IPerguntaEdicao) => (p.id === perguntaId ? { ...p, ...parcial } : p)) });

  const alterarTipo = (p: IPerguntaEdicao, tipo: TipoPergunta): void =>
    // Ao virar escolha única, fica só a primeira correta marcada.
    alterarPergunta(p.id, { tipo, corretasIds: tipo === 'unica' ? p.corretasIds.slice(0, 1) : p.corretasIds });

  const alternarCorreta = (p: IPerguntaEdicao, opcaoId: string): void => {
    const marcada: boolean = p.corretasIds.indexOf(opcaoId) !== -1;
    const corretasIds: string[] =
      p.tipo === 'unica' ? (marcada ? [] : [opcaoId]) : marcada ? p.corretasIds.filter((x: string) => x !== opcaoId) : [...p.corretasIds, opcaoId];
    alterarPergunta(p.id, { corretasIds });
  };

  const alterarOpcao = (p: IPerguntaEdicao, opcaoId: string, texto: string): void =>
    alterarPergunta(p.id, { opcoes: p.opcoes.map((o: IOpcaoQuiz) => (o.id === opcaoId ? { ...o, texto } : o)) });

  const removerOpcao = (p: IPerguntaEdicao, opcaoId: string): void =>
    alterarPergunta(p.id, { opcoes: p.opcoes.filter((o: IOpcaoQuiz) => o.id !== opcaoId), corretasIds: p.corretasIds.filter((x: string) => x !== opcaoId) });

  const mover = (indice: number, direcao: -1 | 1): void => {
    const destino: number = indice + direcao;
    if (destino < 0 || destino >= quiz.perguntas.length) {
      return;
    }
    const perguntas: IPerguntaEdicao[] = quiz.perguntas.slice();
    const [item] = perguntas.splice(indice, 1);
    perguntas.splice(destino, 0, item);
    atualizar({ ...quiz, perguntas });
  };

  const duplicar = (p: IPerguntaEdicao, indice: number): void => {
    const mapa: Record<string, string> = {};
    const opcoes: IOpcaoQuiz[] = p.opcoes.map((o: IOpcaoQuiz) => {
      mapa[o.id] = novoId();
      return { id: mapa[o.id], texto: o.texto };
    });
    const copia: IPerguntaEdicao = { ...p, id: novoId(), opcoes, corretasIds: p.corretasIds.map((x: string) => mapa[x]).filter(Boolean) };
    const perguntas: IPerguntaEdicao[] = quiz.perguntas.slice();
    perguntas.splice(indice + 1, 0, copia);
    atualizar({ ...quiz, perguntas });
  };

  const previaImportacao: IPerguntaEdicao[] = importando ? importarPerguntas(textoImportar) : [];
  const importar = (): void => {
    // Perguntas novas entram depois das existentes; uma pergunta inicial ainda vazia é substituída.
    const existentes: IPerguntaEdicao[] = quiz.perguntas.filter((p: IPerguntaEdicao) => p.enunciado.trim() !== '' || p.opcoes.some((o) => o.texto.trim()));
    const perguntas: IPerguntaEdicao[] = [...existentes, ...previaImportacao].slice(0, LIMITE_PERGUNTAS);
    atualizar({ ...quiz, perguntas });
    setAviso(`${previaImportacao.length} pergunta(s) importada(s). Confira as respostas corretas.`);
    setImportando(false);
    setTextoImportar('');
  };

  const total: number = quiz.perguntas.length;
  const necessarios: number = acertosNecessarios(quiz.notaMinima, Math.max(1, total));
  const semErros: boolean = Object.keys(erros).length === 0;

  return (
    <div className={styles.editorQuiz}>
      {/* Regras de aprovação */}
      <section className={styles.quizRegras} aria-labelledby={`${id}-regras`}>
        <h4 id={`${id}-regras`}>Regras de aprovação</h4>
        <div className={styles.quizNota}>
          <label htmlFor={`${id}-nota`}>Nota mínima para aprovar</label>
          <div className={styles.quizNotaControle}>
            <input
              id={`${id}-nota`}
              type="range"
              min={10}
              max={100}
              step={5}
              value={quiz.notaMinima}
              aria-valuetext={`${quiz.notaMinima}%`}
              onChange={(e) => atualizar({ ...quiz, notaMinima: Number(e.target.value) })}
              style={{ ['--pct' as string]: `${((quiz.notaMinima - 10) / 90) * 100}%` } as React.CSSProperties}
            />
            <output htmlFor={`${id}-nota`}>{quiz.notaMinima}%</output>
          </div>
          <span className="pi-hint" aria-live="polite">
            {total > 0
              ? `Para aprovar: acertar pelo menos ${necessarios} de ${total} ${total === 1 ? 'pergunta' : 'perguntas'}. Sem aprovação, a pessoa não segue para as próximas etapas.`
              : 'Cadastre perguntas para ver quantos acertos serão necessários.'}
          </span>
        </div>
        <div className="pi-form-grid">
          <div className="pi-field">
            <label htmlFor={`${id}-tent`}>Tentativas</label>
            <select id={`${id}-tent`} value={quiz.tentativas} onChange={(e) => atualizar({ ...quiz, tentativas: Number(e.target.value) })}>
              {TENTATIVAS.map((n: number) => (
                <option key={n} value={n}>
                  {n === 0 ? 'Sem limite' : n === 1 ? '1 tentativa' : `${n} tentativas`}
                </option>
              ))}
            </select>
            <span className="pi-hint">Esgotadas, a gestão da área pode liberar novas no mapa de progresso.</span>
          </div>
          <div className="pi-field">
            <label htmlFor={`${id}-gab`}>Mostrar respostas certas</label>
            <select id={`${id}-gab`} value={quiz.gabarito} onChange={(e) => atualizar({ ...quiz, gabarito: e.target.value as ModoGabarito })}>
              {GABARITOS.map((g) => (
                <option key={g.valor} value={g.valor}>
                  {g.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Alternar
          rotulo="Embaralhar perguntas e opções"
          explicacao="Cada tentativa vem numa ordem diferente."
          ligado={quiz.embaralhar}
          aoAlterar={(embaralhar: boolean) => atualizar({ ...quiz, embaralhar })}
        />
      </section>

      {/* Perguntas */}
      <div className={styles.quizCabecalho}>
        <h4>
          Perguntas <span className="pi-count">{total}</span>
        </h4>
        <div className={styles.editorLinha}>
          <button type="button" className="pi-btn" aria-expanded={importando} onClick={() => setImportando(!importando)}>
            <Icon nome="copiar" tamanho={16} /> Importar de texto
          </button>
          <button type="button" className="pi-btn" disabled={!semErros} title={semErros ? undefined : 'Corrija as perguntas para testar'} onClick={() => setTestando(true)}>
            <Icon nome="play" tamanho={16} /> Testar como participante
          </button>
        </div>
      </div>
      {aviso && (
        <p className="pi-hint" role="status">
          {aviso}
        </p>
      )}

      {importando && (
        <div className={styles.quizImportar}>
          <label className="pi-label" htmlFor={`${id}-imp`}>
            Cole as perguntas
          </label>
          <span className="pi-hint">
            Uma pergunta por bloco, separados por linha em branco. <code>*</code> marca a correta, <code>-</code> a errada e <code>&gt;</code> a explicação. Mais de
            uma correta vira múltipla escolha.
          </span>
          <textarea id={`${id}-imp`} rows={9} placeholder={EXEMPLO_IMPORTACAO} value={textoImportar} onChange={(e) => setTextoImportar(e.target.value)} />
          <div className={styles.editorLinha}>
            <button type="button" className="pi-btn primary" disabled={previaImportacao.length === 0} onClick={importar}>
              Importar {previaImportacao.length || ''} {previaImportacao.length === 1 ? 'pergunta' : 'perguntas'}
            </button>
            <button type="button" className="pi-btn" onClick={() => setTextoImportar(EXEMPLO_IMPORTACAO)}>
              Ver exemplo
            </button>
            <button type="button" className="pi-btn" onClick={() => setImportando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {erros.geral && props.mostrarErros && <p className={styles.erroInline}>{erros.geral}</p>}

      <ol className={styles.quizPerguntas}>
        {quiz.perguntas.map((p: IPerguntaEdicao, i: number) => {
          const erro: string | undefined = props.mostrarErros ? erros[p.id] : undefined;
          return (
            <li key={p.id} className={`${styles.perguntaCard} ${erro ? styles.perguntaInvalida : ''}`} aria-labelledby={`${id}-${p.id}-n`}>
              <div className={styles.perguntaTopo}>
                <span className={styles.perguntaNumero} id={`${id}-${p.id}-n`}>
                  Pergunta {i + 1}
                </span>
                <div className={styles.segmentado} role="radiogroup" aria-label={`Tipo da pergunta ${i + 1}`}>
                  {(
                    [
                      ['unica', 'Escolha única'],
                      ['multipla', 'Múltipla escolha']
                    ] as [TipoPergunta, string][]
                  ).map(([valor, rotulo]) => (
                    <button key={valor} type="button" role="radio" aria-checked={p.tipo === valor} onClick={() => alterarTipo(p, valor)}>
                      {rotulo}
                    </button>
                  ))}
                </div>
                <span className={styles.perguntaAcoes}>
                  <button type="button" className="pi-icon-btn" aria-label={`Subir pergunta ${i + 1}`} disabled={i === 0} onClick={() => mover(i, -1)}>
                    <Icon nome="cima" tamanho={16} />
                  </button>
                  <button type="button" className="pi-icon-btn" aria-label={`Descer pergunta ${i + 1}`} disabled={i === total - 1} onClick={() => mover(i, 1)}>
                    <Icon nome="baixo" tamanho={16} />
                  </button>
                  <button type="button" className="pi-icon-btn" aria-label={`Duplicar pergunta ${i + 1}`} disabled={total >= LIMITE_PERGUNTAS} onClick={() => duplicar(p, i)}>
                    <Icon nome="duplicar" tamanho={16} />
                  </button>
                  <button
                    type="button"
                    className="pi-icon-btn"
                    aria-label={`Excluir pergunta ${i + 1}`}
                    onClick={() => atualizar({ ...quiz, perguntas: quiz.perguntas.filter((x: IPerguntaEdicao) => x.id !== p.id) })}
                  >
                    <Icon nome="lixeira" tamanho={16} />
                  </button>
                </span>
              </div>

              <label className="pi-sr" htmlFor={`${id}-${p.id}-enun`}>
                Enunciado da pergunta {i + 1}
              </label>
              <textarea
                id={`${id}-${p.id}-enun`}
                className={styles.perguntaEnunciado}
                rows={2}
                maxLength={1000}
                placeholder="Escreva a pergunta"
                value={p.enunciado}
                onChange={(e) => alterarPergunta(p.id, { enunciado: e.target.value })}
              />

              <span className="pi-hint">
                {p.tipo === 'unica' ? 'Clique no círculo da opção correta.' : 'Marque todas as opções corretas. A pessoa só acerta se marcar exatamente essas.'}
              </span>
              <ul className={styles.perguntaOpcoes}>
                {p.opcoes.map((o: IOpcaoQuiz, j: number) => {
                  const correta: boolean = p.corretasIds.indexOf(o.id) !== -1;
                  return (
                    <li key={o.id} className={correta ? styles.opcaoMarcadaCorreta : undefined}>
                      <button
                        type="button"
                        className={`${styles.marcaCorreta} ${p.tipo === 'multipla' ? styles.marcaQuadrada : ''}`}
                        aria-pressed={correta}
                        aria-label={`Opção ${String.fromCharCode(65 + j)} é a correta`}
                        title={correta ? 'Correta' : 'Marcar como correta'}
                        onClick={() => alternarCorreta(p, o.id)}
                      >
                        {correta && <Icon nome="check" tamanho={13} />}
                      </button>
                      <input
                        aria-label={`Opção ${String.fromCharCode(65 + j)} da pergunta ${i + 1}`}
                        maxLength={500}
                        placeholder={`Opção ${String.fromCharCode(65 + j)}`}
                        value={o.texto}
                        onChange={(e) => alterarOpcao(p, o.id, e.target.value)}
                        onKeyDown={(e) => {
                          // Enter na última opção cria a próxima.
                          if (e.key === 'Enter' && j === p.opcoes.length - 1 && p.opcoes.length < LIMITE_OPCOES) {
                            e.preventDefault();
                            alterarPergunta(p.id, { opcoes: [...p.opcoes, { id: novoId(), texto: '' }] });
                          }
                        }}
                      />
                      {correta && <span className={styles.seloCorreta}>Correta</span>}
                      <button
                        type="button"
                        className="pi-icon-btn"
                        aria-label={`Remover opção ${String.fromCharCode(65 + j)}`}
                        disabled={p.opcoes.length <= 2}
                        onClick={() => removerOpcao(p, o.id)}
                      >
                        <Icon nome="fechar" tamanho={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {p.opcoes.length < LIMITE_OPCOES && (
                <button type="button" className="pi-link-btn" onClick={() => alterarPergunta(p.id, { opcoes: [...p.opcoes, { id: novoId(), texto: '' }] })}>
                  + Adicionar opção
                </button>
              )}
              <label className="pi-label" htmlFor={`${id}-${p.id}-exp`}>
                Explicação da resposta (opcional)
              </label>
              <input
                id={`${id}-${p.id}-exp`}
                maxLength={1000}
                placeholder="Aparece no gabarito: por que esta é a resposta certa?"
                value={p.explicacao}
                onChange={(e) => alterarPergunta(p.id, { explicacao: e.target.value })}
              />
              {erro && (
                <span className="pi-field-error" role="alert">
                  {erro}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className={`pi-btn ${styles.quizNovaPergunta}`}
        disabled={total >= LIMITE_PERGUNTAS}
        onClick={() => atualizar({ ...quiz, perguntas: [...quiz.perguntas, novaPergunta(quiz.perguntas[total - 1]?.tipo ?? 'unica')] })}
      >
        <Icon nome="mais" tamanho={16} /> Adicionar pergunta
      </button>

      {testando && (
        <div className={styles.quizTeste} role="region" aria-label="Teste do quiz">
          <div className={styles.quizCabecalho}>
            <h4>Testando como participante</h4>
            <button type="button" className="pi-btn" onClick={() => setTestando(false)}>
              <Icon nome="fechar" tamanho={14} /> Fechar teste
            </button>
          </div>
          {(() => {
            const gravado = lerQuiz(json);
            return gravado ? <QuizEtapa id={`${id}-teste`} quiz={gravado} modoTeste /> : null;
          })()}
        </div>
      )}
    </div>
  );
};

export default EditorQuiz;
