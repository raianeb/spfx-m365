// Testes das regras de progresso, prazo, avaliação e conteúdo (escopo, seção 3).
import {
  IEtapa,
  IJornada,
  IMatricula,
  atrasada,
  avaliacaoLiberada,
  concluirEtapa,
  dataLimite,
  estadosEtapas,
  etapaParaContinuar,
  lerProgresso,
  lerPublico,
  minutosConcluidos,
  novidade,
  podeConcluir,
  proximaEtapa,
  publicoInclui,
  recalcular,
  registrarAbertura,
  registrarPosicao,
  resumirAvaliacoes
} from './progresso';
import { idDoYoutube, mesmoHost, tipoDocumento, urlEmbedDocumento, urlEmbedYoutube, urlSegura } from './conteudo';

const etapa = (id: number, ordem: number, extra: Partial<IEtapa> = {}): IEtapa => ({
  id,
  jornadaId: 1,
  titulo: `Etapa ${id}`,
  ordem,
  tipo: 'YouTube',
  url: '',
  duracaoMin: 10,
  instrucoes: '',
  regra: 'Manual',
  percentualMinimo: 0,
  ...extra
});

const jornada = (extra: Partial<IJornada> = {}): IJornada => ({
  id: 1,
  areaId: 1,
  titulo: 'J',
  descricao: '',
  capa: '',
  categoria: '',
  publico: [],
  obrigatoria: false,
  ordemLivre: false,
  ...extra
});

const matricula = (extra: Partial<IMatricula> = {}): IMatricula => ({
  chave: '1-7',
  jornadaId: 1,
  progresso: {},
  percentual: 0,
  status: 'EmAndamento',
  ...extra
});

const AGORA: Date = new Date('2026-12-01T12:00:00Z');
const ETAPAS: IEtapa[] = [etapa(30, 3), etapa(10, 1), etapa(20, 2)];

describe('JSON de progresso', () => {
  it('ignora conteúdo inválido sem quebrar', () => {
    expect(lerProgresso('não é json')).toEqual({});
    expect(lerProgresso('[1,2]')).toEqual({});
    expect(lerProgresso('{"x":{"s":"concluida"},"5":{"s":"outro"},"6":{"s":"iniciada","p":12.7,"pct":140}}')).toEqual({
      6: { s: 'iniciada', p: 12, pct: 100 }
    });
  });
});

describe('ordem e liberação', () => {
  it('com ordem obrigatória, só a primeira pendente fica disponível', () => {
    const ordenadas: IEtapa[] = [etapa(10, 1), etapa(20, 2), etapa(30, 3)];
    const progresso = concluirEtapa({}, 10, AGORA);
    expect(estadosEtapas(ordenadas, progresso, false)).toEqual(['concluida', 'disponivel', 'bloqueada']);
    expect(estadosEtapas(ordenadas, progresso, true)).toEqual(['concluida', 'disponivel', 'disponivel']);
  });

  it('próxima etapa segue a ordem, não o ID', () => {
    expect(proximaEtapa(ETAPAS, 10)?.id).toBe(20);
    expect(proximaEtapa(ETAPAS, 30)).toBeUndefined();
  });
});

describe('regra de conclusão', () => {
  it('Percentual assistido exige o mínimo', () => {
    const video: IEtapa = etapa(1, 1, { regra: 'PercentualAssistido', percentualMinimo: 80 });
    expect(podeConcluir(video, registrarPosicao({}, 1, 100, 79))).toBe(false);
    expect(podeConcluir(video, registrarPosicao({}, 1, 120, 80))).toBe(true);
  });

  it('Abrir conteúdo exige ter aberto a etapa', () => {
    const link: IEtapa = etapa(2, 1, { regra: 'AbrirConteudo' });
    expect(podeConcluir(link, {})).toBe(false);
    expect(podeConcluir(link, registrarAbertura({}, 2))).toBe(true);
  });

  it('percentual assistido nunca diminui e etapa concluída continua concluída', () => {
    let progresso = registrarPosicao({}, 1, 300, 60);
    progresso = registrarPosicao(progresso, 1, 30, 10);
    expect(progresso['1']).toEqual({ s: 'iniciada', p: 30, pct: 60 });
    progresso = concluirEtapa(progresso, 1, AGORA);
    progresso = registrarPosicao(progresso, 1, 5, 5);
    expect(progresso['1'].s).toBe('concluida');
  });
});

describe('recalcular matrícula', () => {
  it('avança a etapa atual e conclui com 100%', () => {
    let atual: IMatricula = recalcular(matricula({ progresso: concluirEtapa({}, 10, AGORA) }), ETAPAS, AGORA);
    expect(atual.percentual).toBe(33);
    expect(atual.etapaAtualId).toBe(20);
    expect(atual.status).toBe('EmAndamento');
    atual = recalcular({ ...atual, progresso: concluirEtapa(concluirEtapa(atual.progresso, 20, AGORA), 30, AGORA) }, ETAPAS, AGORA);
    expect(atual.status).toBe('Concluida');
    expect(atual.percentual).toBe(100);
    expect(atual.concluidaEm).toBe(AGORA.toISOString());
  });

  it('etapa nova depois da conclusão é novidade e não reabre a matrícula', () => {
    const feita: IMatricula = matricula({ status: 'Concluida', percentual: 100, concluidaEm: '2026-11-01T00:00:00Z' });
    const nova: IEtapa = etapa(40, 4, { criadaEm: '2026-11-20T00:00:00Z' });
    expect(novidade(nova, feita)).toBe(true);
    const depois: IMatricula = recalcular(feita, [...ETAPAS, nova], AGORA);
    expect(depois.status).toBe('Concluida');
    expect(depois.percentual).toBe(100);
  });

  it('continuar de onde parei usa a etapa atual gravada', () => {
    expect(etapaParaContinuar(ETAPAS, matricula({ etapaAtualId: 30 }))?.id).toBe(30);
    expect(etapaParaContinuar(ETAPAS, undefined)?.id).toBe(10);
  });
});

describe('prazo pela data de publicação', () => {
  it('calcula a data limite e o atraso', () => {
    const j: IJornada = jornada({ prazoDias: 10, dataPublicacao: '2026-11-01T12:00:00Z' });
    expect(dataLimite(j)?.toISOString()).toBe('2026-11-11T12:00:00.000Z');
    expect(atrasada(j, undefined, AGORA)).toBe(true);
    expect(atrasada(j, matricula({ status: 'Concluida' }), AGORA)).toBe(false);
    expect(atrasada(jornada({ dataPublicacao: '2026-11-01T12:00:00Z' }), undefined, AGORA)).toBe(false);
  });
});

describe('avaliação e engajamento', () => {
  it('avaliação liberada com metade das etapas concluídas', () => {
    expect(avaliacaoLiberada(ETAPAS, concluirEtapa({}, 10, AGORA))).toBe(false);
    expect(avaliacaoLiberada(ETAPAS, concluirEtapa(concluirEtapa({}, 10, AGORA), 20, AGORA))).toBe(true);
  });

  it('resume notas válidas', () => {
    expect(resumirAvaliacoes([5, 4, 4, 9, 0])).toEqual({ media: 4.3, total: 3, distribuicao: [0, 0, 0, 2, 1] });
    expect(resumirAvaliacoes([]).media).toBe(0);
  });

  it('horas de aprendizado somam etapas concluídas', () => {
    expect(minutosConcluidos(ETAPAS, concluirEtapa({}, 20, AGORA))).toBe(10);
  });
});

describe('público específico', () => {
  it('vazio vale para todos; preenchido só para os logins', () => {
    expect(publicoInclui(jornada(), 'i:0#.f|membership|ana@x.com')).toBe(true);
    const j: IJornada = jornada({ publico: lerPublico('[{"loginName":"i:0#.f|membership|ANA@x.com"}]') });
    expect(publicoInclui(j, 'i:0#.f|membership|ana@x.com')).toBe(true);
    expect(publicoInclui(j, 'i:0#.f|membership|bia@x.com')).toBe(false);
    expect(lerPublico('quebrado')).toEqual([]);
  });
});

describe('conteúdo', () => {
  const SITE: string = 'https://tenant.sharepoint.com/sites/hub';

  it('extrai o ID do YouTube dos formatos usuais e recusa o resto', () => {
    expect(idDoYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe('dQw4w9WgXcQ');
    expect(idDoYoutube('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(idDoYoutube('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(idDoYoutube('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('');
    expect(idDoYoutube('https://evil.com/watch?v=dQw4w9WgXcQ')).toBe('');
    expect(urlEmbedYoutube('dQw4w9WgXcQ', 42, 'https://tenant.sharepoint.com')).toContain('start=42');
  });

  it('só aceita https', () => {
    // Montado em partes para não disparar a regra de lint no-script-url no próprio teste.
    expect(urlSegura(['java', 'script:alert(1)'].join(''), SITE)).toBe('');
    expect(urlSegura('http://x.com', SITE)).toBe('');
    expect(urlSegura('/sites/hub/FIN_Conteudos/a.mp4', SITE)).toBe('https://tenant.sharepoint.com/sites/hub/FIN_Conteudos/a.mp4');
    expect(mesmoHost('https://tenant.sharepoint.com/x.mp4', SITE)).toBe(true);
    expect(mesmoHost('https://outro.com/x.mp4', SITE)).toBe(false);
  });

  it('documento: PDF direto, Office com web=1, outros sem embutir', () => {
    expect(tipoDocumento('https://t.sharepoint.com/a/Manual.PDF')).toBe('pdf');
    expect(urlEmbedDocumento('https://t.sharepoint.com/a/b.docx')).toBe('https://t.sharepoint.com/a/b.docx?web=1');
    expect(urlEmbedDocumento('https://t.sharepoint.com/a/b.zip')).toBe('');
  });
});
