// Skills aplicadas: spfx-padrao-visual-gti (receita "Administração": indicadores, cartões por área com faixa de cor,
// situação e ações; criação em painel lateral com passos visíveis), spfx-acessibilidade-conteudo (situação em texto),
// spfx-configuracao-webpart (grupo de Administradores vem das propriedades).
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ISiteGroupInfo } from '@pnp/sp/site-groups';
import { IArea, StatusArea } from '../../../../jornada/modelo';
import { IContagemArea, INovaArea } from '../../../../services/AreaService';
import { IAreaComPapel } from '../../../../services/PerfilService';
import { mensagemDeErro } from '../../../../services/sp';
import { Badge, Empty, GtiDialog, Icon, Metric, MetricGrid, PageHeader, TomBadge } from '../gti';
import { IContextoTela } from '../tipos';
import { Aviso, IconeArea, textoErro } from '../comum/ui';
import NovaAreaModal from './NovaAreaModal';
import MembrosModal from './MembrosModal';
import styles from '../jc.module.scss';

const SITUACAO: Record<StatusArea, { texto: string; tom: TomBadge }> = {
  Provisionando: { texto: 'Provisionando', tom: 'warning' },
  Ativa: { texto: 'Ativa', tom: 'success' },
  Erro: { texto: 'Erro no provisionamento', tom: 'danger' },
  Arquivada: { texto: 'Arquivada', tom: 'neutral' }
};

type Modal = { tipo: 'nova' } | { tipo: 'gestores'; area: IArea } | { tipo: 'arquivar'; area: IArea } | undefined;

const AdministracaoTab: React.FC<IContextoTela> = (ctx: IContextoTela) => {
  const { perfil, servicos, props } = ctx;
  const servico = servicos.areas;
  const [modal, setModal] = useState<Modal>(undefined);
  const [erro, setErro] = useState<string>('');
  const [sucesso, setSucesso] = useState<string>('');
  const [ocupada, setOcupada] = useState<number | undefined>(undefined);
  const [passo, setPasso] = useState<string>('');
  const [contagens, setContagens] = useState<Map<number, IContagemArea>>(new Map<number, IContagemArea>());
  const [grupoAdmin, setGrupoAdmin] = useState<ISiteGroupInfo | undefined | 'carregando'>('carregando');
  const [preparando, setPreparando] = useState<boolean>(false);

  const areas: IArea[] = perfil.areas.map((item: IAreaComPapel) => item.area);
  const grupoAdministradoresId: number | undefined = props.adminGroupIds[0];

  useEffect(() => {
    let ativo: boolean = true;
    servico
      .obterGrupoAdministradores()
      .then((grupo: ISiteGroupInfo | undefined) => ativo && setGrupoAdmin(grupo))
      .catch(() => ativo && setGrupoAdmin(undefined));
    if (perfil.administrador && areas.length > 0) {
      servico
        .contarAreas(areas)
        .then((resultado: Map<number, IContagemArea>) => ativo && setContagens(resultado))
        .catch((falha: unknown) => props.logger.log('warn', 'Administração', mensagemDeErro(falha, 'Contar jornadas e membros')));
    }
    return () => {
      ativo = false;
    };
  }, [servico, perfil]);

  const preparar = useCallback(async (): Promise<void> => {
    setErro('');
    setPreparando(true);
    try {
      const grupo: ISiteGroupInfo = await servico.prepararSite();
      setGrupoAdmin(grupo);
      setSucesso(`Grupo "${grupo.Title}" pronto. Agora selecione-o em Propriedades da web part > Acesso > Administradores — ${props.environment}.`);
    } catch (falha: unknown) {
      setErro(textoErro(falha, (e: unknown) => mensagemDeErro(e, 'Preparar o site')));
    } finally {
      setPreparando(false);
    }
  }, [servico, props.environment]);

  const criar = useCallback(
    async (nova: INovaArea, progresso: (texto: string) => void): Promise<void> => {
      if (!grupoAdministradoresId) {
        throw new Error('Grupo de Administradores não configurado nas propriedades da web part.');
      }
      try {
        await servico.criarArea(nova, grupoAdministradoresId, progresso);
      } finally {
        ctx.recarregarPerfil();
      }
      setModal(undefined);
      ctx.avisar(`Área "${nova.nome}" criada e ativa.`);
    },
    [servico, grupoAdministradoresId]
  );

  const reprocessar = async (area: IArea): Promise<void> => {
    if (!grupoAdministradoresId) {
      return;
    }
    setOcupada(area.id);
    setErro('');
    try {
      await servico.provisionar(area, grupoAdministradoresId, [], setPasso);
      ctx.avisar(`Área "${area.nome}" reprocessada e ativa.`);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Falha ao reprocessar.');
    } finally {
      setOcupada(undefined);
      setPasso('');
      ctx.recarregarPerfil();
    }
  };

  const alterarStatus = async (area: IArea, status: StatusArea): Promise<void> => {
    setOcupada(area.id);
    setErro('');
    try {
      await servico.alterarStatus(area, status);
      ctx.avisar(status === 'Arquivada' ? `"${area.nome}" arquivada. Dados e histórico preservados.` : `"${area.nome}" reativada.`);
      setModal(undefined);
      ctx.recarregarPerfil();
    } catch (falha: unknown) {
      setErro(mensagemDeErro(falha, 'Alterar a situação da área'));
    } finally {
      setOcupada(undefined);
    }
  };

  const cabecalho = (acoes?: React.ReactNode): React.ReactElement => (
    <PageHeader
      idTitulo={ctx.idTitulo}
      nivel={2}
      sobretitulo={`Administração · ${props.environment}`}
      titulo="Áreas"
      descricao="Cada área recebe os próprios grupos, listas, biblioteca e permissões, criados pela web part com a sua sessão."
      acoes={acoes}
    />
  );
  const avisos = (
    <>
      {erro && (
        <Aviso tom="erro" aoFechar={() => setErro('')}>
          {erro}
        </Aviso>
      )}
      {sucesso && (
        <Aviso tom="sucesso" aoFechar={() => setSucesso('')}>
          {sucesso}
        </Aviso>
      )}
    </>
  );

  // Primeiro uso: grupo de Administradores ainda não configurado nas propriedades.
  if (!perfil.administrador) {
    const existe: boolean = !!grupoAdmin && grupoAdmin !== 'carregando';
    return (
      <>
        {cabecalho()}
        {avisos}
        <div className="pi-card">
          <Empty
            icone="engrenagem"
            titulo="Preparar o site"
            descricao={
              existe
                ? `O grupo "${(grupoAdmin as ISiteGroupInfo).Title}" já existe. Selecione-o em Propriedades da web part > Acesso > Administradores — ${props.environment} e inclua nele quem administra a Jornada de Conhecimento.`
                : 'Cria o grupo de Administradores deste ambiente, com Controle Total no site, e inclui você nele. Depois, selecione o grupo nas propriedades da web part.'
            }
            acao={
              grupoAdmin === undefined && perfil.podePrepararSite ? (
                <button type="button" className="pi-btn primary" disabled={preparando} onClick={preparar}>
                  {preparando ? 'Preparando…' : 'Preparar o site'}
                </button>
              ) : undefined
            }
          />
        </div>
      </>
    );
  }

  if (perfil.situacao === 'semListaCentral') {
    return (
      <>
        {cabecalho()}
        <div className="pi-card">
          <Empty
            icone="alerta"
            titulo="Lista central não encontrada"
            descricao={`A lista "${perfil.listaAreas}" não existe neste ambiente. Execute o script de provisionamento (provisionamento/INSTRUCOES.md) e recarregue a página.`}
          />
        </div>
      </>
    );
  }

  const ativas: number = areas.filter((a: IArea) => a.status === 'Ativa').length;
  const comErro: number = areas.filter((a: IArea) => a.status === 'Erro').length;
  const jornadas: number = Array.from(contagens.values()).reduce((t: number, c: IContagemArea) => t + (c.jornadas ?? 0), 0);
  const membros: number = Array.from(contagens.values()).reduce((t: number, c: IContagemArea) => t + (c.membros ?? 0), 0);

  return (
    <>
      {cabecalho(
        <button type="button" className="pi-btn primary" onClick={() => setModal({ tipo: 'nova' })}>
          <Icon nome="mais" tamanho={16} />
          Nova área
        </button>
      )}
      {avisos}
      <MetricGrid>
        <Metric nome="Áreas ativas" valor={ativas} icone="predio" explicacao={`De ${areas.length} cadastrada(s)`} />
        <Metric nome="Jornadas cadastradas" valor={jornadas} icone="livro" explicacao="Todas as situações" />
        <Metric nome="Membros em Usuários" valor={membros.toLocaleString('pt-BR')} icone="pessoas" explicacao="Um grupo do Entra ID conta como um" />
        <Metric nome="Com erro" valor={comErro} icone="alerta" tom={comErro ? 'danger' : 'normal'} explicacao={comErro ? 'Reprocessar resolve sem duplicar' : 'Nenhuma pendência'} />
      </MetricGrid>
      {areas.length === 0 ? (
        <div className="pi-card">
          <Empty
            icone="predio"
            titulo="Nenhuma área criada"
            descricao="Crie a primeira área para montar os grupos, as listas e as permissões dela."
            acao={
              <button type="button" className="pi-btn primary" onClick={() => setModal({ tipo: 'nova' })}>
                Nova área
              </button>
            }
          />
        </div>
      ) : (
        <div className={styles.areas}>
          {areas.map((area: IArea) => {
            const situacao = SITUACAO[area.status];
            const contagem: IContagemArea | undefined = contagens.get(area.id);
            const emAndamento: boolean = ocupada === area.id;
            return (
              <article key={area.id} className={`pi-card ${styles.areaCard}`} aria-label={`Área ${area.nome}`}>
                <div className={styles.areaFaixa} style={{ background: area.cor }} />
                <div className={styles.areaCorpo}>
                  <div className={styles.areaTopo}>
                    <span className={styles.areaIcone} style={{ background: `${area.cor}1f`, color: area.cor }}>
                      <IconeArea area={area} />
                    </span>
                    <div>
                      <h3>{area.nome}</h3>
                      <span className="pi-hint">{area.sigla}</span>
                    </div>
                  </div>
                  <div>
                    <Badge tom={situacao.tom}>{situacao.texto}</Badge>
                  </div>
                  {area.status === 'Erro' && area.mensagemErro ? (
                    <p className="pi-hint" style={{ color: 'var(--pi-danger)' }}>
                      {area.mensagemErro}
                    </p>
                  ) : (
                    area.status === 'Ativa' && (
                      <span className={styles.meta}>
                        <span>
                          <Icon nome="livro" tamanho={13} />
                          {contagem?.jornadas ?? '–'} jornada(s)
                        </span>
                        <span>
                          <Icon nome="pessoas" tamanho={13} />
                          {contagem?.membros ?? '–'} em Usuários
                        </span>
                      </span>
                    )
                  )}
                  {emAndamento && passo && (
                    <p className="pi-hint" role="status">
                      {passo}…
                    </p>
                  )}
                  <div className="pi-actions">
                    {(area.status === 'Erro' || area.status === 'Provisionando') && (
                      <button type="button" className="pi-btn primary" disabled={ocupada !== undefined} onClick={() => reprocessar(area)}>
                        <Icon nome="atualizar" tamanho={16} />
                        {emAndamento ? 'Reprocessando…' : 'Reprocessar'}
                      </button>
                    )}
                    {area.status === 'Ativa' && area.grupoGestoresId && (
                      <button type="button" className="pi-btn" disabled={emAndamento} onClick={() => setModal({ tipo: 'gestores', area })}>
                        Gestores
                      </button>
                    )}
                    {area.status === 'Ativa' && (
                      <button type="button" className="pi-btn ghost" disabled={emAndamento} onClick={() => setModal({ tipo: 'arquivar', area })}>
                        Arquivar
                      </button>
                    )}
                    {area.status === 'Arquivada' && (
                      <button type="button" className="pi-btn" disabled={emAndamento} onClick={() => alterarStatus(area, 'Ativa')}>
                        Reativar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal?.tipo === 'nova' && (
        <NovaAreaModal
          id={`${ctx.idTitulo}-nova`}
          servico={servico}
          siglasExistentes={areas.map((a: IArea) => a.sigla)}
          ambiente={props.environment}
          aoFechar={() => setModal(undefined)}
          aoCriar={criar}
        />
      )}
      {modal?.tipo === 'gestores' && modal.area.grupoGestoresId && (
        <MembrosModal
          id={`${ctx.idTitulo}-gestores`}
          servico={servico}
          grupoId={modal.area.grupoGestoresId}
          sobretitulo={`Administração · ${modal.area.sigla}`}
          titulo={`Gestores — ${modal.area.nome}`}
          descricao="Gestores veem tudo da área, acompanham as pessoas, incluem membros em Apoio e Usuários e aprovam as jornadas."
          aoAvisar={ctx.avisar}
          aoFechar={() => setModal(undefined)}
        />
      )}
      {modal?.tipo === 'arquivar' && (
        <GtiDialog
          id={`${ctx.idTitulo}-arquivar`}
          variante="central"
          titulo={`Arquivar a área "${modal.area.nome}"?`}
          bloquearFechamento={ocupada !== undefined}
          aoFechar={() => setModal(undefined)}
          rodape={
            <>
              <button type="button" className="pi-btn" disabled={ocupada !== undefined} onClick={() => setModal(undefined)}>
                Cancelar
              </button>
              <button type="button" className="pi-btn primary" disabled={ocupada !== undefined} onClick={() => alterarStatus(modal.area, 'Arquivada')}>
                {ocupada !== undefined ? 'Arquivando…' : 'Arquivar'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13 }}>
            As jornadas da área saem do catálogo das pessoas. Grupos, listas, matrículas e avaliações continuam guardados, e a área pode ser reativada.
          </p>
        </GtiDialog>
      )}
    </>
  );
};

export default AdministracaoTab;
