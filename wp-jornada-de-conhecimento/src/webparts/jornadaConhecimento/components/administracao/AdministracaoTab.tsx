// Skills aplicadas: spfx-design-base (barra, cards, estados), spfx-acessibilidade-conteudo (status com texto e ícone,
// não só cor), spfx-configuracao-webpart (grupo de Administradores vem das propriedades), spfx-codigo-performance.
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { ISiteGroupInfo } from '@pnp/sp/site-groups';
import { IArea, StatusArea } from '../../../../jornada/modelo';
import { AreaService, IContagemArea, INovaArea } from '../../../../services/AreaService';
import { IAreaComPapel, IPerfil } from '../../../../services/PerfilService';
import { mensagemDeErro } from '../../../../services/sp';
import { IJornadaConhecimentoProps } from '../tipos';
import Estado from '../comum/Estado';
import NovaAreaModal from './NovaAreaModal';
import MembrosModal from './MembrosModal';
import styles from '../JornadaConhecimento.module.scss';

export interface IAdministracaoTabProps extends IJornadaConhecimentoProps {
  perfil: IPerfil;
  aoAlterar: () => void;
}

const ROTULO_STATUS: Record<StatusArea, { texto: string; icone: string }> = {
  Provisionando: { texto: 'Provisionando', icone: 'Sync' },
  Ativa: { texto: 'Ativa', icone: 'CompletedSolid' },
  Erro: { texto: 'Erro no provisionamento', icone: 'ErrorBadge' },
  Arquivada: { texto: 'Arquivada', icone: 'Archive' }
};

type Modal = { tipo: 'nova' } | { tipo: 'gestores'; area: IArea } | undefined;

const AdministracaoTab: React.FC<IAdministracaoTabProps> = (props: IAdministracaoTabProps) => {
  const { sp, environment, prefixos, logger, perfil, adminGroupIds, aoAlterar } = props;
  const servico: AreaService = useMemo(
    () => new AreaService(sp, environment, prefixos, logger),
    [sp, environment, prefixos.PROD, prefixos.HML, logger]
  );
  const [modal, setModal] = useState<Modal>(undefined);
  const [aviso, setAviso] = useState<{ tipo: MessageBarType; texto: string } | undefined>(undefined);
  const [ocupada, setOcupada] = useState<number | undefined>(undefined);
  const [passo, setPasso] = useState<string>('');
  const [contagens, setContagens] = useState<Map<number, IContagemArea>>(new Map<number, IContagemArea>());
  const [grupoAdmin, setGrupoAdmin] = useState<ISiteGroupInfo | undefined | 'carregando'>('carregando');

  const areas: IArea[] = perfil.areas.map((item: IAreaComPapel) => item.area);
  const grupoAdministradoresId: number | undefined = adminGroupIds[0];

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
        .catch((erro: unknown) => logger.log('warn', 'Administração', mensagemDeErro(erro, 'Contar jornadas e membros')));
    }
    return () => {
      ativo = false;
    };
  }, [servico, perfil]);

  const preparar = useCallback(async (): Promise<void> => {
    setAviso(undefined);
    try {
      const grupo: ISiteGroupInfo = await servico.prepararSite();
      setGrupoAdmin(grupo);
      setAviso({
        tipo: MessageBarType.success,
        texto: `Grupo "${grupo.Title}" pronto. Agora selecione-o em Propriedades da web part > Acesso > Administradores — ${environment}.`
      });
    } catch (erro: unknown) {
      setAviso({ tipo: MessageBarType.error, texto: erro instanceof Error && !('status' in erro) ? erro.message : mensagemDeErro(erro, 'Preparar o site') });
    }
  }, [servico, environment]);

  const criar = useCallback(
    async (nova: INovaArea, progresso: (texto: string) => void): Promise<void> => {
      if (!grupoAdministradoresId) {
        throw new Error('Grupo de Administradores não configurado.');
      }
      try {
        await servico.criarArea(nova, grupoAdministradoresId, progresso);
      } finally {
        aoAlterar();
      }
      setModal(undefined);
      setAviso({ tipo: MessageBarType.success, texto: `Área "${nova.nome}" criada e ativa.` });
    },
    [servico, grupoAdministradoresId, aoAlterar]
  );

  const reprocessar = async (area: IArea): Promise<void> => {
    if (!grupoAdministradoresId) {
      return;
    }
    setOcupada(area.id);
    setAviso(undefined);
    try {
      await servico.provisionar(area, grupoAdministradoresId, [], setPasso);
      setAviso({ tipo: MessageBarType.success, texto: `Área "${area.nome}" reprocessada e ativa.` });
    } catch (erro: unknown) {
      setAviso({ tipo: MessageBarType.error, texto: erro instanceof Error ? erro.message : 'Falha ao reprocessar.' });
    } finally {
      setOcupada(undefined);
      setPasso('');
      aoAlterar();
    }
  };

  const alterarStatus = async (area: IArea, status: StatusArea): Promise<void> => {
    setOcupada(area.id);
    setAviso(undefined);
    try {
      await servico.alterarStatus(area, status);
      aoAlterar();
    } catch (erro: unknown) {
      setAviso({ tipo: MessageBarType.error, texto: mensagemDeErro(erro, 'Alterar o status da área') });
    } finally {
      setOcupada(undefined);
    }
  };

  // ---- Primeiro uso: grupo de Administradores ainda não configurado nas propriedades.
  if (!perfil.administrador) {
    return (
      <>
        {aviso && <MessageBar messageBarType={aviso.tipo}>{aviso.texto}</MessageBar>}
        <Estado
          titulo="Preparar o site"
          texto={
            grupoAdmin && grupoAdmin !== 'carregando'
              ? `O grupo "${grupoAdmin.Title}" já existe. Selecione-o em Propriedades da web part > Acesso > Administradores — ${environment} e inclua nele quem administra a Jornada de Conhecimento.`
              : 'Cria o grupo de Administradores deste ambiente, com Controle Total no site, e inclui você nele. Depois, selecione o grupo nas propriedades da web part.'
          }
        >
          {grupoAdmin === undefined && perfil.podePrepararSite && <PrimaryButton text="Preparar o site" onClick={preparar} />}
        </Estado>
      </>
    );
  }

  if (perfil.situacao === 'semListaCentral') {
    return (
      <Estado
        titulo="Lista central não encontrada"
        texto={`A lista "${perfil.listaAreas}" não existe neste ambiente. Execute o script de provisionamento (provisionamento/INSTRUCOES.md) e recarregue a página.`}
      />
    );
  }

  const total: number = areas.length;
  const ativas: number = areas.filter((area: IArea) => area.status === 'Ativa').length;
  const comErro: number = areas.filter((area: IArea) => area.status === 'Erro').length;

  return (
    <>
      {aviso && (
        <MessageBar messageBarType={aviso.tipo} onDismiss={() => setAviso(undefined)} dismissButtonAriaLabel="Fechar aviso">
          {aviso.texto}
        </MessageBar>
      )}
      <div className={styles.barra}>
        <div>
          <h3 className={styles.subtitulo}>Áreas</h3>
          <span className={styles.numeros}>
            <span>{total} no total</span>
            <span>{ativas} ativas</span>
            {comErro > 0 && <span className={styles.statusErro}>{comErro} com erro</span>}
          </span>
        </div>
        <PrimaryButton iconProps={{ iconName: 'Add' }} text="Nova área" onClick={() => setModal({ tipo: 'nova' })} />
      </div>

      {total === 0 ? (
        <Estado titulo="Nenhuma área criada" texto="Crie a primeira área para montar os grupos, as listas e as permissões dela." />
      ) : (
        <div className={styles.grade}>
          {areas.map((area: IArea) => {
            const status: { texto: string; icone: string } = ROTULO_STATUS[area.status];
            const contagem: IContagemArea | undefined = contagens.get(area.id);
            const emAndamento: boolean = ocupada === area.id;
            return (
              <article key={area.id} className={styles.card} style={{ borderTopColor: area.cor }} aria-label={`Área ${area.nome}`}>
                <div className={styles.cardCabecalho}>
                  <Icon iconName={area.icone} className={styles.cardIcone} style={{ color: area.cor }} aria-hidden="true" />
                  <div>
                    <h4 className={styles.cardNome}>{area.nome}</h4>
                    <span className={styles.cardSigla}>{area.sigla}</span>
                  </div>
                </div>
                <span className={`${styles.status} ${area.status === 'Erro' ? styles.statusErro : ''}`}>
                  <Icon iconName={status.icone} aria-hidden="true" /> {status.texto}
                </span>
                {area.status === 'Ativa' && (
                  <span className={styles.numeros}>
                    <span>{contagem?.jornadas ?? '–'} jornadas</span>
                    <span>{contagem?.membros ?? '–'} membros em Usuários</span>
                  </span>
                )}
                {area.status === 'Erro' && area.mensagemErro && <p className={styles.erroTexto}>{area.mensagemErro}</p>}
                {emAndamento && passo && (
                  <p className={styles.progresso} role="status">
                    {passo}...
                  </p>
                )}
                <div className={styles.cardAcoes}>
                  {area.status === 'Ativa' && area.grupoGestoresId && (
                    <DefaultButton text="Gestores" disabled={emAndamento} onClick={() => setModal({ tipo: 'gestores', area })} />
                  )}
                  {(area.status === 'Erro' || area.status === 'Provisionando') && (
                    <DefaultButton text={emAndamento ? 'Reprocessando...' : 'Reprocessar'} disabled={ocupada !== undefined} onClick={() => reprocessar(area)} />
                  )}
                  {area.status === 'Ativa' && (
                    <DefaultButton text="Arquivar" disabled={emAndamento} onClick={() => alterarStatus(area, 'Arquivada')} />
                  )}
                  {area.status === 'Arquivada' && (
                    <DefaultButton text="Reativar" disabled={emAndamento} onClick={() => alterarStatus(area, 'Ativa')} />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal?.tipo === 'nova' && (
        <NovaAreaModal
          servico={servico}
          siglasExistentes={areas.map((area: IArea) => area.sigla)}
          themeStyle={props.themeStyle}
          aoFechar={() => setModal(undefined)}
          aoCriar={criar}
        />
      )}
      {modal?.tipo === 'gestores' && modal.area.grupoGestoresId && (
        <MembrosModal
          servico={servico}
          grupoId={modal.area.grupoGestoresId}
          titulo={`Gestores — ${modal.area.nome}`}
          descricao="Gestores veem tudo da área, acompanham as pessoas, incluem membros em Apoio e Usuários e aprovam as jornadas."
          themeStyle={props.themeStyle}
          aoFechar={() => setModal(undefined)}
        />
      )}
    </>
  );
};

export default AdministracaoTab;
