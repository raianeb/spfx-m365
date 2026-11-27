// Skills aplicadas: spfx-configuracao-webpart (ambiente e prefixos), sharepoint-dados-listas (nomes físicos).
// Módulo puro: sem dependência do SharePoint, testável com Jest.
import { AmbienteLista, IPrefixosListas, nomeFisico } from '../core/prefixos';

/** Nome base da lista central (definicao.json → listas). */
export const LISTA_AREAS: string = 'JornadaAreas';

/** Nome base dos grupos. Padrão da equipe: HML_<Nome> em HML e <Nome> em PROD. */
const GRUPO_BASE: string = 'Jornadas';
const SEPARADOR: string = ' – ';

export type PapelGrupo = 'Gestores' | 'Apoio' | 'Usuarios';

const ROTULO_GRUPO: Record<PapelGrupo, string> = {
  Gestores: 'Gestores',
  Apoio: 'Apoio',
  Usuarios: 'Usuários'
};

/** Sigla: 2 a 10 caracteres, letras maiúsculas sem acento e números, começando por letra. */
const SIGLA_VALIDA: RegExp = /^[A-Z][A-Z0-9]{1,9}$/;

export const normalizarSigla = (valor: string): string =>
  valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();

/** Mensagem de erro da sigla, ou vazio quando válida. */
export const validarSigla = (sigla: string, existentes: string[]): string => {
  if (!SIGLA_VALIDA.test(sigla)) {
    return 'Use de 2 a 10 letras ou números, começando por letra (ex.: FIN).';
  }
  if (existentes.some((existente: string) => existente.toUpperCase() === sigla)) {
    return 'Já existe uma área com esta sigla.';
  }
  return '';
};

/** Nome físico da lista central no ambiente. Vazio se a configuração de prefixos estiver inválida. */
export const nomeListaAreas = (ambiente: AmbienteLista, prefixos: IPrefixosListas): string =>
  nomeFisico(LISTA_AREAS, ambiente, prefixos);

/** Nome físico de uma lista da área: <prefixo><SIGLA>_<base>. */
export const nomeListaDaArea = (
  sigla: string,
  base: string,
  ambiente: AmbienteLista,
  prefixos: IPrefixosListas
): string => nomeFisico(`${sigla}_${base}`, ambiente, prefixos);

/** Grupo de Administradores do ambiente: <prefixo>Jornadas – Administradores. */
export const nomeGrupoAdministradores = (ambiente: AmbienteLista, prefixos: IPrefixosListas): string =>
  nomeFisico(`${GRUPO_BASE}${SEPARADOR}Administradores`, ambiente, prefixos);

/** Grupo da área: <prefixo>Jornadas – <SIGLA> – Gestores | Apoio | Usuários. */
export const nomeGrupoDaArea = (
  sigla: string,
  papel: PapelGrupo,
  ambiente: AmbienteLista,
  prefixos: IPrefixosListas
): string => nomeFisico(`${GRUPO_BASE}${SEPARADOR}${sigla}${SEPARADOR}${ROTULO_GRUPO[papel]}`, ambiente, prefixos);
