// Skills aplicadas: sharepoint-dados-listas, spfx-codigo-performance (gravação com intervalo, sem chamada a cada
// segundo). A matrícula é criada pelo próprio usuário ao abrir a jornada; a lista só deixa cada um ler e editar
// as próprias (escopo, seção 5).
import { SPFI } from '@pnp/sp';
import { DiagnosticsLogger } from '../core/diagnostics';
import { IArea } from '../jornada/modelo';
import { IMatricula, chaveMatricula } from '../jornada/progresso';
import { CAMPOS_MATRICULA, IMatriculaItem, JornadaService, matriculaDe } from './JornadaService';
import { mensagemDeErro } from './sp';

/** Intervalo de gravação do progresso no player (escopo: a cada 15 segundos e ao sair). */
export const INTERVALO_GRAVACAO_MS: number = 15000;

const paraItem = (matricula: IMatricula): Record<string, unknown> => ({
  EtapaAtualId: matricula.etapaAtualId ?? null,
  ProgressoEtapas: JSON.stringify(matricula.progresso),
  PercentualConcluido: matricula.percentual,
  Status: matricula.status,
  UltimoAcesso: matricula.ultimoAcesso ?? new Date().toISOString(),
  ConcluidaEm: matricula.concluidaEm ?? null
});

export class MatriculaService {
  private _pendente: { area: IArea; matricula: IMatricula } | undefined;
  private _timer: number | undefined;
  private _gravando: Promise<void> = Promise.resolve();

  constructor(
    private readonly _sp: SPFI,
    private readonly _jornadas: JornadaService,
    private readonly _logger: DiagnosticsLogger
  ) {}

  /** Matrícula do usuário na jornada; cria na primeira abertura. Nunca duplica: procura pela chave antes. */
  public async garantir(area: IArea, jornadaId: number, usuarioId: number, primeiraEtapaId?: number): Promise<IMatricula> {
    const lista: string = this._jornadas.lista(area, 'Matriculas');
    const chave: string = chaveMatricula(jornadaId, usuarioId);
    const existentes: IMatriculaItem[] = await this._sp.web.lists
      .getByTitle(lista)
      .items.select(...CAMPOS_MATRICULA)
      .filter(`Title eq '${chave}'`)
      .top(1)<IMatriculaItem[]>();
    if (existentes.length > 0) {
      return matriculaDe(existentes[0]);
    }
    const agora: string = new Date().toISOString();
    const nova: IMatricula = {
      chave,
      jornadaId,
      etapaAtualId: primeiraEtapaId,
      progresso: {},
      percentual: 0,
      status: 'EmAndamento',
      dataInicio: agora,
      ultimoAcesso: agora
    };
    const criada: { Id: number } = await this._sp.web.lists.getByTitle(lista).items.add({
      Title: chave,
      JornadaId: jornadaId,
      DataInicio: agora,
      ...paraItem(nova)
    });
    this._logger.log('info', 'Matrícula', `Criada na jornada ${jornadaId}`);
    return { ...nova, id: criada.Id };
  }

  /** Grava agora (conclusão de etapa, troca de etapa). Cancela a gravação agendada. */
  public async salvar(area: IArea, matricula: IMatricula): Promise<void> {
    this._cancelarAgenda();
    this._pendente = undefined;
    await this._gravar(area, matricula);
  }

  /** Agenda a gravação da posição; só a última versão é gravada, no máximo a cada 15 segundos. */
  public agendar(area: IArea, matricula: IMatricula): void {
    this._pendente = { area, matricula };
    if (this._timer === undefined) {
      this._timer = window.setTimeout(() => {
        this._timer = undefined;
        this.descarregar().catch(() => undefined);
      }, INTERVALO_GRAVACAO_MS);
    }
  }

  /** Grava o que estiver pendente (ao sair da página, trocar de etapa ou fechar o player). */
  public async descarregar(): Promise<void> {
    this._cancelarAgenda();
    const pendente: { area: IArea; matricula: IMatricula } | undefined = this._pendente;
    this._pendente = undefined;
    if (pendente) {
      await this._gravar(pendente.area, pendente.matricula);
    }
  }

  private _cancelarAgenda(): void {
    if (this._timer !== undefined) {
      window.clearTimeout(this._timer);
      this._timer = undefined;
    }
  }

  /** Gravações em sequência: uma posição antiga nunca sobrescreve uma mais nova. */
  private _gravar(area: IArea, matricula: IMatricula): Promise<void> {
    if (!matricula.id) {
      return Promise.resolve();
    }
    const id: number = matricula.id;
    this._gravando = this._gravando
      .catch(() => undefined)
      .then(async () => {
        await this._sp.web.lists.getByTitle(this._jornadas.lista(area, 'Matriculas')).items.getById(id).update(paraItem(matricula));
      })
      .catch((erro: unknown) => {
        this._logger.log('error', 'Matrícula', mensagemDeErro(erro, 'Salvar o progresso'));
        throw erro;
      });
    return this._gravando;
  }
}
