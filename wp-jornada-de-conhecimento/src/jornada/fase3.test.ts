// Testes do Estúdio (publicação, validação, ordem) e da Gestão (mapa, painel, CSV).
import { IEtapa, IJornada } from './progresso';
import { Moderacao, arquivoCombina, lerPublicoDetalhado, moverEtapa, situacaoPublicacao, validarEtapa, validarJornada } from './estudio';
import { IMatriculaPessoa, IPessoaArea, calcularPainel, celulaCsv, faixaCalor, gerarCsv, juntarPessoas, montarCelulas } from './gestao';

const SITE: string = 'https://tenant.sharepoint.com/sites/hub';
const AGORA: Date = new Date('2026-12-01T12:00:00Z');

describe('situação de publicação', () => {
  it('combina Status e aprovação nativa', () => {
    expect(situacaoPublicacao('Rascunho', Moderacao.Pendente, false)).toBe('rascunho');
    expect(situacaoPublicacao('EmAprovacao', Moderacao.Pendente, false)).toBe('emAprovacao');
    expect(situacaoPublicacao('EmAprovacao', Moderacao.Pendente, true)).toBe('alteracoesPendentes');
    expect(situacaoPublicacao('Rascunho', Moderacao.Rejeitado, false)).toBe('devolvida');
    expect(situacaoPublicacao('Publicada', Moderacao.Aprovado, true)).toBe('publicada');
    expect(situacaoPublicacao('Arquivada', Moderacao.Aprovado, true)).toBe('arquivada');
  });
});

describe('validação do editor', () => {
  it('jornada: nome obrigatório, capa https, prazo inteiro', () => {
    expect(validarJornada({ titulo: ' ', capa: '', prazoDias: undefined }, SITE).titulo).toBeDefined();
    expect(validarJornada({ titulo: 'A', capa: 'http://x.com/a.png', prazoDias: 0 }, SITE)).toEqual({
      capa: 'Use um endereço https.',
      prazoDias: 'Informe um número de dias entre 1 e 3650, ou deixe vazio para sem prazo.'
    });
    expect(validarJornada({ titulo: 'A', capa: '', prazoDias: 30 }, SITE)).toEqual({});
  });

  it('etapa: URL conforme o tipo e percentual só em vídeo', () => {
    const base = { titulo: 'E', duracaoMin: 5, percentualMinimo: 90 };
    expect(validarEtapa({ ...base, tipo: 'YouTube', url: 'https://x.com', regra: 'Manual' }, SITE).url).toContain('YouTube');
    expect(validarEtapa({ ...base, tipo: 'Video', url: 'https://outro.com/v.mp4', regra: 'Manual' }, SITE).url).toContain('biblioteca');
    expect(validarEtapa({ ...base, tipo: 'Link', url: 'https://x.com', regra: 'PercentualAssistido' }, SITE).regra).toBeDefined();
    expect(validarEtapa({ ...base, tipo: 'YouTube', url: 'https://youtu.be/dQw4w9WgXcQ', regra: 'PercentualAssistido' }, SITE)).toEqual({});
  });

  it('move etapas e renumera a ordem', () => {
    const etapas = [{ id: 1, ordem: 1 }, { id: 2, ordem: 2 }, { id: 3, ordem: 3 }];
    expect(moverEtapa(etapas, 2, -1).map((e) => [e.id, e.ordem])).toEqual([[1, 10], [3, 20], [2, 30]]);
    expect(moverEtapa(etapas, 0, -1)).toBe(etapas);
  });

  it('público com nomes, compatível com a lista simples de logins', () => {
    expect(lerPublicoDetalhado('["a@x"]')).toEqual([{ loginName: 'a@x', nome: 'a@x' }]);
    expect(lerPublicoDetalhado('[{"loginName":"b@x","nome":"Bia"},{"x":1}]')).toEqual([{ loginName: 'b@x', nome: 'Bia' }]);
    expect(lerPublicoDetalhado('{')).toEqual([]);
  });

  it('arquivo da biblioteca combina com o tipo', () => {
    expect(arquivoCombina('Aula.MP4', 'Video')).toBe(true);
    expect(arquivoCombina('Aula.mp4', 'Documento')).toBe(false);
    expect(arquivoCombina('x.pdf', 'Link')).toBe(false);
  });

  it('etapa de texto e imagens exige conteúdo, não endereço', () => {
    const base = { titulo: 'Leitura', tipo: 'Conteudo' as const, url: '', duracaoMin: 10, regra: 'AbrirConteudo' as const, percentualMinimo: 0 };
    expect(validarEtapa({ ...base, conteudo: '' }, SITE).conteudo).toBeDefined();
    expect(validarEtapa({ ...base, conteudo: '<p>Olá</p>' }, SITE)).toEqual({});
    expect(validarEtapa({ ...base, conteudo: 'x'.repeat(60001) }, SITE).conteudo).toBeDefined();
  });
});

describe('gestão da área', () => {
  const pessoa = (nome: string): IPessoaArea => ({ nome, email: `${nome}@x.com`, loginName: `i:0#.f|membership|${nome}@x.com` });
  const etapa = (id: number): IEtapa => ({
    id,
    jornadaId: 1,
    titulo: '',
    ordem: id,
    tipo: 'Link',
    url: '',
    duracaoMin: 30,
    instrucoes: '',
    regra: 'Manual',
    percentualMinimo: 0
  });
  const jornada = (id: number, extra: Partial<IJornada> = {}): IJornada => ({
    id,
    areaId: 1,
    titulo: `J${id}`,
    descricao: '',
    capa: '',
    categoria: '',
    publico: [],
    obrigatoria: false,
    ordemLivre: true,
    ...extra
  });
  const ana: IPessoaArea = pessoa('ana');
  const bia: IPessoaArea = pessoa('bia');
  const caio: IPessoaArea = pessoa('caio');
  const etapas: Map<number, IEtapa[]> = new Map<number, IEtapa[]>([[1, [etapa(1), etapa(2)]], [2, [etapa(3)]]]);
  const matriculas: IMatriculaPessoa[] = [
    { pessoa: ana, chave: '1-1', jornadaId: 1, progresso: { 1: { s: 'concluida' } }, percentual: 50, status: 'EmAndamento' },
    { pessoa: caio, chave: '1-3', jornadaId: 1, progresso: { 1: { s: 'concluida' }, 2: { s: 'concluida' } }, percentual: 100, status: 'Concluida' }
  ];
  const jornadas: IJornada[] = [jornada(1, { prazoDias: 5, dataPublicacao: '2026-11-01T00:00:00Z' }), jornada(2, { publico: [ana.loginName] })];

  it('junta membros e quem tem matrícula, sem duplicar pelo login', () => {
    const anaMaiuscula: IPessoaArea = { ...ana, loginName: ana.loginName.toUpperCase() };
    expect(juntarPessoas([anaMaiuscula, bia], matriculas).map((p) => p.nome)).toEqual(['ana', 'bia', 'caio']);
  });

  it('monta o mapa respeitando o público específico e calcula o painel', () => {
    const pessoas: IPessoaArea[] = juntarPessoas([ana, bia], matriculas);
    const celulas = montarCelulas(pessoas, jornadas, etapas, matriculas, AGORA);
    expect(celulas[0].map((c) => c.percentual)).toEqual([50, 0]);
    expect(celulas[1][1].naoSeAplica).toBe(true);
    expect(faixaCalor(celulas[2][0])).toBe('completa');
    expect(faixaCalor(celulas[1][0])).toBe('zero');
    const painel = calcularPainel(celulas, etapas);
    expect(painel).toEqual({ pessoas: 3, adesao: 67, conclusaoMedia: 38, atrasados: 2, horas: 1.5, concluidas: 1 });
  });

  it('CSV neutraliza fórmulas e escapa aspas', () => {
    expect(celulaCsv('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(gerarCsv(['A'], [[1]])).toBe('﻿"A"\r\n"1"');
  });
});
