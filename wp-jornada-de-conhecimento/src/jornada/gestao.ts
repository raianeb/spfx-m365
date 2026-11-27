// Skills aplicadas: spfx-implementacao-base (cálculo puro e testável). Escopo, seção 3 (Gestão da Área).
// Indicadores calculados na tela a partir das matrículas que o Gestor lê (nível Editar na lista).
import { IEtapa, IJornada, IMatricula, atrasada, minutosConcluidos, percentualConcluido, publicoInclui } from './progresso';

export interface IPessoaArea {
  nome: string;
  email: string;
  /** Login (claims). A chave da pessoa é o login em minúsculas. */
  loginName: string;
}

export const chavePessoa = (pessoa: Pick<IPessoaArea, 'loginName'>): string => pessoa.loginName.toLowerCase();

export interface IMatriculaPessoa extends IMatricula {
  pessoa: IPessoaArea;
}

export interface ICelula {
  pessoa: string;
  jornadaId: number;
  /** Fora do público específico da jornada. */
  naoSeAplica: boolean;
  percentual: number;
  iniciada: boolean;
  concluida: boolean;
  atrasada: boolean;
  matricula?: IMatriculaPessoa;
}

export interface IPainel {
  pessoas: number;
  /** % de pessoas com ao menos uma jornada iniciada. */
  adesao: number;
  /** Média do percentual concluído nas jornadas que se aplicam a cada pessoa. */
  conclusaoMedia: number;
  atrasados: number;
  horas: number;
  concluidas: number;
}

/**
 * Pessoas do mapa: membros do grupo de Usuários (com grupos do Entra ID já expandidos) e quem tem matrícula
 * (cobre quem saiu do grupo depois de começar).
 */
export const juntarPessoas = (membros: IPessoaArea[], matriculas: IMatriculaPessoa[]): IPessoaArea[] => {
  const porChave: Map<string, IPessoaArea> = new Map<string, IPessoaArea>();
  membros.forEach((pessoa: IPessoaArea) => porChave.set(chavePessoa(pessoa), pessoa));
  matriculas.forEach((matricula: IMatriculaPessoa) => {
    if (!porChave.has(chavePessoa(matricula.pessoa))) {
      porChave.set(chavePessoa(matricula.pessoa), matricula.pessoa);
    }
  });
  return Array.from(porChave.values()).sort((a: IPessoaArea, b: IPessoaArea) => a.nome.localeCompare(b.nome, 'pt-BR'));
};

export const montarCelulas = (
  pessoas: IPessoaArea[],
  jornadas: IJornada[],
  etapas: Map<number, IEtapa[]>,
  matriculas: IMatriculaPessoa[],
  agora: Date
): ICelula[][] => {
  const indice: Map<string, IMatriculaPessoa> = new Map<string, IMatriculaPessoa>();
  matriculas.forEach((matricula: IMatriculaPessoa) => indice.set(`${chavePessoa(matricula.pessoa)}|${matricula.jornadaId}`, matricula));
  return pessoas.map((pessoa: IPessoaArea) =>
    jornadas.map((jornada: IJornada) => {
      const matricula: IMatriculaPessoa | undefined = indice.get(`${chavePessoa(pessoa)}|${jornada.id}`);
      const concluida: boolean = matricula?.status === 'Concluida';
      return {
        pessoa: chavePessoa(pessoa),
        jornadaId: jornada.id,
        naoSeAplica: !matricula && !publicoInclui(jornada, pessoa.loginName),
        percentual: concluida ? 100 : matricula ? percentualConcluido(etapas.get(jornada.id) ?? [], matricula.progresso) : 0,
        iniciada: !!matricula,
        concluida,
        atrasada: atrasada(jornada, matricula, agora),
        matricula
      };
    })
  );
};

export const calcularPainel = (celulas: ICelula[][], etapas: Map<number, IEtapa[]>): IPainel => {
  const aplicaveis: ICelula[] = ([] as ICelula[]).concat(...celulas).filter((celula: ICelula) => !celula.naoSeAplica);
  const comAlgumaIniciada: number = celulas.filter((linha: ICelula[]) => linha.some((celula: ICelula) => celula.iniciada)).length;
  const minutos: number = aplicaveis.reduce(
    (total: number, celula: ICelula) =>
      total + (celula.matricula ? minutosConcluidos(etapas.get(celula.jornadaId) ?? [], celula.matricula.progresso) : 0),
    0
  );
  return {
    pessoas: celulas.length,
    adesao: celulas.length === 0 ? 0 : Math.round((comAlgumaIniciada / celulas.length) * 100),
    conclusaoMedia: aplicaveis.length === 0 ? 0 : Math.round(aplicaveis.reduce((t: number, c: ICelula) => t + c.percentual, 0) / aplicaveis.length),
    atrasados: aplicaveis.filter((celula: ICelula) => celula.atrasada).length,
    horas: Math.round((minutos / 60) * 10) / 10,
    concluidas: aplicaveis.filter((celula: ICelula) => celula.concluida).length
  };
};

/** Faixa de cor do mapa de calor; o percentual também aparece em texto na célula. */
export const faixaCalor = (celula: ICelula): 'na' | 'zero' | 'baixa' | 'media' | 'alta' | 'completa' => {
  if (celula.naoSeAplica) {
    return 'na';
  }
  if (celula.concluida) {
    return 'completa';
  }
  if (celula.percentual === 0) {
    return 'zero';
  }
  return celula.percentual < 34 ? 'baixa' : celula.percentual < 67 ? 'media' : 'alta';
};

/** Célula de CSV segura: aspas escapadas e fórmulas neutralizadas (=, +, -, @ no início). */
export const celulaCsv = (valor: string | number): string => {
  let texto: string = String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) {
    texto = `'${texto}`;
  }
  return `"${texto.replace(/"/g, '""')}"`;
};

/** CSV com separador ";" e BOM, para abrir direto no Excel em português. */
export const gerarCsv = (cabecalho: string[], linhas: (string | number)[][]): string =>
  '﻿' + [cabecalho, ...linhas].map((linha: (string | number)[]) => linha.map(celulaCsv).join(';')).join('\r\n');
