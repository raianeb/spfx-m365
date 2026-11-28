// Skills aplicadas: spfx-padrao-visual-gti (receita "Editor": passos, formulário central, prévia ao vivo, barra de ações
// fixa, painel lateral por item), spfx-acessibilidade-conteudo (passo atual anunciado, reordenar por teclado além de
// arrastar, erro levando ao passo). Escopo, seção 6.4.
import * as React from 'react';
import { useEffect, useState } from 'react';
import { IArea } from '../../../../jornada/modelo';
import { IEtapa, PERCENTUAL_MINIMO_PADRAO, ordenarEtapas } from '../../../../jornada/progresso';
import { ErrosFormulario, IJornadaEstudio, IPessoaPublico, Moderacao, StatusJornada, moverEtapa, renumerar, validarJornada } from '../../../../jornada/estudio';
import { IPessoa } from '../../../../services/AreaService';
import { IArquivoBiblioteca } from '../../../../services/EstudioService';
import { mensagemDeErro } from '../../../../services/sp';
import { Empty, ErrorBox, Field, Icon, Loading, PageHeader, Panel } from '../gti';
import { IContextoTela, IJornadaVisivel } from '../tipos';
import { Alternar, Aviso, formatarDuracao, rotuloRegra, ROTULO_TIPO, textoErro } from '../comum/ui';
import PessoasPicker from '../comum/PessoasPicker';
import CardJornada from '../aprendizado/CardJornada';
import EtapaForm from './EtapaForm';
import PreviaJornada from './PreviaJornada';
import styles from '../jc.module.scss';

export interface IEditorJornadaProps {
  ctx: IContextoTela;
  area: IArea;
  gestor: boolean;
  /** 0 = nova jornada. */
  jornadaId: number;
}

const PASSOS: string[] = ['Dados gerais', 'Etapas', 'Público', 'Regras', 'Revisão'];

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

const novaEtapa = (ordem: number, id: number): IEtapa => ({
  id,
  jornadaId: 0,
  titulo: '',
  ordem,
  tipo: 'YouTube',
  url: '',
  duracaoMin: 10,
  instrucoes: '',
  regra: 'PercentualAssistido',
  percentualMinimo: PERCENTUAL_MINIMO_PADRAO
});

const EditorJornada: React.FC<IEditorJornadaProps> = ({ ctx, area, gestor, jornadaId }: IEditorJornadaProps) => {
  const { servicos, roteador, props } = ctx;
  const idBase: string = ctx.idTitulo;
  const [jornada, setJornada] = useState<IJornadaEstudio | undefined>(jornadaId ? undefined : novaJornada(area.id));
  const [etapas, setEtapas] = useState<IEtapa[] | undefined>(jornadaId ? undefined : []);
  const [removidas, setRemovidas] = useState<number[]>([]);
  const [curtidas, setCurtidas] = useState<Map<number, number>>(new Map<number, number>());
  const [arquivos, setArquivos] = useState<IArquivoBiblioteca[] | undefined>(undefined);
  const [passo, setPasso] = useState<number>(0);
  const [erros, setErros] = useState<ErrosFormulario>({});
  const [erroEtapas, setErroEtapas] = useState<string>('');
  const [editando, setEditando] = useState<{ etapa: IEtapa; nova: boolean } | undefined>(undefined);
  const [previa, setPrevia] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');
  const [falhaCarga, setFalhaCarga] = useState<string>('');
  const [proximoId, setProximoId] = useState<number>(-1);
  const [publicoModo, setPublicoModo] = useState<'todos' | 'especifico'>('todos');
  const [arrastando, setArrastando] = useState<number | undefined>(undefined);
  const [alvo, setAlvo] = useState<number | undefined>(undefined);

  useEffect(() => {
    let ativo: boolean = true;
    if (jornadaId) {
      (async (): Promise<void> => {
        const [lista, lidas] = await Promise.all([servicos.estudio.listar(area), servicos.jornadas.etapasDaJornada(area, jornadaId)]);
        const encontrada: IJornadaEstudio | undefined = lista.find((j: IJornadaEstudio) => j.id === jornadaId);
        if (!ativo) {
          return;
        }
        if (!encontrada) {
          setFalhaCarga('Jornada não encontrada nesta área.');
          return;
        }
        setJornada(encontrada);
        setPublicoModo(encontrada.publicoDetalhado.length ? 'especifico' : 'todos');
        setEtapas(ordenarEtapas(lidas));
      })().catch((falha: unknown) => ativo && setFalhaCarga(mensagemDeErro(falha, 'Abrir a jornada')));
      servicos.estudio
        .curtidasPorEtapa(area, jornadaId)
        .then((mapa: Map<number, number>) => ativo && setCurtidas(mapa))
        .catch(() => undefined);
    }
    servicos.estudio
      .arquivosDaBiblioteca(area, window.location.origin)
      .then((lista: IArquivoBiblioteca[]) => ativo && setArquivos(lista))
      .catch(() => ativo && setArquivos([]));
    return () => {
      ativo = false;
    };
  }, [servicos, area, jornadaId]);

  const voltar = (
    <a className={`pi-link-btn ${styles.voltar}`} href={roteador.hrefDe(`estudio/${area.id}`)} onClick={roteador.aoClicarLink(`estudio/${area.id}`)}>
      <Icon nome="esquerda" tamanho={14} />
      Estúdio
    </a>
  );
  if (falhaCarga) {
    return (
      <>
        {voltar}
        <ErrorBox mensagem={falhaCarga} />
      </>
    );
  }
  if (!jornada || !etapas) {
    return <Loading texto="Abrindo o editor…" />;
  }

  const alterar = (parcial: Partial<IJornadaEstudio>): void => {
    setJornada({ ...jornada, ...parcial });
    const chaves: string[] = Object.keys(parcial);
    if (chaves.some((c: string) => erros[c])) {
      const proximos: ErrosFormulario = { ...erros };
      chaves.forEach((c: string) => delete proximos[c]);
      setErros(proximos);
    }
  };

  const aplicarEtapa = (etapa: IEtapa): void => {
    const existe: boolean = etapas.some((e: IEtapa) => e.id === etapa.id);
    setEtapas(renumerar(existe ? etapas.map((e: IEtapa) => (e.id === etapa.id ? etapa : e)) : [...etapas, etapa]));
    setEditando(undefined);
    setErroEtapas('');
    ctx.avisar(existe ? 'Etapa atualizada.' : 'Etapa adicionada.');
  };

  const removerEtapa = (etapa: IEtapa): void => {
    setEtapas(renumerar(etapas.filter((e: IEtapa) => e.id !== etapa.id)));
    if (etapa.id > 0) {
      setRemovidas([...removidas, etapa.id]);
    }
    ctx.avisar(`"${etapa.titulo}" removida. A exclusão é gravada ao salvar.`);
  };

  const soltar = (destino: number): void => {
    if (arrastando === undefined || arrastando === destino) {
      return;
    }
    const copia: IEtapa[] = etapas.slice();
    const [movida] = copia.splice(arrastando, 1);
    copia.splice(destino, 0, movida);
    setEtapas(renumerar(copia));
  };

  /** Salva como rascunho, envia para aprovação (Apoio) ou publica (Gestor). */
  const salvar = async (acao: 'rascunho' | 'enviar' | 'publicar'): Promise<void> => {
    const encontrados: ErrosFormulario = validarJornada(jornada, props.siteUrl);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setPasso(encontrados.prazoDias ? 3 : 0);
      setErro('Corrija os campos destacados antes de salvar.');
      return;
    }
    if (acao !== 'rascunho' && etapas.length === 0) {
      setPasso(1);
      setErroEtapas('Adicione ao menos uma etapa antes de publicar.');
      return;
    }
    setSalvando(true);
    setErro('');
    // Jornada já publicada segue "Publicada" para os Usuários até a nova versão ser aprovada.
    const status: StatusJornada =
      acao === 'enviar' ? 'EmAprovacao' : acao === 'publicar' ? 'Publicada' : jornada.status === 'Publicada' ? 'Publicada' : 'Rascunho';
    const dados: IJornadaEstudio = { ...jornada, publicoDetalhado: publicoModo === 'todos' ? [] : jornada.publicoDetalhado };
    try {
      const id: number = await servicos.estudio.salvar(area, dados, etapas, removidas, status);
      if (acao === 'publicar') {
        await servicos.estudio.publicar(area, { ...dados, id });
      }
      ctx.avisar(
        acao === 'publicar'
          ? 'Jornada publicada. Ela já aparece para o público escolhido.'
          : acao === 'enviar'
            ? 'Enviada para aprovação dos gestores da área.'
            : 'Jornada salva.'
      );
      ctx.recarregarCatalogo();
      roteador.navegar(`estudio/${area.id}`);
    } catch (falha: unknown) {
      setErro(textoErro(falha, (e: unknown) => mensagemDeErro(e, 'Salvar a jornada')));
      setSalvando(false);
    }
  };

  const duracao: number = etapas.reduce((t: number, e: IEtapa) => t + (e.duracaoMin || 0), 0);
  const okPasso: boolean[] = [jornada.titulo.trim() !== '', etapas.length > 0, publicoModo === 'todos' || jornada.publicoDetalhado.length > 0, !erros.prazoDias, false];
  const previaCard: IJornadaVisivel = {
    area,
    jornada: { ...jornada, id: jornada.id || 1, titulo: jornada.titulo || 'Nome da jornada', dataPublicacao: jornada.dataPublicacao },
    etapas,
    percentual: 0,
    atrasada: false,
    duracaoMin: duracao
  };
  const publicoPessoas: IPessoa[] = jornada.publicoDetalhado.map((p: IPessoaPublico) => ({ loginName: p.loginName, nome: p.nome, email: '' }));

  return (
    <>
      {voltar}
      <PageHeader
        idTitulo={ctx.idTitulo}
        nivel={2}
        sobretitulo={`Estúdio · ${area.nome}`}
        titulo={jornada.id ? `Editar: ${jornada.titulo}` : 'Nova jornada'}
        descricao={
          jornada.status === 'Publicada'
            ? 'Jornada publicada: alterações nas etapas valem ao salvar; os dados da jornada passam por aprovação.'
            : 'Monte a jornada em cinco passos. Você pode salvar o rascunho a qualquer momento.'
        }
        acoes={
          <button type="button" className="pi-btn" onClick={() => setPrevia(true)}>
            <Icon nome="olho" tamanho={16} />
            Pré-visualizar
          </button>
        }
      />
      {jornada.moderacao === Moderacao.Rejeitado && jornada.comentarioModeracao && (
        <Aviso tom="erro">
          <b>Devolvida pelo gestor:</b> {jornada.comentarioModeracao}
        </Aviso>
      )}
      {erro && (
        <Aviso tom="erro" aoFechar={() => setErro('')}>
          {erro}
        </Aviso>
      )}

      <div className={styles.editor}>
        <nav className="pi-card" aria-label="Passos do editor">
          <ol className={styles.passos}>
            {PASSOS.map((rotulo: string, i: number) => (
              <li key={rotulo}>
                <button type="button" aria-current={i === passo ? 'step' : undefined} onClick={() => setPasso(i)}>
                  <span className={`${styles.passoNumero} ${okPasso[i] && i !== passo ? styles.passoOk : ''}`} aria-hidden="true">
                    {okPasso[i] && i !== passo ? <Icon nome="check" tamanho={13} /> : i + 1}
                  </span>
                  {rotulo}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <Panel>
          {passo === 0 && (
            <>
              <div className="pi-panel-head">
                <div>
                  <h2>Dados gerais</h2>
                  <p>O que é a jornada e o que a pessoa vai aprender</p>
                </div>
              </div>
              <div className="pi-form-grid">
                <Field id={`${idBase}-titulo-j`} rotulo="Nome da jornada" obrigatorio inteiro erro={erros.titulo}>
                  {(aria) => <input {...aria} maxLength={255} value={jornada.titulo} onChange={(e) => alterar({ titulo: e.target.value })} />}
                </Field>
                <Field id={`${idBase}-desc`} rotulo="Descrição" inteiro dica="Aparece no detalhe da jornada. Seja direto sobre o que a pessoa vai aprender.">
                  {(aria) => <textarea {...aria} value={jornada.descricao} onChange={(e) => alterar({ descricao: e.target.value })} />}
                </Field>
                <Field id={`${idBase}-cat`} rotulo="Categoria">
                  {(aria) => <input {...aria} maxLength={255} value={jornada.categoria} onChange={(e) => alterar({ categoria: e.target.value })} />}
                </Field>
                <Field id={`${idBase}-capa`} rotulo="Capa (endereço da imagem)" erro={erros.capa} dica="Opcional. Sem capa, o card usa a cor e o ícone da área.">
                  {(aria) => <input {...aria} type="url" value={jornada.capa} onChange={(e) => alterar({ capa: e.target.value })} />}
                </Field>
              </div>
            </>
          )}

          {passo === 1 && (
            <>
              <div className="pi-panel-head">
                <div>
                  <h2>Etapas</h2>
                  <p>Arraste para reordenar ou use as setas. Cada etapa tem uma regra de conclusão.</p>
                </div>
                <button
                  type="button"
                  className="pi-btn primary"
                  onClick={() => {
                    setEditando({ etapa: novaEtapa((etapas.length + 1) * 10, proximoId), nova: true });
                    setProximoId(proximoId - 1);
                  }}
                >
                  <Icon nome="mais" tamanho={16} />
                  Adicionar etapa
                </button>
              </div>
              {jornada.status === 'Publicada' && <Aviso tom="info">Esta jornada já está publicada: alterações nas etapas valem para os Usuários assim que você salvar.</Aviso>}
              {erroEtapas && <Aviso tom="erro">{erroEtapas}</Aviso>}
              {etapas.length === 0 ? (
                <Empty icone="camadas" titulo="Nenhuma etapa ainda" descricao="Adicione vídeos do YouTube, vídeos e documentos da biblioteca da área ou links, na ordem em que devem ser feitos." />
              ) : (
                <ol className={styles.listaEtapas} aria-label="Etapas">
                  {etapas.map((etapa: IEtapa, i: number) => (
                    <li
                      key={etapa.id}
                      className={`${styles.itemEtapa} ${arrastando === i ? styles.arrastando : ''} ${alvo === i && arrastando !== i ? styles.alvo : ''}`}
                      draggable
                      onDragStart={() => setArrastando(i)}
                      onDragEnd={() => {
                        setArrastando(undefined);
                        setAlvo(undefined);
                      }}
                      onDragOver={(e: React.DragEvent) => {
                        e.preventDefault();
                        setAlvo(i);
                      }}
                      onDrop={(e: React.DragEvent) => {
                        e.preventDefault();
                        soltar(i);
                        setArrastando(undefined);
                        setAlvo(undefined);
                      }}
                    >
                      <span className={styles.alca} aria-hidden="true">
                        <Icon nome="arrastar" tamanho={18} />
                      </span>
                      <span className={styles.ordem} aria-hidden="true">
                        {i + 1}
                      </span>
                      <span className={styles.itemTexto}>
                        <b>{etapa.titulo}</b>
                        <span>
                          {ROTULO_TIPO[etapa.tipo]} · {formatarDuracao(etapa.duracaoMin)} · {rotuloRegra(etapa)}
                          {etapa.id > 0 ? ` · ${curtidas.get(etapa.id) ?? 0} curtida(s)` : ''}
                        </span>
                      </span>
                      <button type="button" className={`pi-icon-btn ${styles.botaoIcone}`} aria-label={`Mover ${etapa.titulo} para cima`} disabled={i === 0} onClick={() => setEtapas(moverEtapa(etapas, i, -1))}>
                        <Icon nome="cima" tamanho={16} />
                      </button>
                      <button
                        type="button"
                        className={`pi-icon-btn ${styles.botaoIcone}`}
                        aria-label={`Mover ${etapa.titulo} para baixo`}
                        disabled={i === etapas.length - 1}
                        onClick={() => setEtapas(moverEtapa(etapas, i, 1))}
                      >
                        <Icon nome="baixo" tamanho={16} />
                      </button>
                      <button type="button" className={`pi-icon-btn ${styles.botaoIcone}`} aria-label={`Editar ${etapa.titulo}`} onClick={() => setEditando({ etapa, nova: false })}>
                        <Icon nome="lapis" tamanho={16} />
                      </button>
                      <button type="button" className={`pi-icon-btn ${styles.botaoIcone}`} aria-label={`Remover ${etapa.titulo}`} onClick={() => removerEtapa(etapa)}>
                        <Icon nome="lixeira" tamanho={16} />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}

          {passo === 2 && (
            <>
              <div className="pi-panel-head">
                <div>
                  <h2>Público</h2>
                  <p>Quem deve fazer esta jornada</p>
                </div>
              </div>
              <div role="radiogroup" aria-label="Público" style={{ display: 'grid', gap: 10 }}>
                {(
                  [
                    ['todos', 'Todos os Usuários da área', `Inclui os grupos do Entra ID do grupo de Usuários de ${area.nome}.`],
                    ['especifico', 'Pessoas específicas', 'Só as pessoas escolhidas veem a jornada no catálogo e em Meu aprendizado.']
                  ] as [('todos' | 'especifico'), string, string][]
                ).map(([valor, rotulo, texto]) => (
                  <button key={valor} type="button" role="radio" aria-checked={publicoModo === valor} className={styles.opcao} onClick={() => setPublicoModo(valor)}>
                    <span className={styles.radio} aria-hidden="true" />
                    <span>
                      <b>{rotulo}</b>
                      <span>{texto}</span>
                    </span>
                  </button>
                ))}
              </div>
              {publicoModo === 'especifico' && (
                <div style={{ marginTop: 16 }}>
                  <PessoasPicker
                    id={`${idBase}-publico`}
                    rotulo="Pessoas"
                    servico={servicos.areas}
                    selecionadas={publicoPessoas}
                    aoAlterar={(pessoas: IPessoa[]) => alterar({ publicoDetalhado: pessoas.map((p: IPessoa) => ({ loginName: p.loginName, nome: p.nome })) })}
                  />
                </div>
              )}
              <p className="pi-hint" style={{ marginTop: 14 }}>
                O público organiza a tela de cada pessoa. O conteúdo segue legível para toda a área: a permissão é do SharePoint.
              </p>
            </>
          )}

          {passo === 3 && (
            <>
              <div className="pi-panel-head">
                <div>
                  <h2>Regras</h2>
                  <p>Prazo, ordem e certificado</p>
                </div>
              </div>
              <Alternar rotulo="Obrigatória" explicacao="Aparece em destaque e entra nos indicadores de atraso." ligado={jornada.obrigatoria} aoAlterar={(v: boolean) => alterar({ obrigatoria: v })} />
              <Alternar rotulo="Ordem livre" explicacao="Desligado: cada etapa libera a próxima." ligado={jornada.ordemLivre} aoAlterar={(v: boolean) => alterar({ ordemLivre: v })} />
              <div style={{ maxWidth: 320, marginTop: 16 }}>
                <Field id={`${idBase}-prazo`} rotulo="Prazo (dias a partir da publicação)" erro={erros.prazoDias} dica="Vazio = sem prazo.">
                  {(aria) => (
                    <input
                      {...aria}
                      type="number"
                      min={1}
                      max={3650}
                      value={jornada.prazoDias === undefined ? '' : String(jornada.prazoDias)}
                      onChange={(e) => alterar({ prazoDias: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  )}
                </Field>
              </div>
              <Alternar
                rotulo="Emite certificado"
                explicacao="Integração com a solução de certificados existente (fase 4)."
                ligado={jornada.emiteCertificado}
                aoAlterar={(v: boolean) => alterar({ emiteCertificado: v })}
              />
              {jornada.emiteCertificado && (
                <div style={{ marginTop: 16 }}>
                  <Field id={`${idBase}-modelo`} rotulo="Modelo de certificado">
                    {(aria) => <input {...aria} value={jornada.modeloCertificado} onChange={(e) => alterar({ modeloCertificado: e.target.value })} />}
                  </Field>
                </div>
              )}
            </>
          )}

          {passo === 4 && (
            <>
              <div className="pi-panel-head">
                <div>
                  <h2>Revisão</h2>
                  <p>
                    {gestor
                      ? 'Ao publicar, a jornada aparece na hora para o público escolhido.'
                      : 'Ao enviar, um gestor da área revisa e publica. Até lá, só você e os gestores veem esta versão.'}
                  </p>
                </div>
              </div>
              <ul className={styles.checklist}>
                {(
                  [
                    [okPasso[0], 'Nome preenchido'],
                    [okPasso[1], `${etapas.length} etapa(s), ${formatarDuracao(duracao)} no total`],
                    [okPasso[2], publicoModo === 'todos' ? 'Público: todos da área' : `Público: ${jornada.publicoDetalhado.length} pessoa(s)`],
                    [true, jornada.prazoDias ? `Prazo de ${jornada.prazoDias} dias` : 'Sem prazo'],
                    [true, jornada.ordemLivre ? 'Ordem livre' : 'Ordem sequencial']
                  ] as [boolean, string][]
                ).map(([ok, texto]) => (
                  <li key={texto} className={ok ? styles.ok : undefined}>
                    <span className={styles.marca} aria-hidden="true">
                      <Icon nome={ok ? 'check' : 'alerta'} tamanho={13} />
                    </span>
                    {texto}
                    <span className="pi-sr">{ok ? ', pronto' : ', pendente'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <aside className={styles.previa} aria-label="Como as pessoas verão o card">
          <span className="pi-eyebrow">Como as pessoas verão</span>
          <CardJornada item={previaCard} roteador={roteador} siteUrl={props.siteUrl} estatico />
          <p className="pi-hint">
            {etapas.length} etapa(s) · {formatarDuracao(duracao)} no total
          </p>
        </aside>
      </div>

      <div className={styles.rodapeFixo}>
        <div className="pi-actions">
          <button type="button" className="pi-btn" disabled={passo === 0 || salvando} onClick={() => setPasso(passo - 1)}>
            <Icon nome="esquerda" tamanho={16} />
            Anterior
          </button>
          {passo < 4 && (
            <button type="button" className="pi-btn" disabled={salvando} onClick={() => setPasso(passo + 1)}>
              Próximo <Icon nome="direita" tamanho={16} />
            </button>
          )}
        </div>
        <div className="pi-actions">
          <button type="button" className="pi-btn" disabled={salvando} onClick={() => salvar('rascunho')}>
            {salvando ? 'Salvando…' : jornada.status === 'Publicada' ? 'Salvar alterações' : 'Salvar rascunho'}
          </button>
          {passo === 4 &&
            (gestor ? (
              <button type="button" className="pi-btn primary" disabled={salvando} onClick={() => salvar('publicar')}>
                <Icon nome="enviar" tamanho={16} />
                {salvando ? 'Publicando…' : 'Publicar'}
              </button>
            ) : (
              <button type="button" className="pi-btn primary" disabled={salvando} onClick={() => salvar('enviar')}>
                <Icon nome="enviar" tamanho={16} />
                {salvando ? 'Enviando…' : 'Enviar para publicação'}
              </button>
            ))}
        </div>
      </div>

      {editando && (
        <EtapaForm
          id={`${idBase}-etapa`}
          etapa={editando.etapa}
          nova={editando.nova}
          siteUrl={props.siteUrl}
          arquivos={arquivos}
          sufixoBiblioteca={area.sigla}
          aoFechar={() => setEditando(undefined)}
          aoSalvar={aplicarEtapa}
        />
      )}
      {previa && (
        <PreviaJornada id={`${idBase}-previa`} titulo={jornada.titulo} descricao={jornada.descricao} etapas={etapas} siteUrl={props.siteUrl} aoFechar={() => setPrevia(false)} />
      )}
    </>
  );
};

export default EditorJornada;
