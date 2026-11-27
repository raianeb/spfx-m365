// Skills aplicadas: spfx-design-base (painel, tabela, ações com confirmação), spfx-acessibilidade-conteudo (mapa de
// calor com percentual em texto e rótulo por célula, não só cor), spfx-codigo-performance. Escopo, seção 6.3.
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import ModalShell from '../../../../crud/ModalShell';
import crud from '../../../../crud/crud.module.scss';
import { primaryButtonStyles, secondaryButtonStyles } from '../../../../crud/modalStyles';
import { IArea } from '../../../../jornada/modelo';
import { IEtapa, IJornada, IResumoAvaliacoes, dataLimite } from '../../../../jornada/progresso';
import { ICelula, IMatriculaPessoa, IPainel, IPessoaArea, calcularPainel, faixaCalor, gerarCsv, juntarPessoas, montarCelulas } from '../../../../jornada/gestao';
import { AreaService } from '../../../../services/AreaService';
import { ICatalogoArea } from '../../../../services/JornadaService';
import { IMembros } from '../../../../services/GestaoService';
import { IAreaComPapel, IPerfil } from '../../../../services/PerfilService';
import { mensagemDeErro } from '../../../../services/sp';
import { IJornadaConhecimentoProps, IServicosJornada, NOME_SOLUCAO } from '../tipos';
import Estado from '../comum/Estado';
import SeletorArea from '../comum/SeletorArea';
import MembrosModal from '../administracao/MembrosModal';
import Aprovacoes from './Aprovacoes';
import Moderacao from './Moderacao';
import DetalhePessoa from './DetalhePessoa';
import styles from './Gestao.module.scss';

export interface IGestaoProps extends IJornadaConhecimentoProps {
  perfil: IPerfil;
  servicos: IServicosJornada;
}

type Secao = 'painel' | 'pessoas' | 'aprovacoes' | 'comentarios';

interface IDados {
  catalogo: ICatalogoArea;
  membros: IMembros;
  matriculas: IMatriculaPessoa[];
}

const ROTULO_FAIXA: Record<ReturnType<typeof faixaCalor>, string> = {
  na: 'não se aplica',
  zero: 'não iniciada',
  baixa: 'em andamento',
  media: 'em andamento',
  alta: 'em andamento',
  completa: 'concluída'
};

const baixarCsv = (conteudo: string, nome: string): void => {
  const url: string = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
  const link: HTMLAnchorElement = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const Gestao: React.FC<IGestaoProps> = (props: IGestaoProps) => {
  const { perfil, servicos, sp, environment, prefixos, logger } = props;
  const minhas: IArea[] = perfil.areas.filter((item: IAreaComPapel) => item.area.status === 'Ativa' && item.papeis.gestor).map((item: IAreaComPapel) => item.area);
  const [areaId, setAreaId] = useState<number | undefined>(minhas[0]?.id);
  const area: IArea | undefined = minhas.find((item: IArea) => item.id === areaId) ?? minhas[0];
  const grupos: AreaService = useMemo(() => new AreaService(sp, environment, prefixos, logger), [sp, environment, prefixos.PROD, prefixos.HML, logger]);

  const [secao, setSecao] = useState<Secao>('painel');
  const [dados, setDados] = useState<IDados | undefined>(undefined);
  const [notas, setNotas] = useState<Map<number, IResumoAvaliacoes>>(new Map<number, IResumoAvaliacoes>());
  const [erro, setErro] = useState<string>('');
  const [versao, setVersao] = useState<number>(0);
  const [detalhe, setDetalhe] = useState<{ pessoa: IPessoaArea; jornada: IJornada; celula: ICelula } | undefined>(undefined);
  const [grupoAberto, setGrupoAberto] = useState<'usuarios' | 'apoio' | undefined>(undefined);
  const [lembrete, setLembrete] = useState<{ jornada: IJornada; pessoas: IPessoaArea[] }[] | undefined>(undefined);
  const [aviso, setAviso] = useState<{ tipo: MessageBarType; texto: string } | undefined>(undefined);
  const [enviando, setEnviando] = useState<boolean>(false);

  useEffect(() => {
    if (!area || !area.grupoUsuariosId) {
      return undefined;
    }
    let ativo: boolean = true;
    setDados(undefined);
    setErro('');
    (async (): Promise<void> => {
      const [catalogo] = await servicos.jornadas.carregarCatalogo([area], perfil.usuarioId);
      const [membros, matriculas] = await Promise.all([
        servicos.gestao.membros(area.grupoUsuariosId ?? 0),
        servicos.gestao.matriculas(area, catalogo.jornadas)
      ]);
      if (ativo) {
        setDados({ catalogo, membros, matriculas });
      }
      const resumos = await servicos.engajamento.resumosDosCards(area, catalogo.jornadas.map((jornada: IJornada) => jornada.id));
      if (ativo) {
        setNotas(resumos);
      }
    })().catch((falha: unknown) => ativo && setErro(mensagemDeErro(falha, 'Carregar a gestão da área')));
    return () => {
      ativo = false;
    };
  }, [servicos, area, perfil.usuarioId, versao]);

  const calculo = useMemo(() => {
    if (!dados) {
      return undefined;
    }
    const pessoas: IPessoaArea[] = juntarPessoas(dados.membros.pessoas, dados.matriculas);
    const celulas: ICelula[][] = montarCelulas(pessoas, dados.catalogo.jornadas, dados.catalogo.etapas, dados.matriculas, new Date());
    return { pessoas, celulas, painel: calcularPainel(celulas, dados.catalogo.etapas) };
  }, [dados]);

  if (!area) {
    return <Estado titulo="Gestão da Área" texto="Você não é Gestor de nenhuma área ativa." />;
  }

  const exportar = (): void => {
    if (!dados || !calculo) {
      return;
    }
    const linhas: (string | number)[][] = [];
    calculo.pessoas.forEach((pessoa: IPessoaArea, i: number) =>
      dados.catalogo.jornadas.forEach((jornada: IJornada, j: number) => {
        const celula: ICelula = calculo.celulas[i][j];
        if (celula.naoSeAplica) {
          return;
        }
        const limite: Date | undefined = dataLimite(jornada);
        linhas.push([
          pessoa.nome,
          pessoa.email,
          jornada.titulo,
          ROTULO_FAIXA[faixaCalor(celula)],
          celula.percentual,
          celula.matricula?.dataInicio ? new Date(celula.matricula.dataInicio).toLocaleDateString('pt-BR') : '',
          celula.matricula?.ultimoAcesso ? new Date(celula.matricula.ultimoAcesso).toLocaleDateString('pt-BR') : '',
          celula.matricula?.concluidaEm ? new Date(celula.matricula.concluidaEm).toLocaleDateString('pt-BR') : '',
          limite ? limite.toLocaleDateString('pt-BR') : '',
          celula.atrasada ? 'Sim' : 'Não'
        ]);
      })
    );
    baixarCsv(
      gerarCsv(['Pessoa', 'E-mail', 'Jornada', 'Situação', 'Percentual', 'Início', 'Último acesso', 'Concluída em', 'Prazo', 'Atrasada'], linhas),
      `jornadas-${area.sigla}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    logger.log('info', `Gestão ${area.sigla}`, `Exportação: ${linhas.length} linha(s)`);
  };

  const prepararLembrete = (): void => {
    if (!dados || !calculo) {
      return;
    }
    const porJornada: { jornada: IJornada; pessoas: IPessoaArea[] }[] = dados.catalogo.jornadas
      .map((jornada: IJornada, j: number) => ({
        jornada,
        pessoas: calculo.pessoas.filter((_pessoa: IPessoaArea, i: number) => calculo.celulas[i][j].atrasada && !calculo.celulas[i][j].naoSeAplica)
      }))
      .filter((grupo) => grupo.pessoas.length > 0);
    setLembrete(porJornada);
  };

  const enviarLembretes = async (): Promise<void> => {
    if (!lembrete) {
      return;
    }
    setEnviando(true);
    let enviados: number = 0;
    let falhas: number = 0;
    for (const grupo of lembrete) {
      const resultado = await servicos.gestao.lembrar(grupo.pessoas, grupo.jornada, window.location.href.split('#')[0]);
      enviados += resultado.enviados;
      falhas += resultado.falhas;
    }
    setEnviando(false);
    setLembrete(undefined);
    setAviso({
      tipo: falhas ? MessageBarType.warning : MessageBarType.success,
      texto: `${enviados} lembrete(s) enviado(s)${falhas ? `; ${falhas} não puderam ser enviados` : ''}.`
    });
  };

  const painel: IPainel | undefined = calculo?.painel;
  const notasValidas: IResumoAvaliacoes[] = Array.from(notas.values()).filter((nota: IResumoAvaliacoes) => nota.total > 0);
  const notaMedia: number = notasValidas.length ? notasValidas.reduce((t: number, n: IResumoAvaliacoes) => t + n.media, 0) / notasValidas.length : 0;
  const totalAtrasados: number = lembrete ? lembrete.reduce((t: number, g) => t + g.pessoas.length, 0) : 0;

  return (
    <div className={styles.root}>
      <div className={styles.barra}>
        <SeletorArea areas={minhas} selecionada={area.id} aoSelecionar={setAreaId} />
      </div>
      <Pivot selectedKey={secao} onLinkClick={(item?: PivotItem) => item?.props.itemKey && setSecao(item.props.itemKey as Secao)} headersOnly aria-label="Seções da gestão">
        <PivotItem itemKey="painel" headerText="Painel" />
        <PivotItem itemKey="pessoas" headerText="Pessoas" />
        <PivotItem itemKey="aprovacoes" headerText="Aprovações" />
        <PivotItem itemKey="comentarios" headerText="Comentários" />
      </Pivot>
      {aviso && (
        <MessageBar messageBarType={aviso.tipo} onDismiss={() => setAviso(undefined)} dismissButtonAriaLabel="Fechar aviso">
          {aviso.texto}
        </MessageBar>
      )}

      {secao === 'pessoas' && (
        <div className={styles.secao}>
          <p className={styles.ajuda}>As alterações entram direto nos grupos do SharePoint da área. Na área Geral, inclua um grupo do Entra ID em vez de pessoas uma a uma.</p>
          <div className={styles.acoes}>
            <DefaultButton iconProps={{ iconName: 'People' }} text="Usuários da área" disabled={!area.grupoUsuariosId} onClick={() => setGrupoAberto('usuarios')} />
            <DefaultButton iconProps={{ iconName: 'Teamwork' }} text="Equipe de apoio" disabled={!area.grupoApoioId} onClick={() => setGrupoAberto('apoio')} />
          </div>
        </div>
      )}

      {secao === 'aprovacoes' && (
        <Aprovacoes area={area} servicos={servicos} siteUrl={props.siteUrl} themeStyle={props.themeStyle} aoPublicar={() => setVersao((v: number) => v + 1)} />
      )}

      {secao === 'comentarios' &&
        (dados ? <Moderacao area={area} jornadas={dados.catalogo.jornadas} servicos={servicos} /> : <Spinner size={SpinnerSize.small} label="Carregando..." />)}

      {secao === 'painel' &&
        (erro ? (
          <Estado titulo="Não foi possível carregar" texto={erro} papel="alert">
            <DefaultButton text="Tentar novamente" onClick={() => setVersao((v: number) => v + 1)} />
          </Estado>
        ) : !dados || !calculo || !painel ? (
          <Spinner size={SpinnerSize.medium} label="Calculando os indicadores da área..." />
        ) : (
          <div className={styles.secao}>
            <dl className={styles.indicadores}>
              <div className={styles.indicador}>
                <dt>Adesão</dt>
                <dd>{painel.adesao}%</dd>
              </div>
              <div className={styles.indicador}>
                <dt>Conclusão média</dt>
                <dd>{painel.conclusaoMedia}%</dd>
              </div>
              <div className={styles.indicador}>
                <dt>Atrasados</dt>
                <dd>{painel.atrasados}</dd>
              </div>
              <div className={styles.indicador}>
                <dt>Horas totais</dt>
                <dd>{painel.horas.toLocaleString('pt-BR')}</dd>
              </div>
              <div className={styles.indicador}>
                <dt>Nota média</dt>
                <dd>{notaMedia ? notaMedia.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '–'}</dd>
              </div>
            </dl>
            <div className={styles.acoes}>
              <DefaultButton iconProps={{ iconName: 'Download' }} text="Exportar (CSV)" onClick={exportar} />
              <DefaultButton iconProps={{ iconName: 'Mail' }} text="Lembrar atrasados" disabled={painel.atrasados === 0} onClick={prepararLembrete} />
            </div>
            {dados.membros.gruposExpandidos > 0 && (
              <p className={styles.ajuda}>Inclui as pessoas de {dados.membros.gruposExpandidos} grupo(s) do Entra ID do grupo de Usuários.</p>
            )}

            {dados.catalogo.jornadas.length === 0 || calculo.pessoas.length === 0 ? (
              <Estado titulo="Sem dados para o mapa" texto="O mapa aparece quando houver jornadas publicadas e pessoas na área." />
            ) : (
              <div className={styles.mapaRolagem}>
                <table className={styles.mapa}>
                  <caption className={styles.legenda}>Progresso por pessoa e jornada (clique numa célula para ver as etapas)</caption>
                  <thead>
                    <tr>
                      <th scope="col">Pessoa</th>
                      {dados.catalogo.jornadas.map((jornada: IJornada) => (
                        <th scope="col" key={jornada.id} className={styles.colunaJornada}>
                          {jornada.titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calculo.pessoas.map((pessoa: IPessoaArea, i: number) => (
                      <tr key={pessoa.loginName}>
                        <th scope="row" className={styles.colunaPessoa}>
                          {pessoa.nome}
                        </th>
                        {dados.catalogo.jornadas.map((jornada: IJornada, j: number) => {
                          const celula: ICelula = calculo.celulas[i][j];
                          const faixa = faixaCalor(celula);
                          return (
                            <td key={jornada.id} className={`${styles.celula} ${(styles as unknown as Record<string, string>)[`faixa_${faixa}`] ?? ''}`}>
                              {faixa === 'na' ? (
                                <span aria-label={`${pessoa.nome}, ${jornada.titulo}: não se aplica`}>–</span>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.celulaBotao}
                                  aria-label={`${pessoa.nome}, ${jornada.titulo}: ${celula.percentual}%, ${ROTULO_FAIXA[faixa]}${celula.atrasada ? ', atrasada' : ''}`}
                                  onClick={() => setDetalhe({ pessoa, jornada, celula })}
                                >
                                  {celula.percentual}%{celula.atrasada ? ' !' : ''}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={styles.ajuda}>O sinal ! indica atraso; o traço indica que a jornada não se aplica à pessoa (público específico).</p>
              </div>
            )}
          </div>
        ))}

      {detalhe && dados && (
        <DetalhePessoa
          pessoa={detalhe.pessoa}
          jornada={detalhe.jornada}
          celula={detalhe.celula}
          etapas={dados.catalogo.etapas.get(detalhe.jornada.id) ?? ([] as IEtapa[])}
          themeStyle={props.themeStyle}
          aoFechar={() => setDetalhe(undefined)}
        />
      )}
      {grupoAberto && (
        <MembrosModal
          servico={grupos}
          grupoId={(grupoAberto === 'usuarios' ? area.grupoUsuariosId : area.grupoApoioId) ?? 0}
          titulo={`${grupoAberto === 'usuarios' ? 'Usuários' : 'Equipe de apoio'} — ${area.nome}`}
          descricao={
            grupoAberto === 'usuarios'
              ? 'Usuários fazem as jornadas publicadas da área, curtem, avaliam e comentam.'
              : 'A Equipe de apoio cria e edita jornadas, etapas e conteúdos, e vê só indicadores agregados.'
          }
          incluirGrupos={grupoAberto === 'usuarios'}
          themeStyle={props.themeStyle}
          aoFechar={() => {
            setGrupoAberto(undefined);
            setVersao((v: number) => v + 1);
          }}
        />
      )}
      {lembrete && (
        <ModalShell contextLabel={NOME_SOLUCAO} titleId="lembrete-titulo" onDismiss={() => !enviando && setLembrete(undefined)} themeStyle={props.themeStyle}>
          <h2 id="lembrete-titulo" className={crud.modalTitle}>
            Lembrar atrasados
          </h2>
          <p className={crud.modalText}>
            Serão enviados {totalAtrasados} e-mail(s), um por pessoa e jornada atrasada, com a sua conta. Ninguém vê os outros destinatários.
          </p>
          <ul>
            {lembrete.map((grupo) => (
              <li key={grupo.jornada.id}>
                {grupo.jornada.titulo}: {grupo.pessoas.length} pessoa(s)
              </li>
            ))}
          </ul>
          <footer className={crud.footer}>
            <span className={crud.helper}>Pessoas sem e-mail cadastrado são ignoradas.</span>
            <div className={crud.footerActions}>
              <DefaultButton text="Cancelar" onClick={() => setLembrete(undefined)} disabled={enviando} styles={secondaryButtonStyles} />
              <PrimaryButton text={enviando ? 'Enviando...' : 'Enviar lembretes'} onClick={enviarLembretes} disabled={enviando} styles={primaryButtonStyles} />
            </div>
          </footer>
        </ModalShell>
      )}
    </div>
  );
};

export default Gestao;
