// Testes do quiz: gravação com marcas, correção, nota mínima, barreira nas etapas, tentativas e importação.
import { IEtapa, MapaProgresso, estadosEtapas, liberarTentativas, lerProgresso, podeConcluir, registrarTentativa } from './progresso';
import {
  IQuizEdicao,
  acertosNecessarios,
  corrigir,
  embaralhar,
  importarPerguntas,
  lerQuiz,
  paraEdicao,
  paraGravar,
  tentativasRestantes,
  validarQuiz
} from './quiz';
import { validarEtapa } from './estudio';

const edicao = (): IQuizEdicao => ({
  notaMinima: 70,
  tentativas: 2,
  embaralhar: true,
  gabarito: 'aposAprovar',
  perguntas: [
    {
      id: 'p1',
      enunciado: 'Capital do Brasil?',
      tipo: 'unica',
      opcoes: [
        { id: 'a', texto: 'Brasília' },
        { id: 'b', texto: 'Rio' }
      ],
      corretasIds: ['a'],
      explicacao: 'Desde 1960.'
    },
    {
      id: 'p2',
      enunciado: 'Dados pessoais?',
      tipo: 'multipla',
      opcoes: [
        { id: 'a', texto: 'Nome' },
        { id: 'b', texto: 'CPF' },
        { id: 'c', texto: 'CNPJ' }
      ],
      corretasIds: ['a', 'b'],
      explicacao: ''
    },
    {
      id: 'p3',
      enunciado: 'Canal de chamados?',
      tipo: 'unica',
      opcoes: [
        { id: 'a', texto: 'Portal' },
        { id: 'b', texto: 'E-mail' },
        { id: 'c', texto: '' }
      ],
      corretasIds: ['a'],
      explicacao: ''
    }
  ]
});

const etapa = (id: number, tipo: IEtapa['tipo']): IEtapa => ({
  id,
  jornadaId: 1,
  titulo: '',
  ordem: id,
  tipo,
  url: '',
  duracaoMin: 5,
  instrucoes: '',
  regra: tipo === 'Quiz' ? 'Aprovacao' : 'Manual',
  percentualMinimo: 0
});

describe('quiz: gravação', () => {
  it('não grava o id da opção correta em texto claro e recupera as corretas no editor', () => {
    const json: string = paraGravar(edicao(), 'semente');
    expect(json).not.toMatch(/"corretas":\["a"/);
    const quiz = lerQuiz(json);
    expect(quiz).toBeDefined();
    const devolta: IQuizEdicao = paraEdicao(quiz);
    expect(devolta.perguntas[0].corretasIds).toEqual(['a']);
    expect(devolta.perguntas[1].corretasIds).toEqual(['a', 'b']);
    // Opção vazia é descartada ao gravar.
    expect(devolta.perguntas[2].opcoes).toHaveLength(2);
  });

  it('JSON inválido não quebra', () => {
    expect(lerQuiz('{x')).toBeUndefined();
    expect(lerQuiz('{"perguntas":3}')).toBeUndefined();
  });
});

describe('quiz: correção e nota mínima', () => {
  const quiz = lerQuiz(paraGravar(edicao(), 's'))!;

  it('múltipla escolha só conta com exatamente as corretas', () => {
    expect(corrigir(quiz, { p1: ['a'], p2: ['a'], p3: ['a'] }).acertos).toBe(2);
    expect(corrigir(quiz, { p1: ['a'], p2: ['a', 'b', 'c'], p3: ['a'] }).acertos).toBe(2);
    expect(corrigir(quiz, { p1: ['a'], p2: ['b', 'a'], p3: ['a'] }).acertos).toBe(3);
  });

  it('aprova com nota ≥ mínima (70% de 3 = 3 acertos)', () => {
    expect(acertosNecessarios(70, 3)).toBe(3);
    expect(acertosNecessarios(60, 5)).toBe(3);
    expect(acertosNecessarios(100, 4)).toBe(4);
    const dois = corrigir(quiz, { p1: ['a'], p2: ['a'], p3: ['a'] });
    expect(dois.nota).toBe(67);
    expect(dois.aprovado).toBe(false);
    expect(corrigir(quiz, { p1: ['a'], p2: ['a', 'b'], p3: ['a'] }).aprovado).toBe(true);
  });

  it('validação: corretas por tipo e opções mínimas', () => {
    expect(validarQuiz(edicao())).toEqual({});
    const e = edicao();
    e.perguntas[0].corretasIds = ['a', 'b'];
    e.perguntas[1].corretasIds = ['a', 'b', 'c'];
    e.perguntas[2].opcoes = [{ id: 'a', texto: 'Só uma' }];
    const erros = validarQuiz(e);
    expect(Object.keys(erros).sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('etapa de quiz exige quiz válido e regra de aprovação', () => {
    const base = { titulo: 'Quiz', tipo: 'Quiz' as const, url: '', duracaoMin: 5, percentualMinimo: 0 };
    expect(validarEtapa({ ...base, regra: 'Aprovacao', conteudo: paraGravar(edicao()) }, 'https://x.com')).toEqual({});
    expect(validarEtapa({ ...base, regra: 'Aprovacao', conteudo: '' }, 'https://x.com').conteudo).toBeDefined();
    expect(validarEtapa({ ...base, regra: 'Manual', conteudo: paraGravar(edicao()) }, 'https://x.com').regra).toBeDefined();
  });

  it('embaralhar é estável para a mesma semente', () => {
    const itens: number[] = [1, 2, 3, 4, 5, 6];
    expect(embaralhar(itens, 'x')).toEqual(embaralhar(itens, 'x'));
    expect(embaralhar(itens, 'x').slice().sort()).toEqual(itens);
  });
});

describe('quiz: barreira e tentativas', () => {
  const etapas: IEtapa[] = [etapa(1, 'Video'), etapa(2, 'Quiz'), etapa(3, 'Documento')];
  const agora: Date = new Date('2026-12-01T10:00:00Z');

  it('quiz sem aprovação bloqueia as etapas seguintes mesmo com ordem livre', () => {
    expect(estadosEtapas(etapas, {}, true)).toEqual(['disponivel', 'disponivel', 'bloqueada']);
    const reprovado: MapaProgresso = registrarTentativa({}, 2, 40, false, agora);
    expect(estadosEtapas(etapas, reprovado, true)[2]).toBe('bloqueada');
    const aprovado: MapaProgresso = registrarTentativa(reprovado, 2, 80, true, agora);
    expect(aprovado['2'].s).toBe('concluida');
    expect(aprovado['2'].q).toEqual({ t: 2, n: 80, u: 80 });
    expect(estadosEtapas(etapas, aprovado, true)[2]).toBe('disponivel');
  });

  it('concluir manual não vale para quiz; melhor nota não diminui; prática não muda a aprovação', () => {
    expect(podeConcluir(etapas[1], {})).toBe(false);
    let p: MapaProgresso = registrarTentativa({}, 2, 60, false, agora);
    p = registrarTentativa(p, 2, 20, false, agora);
    expect(p['2'].q).toEqual({ t: 2, n: 60, u: 20 });
    const aprovado: MapaProgresso = registrarTentativa(p, 2, 90, true, agora);
    expect(registrarTentativa(aprovado, 2, 10, false, agora)).toBe(aprovado);
  });

  it('tentativas restantes, liberação pela gestão e leitura do JSON', () => {
    expect(tentativasRestantes({ tentativas: 0 }, 9)).toBe(Infinity);
    expect(tentativasRestantes({ tentativas: 2 }, 2)).toBe(0);
    const p: MapaProgresso = registrarTentativa(registrarTentativa({}, 2, 30, false, agora), 2, 50, false, agora);
    const liberado: MapaProgresso = liberarTentativas(p, 2);
    expect(liberado['2'].q).toEqual({ t: 0, n: 50, u: 50 });
    expect(lerProgresso(JSON.stringify(liberado))['2'].q).toEqual({ t: 0, n: 50, u: 50 });
  });
});

describe('quiz: importação de texto', () => {
  it('lê blocos com corretas, erradas e explicação', () => {
    const perguntas = importarPerguntas(`1. Qual canal?
* Portal
- E-mail
> O portal registra.

2) Dados pessoais?
[x] Nome
[x] CPF
[ ] CNPJ

linha solta sem opções`);
    expect(perguntas).toHaveLength(2);
    expect(perguntas[0].enunciado).toBe('Qual canal?');
    expect(perguntas[0].tipo).toBe('unica');
    expect(perguntas[0].explicacao).toBe('O portal registra.');
    expect(perguntas[1].tipo).toBe('multipla');
    expect(perguntas[1].corretasIds).toHaveLength(2);
    expect(perguntas[1].opcoes).toHaveLength(3);
  });
});
