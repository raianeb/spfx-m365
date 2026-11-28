// Skills aplicadas: spfx-implementacao-base (regras de negócio puras e testáveis). Escopo, seção 3 ("Regras de negócio").
// Módulo puro: sem dependência do SharePoint.

/**
 * Tipos de etapa. "Conteudo" é o conteúdo montado no próprio editor (texto, imagens e links); o HTML
 * sanitizado é gravado na coluna Url da lista de Etapas (texto multilinha simples, sem mudança de esquema).
 * "Link" não é mais oferecido para etapas novas, mas continua exibido nas etapas existentes.
 */
export type TipoEtapa = 'YouTube' | 'Video' | 'Documento' | 'Conteudo' | 'Link';
export type RegraConclusao = 'Manual' | 'PercentualAssistido' | 'AbrirConteudo';
export type StatusMatricula = 'EmAndamento' | 'Concluida';

const TIPOS: TipoEtapa[] = ['YouTube', 'Video', 'Documento', 'Conteudo', 'Link'];
const REGRAS: RegraConclusao[] = ['Manual', 'PercentualAssistido', 'AbrirConteudo'];

export const PERCENTUAL_MINIMO_PADRAO: number = 90;
export const LIMITE_COMENTARIO: number = 1000;
const MS_DIA: number = 24 * 60 * 60 * 1000;

export interface IJornada {
  id: number;
  areaId: number;
  titulo: string;
  descricao: string;
  capa: string;
  categoria: string;
  /** Logins do público específico. Vazio = todos os Usuários da área. */
  publico: string[];
  obrigatoria: boolean;
  prazoDias?: number;
  ordemLivre: boolean;
  dataPublicacao?: string;
}

export interface IEtapa {
  id: number;
  jornadaId: number;
  titulo: string;
  ordem: number;
  tipo: TipoEtapa;
  url: string;
  /** HTML sanitizado da etapa do tipo Conteudo (vazio nos demais tipos). */
  conteudo?: string;
  duracaoMin: number;
  instrucoes: string;
  regra: RegraConclusao;
  percentualMinimo: number;
  criadaEm?: string;
}

/** Progresso de uma etapa no JSON da matrícula: status, posição (s), percentual assistido, conclusão. */
export interface IProgressoEtapa {
  s: 'iniciada' | 'concluida';
  p?: number;
  pct?: number;
  c?: string;
}

export type MapaProgresso = Record<string, IProgressoEtapa>;

export interface IMatricula {
  id?: number;
  chave: string;
  jornadaId: number;
  etapaAtualId?: number;
  progresso: MapaProgresso;
  percentual: number;
  status: StatusMatricula;
  dataInicio?: string;
  ultimoAcesso?: string;
  concluidaEm?: string;
}

export type EstadoEtapa = 'concluida' | 'disponivel' | 'bloqueada';

export const tipoEtapaDe = (valor: string | undefined): TipoEtapa =>
  TIPOS.indexOf(valor as TipoEtapa) !== -1 ? (valor as TipoEtapa) : 'Link';

export const regraDe = (valor: string | undefined): RegraConclusao =>
  REGRAS.indexOf(valor as RegraConclusao) !== -1 ? (valor as RegraConclusao) : 'Manual';

export const chaveMatricula = (jornadaId: number, usuarioId: number): string => `${jornadaId}-${usuarioId}`;
export const chaveCurtida = (etapaId: number, usuarioId: number): string => `${etapaId}-${usuarioId}`;

const numeroValido = (valor: unknown): valor is number => typeof valor === 'number' && isFinite(valor) && valor >= 0;

/** Lê o JSON gravado na matrícula. Conteúdo inválido ou fora do formato é ignorado, nunca quebra a tela. */
export const lerProgresso = (json: string | undefined): MapaProgresso => {
  if (!json) {
    return {};
  }
  let bruto: unknown;
  try {
    bruto = JSON.parse(json);
  } catch {
    return {};
  }
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) {
    return {};
  }
  const mapa: MapaProgresso = {};
  Object.keys(bruto as Record<string, unknown>).forEach((chave: string) => {
    const item: Partial<IProgressoEtapa> = (bruto as Record<string, Partial<IProgressoEtapa>>)[chave];
    if (!/^\d+$/.test(chave) || !item || (item.s !== 'iniciada' && item.s !== 'concluida')) {
      return;
    }
    mapa[chave] = {
      s: item.s,
      ...(numeroValido(item.p) ? { p: Math.floor(item.p) } : {}),
      ...(numeroValido(item.pct) ? { pct: Math.min(100, Math.round(item.pct)) } : {}),
      ...(typeof item.c === 'string' ? { c: item.c } : {})
    };
  });
  return mapa;
};

export const ordenarEtapas = (etapas: IEtapa[]): IEtapa[] =>
  etapas.slice().sort((a: IEtapa, b: IEtapa) => a.ordem - b.ordem || a.id - b.id);

export const concluida = (progresso: MapaProgresso, etapa: IEtapa): boolean => progresso[String(etapa.id)]?.s === 'concluida';

export const etapasConcluidas = (etapas: IEtapa[], progresso: MapaProgresso): number =>
  etapas.filter((etapa: IEtapa) => concluida(progresso, etapa)).length;

export const percentualConcluido = (etapas: IEtapa[], progresso: MapaProgresso): number =>
  etapas.length === 0 ? 0 : Math.round((etapasConcluidas(etapas, progresso) / etapas.length) * 100);

/**
 * Jornada alterada depois de publicada: para quem já concluiu, etapas criadas depois da conclusão são
 * novidades opcionais e não reabrem a matrícula.
 */
export const novidade = (etapa: IEtapa, matricula: IMatricula | undefined): boolean =>
  !!matricula &&
  matricula.status === 'Concluida' &&
  !!matricula.concluidaEm &&
  !!etapa.criadaEm &&
  new Date(etapa.criadaEm).getTime() > new Date(matricula.concluidaEm).getTime();

/** Estado de cada etapa (ordenadas): com ordem obrigatória, a próxima só libera após a anterior. */
export const estadosEtapas = (etapas: IEtapa[], progresso: MapaProgresso, ordemLivre: boolean): EstadoEtapa[] => {
  let anteriorConcluida: boolean = true;
  return etapas.map((etapa: IEtapa) => {
    const feita: boolean = concluida(progresso, etapa);
    const estado: EstadoEtapa = feita ? 'concluida' : ordemLivre || anteriorConcluida ? 'disponivel' : 'bloqueada';
    anteriorConcluida = anteriorConcluida && feita;
    return estado;
  });
};

/** Concluir etapa liberado conforme a regra da etapa. */
export const podeConcluir = (etapa: IEtapa, progresso: MapaProgresso): boolean => {
  const atual: IProgressoEtapa | undefined = progresso[String(etapa.id)];
  if (atual?.s === 'concluida') {
    return false;
  }
  switch (etapa.regra) {
    case 'PercentualAssistido':
      return (atual?.pct ?? 0) >= (etapa.percentualMinimo || PERCENTUAL_MINIMO_PADRAO);
    case 'AbrirConteudo':
      return !!atual;
    default:
      return true;
  }
};

/** Registra posição e percentual assistido. O percentual nunca diminui; etapa concluída continua concluída. */
export const registrarPosicao = (progresso: MapaProgresso, etapaId: number, posicaoSeg: number, pct: number): MapaProgresso => {
  const chave: string = String(etapaId);
  const atual: IProgressoEtapa | undefined = progresso[chave];
  return {
    ...progresso,
    [chave]: {
      ...atual,
      s: atual?.s === 'concluida' ? 'concluida' : 'iniciada',
      p: Math.max(0, Math.floor(posicaoSeg)),
      pct: Math.max(atual?.pct ?? 0, Math.min(100, Math.round(pct)))
    }
  };
};

/** Marca a etapa como aberta (sem posição), se ainda não houver registro. */
export const registrarAbertura = (progresso: MapaProgresso, etapaId: number): MapaProgresso =>
  progresso[String(etapaId)] ? progresso : { ...progresso, [String(etapaId)]: { s: 'iniciada' } };

export const concluirEtapa = (progresso: MapaProgresso, etapaId: number, agora: Date): MapaProgresso => ({
  ...progresso,
  [String(etapaId)]: { ...progresso[String(etapaId)], s: 'concluida', c: agora.toISOString() }
});

/**
 * Recalcula percentual, status e etapa atual depois de uma mudança. Com 100%, a matrícula fica Concluída.
 * Uma matrícula já concluída continua concluída (etapas novas são novidade opcional).
 */
export const recalcular = (matricula: IMatricula, etapas: IEtapa[], agora: Date): IMatricula => {
  const ordenadas: IEtapa[] = ordenarEtapas(etapas);
  const percentual: number = percentualConcluido(ordenadas, matricula.progresso);
  const jaConcluida: boolean = matricula.status === 'Concluida';
  const terminou: boolean = jaConcluida || (ordenadas.length > 0 && percentual === 100);
  const pendente: IEtapa | undefined = ordenadas.find((etapa: IEtapa) => !concluida(matricula.progresso, etapa));
  return {
    ...matricula,
    percentual: jaConcluida ? Math.max(percentual, matricula.percentual) : percentual,
    status: terminou ? 'Concluida' : 'EmAndamento',
    concluidaEm: terminou ? matricula.concluidaEm ?? agora.toISOString() : undefined,
    etapaAtualId: pendente?.id ?? ordenadas[ordenadas.length - 1]?.id,
    ultimoAcesso: agora.toISOString()
  };
};

/** Etapa para "Continuar de onde parei": a atual gravada, se ainda existir; senão a primeira pendente. */
export const etapaParaContinuar = (etapas: IEtapa[], matricula: IMatricula | undefined): IEtapa | undefined => {
  const ordenadas: IEtapa[] = ordenarEtapas(etapas);
  if (!matricula) {
    return ordenadas[0];
  }
  return (
    ordenadas.find((etapa: IEtapa) => etapa.id === matricula.etapaAtualId) ??
    ordenadas.find((etapa: IEtapa) => !concluida(matricula.progresso, etapa)) ??
    ordenadas[0]
  );
};

/** Próxima etapa depois da atual, na ordem. */
export const proximaEtapa = (etapas: IEtapa[], atualId: number): IEtapa | undefined => {
  const ordenadas: IEtapa[] = ordenarEtapas(etapas);
  const indice: number = ordenadas.findIndex((etapa: IEtapa) => etapa.id === atualId);
  return indice === -1 ? undefined : ordenadas[indice + 1];
};

/** Data limite = data de publicação + PrazoDias (decisão de 27/11/2026). */
export const dataLimite = (jornada: IJornada): Date | undefined => {
  if (!jornada.prazoDias || jornada.prazoDias <= 0 || !jornada.dataPublicacao) {
    return undefined;
  }
  const publicacao: number = new Date(jornada.dataPublicacao).getTime();
  return isNaN(publicacao) ? undefined : new Date(publicacao + jornada.prazoDias * MS_DIA);
};

export const atrasada = (jornada: IJornada, matricula: IMatricula | undefined, agora: Date): boolean => {
  const limite: Date | undefined = dataLimite(jornada);
  return !!limite && matricula?.status !== 'Concluida' && agora.getTime() > limite.getTime();
};

/** Avaliação liberada após concluir ao menos metade das etapas. */
export const avaliacaoLiberada = (etapas: IEtapa[], progresso: MapaProgresso): boolean =>
  etapas.length > 0 && etapasConcluidas(etapas, progresso) >= Math.ceil(etapas.length / 2);

/** Público específico gravado como JSON: lista de logins (ou objetos com loginName). */
export const lerPublico = (json: string | undefined): string[] => {
  if (!json) {
    return [];
  }
  try {
    const bruto: unknown = JSON.parse(json);
    if (!Array.isArray(bruto)) {
      return [];
    }
    return bruto
      .map((item: unknown) => (typeof item === 'string' ? item : (item as { loginName?: unknown })?.loginName))
      .filter((login: unknown): login is string => typeof login === 'string' && login.trim() !== '');
  } catch {
    return [];
  }
};

/** Vazio = todos da área. A permissão real é do SharePoint; este filtro só organiza a tela. */
export const publicoInclui = (jornada: IJornada, loginName: string): boolean =>
  jornada.publico.length === 0 ||
  jornada.publico.some((login: string) => login.toLowerCase() === loginName.toLowerCase());

export interface IResumoAvaliacoes {
  media: number;
  total: number;
  /** Quantidade por nota, índice 0 = 1 estrela ... índice 4 = 5 estrelas. */
  distribuicao: number[];
}

export const resumirAvaliacoes = (notas: number[]): IResumoAvaliacoes => {
  const validas: number[] = notas.filter((nota: number) => Number.isInteger(nota) && nota >= 1 && nota <= 5);
  const distribuicao: number[] = [0, 0, 0, 0, 0];
  validas.forEach((nota: number) => {
    distribuicao[nota - 1] += 1;
  });
  const soma: number = validas.reduce((total: number, nota: number) => total + nota, 0);
  return {
    media: validas.length === 0 ? 0 : Math.round((soma / validas.length) * 10) / 10,
    total: validas.length,
    distribuicao
  };
};

/** Horas de aprendizado: soma da duração das etapas concluídas. */
export const minutosConcluidos = (etapas: IEtapa[], progresso: MapaProgresso): number =>
  etapas.filter((etapa: IEtapa) => concluida(progresso, etapa)).reduce((total: number, etapa: IEtapa) => total + (etapa.duracaoMin || 0), 0);
