// Skills aplicadas: spfx-implementacao-base. Escopo, seção 5 ("Permissões por área").
// Somente níveis de permissão padrão do SharePoint. Identificados pelo tipo (RoleTypeKind),
// que não depende do idioma do site.
import { BaseListaArea } from './catalogoArea';
import { PapelGrupo } from './nomes';

/** SP.RoleType: valores fixos da API do SharePoint. */
export enum NivelPadrao {
  Leitura = 2,
  Contribuir = 3,
  Design = 4,
  ControleTotal = 5,
  Editar = 6
}

export const ROTULO_NIVEL: Record<NivelPadrao, string> = {
  [NivelPadrao.Leitura]: 'Leitura',
  [NivelPadrao.Contribuir]: 'Contribuir',
  [NivelPadrao.Design]: 'Design',
  [NivelPadrao.ControleTotal]: 'Controle Total',
  [NivelPadrao.Editar]: 'Editar'
};

export type MatrizLista = Record<PapelGrupo, NivelPadrao>;

/** Nível de cada grupo da área em cada lista. O grupo de Administradores recebe sempre Controle Total. */
export const MATRIZ_PERMISSOES: Record<BaseListaArea, MatrizLista> = {
  // Design é o menor nível padrão com "Aprovar itens" fora de sites de publicação.
  Jornadas: { Gestores: NivelPadrao.Design, Apoio: NivelPadrao.Contribuir, Usuarios: NivelPadrao.Leitura },
  Etapas: { Gestores: NivelPadrao.Contribuir, Apoio: NivelPadrao.Contribuir, Usuarios: NivelPadrao.Leitura },
  Conteudos: { Gestores: NivelPadrao.Contribuir, Apoio: NivelPadrao.Contribuir, Usuarios: NivelPadrao.Leitura },
  // Editar inclui "Gerenciar listas": o Gestor lê todas as matrículas e modera avaliações de outras pessoas.
  Matriculas: { Gestores: NivelPadrao.Editar, Apoio: NivelPadrao.Contribuir, Usuarios: NivelPadrao.Contribuir },
  Curtidas: { Gestores: NivelPadrao.Contribuir, Apoio: NivelPadrao.Contribuir, Usuarios: NivelPadrao.Contribuir },
  Avaliacoes: { Gestores: NivelPadrao.Editar, Apoio: NivelPadrao.Contribuir, Usuarios: NivelPadrao.Contribuir }
};

/** Item da área na lista central: os três grupos só leem. */
export const MATRIZ_ITEM_AREA: MatrizLista = {
  Gestores: NivelPadrao.Leitura,
  Apoio: NivelPadrao.Leitura,
  Usuarios: NivelPadrao.Leitura
};

export const PAPEIS_GRUPO: PapelGrupo[] = ['Gestores', 'Apoio', 'Usuarios'];
