// Skills aplicadas: spfx-design-base (cabeçalho, filtros, cards, estados), spfx-acessibilidade-conteudo (botões com
// estado anunciado, atraso em texto e não só cor), spfx-codigo-performance (uma carga em lote; notas com cache).
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { IArea } from '../../../../jornada/modelo';
import { IResumoAvaliacoes, atrasada, dataLimite, minutosConcluidos, percentualConcluido, publicoInclui } from '../../../../jornada/progresso';
import { urlSegura } from '../../../../jornada/conteudo';
import { ICatalogoArea } from '../../../../services/JornadaService';
import { IAreaComPapel, IPerfil } from '../../../../services/PerfilService';
import { mensagemDeErro } from '../../../../services/sp';
import { IJornadaVisivel, IServicosJornada } from '../tipos';
import Estado from '../comum/Estado';
import { AnelProgresso, Estrelas } from '../comum/Indicadores';
import styles from './MinhasJornadas.module.scss';

export interface IMinhasJornadasProps {
  perfil: IPerfil;
  servicos: IServicosJornada;
  siteUrl: string;
  nomeUsuario: string;
  loginUsuario: string;
  /** Muda quando o player grava progresso, para recarregar os cards ao voltar. */
  versao: number;
  aoAbrir: (item: IJornadaVisivel) => void;
}

type Filtro = 'paraMim' | 'andamento' | 'concluidas';

const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: 'paraMim', rotulo: 'Para mim' },
  { chave: 'andamento', rotulo: 'Em andamento' },
  { chave: 'concluidas', rotulo: 'Concluídas' }
];

const formatarData = (data: Date): string => data.toLocaleDateString('pt-BR');
const formatarDuracao = (minutos: number): string =>
  minutos >= 60 ? `${Math.floor(minutos / 60)} h ${minutos % 60 ? `${minutos % 60} min` : ''}`.trim() : `${minutos} min`;

/** Monta a lista visível: público específico vale para Usuários; Gestores e Apoio veem todas da área. */
const montarVisiveis = (catalogo: ICatalogoArea[], perfil: IPerfil, loginUsuario: string, agora: Date): IJornadaVisivel[] => {
  const itens: IJornadaVisivel[] = [];
  catalogo.forEach((area: ICatalogoArea) => {
    const papel: IAreaComPapel | undefined = perfil.areas.find((item: IAreaComPapel) => item.area.id === area.area.id);
    const equipe: boolean = !!papel && (papel.papeis.gestor || papel.papeis.apoio);
    area.jornadas
      .filter((jornada) => equipe || publicoInclui(jornada, loginUsuario))
      .forEach((jornada) => {
        const etapas = area.etapas.get(jornada.id) ?? [];
        const matricula = area.matriculas.get(jornada.id);
        itens.push({
          area: area.area,
          jornada,
          etapas,
          matricula,
          percentual: matricula ? (matricula.status === 'Concluida' ? 100 : percentualConcluido(etapas, matricula.progresso)) : 0,
          atrasada: atrasada(jornada, matricula, agora),
          limite: dataLimite(jornada),
          duracaoMin: etapas.reduce((total: number, etapa) => total + (etapa.duracaoMin || 0), 0)
        });
      });
  });
  // Atrasadas primeiro, depois obrigatórias, depois as mais recentes.
  return itens.sort(
    (a: IJornadaVisivel, b: IJornadaVisivel) =>
      Number(b.atrasada) - Number(a.atrasada) ||
      Number(b.jornada.obrigatoria) - Number(a.jornada.obrigatoria) ||
      (b.jornada.dataPublicacao ?? '').localeCompare(a.jornada.dataPublicacao ?? '')
  );
};

const MinhasJornadas: React.FC<IMinhasJornadasProps> = (props: IMinhasJornadasProps) => {
  const { perfil, servicos, loginUsuario, versao } = props;
  const [catalogo, setCatalogo] = useState<ICatalogoArea[] | undefined>(undefined);
  const [erro, setErro] = useState<string>('');
  const [filtro, setFiltro] = useState<Filtro>('paraMim');
  const [areaFiltro, setAreaFiltro] = useState<number | undefined>(undefined);
  const [notas, setNotas] = useState<Map<string, IResumoAvaliacoes>>(new Map<string, IResumoAvaliacoes>());
  const [tentativa, setTentativa] = useState<number>(0);

  const areas: IArea[] = useMemo(
    () => perfil.areas.filter((item: IAreaComPapel) => item.area.status === 'Ativa' && item.papeis.usuario).map((item: IAreaComPapel) => item.area),
    [perfil]
  );

  useEffect(() => {
    let ativo: boolean = true;
    setErro('');
    servicos.jornadas
      .carregarCatalogo(areas, perfil.usuarioId)
      .then((resultado: ICatalogoArea[]) => {
        if (!ativo) {
          return;
        }
        setCatalogo(resultado);
        // Notas médias dos cards, por área, sem bloquear a tela.
        resultado.forEach((area: ICatalogoArea) => {
          servicos.engajamento
            .resumosDosCards(area.area, area.jornadas.map((jornada) => jornada.id))
            .then((resumos: Map<number, IResumoAvaliacoes>) => {
              if (ativo) {
                setNotas((atual: Map<string, IResumoAvaliacoes>) => {
                  const proximo: Map<string, IResumoAvaliacoes> = new Map<string, IResumoAvaliacoes>(atual);
                  resumos.forEach((resumo: IResumoAvaliacoes, id: number) => proximo.set(`${area.area.id}-${id}`, resumo));
                  return proximo;
                });
              }
            })
            .catch(() => undefined);
        });
      })
      .catch((falha: unknown) => ativo && setErro(mensagemDeErro(falha, 'Carregar as jornadas')));
    return () => {
      ativo = false;
    };
  }, [servicos, areas, perfil.usuarioId, versao, tentativa]);

  const visiveis: IJornadaVisivel[] = useMemo(
    () => (catalogo ? montarVisiveis(catalogo, perfil, loginUsuario, new Date()) : []),
    [catalogo, perfil, loginUsuario]
  );

  if (areas.length === 0) {
    return <Estado titulo="Nenhuma jornada disponível" texto="Você ainda não participa de nenhuma área. Fale com o gestor da sua área para ser incluído." />;
  }
  if (erro) {
    return (
      <Estado titulo="Não foi possível carregar as jornadas" texto={erro} papel="alert">
        <DefaultButton text="Tentar novamente" onClick={() => setTentativa((v: number) => v + 1)} />
      </Estado>
    );
  }
  if (!catalogo) {
    return <Spinner size={SpinnerSize.medium} label="Carregando suas jornadas..." />;
  }

  const emAndamento: IJornadaVisivel[] = visiveis.filter((item) => item.matricula?.status === 'EmAndamento');
  const concluidas: IJornadaVisivel[] = visiveis.filter((item) => item.matricula?.status === 'Concluida');
  const minutos: number = visiveis.reduce(
    (total: number, item: IJornadaVisivel) => total + (item.matricula ? minutosConcluidos(item.etapas, item.matricula.progresso) : 0),
    0
  );
  const continuar: IJornadaVisivel | undefined = emAndamento
    .slice()
    .sort((a, b) => (b.matricula?.ultimoAcesso ?? '').localeCompare(a.matricula?.ultimoAcesso ?? ''))[0];

  const porArea: IJornadaVisivel[] = areaFiltro === undefined ? visiveis : visiveis.filter((item) => item.area.id === areaFiltro);
  const exibidas: IJornadaVisivel[] =
    filtro === 'andamento'
      ? porArea.filter((item) => item.matricula?.status === 'EmAndamento')
      : filtro === 'concluidas'
        ? porArea.filter((item) => item.matricula?.status === 'Concluida')
        : porArea.filter((item) => item.matricula?.status !== 'Concluida');
  const areasComJornada: IArea[] = areas.filter((area: IArea) => visiveis.some((item) => item.area.id === area.id));
  const primeiroNome: string = props.nomeUsuario.split(' ')[0] || '';

  return (
    <div className={styles.root}>
      <div className={styles.topo}>
        <div>
          <h3 className={styles.saudacao}>{primeiroNome ? `Olá, ${primeiroNome}!` : 'Olá!'}</h3>
          <dl className={styles.numeros}>
            <div className={styles.numero}>
              <dt>Em andamento</dt>
              <dd>{emAndamento.length}</dd>
            </div>
            <div className={styles.numero}>
              <dt>Concluídas</dt>
              <dd>{concluidas.length}</dd>
            </div>
            <div className={styles.numero}>
              <dt>Horas de aprendizado</dt>
              <dd>{(minutos / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</dd>
            </div>
          </dl>
        </div>
        {continuar && (
          <section className={styles.continuar} aria-label="Continuar de onde parei" style={{ borderLeftColor: continuar.area.cor }}>
            <span className={styles.continuarRotulo}>Continuar de onde parei</span>
            <strong className={styles.continuarTitulo}>{continuar.jornada.titulo}</strong>
            <span className={styles.meta}>
              {continuar.area.nome} · {continuar.percentual}% concluído
            </span>
            <PrimaryButton iconProps={{ iconName: 'Play' }} text="Continuar" onClick={() => props.aoAbrir(continuar)} />
          </section>
        )}
      </div>

      {areasComJornada.length > 1 && (
        <div className={styles.chips} role="group" aria-label="Filtrar por área">
          <button type="button" className={styles.chip} aria-pressed={areaFiltro === undefined} onClick={() => setAreaFiltro(undefined)}>
            Todas
          </button>
          {areasComJornada.map((area: IArea) => (
            <button
              key={area.id}
              type="button"
              className={styles.chip}
              style={{ borderColor: area.cor }}
              aria-pressed={areaFiltro === area.id}
              onClick={() => setAreaFiltro(area.id)}
            >
              <Icon iconName={area.icone} style={{ color: area.cor }} aria-hidden="true" /> {area.nome}
            </button>
          ))}
        </div>
      )}

      <div className={styles.filtros} role="group" aria-label="Situação das jornadas">
        {FILTROS.map((item) => (
          <button key={item.chave} type="button" className={styles.filtro} aria-pressed={filtro === item.chave} onClick={() => setFiltro(item.chave)}>
            {item.rotulo}
          </button>
        ))}
      </div>

      {exibidas.length === 0 ? (
        <Estado
          titulo={filtro === 'concluidas' ? 'Nenhuma jornada concluída ainda' : filtro === 'andamento' ? 'Nenhuma jornada em andamento' : 'Tudo em dia'}
          texto={filtro === 'paraMim' ? 'Não há jornadas pendentes para você agora.' : 'Quando houver, elas aparecem aqui.'}
        />
      ) : (
        <ul className={styles.grade} aria-label="Jornadas">
          {exibidas.map((item: IJornadaVisivel) => {
            const nota: IResumoAvaliacoes | undefined = notas.get(`${item.area.id}-${item.jornada.id}`);
            const capa: string = urlSegura(item.jornada.capa, props.siteUrl);
            const acao: string = item.matricula?.status === 'Concluida' ? 'Rever' : item.matricula ? 'Continuar' : 'Começar';
            return (
              <li key={`${item.area.id}-${item.jornada.id}`} className={styles.card}>
                <div className={styles.capa} style={{ backgroundColor: item.area.cor }}>
                  {capa ? <img src={capa} alt="" loading="lazy" /> : <Icon iconName={item.area.icone} className={styles.capaIcone} aria-hidden="true" />}
                </div>
                <div className={styles.corpo}>
                  <span className={styles.area} style={{ color: item.area.cor }}>
                    {item.area.nome}
                  </span>
                  <h4 className={styles.titulo}>{item.jornada.titulo}</h4>
                  <div className={styles.selos}>
                    {item.jornada.obrigatoria && <span className={styles.selo}>Obrigatória</span>}
                    {item.limite && (
                      <span className={`${styles.selo} ${item.atrasada ? styles.seloAtrasada : ''}`}>
                        <Icon iconName={item.atrasada ? 'Warning' : 'Calendar'} aria-hidden="true" />{' '}
                        {item.atrasada ? `Atrasada (prazo ${formatarData(item.limite)})` : `Prazo ${formatarData(item.limite)}`}
                      </span>
                    )}
                  </div>
                  <span className={styles.meta}>
                    {item.etapas.length} etapa(s) · {formatarDuracao(item.duracaoMin)}
                  </span>
                  <Estrelas nota={nota?.media ?? 0} total={nota?.total} />
                </div>
                <div className={styles.rodape}>
                  <AnelProgresso percentual={item.percentual} />
                  <DefaultButton text={acao} ariaLabel={`${acao}: ${item.jornada.titulo}`} onClick={() => props.aoAbrir(item)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MinhasJornadas;
