// Skills aplicadas: spfx-design-base (lista com status e ações, estados), spfx-acessibilidade-conteudo (tabela com
// cabeçalhos, situação em texto). Escopo, seção 6.4: Gestores e Apoio das suas áreas.
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { IArea } from '../../../../jornada/modelo';
import { IEtapa, IResumoAvaliacoes } from '../../../../jornada/progresso';
import { IJornadaEstudio, Moderacao, ROTULO_SITUACAO, SituacaoPublicacao, situacaoPublicacao } from '../../../../jornada/estudio';
import { AreaService } from '../../../../services/AreaService';
import { IAreaComPapel, IPerfil } from '../../../../services/PerfilService';
import { mensagemDeErro } from '../../../../services/sp';
import { IJornadaConhecimentoProps, IServicosJornada } from '../tipos';
import Estado from '../comum/Estado';
import { Estrelas } from '../comum/Indicadores';
import SeletorArea from '../comum/SeletorArea';
import EditorJornada from './EditorJornada';
import PreviaJornada from './PreviaJornada';
import styles from './Estudio.module.scss';

export interface IEstudioProps extends IJornadaConhecimentoProps {
  perfil: IPerfil;
  servicos: IServicosJornada;
}

const novaJornada = (areaId: number): IJornadaEstudio => ({
  id: 0,
  areaId,
  titulo: '',
  descricao: '',
  capa: '',
  categoria: '',
  publico: [],
  publicoDetalhado: [],
  obrigatoria: false,
  ordemLivre: false,
  status: 'Rascunho',
  moderacao: Moderacao.Pendente,
  comentarioModeracao: '',
  emiteCertificado: false,
  modeloCertificado: '',
  autor: ''
});

const Estudio: React.FC<IEstudioProps> = (props: IEstudioProps) => {
  const { perfil, servicos, sp, environment, prefixos, logger } = props;
  const minhas: IAreaComPapel[] = perfil.areas.filter((item: IAreaComPapel) => item.area.status === 'Ativa' && (item.papeis.gestor || item.papeis.apoio));
  const [areaId, setAreaId] = useState<number | undefined>(minhas[0]?.area.id);
  const atual: IAreaComPapel | undefined = minhas.find((item: IAreaComPapel) => item.area.id === areaId) ?? minhas[0];
  const area: IArea | undefined = atual?.area;
  const gestor: boolean = !!atual?.papeis.gestor;
  const pessoas: AreaService = useMemo(() => new AreaService(sp, environment, prefixos, logger), [sp, environment, prefixos.PROD, prefixos.HML, logger]);

  const [jornadas, setJornadas] = useState<IJornadaEstudio[] | undefined>(undefined);
  const [notas, setNotas] = useState<Map<number, IResumoAvaliacoes>>(new Map<number, IResumoAvaliacoes>());
  const [conclusao, setConclusao] = useState<Map<number, { iniciadas: number; concluidas: number }>>(new Map());
  const [editando, setEditando] = useState<IJornadaEstudio | undefined>(undefined);
  const [previa, setPrevia] = useState<{ jornada: IJornadaEstudio; etapas: IEtapa[] } | undefined>(undefined);
  const [aviso, setAviso] = useState<{ tipo: MessageBarType; texto: string } | undefined>(undefined);
  const [versao, setVersao] = useState<number>(0);

  useEffect(() => {
    if (!area) {
      return undefined;
    }
    let ativo: boolean = true;
    setJornadas(undefined);
    servicos.estudio
      .listar(area)
      .then((lista: IJornadaEstudio[]) => {
        if (!ativo) {
          return;
        }
        setJornadas(lista);
        const ids: number[] = lista.map((jornada: IJornadaEstudio) => jornada.id);
        servicos.engajamento.resumosDosCards(area, ids).then((mapa) => ativo && setNotas(mapa)).catch(() => undefined);
        if (gestor) {
          servicos.gestao.conclusaoPorJornada(area, ids).then((mapa) => ativo && setConclusao(mapa)).catch(() => undefined);
        }
      })
      .catch((erro: unknown) => ativo && setAviso({ tipo: MessageBarType.error, texto: mensagemDeErro(erro, 'Carregar as jornadas da área') }));
    return () => {
      ativo = false;
    };
  }, [servicos, area, gestor, versao]);

  const abrirPrevia = useCallback(
    async (jornada: IJornadaEstudio): Promise<void> => {
      if (!area) {
        return;
      }
      try {
        setPrevia({ jornada, etapas: await servicos.jornadas.etapasDaJornada(area, jornada.id) });
      } catch (erro: unknown) {
        setAviso({ tipo: MessageBarType.error, texto: mensagemDeErro(erro, 'Abrir a pré-visualização') });
      }
    },
    [servicos, area]
  );

  const arquivar = async (jornada: IJornadaEstudio): Promise<void> => {
    if (!area) {
      return;
    }
    try {
      await servicos.estudio.arquivar(area, jornada.id);
      setAviso({ tipo: MessageBarType.success, texto: `"${jornada.titulo}" foi arquivada. Dados e histórico continuam guardados.` });
      setVersao((v: number) => v + 1);
    } catch (erro: unknown) {
      setAviso({ tipo: MessageBarType.error, texto: erro instanceof Error && !('status' in erro) ? erro.message : mensagemDeErro(erro, 'Arquivar') });
    }
  };

  if (!area) {
    return <Estado titulo="Estúdio" texto="Você não está como Gestor ou Apoio em nenhuma área ativa." />;
  }

  if (editando) {
    return (
      <EditorJornada
        area={area}
        jornada={editando}
        gestor={gestor}
        servicos={servicos}
        pessoas={pessoas}
        siteUrl={props.siteUrl}
        themeStyle={props.themeStyle}
        aoFechar={(alterou: boolean) => {
          setEditando(undefined);
          if (alterou) {
            setAviso({ tipo: MessageBarType.success, texto: 'Jornada salva.' });
            setVersao((v: number) => v + 1);
          }
        }}
      />
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.barra}>
        <SeletorArea areas={minhas.map((item: IAreaComPapel) => item.area)} selecionada={area.id} aoSelecionar={setAreaId} />
        <PrimaryButton iconProps={{ iconName: 'Add' }} text="Nova jornada" onClick={() => setEditando(novaJornada(area.id))} />
      </div>
      {aviso && (
        <MessageBar messageBarType={aviso.tipo} onDismiss={() => setAviso(undefined)} dismissButtonAriaLabel="Fechar aviso">
          {aviso.texto}
        </MessageBar>
      )}

      {jornadas === undefined ? (
        <Spinner size={SpinnerSize.medium} label="Carregando as jornadas da área..." />
      ) : jornadas.length === 0 ? (
        <Estado titulo="Nenhuma jornada nesta área" texto="Crie a primeira jornada: dados gerais, etapas, público, regras e publicação." />
      ) : (
        <div className={styles.tabelaRolagem}>
          <table className={styles.tabela}>
            <caption className={styles.legenda}>Jornadas da área {area.nome}</caption>
            <thead>
              <tr>
                <th scope="col">Jornada</th>
                <th scope="col">Situação</th>
                <th scope="col">Conclusão</th>
                <th scope="col">Nota</th>
                <th scope="col">
                  <span className={styles.oculto}>Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {jornadas.map((jornada: IJornadaEstudio) => {
                const situacao: SituacaoPublicacao = situacaoPublicacao(jornada.status, jornada.moderacao, !!jornada.dataPublicacao);
                const contagem = conclusao.get(jornada.id);
                const nota: IResumoAvaliacoes | undefined = notas.get(jornada.id);
                return (
                  <tr key={jornada.id}>
                    <th scope="row" className={styles.nomeJornada}>
                      {jornada.titulo}
                      <span className={styles.ajuda}>
                        {jornada.autor}
                        {jornada.modificadaEm ? ` · ${new Date(jornada.modificadaEm).toLocaleDateString('pt-BR')}` : ''}
                      </span>
                    </th>
                    <td>
                      <span className={`${styles.situacao} ${(styles as unknown as Record<string, string>)[situacao] ?? ''}`}>{ROTULO_SITUACAO[situacao]}</span>
                      {situacao === 'devolvida' && jornada.comentarioModeracao && <span className={styles.ajuda}>{jornada.comentarioModeracao}</span>}
                    </td>
                    <td>
                      {gestor ? (
                        contagem ? (
                          `${contagem.iniciadas ? Math.round((contagem.concluidas / contagem.iniciadas) * 100) : 0}% (${contagem.concluidas} de ${contagem.iniciadas})`
                        ) : (
                          '–'
                        )
                      ) : (
                        <span className={styles.ajuda} title="Visível para os gestores da área">
                          Gestores
                        </span>
                      )}
                    </td>
                    <td>
                      <Estrelas nota={nota?.media ?? 0} total={nota?.total} />
                    </td>
                    <td className={styles.acoes}>
                      <DefaultButton text="Editar" ariaLabel={`Editar ${jornada.titulo}`} onClick={() => setEditando(jornada)} />
                      <DefaultButton text="Pré-visualizar" ariaLabel={`Pré-visualizar ${jornada.titulo}`} onClick={() => abrirPrevia(jornada)} />
                      {gestor && situacao !== 'arquivada' && (
                        <DefaultButton text="Arquivar" ariaLabel={`Arquivar ${jornada.titulo}`} onClick={() => arquivar(jornada)} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {previa && (
        <PreviaJornada
          titulo={previa.jornada.titulo}
          descricao={previa.jornada.descricao}
          etapas={previa.etapas}
          siteUrl={props.siteUrl}
          themeStyle={props.themeStyle}
          aoFechar={() => setPrevia(undefined)}
        />
      )}
    </div>
  );
};

export default Estudio;
