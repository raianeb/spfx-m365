// Skills aplicadas: spfx-padrao-visual-gti (modo B: navegação interna compacta, sem cabeçalho próprio — o site usa o
// ex-layout-sharepoint), spfx-configuracao-webpart (ambiente visível, troca de contexto descarta respostas antigas),
// spfx-implementacao-base (diagnóstico), spfx-codigo-performance (telas de gestão em pacotes sob demanda).
import * as React from 'react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { prefixosValidos } from '../../../core/prefixos';
import { IDiagnosticEntry } from '../../../core/diagnostics';
import { IResumoAvaliacoes } from '../../../jornada/progresso';
import { Aba, IArea } from '../../../jornada/modelo';
import { IAreaComPapel, IPerfil, PerfilService } from '../../../services/PerfilService';
import { EngajamentoService } from '../../../services/EngajamentoService';
import { ICatalogoArea, JornadaService } from '../../../services/JornadaService';
import { MatriculaService } from '../../../services/MatriculaService';
import { EstudioService } from '../../../services/EstudioService';
import { GestaoService } from '../../../services/GestaoService';
import { AreaService } from '../../../services/AreaService';
import { mensagemDeErro } from '../../../services/sp';
import {
  Diagnostics,
  Empty,
  ErrorBox,
  GtiRoot,
  IEventoLog,
  IGrupoNav,
  IItemNav,
  IResultadoBusca,
  Loading,
  NoAccess,
  QuickSearch,
  ToastProvider,
  WpNav,
  useToast,
  useWpRoute
} from './gti';
import { EstadoCatalogo, IContextoTela, IJornadaConhecimentoProps, IJornadaVisivel, IServicosJornada, NOME_SOLUCAO, rotaJornada, rotaPlayer } from './tipos';
import { chaveNota, montarVisiveis } from './aprendizado/dadosCatalogo';
import { ICONE_TIPO } from './comum/ui';
import Inicio from './aprendizado/Inicio';
import Catalogo from './aprendizado/Catalogo';
import MeuAprendizado from './aprendizado/MeuAprendizado';
import DetalheJornada from './aprendizado/DetalheJornada';
import Player from './player/Player';

// Telas de quem cria, gere e administra: carregadas só quando abertas (pacote inicial menor para os Usuários).
const Estudio = lazy(() => import(/* webpackChunkName: 'jc-estudio' */ './estudio/Estudio'));
const Gestao = lazy(() => import(/* webpackChunkName: 'jc-gestao' */ './gestao/Gestao'));
const Administracao = lazy(() => import(/* webpackChunkName: 'jc-administracao' */ './administracao/AdministracaoTab'));

type Carga = { tipo: 'carregando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'pronto'; perfil: IPerfil };

const PERFIL_PENDENTE: IPerfil = {
  situacao: 'configuracaoPendente',
  administrador: false,
  podePrepararSite: false,
  usuarioId: 0,
  areas: [],
  abas: ['minhas'],
  listaAreas: ''
};

/** Diagnóstico do padrão GTI alimentado pelo logger da instância (só com "Exibir log"). */
const DiagnosticoInstancia: React.FC<{ props: IJornadaConhecimentoProps }> = ({ props }: { props: IJornadaConhecimentoProps }) => {
  const [, setVersao] = useState<number>(0);
  useEffect(() => props.logger.subscribe(() => setVersao((v: number) => v + 1)), [props.logger]);
  const eventos: IEventoLog[] = props.logger.entries
    .slice()
    .reverse()
    .map((e: IDiagnosticEntry) => ({ quando: e.time, escopo: e.scope, mensagem: e.message, erro: e.level === 'error' }));
  return <Diagnostics visivel={props.logger.enabled} eventos={eventos} ambiente={props.environment} />;
};

/** Telas da navegação conforme o perfil (escopo, seção 2). */
const gruposNav = (perfil: IPerfil | undefined): IGrupoNav[] => {
  const grupos: IGrupoNav[] = [
    {
      itens: [
        { rota: 'inicio', rotulo: 'Início', icone: 'inicio' },
        { rota: 'catalogo', rotulo: 'Catálogo', icone: 'grade', ativoEm: ['jornada', 'player'] },
        { rota: 'aprendizado', rotulo: 'Meu aprendizado', icone: 'capelo' }
      ]
    }
  ];
  const abas: string[] = perfil?.abas ?? [];
  const equipe: IItemNav[] = [];
  if (abas.indexOf('estudio') !== -1) {
    equipe.push({ rota: 'estudio', rotulo: 'Estúdio', icone: 'lapis', ativoEm: ['editor'] });
  }
  if (abas.indexOf('gestao') !== -1) {
    equipe.push({ rota: 'gestao', rotulo: 'Gestão da área', icone: 'grafico' });
  }
  if (equipe.length) {
    grupos.push({ itens: equipe });
  }
  if (abas.indexOf('administracao') !== -1) {
    grupos.push({ itens: [{ rota: 'admin', rotulo: 'Administração', icone: 'predio' }] });
  }
  return grupos;
};

const Aplicacao: React.FC<IJornadaConhecimentoProps> = (props: IJornadaConhecimentoProps) => {
  const { sp, environment, prefixos, adminGroupIds, logger, siteUrl } = props;
  const { avisar } = useToast();
  const [carga, setCarga] = useState<Carga>({ tipo: 'carregando' });
  const [versaoPerfil, setVersaoPerfil] = useState<number>(0);
  const [catalogo, setCatalogo] = useState<EstadoCatalogo>({ tipo: 'carregando' });
  const [versaoCatalogo, setVersaoCatalogo] = useState<number>(0);
  const [buscaAberta, setBuscaAberta] = useState<boolean>(false);
  const roteador = useWpRoute({ rotaInicial: 'inicio', prefixo: 'jc', sincronizarHash: true });
  const idTitulo: string = `jc-${React.useId().replace(/:/g, '')}-titulo`;

  // Contexto de dados: trocar site, ambiente, prefixos ou grupos de Administradores recarrega tudo.
  const chaveContexto: string = `${siteUrl}|${environment}|${prefixos.PROD}|${prefixos.HML}|${adminGroupIds.join(',')}`;
  const perfilServico: PerfilService = useMemo(() => new PerfilService(sp, environment, prefixos, adminGroupIds, logger), [sp, chaveContexto]);
  const servicos: IServicosJornada = useMemo(() => {
    const jornadas: JornadaService = new JornadaService(sp, environment, prefixos, logger);
    return {
      jornadas,
      matriculas: new MatriculaService(sp, jornadas, logger),
      engajamento: new EngajamentoService(sp, jornadas, logger),
      estudio: new EstudioService(sp, jornadas, logger),
      gestao: new GestaoService(sp, jornadas, logger),
      areas: new AreaService(sp, environment, prefixos, logger)
    };
  }, [sp, chaveContexto]);

  // Perfil do usuário logado.
  useEffect(() => {
    let ativo: boolean = true;
    setCarga({ tipo: 'carregando' });
    if (environment === 'HML' && !prefixosValidos(prefixos)) {
      setCarga({ tipo: 'pronto', perfil: PERFIL_PENDENTE });
      return undefined;
    }
    perfilServico
      .carregar()
      .then((perfil: IPerfil) => ativo && setCarga({ tipo: 'pronto', perfil }))
      .catch((erro: unknown) => {
        if (ativo) {
          const mensagem: string = mensagemDeErro(erro, 'Carregar o perfil');
          logger.log('error', 'Perfil', mensagem);
          setCarga({ tipo: 'erro', mensagem });
        }
      });
    return () => {
      ativo = false;
    };
  }, [perfilServico, versaoPerfil]);

  const perfil: IPerfil | undefined = carga.tipo === 'pronto' ? carga.perfil : undefined;
  const areasUsuario: IArea[] = useMemo(
    () => (perfil ? perfil.areas.filter((item: IAreaComPapel) => item.area.status === 'Ativa' && item.papeis.usuario).map((item: IAreaComPapel) => item.area) : []),
    [perfil]
  );

  // Catálogo do usuário: uma carga por área e notas dos cards sem bloquear a tela.
  useEffect(() => {
    if (!perfil || perfil.situacao !== 'ok') {
      return undefined;
    }
    let ativo: boolean = true;
    setCatalogo((atual: EstadoCatalogo) => (atual.tipo === 'pronto' ? atual : { tipo: 'carregando' }));
    servicos.jornadas
      .carregarCatalogo(areasUsuario, perfil.usuarioId)
      .then(async (resultado: ICatalogoArea[]) => {
        if (!ativo) {
          return;
        }
        const notas: Map<string, IResumoAvaliacoes> = new Map<string, IResumoAvaliacoes>();
        const montar = (): void =>
          setCatalogo({
            tipo: 'pronto',
            itens: montarVisiveis(resultado, perfil, props.loginUsuario, notas, new Date()),
            areasComFalha: resultado.filter((a: ICatalogoArea) => !!a.erro).map((a: ICatalogoArea) => a.area.nome)
          });
        montar();
        await Promise.all(
          resultado.map((area: ICatalogoArea) =>
            servicos.engajamento
              .resumosDosCards(area.area, area.jornadas.map((j) => j.id))
              .then((mapa: Map<number, IResumoAvaliacoes>) => mapa.forEach((r: IResumoAvaliacoes, id: number) => notas.set(chaveNota(area.area.id, id), r)))
              .catch(() => undefined)
          )
        );
        if (ativo) {
          montar();
        }
      })
      .catch((erro: unknown) => ativo && setCatalogo({ tipo: 'erro', mensagem: mensagemDeErro(erro, 'Carregar as jornadas') }));
    return () => {
      ativo = false;
    };
  }, [servicos, perfil, areasUsuario, versaoCatalogo]);

  // Troca de tela: foco no título (anúncio para leitor de tela) e topo da web part visível.
  useEffect(() => {
    const titulo: HTMLElement | null = document.getElementById(idTitulo);
    if (titulo) {
      titulo.focus({ preventScroll: true });
      const raiz: HTMLElement | null = titulo.closest('section');
      const topo: number = (raiz ?? titulo).getBoundingClientRect().top;
      if (topo < 0) {
        (raiz ?? titulo).scrollIntoView({ block: 'start' });
      }
    }
    logger.log('info', 'Rota', `#jc/${roteador.rota}`);
  }, [roteador.rota]);

  const recarregarCatalogo = useCallback(() => setVersaoCatalogo((v: number) => v + 1), []);
  const recarregarPerfil = useCallback(() => setVersaoPerfil((v: number) => v + 1), []);

  const buscar = useCallback(
    (texto: string): IResultadoBusca[] => {
      const q: string = texto.toLowerCase().trim();
      const telas: IResultadoBusca[] = gruposNav(perfil)
        .reduce((todos: IItemNav[], g: IGrupoNav) => todos.concat(g.itens), [])
        .map((i: IItemNav) => ({ chave: `t-${i.rota}`, grupo: 'Telas', titulo: i.rotulo, detalhe: 'Ir para', icone: i.icone, rota: i.rota }));
      const itens: IJornadaVisivel[] = catalogo.tipo === 'pronto' ? catalogo.itens : [];
      const jornadas: IResultadoBusca[] = itens.map((i: IJornadaVisivel) => ({
        chave: `j-${i.area.id}-${i.jornada.id}`,
        grupo: 'Jornadas',
        titulo: i.jornada.titulo,
        detalhe: `${i.area.nome} · ${i.etapas.length} etapa(s) · ${i.percentual}%`,
        icone: 'livro',
        rota: rotaJornada(i)
      }));
      const etapas: IResultadoBusca[] = q
        ? itens.reduce(
            (todos: IResultadoBusca[], i: IJornadaVisivel) =>
              todos.concat(
                i.etapas.map((e) => ({
                  chave: `e-${i.area.id}-${e.id}`,
                  grupo: 'Etapas',
                  titulo: e.titulo,
                  detalhe: i.jornada.titulo,
                  icone: ICONE_TIPO[e.tipo],
                  rota: rotaPlayer(i, e.id)
                }))
              ),
            []
          )
        : [];
      return [...telas, ...jornadas, ...etapas].filter((r: IResultadoBusca) => !q || `${r.titulo} ${r.detalhe ?? ''}`.toLowerCase().indexOf(q) !== -1);
    },
    [perfil, catalogo]
  );

  if (carga.tipo === 'carregando') {
    return <Loading texto="Carregando seu perfil…" />;
  }
  if (carga.tipo === 'erro') {
    return <ErrorBox mensagem={carga.mensagem} aoTentarNovamente={recarregarPerfil} />;
  }
  const p: IPerfil = carga.perfil;
  if (p.situacao === 'configuracaoPendente') {
    return (
      <div className="pi-card">
        <Empty
          icone="engrenagem"
          titulo="Configuração pendente"
          descricao="O ambiente HML precisa de um prefixo próprio, diferente do de PROD (padrão: HML_). Ajuste em Propriedades da web part > Dados e ambiente."
        />
      </div>
    );
  }

  const ctx: IContextoTela = { props, perfil: p, servicos, roteador, catalogo, recarregarCatalogo, recarregarPerfil, avisar, idTitulo };
  const tela: string = roteador.tela || 'inicio';
  const pode = (aba: Aba): boolean => p.abas.indexOf(aba) !== -1;
  const semAcesso = <NoAccess aoVoltar={() => roteador.navegar('inicio')} />;
  const semLista = (
    <div className="pi-card">
      <Empty
        icone="predio"
        titulo="Estrutura ainda não criada"
        descricao="A lista central deste ambiente ainda não existe. Peça ao administrador para executar o provisionamento."
      />
    </div>
  );

  let conteudo: React.ReactNode;
  if (tela === 'admin') {
    conteudo = pode('administracao') ? <Administracao {...ctx} /> : semAcesso;
  } else if (p.situacao === 'semListaCentral') {
    conteudo = semLista;
  } else if (tela === 'estudio' || tela === 'editor') {
    conteudo = pode('estudio') ? <Estudio {...ctx} /> : semAcesso;
  } else if (tela === 'gestao') {
    conteudo = pode('gestao') ? <Gestao {...ctx} /> : semAcesso;
  } else if (tela === 'catalogo') {
    conteudo = <Catalogo {...ctx} />;
  } else if (tela === 'aprendizado') {
    conteudo = <MeuAprendizado {...ctx} />;
  } else if (tela === 'jornada') {
    conteudo = <DetalheJornada {...ctx} />;
  } else if (tela === 'player') {
    conteudo = <Player {...ctx} />;
  } else {
    conteudo = <Inicio {...ctx} />;
  }

  return (
    <>
      <WpNav ambiente={environment} grupos={gruposNav(p)} roteador={roteador} aoBuscar={() => setBuscaAberta(true)} rotuloNavegacao={`Telas de ${props.title || NOME_SOLUCAO}`} />
      <Suspense fallback={<Loading />}>{conteudo}</Suspense>
      <DiagnosticoInstancia props={props} />
      {buscaAberta && (
        <QuickSearch id={`${idTitulo}-busca`} buscar={buscar} dica="Buscar jornadas, etapas e telas" aoEscolher={roteador.navegar} aoFechar={() => setBuscaAberta(false)} />
      )}
    </>
  );
};


const JornadaConhecimento: React.FC<IJornadaConhecimentoProps> = (props: IJornadaConhecimentoProps) => (
  <section aria-label={props.title || NOME_SOLUCAO}>
    <GtiRoot estilo={props.themeStyle}>
      <ToastProvider>
        <Aplicacao {...props} />
      </ToastProvider>
    </GtiRoot>
  </section>
);

export default JornadaConhecimento;
