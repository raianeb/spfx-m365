// Testes do domínio puro (nomes, catálogo, permissões, papéis). Rodam no build: heft test.
import { IPrefixosListas } from '../core/prefixos';
import {
  nomeGrupoAdministradores,
  nomeGrupoDaArea,
  nomeListaAreas,
  nomeListaDaArea,
  normalizarSigla,
  validarSigla
} from './nomes';
import { CATALOGO_AREA, xmlDoCampo } from './catalogoArea';
import { MATRIZ_PERMISSOES, NivelPadrao } from './permissoes';
import { abasVisiveis, areaDe, corSegura, iconeSeguro, papeisDaArea, papeisPorPermissao } from './modelo';

// O build do SPFx não inclui os tipos do Node; o Jest roda em CommonJS e oferece require.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: (modulo: string) => any;
const fs: { readFileSync: (arquivo: string, codificacao: string) => string } = require('fs');
const path: { join: (...partes: string[]) => string } = require('path');
const pastaDoProjeto: string = (process as unknown as { cwd: () => string }).cwd();

const PADRAO: IPrefixosListas = { HML: 'HML_', PROD: '' };

describe('nomes por ambiente (HML_<Nome> / <Nome>)', () => {
  it('lista central', () => {
    expect(nomeListaAreas('PROD', PADRAO)).toBe('JornadaAreas');
    expect(nomeListaAreas('HML', PADRAO)).toBe('HML_JornadaAreas');
  });

  it('listas da área', () => {
    expect(nomeListaDaArea('FIN', 'Jornadas', 'PROD', PADRAO)).toBe('FIN_Jornadas');
    expect(nomeListaDaArea('FIN', 'Conteudos', 'HML', PADRAO)).toBe('HML_FIN_Conteudos');
  });

  it('grupos', () => {
    expect(nomeGrupoAdministradores('PROD', PADRAO)).toBe('Jornadas – Administradores');
    expect(nomeGrupoAdministradores('HML', PADRAO)).toBe('HML_Jornadas – Administradores');
    expect(nomeGrupoDaArea('FIN', 'Usuarios', 'HML', PADRAO)).toBe('HML_Jornadas – FIN – Usuários');
    expect(nomeGrupoDaArea('TI', 'Gestores', 'PROD', PADRAO)).toBe('Jornadas – TI – Gestores');
  });

  it('HML sem prefixo próprio não resolve nome (nunca cai em PROD)', () => {
    expect(nomeListaAreas('HML', { HML: '', PROD: '' })).toBe('');
    expect(nomeGrupoAdministradores('HML', { HML: 'X_', PROD: 'X_' })).toBe('');
  });
});

describe('sigla', () => {
  it('normaliza acentos, espaços e caixa', () => {
    expect(normalizarSigla(' fín-2 ')).toBe('FIN2');
  });

  it('valida formato e duplicidade', () => {
    expect(validarSigla('FIN', [])).toBe('');
    expect(validarSigla('F', [])).not.toBe('');
    expect(validarSigla('1AB', [])).not.toBe('');
    expect(validarSigla('FIN', ['fin'])).toContain('Já existe');
  });
});

describe('catálogo da área', () => {
  it('é igual a definicao.json → listasPorArea', () => {
    const arquivo: string = path.join(pastaDoProjeto, 'provisionamento', 'definicao.json');
    const definicao: { listasPorArea: unknown[] } = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    expect(JSON.parse(JSON.stringify(CATALOGO_AREA))).toEqual(definicao.listasPorArea);
  });

  it('gera XML de todos os campos não nativos', () => {
    CATALOGO_AREA.forEach((lista) =>
      lista.campos
        .filter((campo) => !campo.nativo)
        .forEach((campo) => expect(xmlDoCampo(campo)).toContain(`Name="${campo.nome}"`))
    );
  });

  it('texto com formatação usa RichText Compatible', () => {
    expect(xmlDoCampo({ nome: 'Instrucoes', rotulo: 'x', tipo: 'Note', formatacao: true })).toContain(
      'RichTextMode="Compatible"'
    );
  });

  it('todas as listas têm matriz de permissões', () => {
    CATALOGO_AREA.forEach((lista) => expect(MATRIZ_PERMISSOES[lista.base]).toBeDefined());
  });
});

describe('permissões padrão', () => {
  it('só usa níveis padrão do SharePoint', () => {
    const permitidos: number[] = [
      NivelPadrao.Leitura,
      NivelPadrao.Contribuir,
      NivelPadrao.Design,
      NivelPadrao.Editar,
      NivelPadrao.ControleTotal
    ];
    Object.keys(MATRIZ_PERMISSOES).forEach((base: string) => {
      const matriz = MATRIZ_PERMISSOES[base as keyof typeof MATRIZ_PERMISSOES];
      [matriz.Gestores, matriz.Apoio, matriz.Usuarios].forEach((nivel) => expect(permitidos).toContain(nivel));
    });
  });

  it('Gestor aprova jornadas e lê matrículas; Usuário só lê o conteúdo', () => {
    expect(MATRIZ_PERMISSOES.Jornadas.Gestores).toBe(NivelPadrao.Design);
    expect(MATRIZ_PERMISSOES.Matriculas.Gestores).toBe(NivelPadrao.Editar);
    expect(MATRIZ_PERMISSOES.Jornadas.Usuarios).toBe(NivelPadrao.Leitura);
  });
});

describe('papéis por permissão efetiva', () => {
  const leitura = { High: 0, Low: 0x1 };
  const contribuir = { High: 0, Low: 0x1 | 0x2 | 0x4 | 0x8 };
  const design = { High: 0, Low: 0x1 | 0x2 | 0x4 | 0x8 | 0x10 };

  it('detecta Usuário, Apoio e Gestor', () => {
    expect(papeisPorPermissao(leitura)).toEqual({ gestor: false, apoio: false, usuario: true });
    expect(papeisPorPermissao(contribuir)).toEqual({ gestor: false, apoio: true, usuario: true });
    expect(papeisPorPermissao(design)).toEqual({ gestor: true, apoio: false, usuario: true });
    expect(papeisPorPermissao(undefined)).toEqual({ gestor: false, apoio: false, usuario: false });
  });

  it('abas por perfil', () => {
    expect(abasVisiveis(false, [papeisPorPermissao(leitura)])).toEqual(['minhas']);
    expect(abasVisiveis(false, [papeisPorPermissao(contribuir)])).toEqual(['minhas', 'estudio']);
    expect(abasVisiveis(true, [papeisPorPermissao(design)])).toEqual(['minhas', 'gestao', 'estudio', 'administracao']);
    expect(abasVisiveis(false, [], true)).toEqual(['minhas', 'administracao']);
  });

  it('Controle Total na lista (dono do site) não vira Gestor sem estar no grupo da área', () => {
    const controleTotal = { High: 0x7fffffff, Low: 0xffffffff };
    const nenhum = { gestores: false, apoio: false };
    expect(papeisDaArea(controleTotal, nenhum, false)).toEqual({ gestor: false, apoio: false, usuario: true });
    expect(abasVisiveis(false, [papeisDaArea(controleTotal, nenhum, false)])).toEqual(['minhas']);
    expect(papeisDaArea(controleTotal, { gestores: false, apoio: true }, false)).toEqual({ gestor: false, apoio: true, usuario: true });
    expect(papeisDaArea(controleTotal, { gestores: true, apoio: false }, false).gestor).toBe(true);
    expect(papeisDaArea(controleTotal, nenhum, true).gestor).toBe(true);
    // Sem Controle Total vale a permissão efetiva (grupos do Entra ID dentro dos grupos da área).
    expect(papeisDaArea(design, nenhum, false).gestor).toBe(true);
  });
});

describe('dados editáveis seguros na tela', () => {
  it('cor e ícone fora do formato voltam ao padrão', () => {
    expect(corSegura('red;background:url(x)')).toBe('#0F6CBD');
    expect(corSegura('#A1B2C3')).toBe('#A1B2C3');
    expect(iconeSeguro('<script>')).toBe('Education');
  });

  it('status desconhecido vira Erro', () => {
    const area = areaDe({
      Id: 1,
      Title: 'Financeiro',
      Sigla: 'fin',
      Status: 'Outro',
      GrupoApoioId: 0,
      GrupoUsuariosId: 7
    });
    expect(area.status).toBe('Erro');
    expect(area.sigla).toBe('FIN');
    expect(area.grupoApoioId).toBeUndefined();
    expect(area.grupoUsuariosId).toBe(7);
  });
});
