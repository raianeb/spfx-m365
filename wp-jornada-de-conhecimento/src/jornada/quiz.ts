// Skills aplicadas: spfx-implementacao-base (regras de negócio puras e testáveis).
// Quiz da etapa: perguntas de escolha única ou múltipla, nota mínima para aprovar e limite de tentativas.
// Gravado como JSON na coluna Url da lista de Etapas (mesma coluna do tipo Conteudo; sem mudança de esquema).
//
// Respostas corretas: o JSON guarda uma marca por opção correta (hash de semente + pergunta + opção), não o id
// da opção. Isso evita que o gabarito apareça em texto claro para quem abre a lista, mas NÃO é segurança: a
// correção acontece no navegador, e quem souber programar consegue descobrir as respostas. Para avaliação com
// valor formal, use uma ferramenta própria (ex.: Microsoft Forms em modo teste).

export type TipoPergunta = 'unica' | 'multipla';
export type ModoGabarito = 'sempre' | 'aposAprovar' | 'nunca';

export interface IOpcaoQuiz {
  id: string;
  texto: string;
}

/** Pergunta gravada: corretas são marcas, não ids. */
export interface IPerguntaQuiz {
  id: string;
  enunciado: string;
  tipo: TipoPergunta;
  opcoes: IOpcaoQuiz[];
  corretas: string[];
  explicacao: string;
}

export interface IQuiz {
  v: 1;
  semente: string;
  /** Percentual mínimo de acertos para aprovar (1 a 100). */
  notaMinima: number;
  /** Tentativas permitidas; 0 = sem limite. */
  tentativas: number;
  /** Embaralha perguntas e opções a cada tentativa. */
  embaralhar: boolean;
  /** Quando mostrar as respostas certas e as explicações. */
  gabarito: ModoGabarito;
  perguntas: IPerguntaQuiz[];
}

/** Pergunta no editor: corretas como ids das opções. */
export interface IPerguntaEdicao {
  id: string;
  enunciado: string;
  tipo: TipoPergunta;
  opcoes: IOpcaoQuiz[];
  corretasIds: string[];
  explicacao: string;
}

export interface IQuizEdicao {
  notaMinima: number;
  tentativas: number;
  embaralhar: boolean;
  gabarito: ModoGabarito;
  perguntas: IPerguntaEdicao[];
}

/** Respostas da pessoa: ids das opções marcadas por pergunta. */
export type RespostasQuiz = Record<string, string[]>;

export interface IResultadoPergunta {
  id: string;
  certa: boolean;
  corretasIds: string[];
  marcadasIds: string[];
}

export interface IResultadoQuiz {
  acertos: number;
  total: number;
  /** Percentual de acertos, inteiro de 0 a 100. */
  nota: number;
  aprovado: boolean;
  perguntas: IResultadoPergunta[];
}

export const NOTA_MINIMA_PADRAO: number = 70;
export const LIMITE_PERGUNTAS: number = 50;
export const LIMITE_OPCOES: number = 8;
export const LIMITE_TENTATIVAS: number = 20;

const GABARITOS: ModoGabarito[] = ['sempre', 'aposAprovar', 'nunca'];

/** Identificador curto e único o bastante dentro de um quiz. */
export const novoId = (): string => Math.random().toString(36).slice(2, 9);

/** FNV-1a de 32 bits, duas passagens com sementes diferentes: marca estável e curta (não é criptografia). */
const fnv = (texto: string, base: number): string => {
  let hash: number = base >>> 0;
  for (let i: number = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(36);
};

export const marcaResposta = (semente: string, perguntaId: string, opcaoId: string): string => {
  const texto: string = `${semente}|${perguntaId}|${opcaoId}`;
  return `${fnv(texto, 2166136261)}${fnv(texto, 3735928559)}`;
};

/** Ids das opções corretas de uma pergunta gravada. */
export const corretasDe = (quiz: Pick<IQuiz, 'semente'>, pergunta: IPerguntaQuiz): string[] =>
  pergunta.opcoes
    .filter((opcao: IOpcaoQuiz) => pergunta.corretas.indexOf(marcaResposta(quiz.semente, pergunta.id, opcao.id)) !== -1)
    .map((opcao: IOpcaoQuiz) => opcao.id);

const novaOpcao = (texto: string = ''): IOpcaoQuiz => ({ id: novoId(), texto });

export const novaPergunta = (tipo: TipoPergunta = 'unica'): IPerguntaEdicao => ({
  id: novoId(),
  enunciado: '',
  tipo,
  opcoes: [novaOpcao(), novaOpcao(), novaOpcao()],
  corretasIds: [],
  explicacao: ''
});

export const quizVazio = (): IQuizEdicao => ({
  notaMinima: NOTA_MINIMA_PADRAO,
  tentativas: 0,
  embaralhar: true,
  gabarito: 'aposAprovar',
  perguntas: [novaPergunta()]
});

const inteiroEntre = (valor: unknown, min: number, max: number, padrao: number): number =>
  typeof valor === 'number' && isFinite(valor) ? Math.min(max, Math.max(min, Math.round(valor))) : padrao;

const textoLimitado = (valor: unknown, limite: number): string => (typeof valor === 'string' ? valor.slice(0, limite) : '');

/** Lê o JSON gravado. Conteúdo inválido vira undefined (a tela avisa), nunca quebra o player. */
export const lerQuiz = (json: string | undefined): IQuiz | undefined => {
  if (!json) {
    return undefined;
  }
  let bruto: Partial<IQuiz>;
  try {
    bruto = JSON.parse(json);
  } catch {
    return undefined;
  }
  if (!bruto || typeof bruto !== 'object' || !Array.isArray(bruto.perguntas) || typeof bruto.semente !== 'string') {
    return undefined;
  }
  const perguntas: IPerguntaQuiz[] = (bruto.perguntas as Partial<IPerguntaQuiz>[])
    .slice(0, LIMITE_PERGUNTAS)
    .filter((p: Partial<IPerguntaQuiz>) => p && typeof p.id === 'string' && Array.isArray(p.opcoes))
    .map((p: Partial<IPerguntaQuiz>) => ({
      id: textoLimitado(p.id, 20),
      enunciado: textoLimitado(p.enunciado, 1000),
      tipo: p.tipo === 'multipla' ? 'multipla' : 'unica',
      opcoes: (p.opcoes as Partial<IOpcaoQuiz>[])
        .slice(0, LIMITE_OPCOES)
        .filter((o: Partial<IOpcaoQuiz>) => o && typeof o.id === 'string')
        .map((o: Partial<IOpcaoQuiz>) => ({ id: textoLimitado(o.id, 20), texto: textoLimitado(o.texto, 500) })),
      corretas: Array.isArray(p.corretas) ? p.corretas.filter((c: unknown): c is string => typeof c === 'string') : [],
      explicacao: textoLimitado(p.explicacao, 1000)
    }));
  return {
    v: 1,
    semente: bruto.semente.slice(0, 40),
    notaMinima: inteiroEntre(bruto.notaMinima, 1, 100, NOTA_MINIMA_PADRAO),
    tentativas: inteiroEntre(bruto.tentativas, 0, LIMITE_TENTATIVAS, 0),
    embaralhar: bruto.embaralhar !== false,
    gabarito: GABARITOS.indexOf(bruto.gabarito as ModoGabarito) !== -1 ? (bruto.gabarito as ModoGabarito) : 'aposAprovar',
    perguntas
  };
};

/** Quiz gravado → editor (recupera as corretas pelas marcas). */
export const paraEdicao = (quiz: IQuiz | undefined): IQuizEdicao =>
  quiz
    ? {
        notaMinima: quiz.notaMinima,
        tentativas: quiz.tentativas,
        embaralhar: quiz.embaralhar,
        gabarito: quiz.gabarito,
        perguntas: quiz.perguntas.map((p: IPerguntaQuiz) => ({
          id: p.id,
          enunciado: p.enunciado,
          tipo: p.tipo,
          opcoes: p.opcoes.map((o: IOpcaoQuiz) => ({ ...o })),
          corretasIds: corretasDe(quiz, p),
          explicacao: p.explicacao
        }))
      }
    : quizVazio();

/** Editor → JSON gravado. Uma semente nova a cada gravação muda todas as marcas. */
export const paraGravar = (edicao: IQuizEdicao, semente: string = novoId() + novoId()): string => {
  const quiz: IQuiz = {
    v: 1,
    semente,
    notaMinima: inteiroEntre(edicao.notaMinima, 1, 100, NOTA_MINIMA_PADRAO),
    tentativas: inteiroEntre(edicao.tentativas, 0, LIMITE_TENTATIVAS, 0),
    embaralhar: edicao.embaralhar,
    gabarito: edicao.gabarito,
    perguntas: edicao.perguntas.map((p: IPerguntaEdicao) => {
      const opcoes: IOpcaoQuiz[] = p.opcoes.filter((o: IOpcaoQuiz) => o.texto.trim() !== '').map((o: IOpcaoQuiz) => ({ id: o.id, texto: o.texto.trim() }));
      return {
        id: p.id,
        enunciado: p.enunciado.trim(),
        tipo: p.tipo,
        opcoes,
        corretas: opcoes
          .filter((o: IOpcaoQuiz) => p.corretasIds.indexOf(o.id) !== -1)
          .map((o: IOpcaoQuiz) => marcaResposta(semente, p.id, o.id)),
        explicacao: p.explicacao.trim()
      };
    })
  };
  return JSON.stringify(quiz);
};

export type ErrosQuiz = Record<string, string>;

/** Erros por chave: "geral", "notaMinima", "tentativas", "<perguntaId>". */
export const validarQuiz = (edicao: IQuizEdicao): ErrosQuiz => {
  const erros: ErrosQuiz = {};
  if (edicao.perguntas.length === 0) {
    erros.geral = 'Cadastre ao menos uma pergunta.';
  } else if (edicao.perguntas.length > LIMITE_PERGUNTAS) {
    erros.geral = `Use no máximo ${LIMITE_PERGUNTAS} perguntas por etapa.`;
  }
  if (!Number.isInteger(edicao.notaMinima) || edicao.notaMinima < 1 || edicao.notaMinima > 100) {
    erros.notaMinima = 'Informe a nota mínima entre 1% e 100%.';
  }
  if (!Number.isInteger(edicao.tentativas) || edicao.tentativas < 0 || edicao.tentativas > LIMITE_TENTATIVAS) {
    erros.tentativas = `Informe de 1 a ${LIMITE_TENTATIVAS} tentativas, ou 0 para sem limite.`;
  }
  edicao.perguntas.forEach((p: IPerguntaEdicao) => {
    const preenchidas: IOpcaoQuiz[] = p.opcoes.filter((o: IOpcaoQuiz) => o.texto.trim() !== '');
    const corretas: number = preenchidas.filter((o: IOpcaoQuiz) => p.corretasIds.indexOf(o.id) !== -1).length;
    if (p.enunciado.trim() === '') {
      erros[p.id] = 'Escreva a pergunta.';
    } else if (preenchidas.length < 2) {
      erros[p.id] = 'Preencha ao menos duas opções.';
    } else if (corretas === 0) {
      erros[p.id] = p.tipo === 'unica' ? 'Marque a opção correta.' : 'Marque ao menos uma opção correta.';
    } else if (p.tipo === 'unica' && corretas > 1) {
      erros[p.id] = 'Escolha única aceita só uma opção correta. Troque para múltipla escolha ou desmarque as demais.';
    } else if (p.tipo === 'multipla' && corretas === preenchidas.length) {
      erros[p.id] = 'Todas as opções estão corretas: inclua ao menos uma opção errada.';
    }
  });
  return erros;
};

/** Acertos necessários para aprovar, com a nota mínima e o total de perguntas. */
export const acertosNecessarios = (notaMinima: number, total: number): number => Math.ceil((notaMinima / 100) * total - 1e-9);

/**
 * Corrige: cada pergunta vale o mesmo; múltipla escolha só conta se marcar exatamente as corretas
 * (sem marcar nenhuma errada). Aprovado com nota ≥ nota mínima.
 */
export const corrigir = (quiz: IQuiz, respostas: RespostasQuiz): IResultadoQuiz => {
  const perguntas: IResultadoPergunta[] = quiz.perguntas.map((p: IPerguntaQuiz) => {
    const corretasIds: string[] = corretasDe(quiz, p);
    const marcadasIds: string[] = (respostas[p.id] ?? []).filter((id: string) => p.opcoes.some((o: IOpcaoQuiz) => o.id === id));
    const certa: boolean =
      corretasIds.length > 0 && marcadasIds.length === corretasIds.length && marcadasIds.every((id: string) => corretasIds.indexOf(id) !== -1);
    return { id: p.id, certa, corretasIds, marcadasIds };
  });
  const total: number = perguntas.length;
  const acertos: number = perguntas.filter((r: IResultadoPergunta) => r.certa).length;
  const nota: number = total === 0 ? 0 : Math.round((acertos / total) * 100);
  return { acertos, total, nota, aprovado: total > 0 && acertos >= acertosNecessarios(quiz.notaMinima, total), perguntas };
};

/** Embaralhamento determinístico por semente (mesma ordem enquanto a tentativa estiver aberta). */
export const embaralhar = <T>(itens: T[], semente: string): T[] => {
  const copia: T[] = itens.slice();
  let estado: number = parseInt(fnv(semente, 2166136261), 36) || 1;
  for (let i: number = copia.length - 1; i > 0; i--) {
    estado = Math.imul(estado ^ (estado >>> 15), 2246822507) >>> 0;
    estado = (estado ^ (estado >>> 13)) >>> 0;
    const j: number = estado % (i + 1);
    const temp: T = copia[i];
    copia[i] = copia[j];
    copia[j] = temp;
  }
  return copia;
};

/**
 * Importa perguntas de texto colado. Formato (uma pergunta por bloco, separados por linha em branco):
 *   Qual é a capital do Brasil?
 *   * Brasília          ← correta (também aceita "[x]")
 *   - São Paulo         ← errada (também aceita "[ ]")
 *   > Explicação (opcional)
 * Mais de uma correta vira múltipla escolha. Numeração no início ("1.", "1)") é ignorada.
 */
export const importarPerguntas = (textoColado: string): IPerguntaEdicao[] => {
  const blocos: string[][] = [];
  let atual: string[] = [];
  textoColado.split(/\r?\n/).forEach((linha: string) => {
    if (linha.trim() === '') {
      if (atual.length) {
        blocos.push(atual);
      }
      atual = [];
    } else {
      atual.push(linha.trim());
    }
  });
  if (atual.length) {
    blocos.push(atual);
  }
  return blocos
    .map((linhas: string[]): IPerguntaEdicao | undefined => {
      const pergunta: IPerguntaEdicao = { ...novaPergunta(), opcoes: [] };
      const enunciado: string[] = [];
      linhas.forEach((linha: string) => {
        const correta: RegExpMatchArray | null = linha.match(/^(?:\*|\[x\]|\[X\])\s*(.+)$/);
        const errada: RegExpMatchArray | null = linha.match(/^(?:-|\[ \]|\[\])\s*(.+)$/);
        const explicacao: RegExpMatchArray | null = linha.match(/^>\s*(.+)$/);
        if (correta) {
          const opcao: IOpcaoQuiz = novaOpcao(correta[1].trim());
          pergunta.opcoes.push(opcao);
          pergunta.corretasIds.push(opcao.id);
        } else if (errada) {
          pergunta.opcoes.push(novaOpcao(errada[1].trim()));
        } else if (explicacao) {
          pergunta.explicacao = pergunta.explicacao ? `${pergunta.explicacao} ${explicacao[1].trim()}` : explicacao[1].trim();
        } else if (pergunta.opcoes.length === 0) {
          enunciado.push(linha.replace(/^\d+\s*[.)-]\s*/, ''));
        }
      });
      pergunta.enunciado = enunciado.join(' ').trim();
      pergunta.opcoes = pergunta.opcoes.slice(0, LIMITE_OPCOES);
      pergunta.tipo = pergunta.corretasIds.length > 1 ? 'multipla' : 'unica';
      return pergunta.enunciado && pergunta.opcoes.length ? pergunta : undefined;
    })
    .filter((p: IPerguntaEdicao | undefined): p is IPerguntaEdicao => !!p)
    .slice(0, LIMITE_PERGUNTAS);
};

/** Tentativas restantes (Infinity quando sem limite). */
export const tentativasRestantes = (quiz: Pick<IQuiz, 'tentativas'>, usadas: number): number =>
  quiz.tentativas === 0 ? Infinity : Math.max(0, quiz.tentativas - usadas);
