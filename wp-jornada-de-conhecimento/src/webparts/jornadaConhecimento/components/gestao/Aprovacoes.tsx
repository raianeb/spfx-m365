// Skills aplicadas: spfx-padrao-visual-gti (fila em cartões com etapas, devolução com comentário em painel lateral),
// spfx-acessibilidade-conteudo. Escopo, seção 6.3 ("Aprovações"): Publicar e Devolver com comentário.
import * as React from 'react';
import { useEffect, useState } from 'react';
import { IArea } from '../../../../jornada/modelo';
import { IEtapa } from '../../../../jornada/progresso';
import { IJornadaEstudio, ROTULO_SITUACAO, SituacaoPublicacao, situacaoPublicacao } from '../../../../jornada/estudio';
import { mensagemDeErro } from '../../../../services/sp';
import { Badge, Empty, ErrorBox, Field, GtiDialog, Icon, Loading, Panel } from '../gti';
import { IContextoTela } from '../tipos';
import { ICONE_TIPO, ROTULO_TIPO, dataCurta, formatarDuracao, rotuloRegra, textoErro } from '../comum/ui';
import PreviaJornada from '../estudio/PreviaJornada';
import styles from '../jc.module.scss';

export const aguardando = (jornada: IJornadaEstudio): boolean => {
  const situacao: SituacaoPublicacao = situacaoPublicacao(jornada.status, jornada.moderacao, !!jornada.dataPublicacao);
  return situacao === 'emAprovacao' || situacao === 'alteracoesPendentes';
};

export interface IAprovacoesProps {
  ctx: IContextoTela;
  area: IArea;
  aoContar: (n: number) => void;
  aoPublicar: () => void;
}

const Aprovacoes: React.FC<IAprovacoesProps> = ({ ctx, area, aoContar, aoPublicar }: IAprovacoesProps) => {
  const { servicos } = ctx;
  const [lista, setLista] = useState<{ jornada: IJornadaEstudio; etapas: IEtapa[] }[] | undefined>(undefined);
  const [previa, setPrevia] = useState<{ jornada: IJornadaEstudio; etapas: IEtapa[] } | undefined>(undefined);
  const [devolvendo, setDevolvendo] = useState<IJornadaEstudio | undefined>(undefined);
  const [comentario, setComentario] = useState<string>('');
  const [tentou, setTentou] = useState<boolean>(false);
  const [ocupado, setOcupado] = useState<number | undefined>(undefined);
  const [erro, setErro] = useState<string>('');
  const [versao, setVersao] = useState<number>(0);

  useEffect(() => {
    let ativo: boolean = true;
    setErro('');
    (async (): Promise<void> => {
      const pendentes: IJornadaEstudio[] = (await servicos.estudio.listar(area)).filter(aguardando);
      const comEtapas = await Promise.all(pendentes.map(async (jornada: IJornadaEstudio) => ({ jornada, etapas: await servicos.jornadas.etapasDaJornada(area, jornada.id) })));
      if (ativo) {
        setLista(comEtapas);
        aoContar(comEtapas.length);
      }
    })().catch((falha: unknown) => ativo && setErro(mensagemDeErro(falha, 'Carregar as aprovações')));
    return () => {
      ativo = false;
    };
  }, [servicos, area, versao]);

  const executar = async (jornada: IJornadaEstudio, acao: () => Promise<void>, sucesso: string): Promise<boolean> => {
    setOcupado(jornada.id);
    setErro('');
    try {
      await acao();
      ctx.avisar(sucesso);
      setVersao((v: number) => v + 1);
      aoPublicar();
      return true;
    } catch (falha: unknown) {
      setErro(textoErro(falha, (e: unknown) => mensagemDeErro(e, 'Atualizar a jornada')));
      return false;
    } finally {
      setOcupado(undefined);
    }
  };

  const devolver = async (): Promise<void> => {
    setTentou(true);
    if (!devolvendo || comentario.trim() === '') {
      return;
    }
    const alvo: IJornadaEstudio = devolvendo;
    if (await executar(alvo, () => servicos.estudio.devolver(area, alvo.id, comentario.trim()), `"${alvo.titulo}" foi devolvida para ajustes.`)) {
      setDevolvendo(undefined);
      setComentario('');
      setTentou(false);
    }
  };

  if (erro && !lista) {
    return <ErrorBox mensagem={erro} aoTentarNovamente={() => setVersao((v: number) => v + 1)} />;
  }
  if (!lista) {
    return <Loading texto="Carregando aprovações…" />;
  }
  return (
    <>
      {erro && <ErrorBox mensagem={erro} />}
      {lista.length === 0 ? (
        <div className="pi-card">
          <Empty icone="caixaEntrada" titulo="Nada aguardando aprovação" descricao="Quando a Equipe de apoio enviar uma jornada, ela aparece aqui." />
        </div>
      ) : (
        lista.map(({ jornada, etapas }) => {
          const situacao: SituacaoPublicacao = situacaoPublicacao(jornada.status, jornada.moderacao, !!jornada.dataPublicacao);
          const duracao: number = etapas.reduce((t: number, e: IEtapa) => t + (e.duracaoMin || 0), 0);
          return (
            <div key={jornada.id} style={{ marginBottom: 14 }}>
              <Panel
                titulo={jornada.titulo}
                descricao={`Enviada por ${jornada.autor}${jornada.modificadaEm ? ` em ${dataCurta(jornada.modificadaEm)}` : ''} · ${etapas.length} etapa(s) · ${formatarDuracao(duracao)}`}
                acao={<Badge tom="warning">{ROTULO_SITUACAO[situacao]}</Badge>}
              >
                {jornada.descricao && <p style={{ fontSize: 13, marginBottom: 10 }}>{jornada.descricao}</p>}
                <ol className={styles.etapas}>
                  {etapas.map((e: IEtapa, i: number) => (
                    <li key={e.id} className={styles.etapa}>
                      <span className={styles.numero} aria-hidden="true">
                        {i + 1}
                      </span>
                      <div className={styles.etapaTexto}>
                        <b>{e.titulo}</b>
                        <span>
                          <Icon nome={ICONE_TIPO[e.tipo]} tamanho={13} />
                          {ROTULO_TIPO[e.tipo]} · {formatarDuracao(e.duracaoMin)} · {rotuloRegra(e)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="pi-actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
                  <button type="button" className="pi-btn" onClick={() => setPrevia({ jornada, etapas })}>
                    <Icon nome="olho" tamanho={16} />
                    Pré-visualizar
                  </button>
                  <button type="button" className="pi-btn danger" disabled={ocupado !== undefined} onClick={() => setDevolvendo(jornada)}>
                    Devolver com comentário
                  </button>
                  <button
                    type="button"
                    className="pi-btn primary"
                    disabled={ocupado !== undefined}
                    onClick={() => executar(jornada, () => servicos.estudio.publicar(area, jornada), `"${jornada.titulo}" foi publicada.`)}
                  >
                    <Icon nome="check" tamanho={16} />
                    {ocupado === jornada.id ? 'Publicando…' : 'Publicar'}
                  </button>
                </div>
              </Panel>
            </div>
          );
        })
      )}
      {previa && (
        <PreviaJornada
          id={`${ctx.idTitulo}-previa`}
          titulo={previa.jornada.titulo}
          descricao={previa.jornada.descricao}
          etapas={previa.etapas}
          siteUrl={ctx.props.siteUrl}
          aoFechar={() => setPrevia(undefined)}
        />
      )}
      {devolvendo && (
        <GtiDialog
          id={`${ctx.idTitulo}-devolver`}
          sobretitulo={`Aprovações · ${area.nome}`}
          titulo={`Devolver: ${devolvendo.titulo}`}
          bloquearFechamento={ocupado !== undefined}
          aoFechar={() => setDevolvendo(undefined)}
          textoRodape="O comentário aparece para quem enviou a jornada."
          rodape={
            <>
              <button type="button" className="pi-btn" disabled={ocupado !== undefined} onClick={() => setDevolvendo(undefined)}>
                Cancelar
              </button>
              <button type="button" className="pi-btn primary" disabled={ocupado !== undefined} onClick={devolver}>
                {ocupado !== undefined ? 'Devolvendo…' : 'Devolver'}
              </button>
            </>
          }
        >
          <Field id={`${ctx.idTitulo}-dev`} rotulo="O que precisa ser ajustado" obrigatorio erro={tentou && comentario.trim() === '' ? 'Escreva o que precisa ser ajustado.' : undefined}>
            {(aria) => <textarea {...aria} autoFocus maxLength={1000} value={comentario} placeholder="Seja específico: cite a etapa e o ajuste." onChange={(e) => setComentario(e.target.value)} />}
          </Field>
        </GtiDialog>
      )}
    </>
  );
};

export default Aprovacoes;
