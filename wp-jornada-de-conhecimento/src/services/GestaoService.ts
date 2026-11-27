// Skills aplicadas: sharepoint-dados-listas (paginação por coluna indexada), spfx-codigo-performance.
// O Gestor lê todas as matrículas da área pelo nível Editar (escopo, seção 7, item 1: validar em HML).
import { SPFI } from '@pnp/sp';
import { IPrincipalInfo, PrincipalType } from '@pnp/sp';
import { ISiteUserInfo } from '@pnp/sp/site-users';
import { DiagnosticsLogger } from '../core/diagnostics';
import { IArea } from '../jornada/modelo';
import { IJornada } from '../jornada/progresso';
import { IMatriculaPessoa, IPessoaArea } from '../jornada/gestao';
import { CAMPOS_MATRICULA, IMatriculaItem, JornadaService, matriculaDe } from './JornadaService';
import { IAvaliacao } from './EngajamentoService';

/** Limite de pessoas expandidas a partir de grupos do Entra ID (área Geral: ~4.000). */
const LIMITE_EXPANSAO: number = 5000;

interface IMatriculaComAutor extends IMatriculaItem {
  Author?: { Title?: string; EMail?: string; Name?: string };
}

interface IAvaliacaoGestorItem {
  Id: number;
  Nota?: number;
  Comentario?: string;
  Oculto?: boolean;
  AuthorId?: number;
  Author?: { Title?: string; EMail?: string };
  Modified?: string;
}

export interface IMembros {
  pessoas: IPessoaArea[];
  /** Grupos do Entra ID que estavam no grupo de Usuários (já expandidos em pessoas). */
  gruposExpandidos: number;
}

const escaparHtml = (texto: string): string =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export class GestaoService {
  constructor(
    private readonly _sp: SPFI,
    private readonly _jornadas: JornadaService,
    private readonly _logger: DiagnosticsLogger
  ) {}

  /** Membros do grupo de Usuários, com grupos do Entra ID expandidos em pessoas. */
  public async membros(grupoUsuariosId: number): Promise<IMembros> {
    const usuarios: ISiteUserInfo[] = await this._sp.web.siteGroups
      .getById(grupoUsuariosId)
      .users.select('Title', 'Email', 'LoginName', 'PrincipalType')
      .top(5000)<ISiteUserInfo[]>();
    const pessoas: IPessoaArea[] = usuarios
      .filter((usuario: ISiteUserInfo) => usuario.PrincipalType === PrincipalType.User)
      .map((usuario: ISiteUserInfo) => ({ nome: usuario.Title, email: usuario.Email, loginName: usuario.LoginName }));
    const grupos: string[] = usuarios
      .filter((usuario: ISiteUserInfo) => usuario.PrincipalType === PrincipalType.SecurityGroup)
      .map((usuario: ISiteUserInfo) => usuario.LoginName);
    if (grupos.length > 0) {
      try {
        const expandidos: IPrincipalInfo[] = await this._sp.utility.expandGroupsToPrincipals(grupos, LIMITE_EXPANSAO);
        expandidos
          .filter((principal: IPrincipalInfo) => principal.PrincipalType === PrincipalType.User)
          .forEach((principal: IPrincipalInfo) =>
            pessoas.push({ nome: principal.DisplayName, email: principal.Email ?? '', loginName: principal.LoginName })
          );
      } catch {
        this._logger.log('warn', 'Gestão', 'Não foi possível expandir os grupos do Entra ID; o mapa mostra só quem já começou.');
      }
    }
    return { pessoas, gruposExpandidos: grupos.length };
  }

  /** Matrículas da área, por jornada, com todas as páginas (área Geral: até ~4.000 por jornada). */
  public async matriculas(area: IArea, jornadas: IJornada[]): Promise<IMatriculaPessoa[]> {
    const inicio: number = performance.now();
    const lista = this._sp.web.lists.getByTitle(this._jornadas.lista(area, 'Matriculas'));
    const todas: IMatriculaPessoa[] = [];
    await Promise.all(
      jornadas.map(async (jornada: IJornada) => {
        const consulta = lista.items
          .select(...CAMPOS_MATRICULA, 'Author/Title', 'Author/EMail', 'Author/Name')
          .expand('Author')
          .filter(`JornadaId eq ${jornada.id}`)
          .top(5000);
        for await (const pagina of consulta) {
          (pagina as IMatriculaComAutor[]).forEach((item: IMatriculaComAutor) =>
            todas.push({
              ...matriculaDe(item),
              pessoa: { nome: item.Author?.Title ?? '', email: item.Author?.EMail ?? '', loginName: item.Author?.Name ?? '' }
            })
          );
        }
      })
    );
    this._logger.log('info', `Gestão ${area.sigla}`, `${todas.length} matrícula(s) lida(s)`, performance.now() - inicio);
    return todas;
  }

  /** Matrículas iniciadas e concluídas por jornada (só a coluna Status), para a lista do Estúdio. */
  public async conclusaoPorJornada(area: IArea, jornadaIds: number[]): Promise<Map<number, { iniciadas: number; concluidas: number }>> {
    const lista = this._sp.web.lists.getByTitle(this._jornadas.lista(area, 'Matriculas'));
    const resultado: Map<number, { iniciadas: number; concluidas: number }> = new Map<number, { iniciadas: number; concluidas: number }>();
    await Promise.all(
      jornadaIds.map(async (id: number) => {
        const contagem: { iniciadas: number; concluidas: number } = { iniciadas: 0, concluidas: 0 };
        for await (const pagina of lista.items.select('Status').filter(`JornadaId eq ${id}`).top(5000)) {
          (pagina as { Status?: string }[]).forEach((item: { Status?: string }) => {
            contagem.iniciadas += 1;
            contagem.concluidas += item.Status === 'Concluida' ? 1 : 0;
          });
        }
        resultado.set(id, contagem);
      })
    );
    return resultado;
  }

  /** Comentários da jornada para moderação (inclui os ocultos). */
  public async comentarios(area: IArea, jornadaId: number): Promise<IAvaliacao[]> {
    const itens: IAvaliacaoGestorItem[] = await this._sp.web.lists
      .getByTitle(this._jornadas.lista(area, 'Avaliacoes'))
      .items.select('Id', 'Nota', 'Comentario', 'Oculto', 'AuthorId', 'Author/Title', 'Author/EMail', 'Modified')
      .expand('Author')
      .filter(`JornadaId eq ${jornadaId}`)
      .orderBy('Modified', false)
      .top(5000)<IAvaliacaoGestorItem[]>();
    return itens
      .filter((item: IAvaliacaoGestorItem) => (item.Comentario ?? '').trim() !== '')
      .map((item: IAvaliacaoGestorItem) => ({
        id: item.Id,
        nota: item.Nota ?? 0,
        comentario: item.Comentario ?? '',
        oculto: item.Oculto === true,
        autorId: item.AuthorId ?? 0,
        autorNome: item.Author?.Title ?? '',
        autorEmail: item.Author?.EMail ?? '',
        data: item.Modified ?? ''
      }));
  }

  /** Oculta ou mostra um comentário (o Gestor tem Editar na lista Avaliações). */
  public async ocultar(area: IArea, avaliacaoId: number, oculto: boolean): Promise<void> {
    await this._sp.web.lists.getByTitle(this._jornadas.lista(area, 'Avaliacoes')).items.getById(avaliacaoId).update({ Oculto: oculto });
    this._logger.log('info', `Gestão ${area.sigla}`, `Comentário ${oculto ? 'ocultado' : 'reexibido'}`);
  }

  /** Lembrete aos atrasados: um e-mail por pessoa (ninguém vê quem mais recebeu), enviado com a conta do Gestor. */
  public async lembrar(pessoas: IPessoaArea[], jornada: IJornada, paginaUrl: string): Promise<{ enviados: number; falhas: number }> {
    let enviados: number = 0;
    let falhas: number = 0;
    const titulo: string = escaparHtml(jornada.titulo);
    for (const pessoa of pessoas.filter((item: IPessoaArea) => item.email)) {
      try {
        await this._sp.utility.sendEmail({
          To: [pessoa.email],
          Subject: `Lembrete: jornada "${jornada.titulo}" em atraso`,
          Body:
            `<p>Olá, ${escaparHtml(pessoa.nome)}.</p>` +
            `<p>A jornada <strong>${titulo}</strong> passou do prazo e ainda não foi concluída.</p>` +
            `<p><a href="${escaparHtml(paginaUrl)}">Abrir a Jornada de Conhecimento</a></p>`
        });
        enviados += 1;
      } catch {
        falhas += 1;
      }
    }
    this._logger.log('info', 'Gestão', `Lembretes: ${enviados} enviado(s), ${falhas} falha(s)`);
    return { enviados, falhas };
  }
}
