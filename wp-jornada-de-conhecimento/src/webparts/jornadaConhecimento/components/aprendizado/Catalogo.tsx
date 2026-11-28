// Skills aplicadas: spfx-padrao-visual-gti (receita "Catálogo": recorte, filtros, contagem, grade ou lista),
// spfx-acessibilidade-conteudo (contagem anunciada, chips com aria-pressed). A busca é local, sobre o que foi carregado.
import * as React from 'react';
import { useMemo, useState } from 'react';
import { IArea } from '../../../../jornada/modelo';
import { Badge, Empty, ErrorBox, Icon, Loading, PageHeader, ProgressBar } from '../gti';
import { IContextoTela, IJornadaVisivel, rotaJornada } from '../tipos';
import { Estrelas, formatarDuracao } from '../comum/ui';
import { Situacao, normalizarBusca, ordenarPorPrioridade, situacaoDe, textoBusca } from './dadosCatalogo';
import CardJornada from './CardJornada';
import styles from '../jc.module.scss';

type Ordem = 'prioridade' | 'recentes' | 'nota' | 'curtas';
type FiltroSituacao = '' | Situacao | 'obrigatoria';

const ORDENS: { chave: Ordem; rotulo: string }[] = [
  { chave: 'prioridade', rotulo: 'Prioridade para mim' },
  { chave: 'recentes', rotulo: 'Mais recentes' },
  { chave: 'nota', rotulo: 'Melhor avaliadas' },
  { chave: 'curtas', rotulo: 'Mais curtas' }
];

const SITUACOES: { chave: FiltroSituacao; rotulo: string }[] = [
  { chave: '', rotulo: 'Qualquer situação' },
  { chave: 'nova', rotulo: 'Não iniciadas' },
  { chave: 'andamento', rotulo: 'Em andamento' },
  { chave: 'concluida', rotulo: 'Concluídas' },
  { chave: 'obrigatoria', rotulo: 'Obrigatórias' }
];

const Catalogo: React.FC<IContextoTela> = (ctx: IContextoTela) => {
  const { catalogo, roteador, props } = ctx;
  const [busca, setBusca] = useState<string>('');
  const [areaId, setAreaId] = useState<number | undefined>(undefined);
  const [categoria, setCategoria] = useState<string>('');
  const [situacao, setSituacao] = useState<FiltroSituacao>('');
  const [ordem, setOrdem] = useState<Ordem>('prioridade');
  const [vista, setVista] = useState<'grade' | 'lista'>('grade');
  const idBusca: string = `${ctx.idTitulo}-busca`;

  const itens: IJornadaVisivel[] = catalogo.tipo === 'pronto' ? catalogo.itens : [];
  const areas: IArea[] = useMemo(() => {
    const vistas: Map<number, IArea> = new Map<number, IArea>();
    itens.forEach((item: IJornadaVisivel) => vistas.set(item.area.id, item.area));
    return Array.from(vistas.values());
  }, [itens]);
  const categorias: string[] = useMemo(
    () => Array.from(new Set(itens.map((item: IJornadaVisivel) => item.jornada.categoria).filter(Boolean))).sort(),
    [itens]
  );

  const filtradas: IJornadaVisivel[] = useMemo(() => {
    const termo: string = normalizarBusca(busca);
    const lista: IJornadaVisivel[] = itens.filter(
      (item: IJornadaVisivel) =>
        (areaId === undefined || item.area.id === areaId) &&
        (!categoria || item.jornada.categoria === categoria) &&
        (!situacao || (situacao === 'obrigatoria' ? item.jornada.obrigatoria : situacaoDe(item) === situacao)) &&
        (!termo || textoBusca(item).indexOf(termo) !== -1)
    );
    switch (ordem) {
      case 'recentes':
        return lista.sort((a, b) => (b.jornada.dataPublicacao ?? '').localeCompare(a.jornada.dataPublicacao ?? ''));
      case 'nota':
        return lista.sort((a, b) => (b.nota?.media ?? 0) - (a.nota?.media ?? 0));
      case 'curtas':
        return lista.sort((a, b) => a.duracaoMin - b.duracaoMin);
      default:
        return ordenarPorPrioridade(lista);
    }
  }, [itens, busca, areaId, categoria, situacao, ordem]);

  const comFiltro: boolean = !!busca || areaId !== undefined || !!categoria || !!situacao;
  const limpar = (): void => {
    setBusca('');
    setAreaId(undefined);
    setCategoria('');
    setSituacao('');
  };

  return (
    <>
      <PageHeader
        idTitulo={ctx.idTitulo}
        nivel={2}
        sobretitulo="Aprendizado"
        titulo="Catálogo de jornadas"
        descricao="Todas as jornadas publicadas nas suas áreas. A busca considera título, descrição, categoria e etapas."
      />
      {catalogo.tipo === 'carregando' && <Loading texto="Carregando o catálogo…" />}
      {catalogo.tipo === 'erro' && <ErrorBox mensagem={catalogo.mensagem} aoTentarNovamente={ctx.recarregarCatalogo} />}
      {catalogo.tipo === 'pronto' && (
        <>
          {catalogo.areasComFalha.length > 0 && (
            <ErrorBox mensagem={`Não foi possível carregar: ${catalogo.areasComFalha.join(', ')}. As demais áreas aparecem normalmente.`} aoTentarNovamente={ctx.recarregarCatalogo} />
          )}
          {areas.length > 1 && (
            <div className="pi-chips" role="group" aria-label="Filtrar por área" style={{ marginBottom: 14 }}>
              <button type="button" className="pi-chip" aria-pressed={areaId === undefined} onClick={() => setAreaId(undefined)}>
                Todas as áreas
              </button>
              {areas.map((area: IArea) => (
                <button key={area.id} type="button" className="pi-chip" aria-pressed={areaId === area.id} onClick={() => setAreaId(area.id)}>
                  <i style={{ width: 8, height: 8, borderRadius: '50%', background: area.cor }} aria-hidden="true" />
                  {area.nome}
                </button>
              ))}
            </div>
          )}
          <div className="pi-card" style={{ marginBottom: 18 }}>
            <div className="pi-toolbar">
              <label className="pi-search" htmlFor={idBusca}>
                <Icon nome="busca" tamanho={16} />
                <span className="pi-sr">Buscar</span>
                <input id={idBusca} type="search" placeholder="Buscar por tema, etapa ou palavra-chave" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </label>
              {categorias.length > 0 && (
                <select className="pi-select" aria-label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option value="">Todas as categorias</option>
                  {categorias.map((c: string) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              )}
              <select className="pi-select" aria-label="Situação" value={situacao} onChange={(e) => setSituacao(e.target.value as FiltroSituacao)}>
                {SITUACOES.map((s) => (
                  <option key={s.chave} value={s.chave}>
                    {s.rotulo}
                  </option>
                ))}
              </select>
              <select className="pi-select" aria-label="Ordenar" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)}>
                {ORDENS.map((o) => (
                  <option key={o.chave} value={o.chave}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
              <div className="pi-chips" role="group" aria-label="Visualização">
                <button type="button" className="pi-chip" aria-pressed={vista === 'grade'} aria-label="Grade" onClick={() => setVista('grade')}>
                  <Icon nome="grade" tamanho={16} />
                </button>
                <button type="button" className="pi-chip" aria-pressed={vista === 'lista'} aria-label="Lista" onClick={() => setVista('lista')}>
                  <Icon nome="lista" tamanho={16} />
                </button>
              </div>
            </div>
          </div>
          <p className="pi-hint" role="status" style={{ marginBottom: 12 }}>
            {filtradas.length} jornada(s){comFiltro ? ' com os filtros aplicados' : ''}
          </p>
          {filtradas.length === 0 ? (
            <div className="pi-card">
              <Empty
                icone="busca"
                titulo={comFiltro ? 'Nenhuma jornada encontrada' : 'Nenhuma jornada publicada'}
                descricao={comFiltro ? 'Revise a busca ou os filtros.' : 'Quando houver jornadas publicadas nas suas áreas, elas aparecem aqui.'}
                acao={
                  comFiltro ? (
                    <button type="button" className="pi-btn" onClick={limpar}>
                      Limpar filtros
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : vista === 'grade' ? (
            <ul className={styles.grade}>
              {filtradas.map((item: IJornadaVisivel) => (
                <li key={`${item.area.id}-${item.jornada.id}`}>
                  <CardJornada item={item} roteador={roteador} siteUrl={props.siteUrl} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="pi-card pi-table-wrap">
              <table className="pi-table">
                <caption className="pi-sr">Jornadas do catálogo</caption>
                <thead>
                  <tr>
                    <th scope="col">Jornada</th>
                    <th scope="col">Área</th>
                    <th scope="col">Etapas</th>
                    <th scope="col">Duração</th>
                    <th scope="col">Nota</th>
                    <th scope="col">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((item: IJornadaVisivel) => {
                    const s = situacaoDe(item);
                    return (
                      <tr key={`${item.area.id}-${item.jornada.id}`}>
                        <td>
                          <a className="pi-link-btn" href={roteador.hrefDe(rotaJornada(item))} onClick={roteador.aoClicarLink(rotaJornada(item))}>
                            {item.jornada.titulo}
                          </a>{' '}
                          {item.jornada.obrigatoria && <Badge tom="warning">Obrigatória</Badge>}
                        </td>
                        <td>{item.area.nome}</td>
                        <td className="num">{item.etapas.length}</td>
                        <td>{formatarDuracao(item.duracaoMin)}</td>
                        <td>
                          <Estrelas nota={item.nota?.media ?? 0} total={item.nota?.total} />
                        </td>
                        <td style={{ minWidth: 150 }}>
                          {s === 'concluida' ? (
                            <Badge tom="success">Concluída</Badge>
                          ) : item.atrasada ? (
                            <Badge tom="danger">Atrasada · {item.percentual}%</Badge>
                          ) : s === 'andamento' ? (
                            <ProgressBar percentual={item.percentual} rotulo={`Progresso em ${item.jornada.titulo}`} />
                          ) : (
                            <Badge tom="neutral">Não iniciada</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default Catalogo;
