// Skills aplicadas: spfx-padrao-visual-gti (resumo, formulário curto, lista), spfx-acessibilidade-conteudo (estrelas como
// grupo de opções, contador de caracteres, distribuição em texto). Escopo, seção 3 (avaliar e comentar).
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { IArea } from '../../../../jornada/modelo';
import { IResumoAvaliacoes, LIMITE_COMENTARIO } from '../../../../jornada/progresso';
import { urlFoto } from '../../../../jornada/conteudo';
import { EngajamentoService, IAvaliacao } from '../../../../services/EngajamentoService';
import { mensagemDeErro } from '../../../../services/sp';
import { Loading, Panel, useToast } from '../gti';
import { Aviso, Estrelas, dataCurta, iniciais, textoErro } from '../comum/ui';
import styles from '../jc.module.scss';

export interface IAvaliacoesProps {
  servico: EngajamentoService;
  area: IArea;
  jornadaId: number;
  usuarioId: number;
  siteUrl: string;
  liberada: boolean;
  /** Formulário em destaque (logo depois de concluir a jornada). */
  destaque?: boolean;
  aoSalvar?: () => void;
}

const ESTRELA: string = 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z';

/** Escolha de nota de 1 a 5 (grupo de opções). */
export const EscolhaNota: React.FC<{ nota: number; aoEscolher: (nota: number) => void; desabilitado?: boolean }> = ({
  nota,
  aoEscolher,
  desabilitado
}: {
  nota: number;
  aoEscolher: (nota: number) => void;
  desabilitado?: boolean;
}) => (
  <div role="radiogroup" aria-label="Nota de 1 a 5 estrelas" className={styles.escolhaEstrelas}>
    {[1, 2, 3, 4, 5].map((valor: number) => (
      <button
        key={valor}
        type="button"
        role="radio"
        aria-checked={nota === valor}
        aria-label={`${valor} estrela${valor > 1 ? 's' : ''}`}
        disabled={desabilitado}
        onClick={() => aoEscolher(valor)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill={valor <= nota ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d={ESTRELA} />
        </svg>
      </button>
    ))}
  </div>
);

const Avaliacoes: React.FC<IAvaliacoesProps> = (props: IAvaliacoesProps) => {
  const { servico, area, jornadaId, usuarioId } = props;
  const id: string = React.useId();
  const { avisar } = useToast();
  const [dados, setDados] = useState<{ lista: IAvaliacao[]; resumo: IResumoAvaliacoes; minha?: IAvaliacao } | undefined>(undefined);
  const [nota, setNota] = useState<number>(0);
  const [comentario, setComentario] = useState<string>('');
  const [filtro, setFiltro] = useState<number>(0);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');

  const carregar = useCallback(async (): Promise<void> => {
    const resultado = await servico.avaliacoes(area, jornadaId, usuarioId);
    setDados(resultado);
    setNota(resultado.minha?.nota ?? 0);
    setComentario(resultado.minha?.comentario ?? '');
  }, [servico, area, jornadaId, usuarioId]);

  useEffect(() => {
    carregar().catch((falha: unknown) => {
      setDados({ lista: [], resumo: { media: 0, total: 0, distribuicao: [0, 0, 0, 0, 0] } });
      setErro(mensagemDeErro(falha, 'Carregar as avaliações'));
    });
  }, [carregar]);

  const executar = async (acao: () => Promise<void>, sucesso: string, rotulo: string): Promise<void> => {
    setSalvando(true);
    setErro('');
    try {
      await acao();
      await carregar();
      avisar(sucesso);
      props.aoSalvar?.();
    } catch (falha: unknown) {
      setErro(textoErro(falha, (e: unknown) => mensagemDeErro(e, rotulo)));
    } finally {
      setSalvando(false);
    }
  };

  if (!dados) {
    return <Loading texto="Carregando avaliações…" />;
  }
  const { resumo } = dados;
  const comentarios: IAvaliacao[] = dados.lista.filter((a: IAvaliacao) => a.comentario.trim() !== '' && (filtro === 0 || a.nota === filtro));

  return (
    <>
      <Panel>
        <div className={styles.resumoNotas}>
          <div>
            <div className={styles.media}>{resumo.total ? resumo.media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '–'}</div>
            <Estrelas nota={resumo.media} total={resumo.total} />
          </div>
          <ul className={styles.distribuicao} aria-label="Distribuição das notas">
            {[5, 4, 3, 2, 1].map((estrelas: number) => {
              const quantidade: number = resumo.distribuicao[estrelas - 1];
              return (
                <li key={estrelas}>
                  <span>{estrelas} estrela(s)</span>
                  <span className="pi-bar" aria-hidden="true">
                    <i style={{ width: `${resumo.total ? (quantidade / resumo.total) * 100 : 0}%` }} />
                  </span>
                  <span>{quantidade}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </Panel>
      <div style={{ height: 18 }} />
      <Panel
        className={props.destaque ? styles.destaque : undefined}
        titulo={dados.minha ? 'Sua avaliação' : 'Avalie esta jornada'}
        descricao={props.liberada ? 'Sua nota ajuda quem cria as jornadas a melhorar o conteúdo.' : 'Liberada depois que você concluir ao menos metade das etapas.'}
      >
        {props.liberada && (
          <>
            <EscolhaNota nota={nota} aoEscolher={setNota} desabilitado={salvando} />
            <div className="pi-field" style={{ marginTop: 14 }}>
              <label htmlFor={`${id}-coment`}>Comentário (opcional)</label>
              <textarea
                id={`${id}-coment`}
                maxLength={LIMITE_COMENTARIO}
                value={comentario}
                disabled={salvando}
                placeholder="O que funcionou bem? O que poderia melhorar?"
                aria-describedby={`${id}-cont`}
                onChange={(e) => setComentario(e.target.value)}
              />
              <span className="pi-hint" id={`${id}-cont`}>
                {comentario.length}/{LIMITE_COMENTARIO} caracteres
              </span>
            </div>
            {erro && <Aviso tom="erro">{erro}</Aviso>}
            <div className="pi-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="pi-btn primary"
                disabled={salvando || nota === 0}
                onClick={() => executar(() => servico.salvarAvaliacao(area, jornadaId, usuarioId, nota, comentario, dados.minha?.id), 'Avaliação salva. Obrigado!', 'Salvar a avaliação')}
              >
                {salvando ? 'Salvando…' : 'Salvar avaliação'}
              </button>
              {dados.minha && (
                <button
                  type="button"
                  className="pi-btn danger"
                  disabled={salvando}
                  onClick={() => dados.minha && executar(() => servico.excluirAvaliacao(area, jornadaId, dados.minha?.id ?? 0), 'Sua avaliação foi excluída.', 'Excluir a avaliação')}
                >
                  Excluir minha avaliação
                </button>
              )}
            </div>
            {dados.minha?.oculto && <p className="pi-hint" style={{ marginTop: 10 }}>Seu comentário foi ocultado pelo gestor da área e só você o vê.</p>}
          </>
        )}
      </Panel>
      <div style={{ height: 18 }} />
      <Panel
        titulo="Comentários"
        descricao={`${comentarios.length} comentário(s)`}
        acao={
          <select className="pi-select" aria-label="Filtrar comentários por nota" value={filtro} onChange={(e) => setFiltro(Number(e.target.value))}>
            <option value={0}>Todas as notas</option>
            {[5, 4, 3, 2, 1].map((n: number) => (
              <option key={n} value={n}>
                {n} estrela(s)
              </option>
            ))}
          </select>
        }
      >
        {comentarios.length === 0 ? (
          <p className="pi-hint">Nenhum comentário {filtro ? 'com esta nota' : 'ainda'}.</p>
        ) : (
          comentarios.map((a: IAvaliacao) => {
            const foto: string = urlFoto(props.siteUrl, a.autorEmail);
            return (
              <div key={a.id} className={styles.comentario}>
                {foto ? (
                  <img src={foto} alt="" loading="lazy" />
                ) : (
                  <span className="pi-avatar" aria-hidden="true">
                    {iniciais(a.autorNome)}
                  </span>
                )}
                <div>
                  <b style={{ color: 'var(--pi-navy)', fontSize: 12 }}>{a.autorNome}</b> <Estrelas nota={a.nota} total={1} individual />{' '}
                  <span className="pi-hint">{dataCurta(a.data)}</span>
                  <p>{a.comentario}</p>
                </div>
              </div>
            );
          })
        )}
      </Panel>
    </>
  );
};

export default Avaliacoes;
