// Skills aplicadas: spfx-padrao-visual-gti (lista de comentários com ação por item), spfx-acessibilidade-conteudo.
// Escopo, seção 5 ("Moderação"): o Gestor oculta comentários direto, pelo nível Editar na lista Avaliações.
import * as React from 'react';
import { useEffect, useState } from 'react';
import { IArea } from '../../../../jornada/modelo';
import { IJornada } from '../../../../jornada/progresso';
import { IAvaliacao } from '../../../../services/EngajamentoService';
import { mensagemDeErro } from '../../../../services/sp';
import { Badge, Empty, ErrorBox, Loading, Panel } from '../gti';
import { IContextoTela } from '../tipos';
import { Estrelas, dataCurta, iniciais } from '../comum/ui';
import styles from '../jc.module.scss';

export interface IModeracaoProps {
  ctx: IContextoTela;
  area: IArea;
  jornadas: IJornada[];
}

const Moderacao: React.FC<IModeracaoProps> = ({ ctx, area, jornadas }: IModeracaoProps) => {
  const { servicos } = ctx;
  const [jornadaId, setJornadaId] = useState<number | undefined>(jornadas[0]?.id);
  const [comentarios, setComentarios] = useState<IAvaliacao[] | undefined>(undefined);
  const [erro, setErro] = useState<string>('');
  const [ocupado, setOcupado] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (jornadaId === undefined) {
      return undefined;
    }
    let ativo: boolean = true;
    setComentarios(undefined);
    setErro('');
    servicos.gestao
      .comentarios(area, jornadaId)
      .then((lista: IAvaliacao[]) => ativo && setComentarios(lista))
      .catch((falha: unknown) => ativo && setErro(mensagemDeErro(falha, 'Carregar os comentários')));
    return () => {
      ativo = false;
    };
  }, [servicos, area, jornadaId]);

  const alternar = async (avaliacao: IAvaliacao): Promise<void> => {
    setOcupado(avaliacao.id);
    setErro('');
    try {
      await servicos.gestao.ocultar(area, avaliacao.id, !avaliacao.oculto);
      setComentarios((atual: IAvaliacao[] | undefined) => (atual ?? []).map((a: IAvaliacao) => (a.id === avaliacao.id ? { ...a, oculto: !a.oculto } : a)));
      ctx.avisar(avaliacao.oculto ? 'Comentário visível de novo.' : 'Comentário ocultado. Só o autor continua vendo.');
    } catch (falha: unknown) {
      setErro(mensagemDeErro(falha, 'Moderar o comentário'));
    } finally {
      setOcupado(undefined);
    }
  };

  if (jornadas.length === 0) {
    return (
      <div className="pi-card">
        <Empty icone="email" titulo="Nenhuma jornada publicada" descricao="Os comentários das jornadas da área aparecem aqui para moderação." />
      </div>
    );
  }

  return (
    <Panel
      titulo="Comentários"
      descricao="Oculte comentários inadequados. O autor continua vendo o próprio comentário."
      acao={
        <select className="pi-select" aria-label="Jornada" value={jornadaId} onChange={(e) => setJornadaId(Number(e.target.value))}>
          {jornadas.map((j: IJornada) => (
            <option key={j.id} value={j.id}>
              {j.titulo}
            </option>
          ))}
        </select>
      }
    >
      {erro && <ErrorBox mensagem={erro} />}
      {comentarios === undefined ? (
        !erro && <Loading texto="Carregando comentários…" />
      ) : comentarios.length === 0 ? (
        <p className="pi-hint">Nenhum comentário nesta jornada.</p>
      ) : (
        comentarios.map((a: IAvaliacao) => (
          <div key={a.id} className={styles.comentario} style={a.oculto ? { opacity: 0.65 } : undefined}>
            <span className="pi-avatar" aria-hidden="true">
              {iniciais(a.autorNome)}
            </span>
            <div style={{ flex: 1 }}>
              <b style={{ color: 'var(--pi-navy)', fontSize: 12 }}>{a.autorNome}</b> <Estrelas nota={a.nota} total={1} individual />{' '}
              <span className="pi-hint">{dataCurta(a.data)}</span> {a.oculto && <Badge tom="danger">Oculto</Badge>}
              <p>{a.comentario}</p>
            </div>
            <button
              type="button"
              className="pi-btn ghost"
              disabled={ocupado !== undefined}
              aria-label={`${a.oculto ? 'Mostrar' : 'Ocultar'} comentário de ${a.autorNome}`}
              onClick={() => alternar(a)}
            >
              {a.oculto ? 'Mostrar' : 'Ocultar'}
            </button>
          </div>
        ))
      )}
    </Panel>
  );
};

export default Moderacao;
