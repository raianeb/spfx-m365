// Skills aplicadas: spfx-design-base (formulário curto, erro visível), spfx-acessibilidade-conteudo (estrelas como
// grupo de opções, contador de caracteres, distribuição em texto). Escopo, seção 3 (avaliar e comentar).
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { TextField } from '@fluentui/react/lib/TextField';
import { IArea } from '../../../../jornada/modelo';
import { IResumoAvaliacoes, LIMITE_COMENTARIO } from '../../../../jornada/progresso';
import { urlFoto } from '../../../../jornada/conteudo';
import { EngajamentoService, IAvaliacao } from '../../../../services/EngajamentoService';
import { mensagemDeErro } from '../../../../services/sp';
import { Estrelas } from '../comum/Indicadores';
import styles from './Player.module.scss';

export interface IAvaliacoesProps {
  servico: EngajamentoService;
  area: IArea;
  jornadaId: number;
  usuarioId: number;
  siteUrl: string;
  liberada: boolean;
  /** Abre o formulário em destaque (tela de conclusão). */
  destaque?: boolean;
}

const FILTRO_NOTA: IDropdownOption[] = [
  { key: 0, text: 'Todas as notas' },
  { key: 5, text: '5 estrelas' },
  { key: 4, text: '4 estrelas' },
  { key: 3, text: '3 estrelas' },
  { key: 2, text: '2 estrelas' },
  { key: 1, text: '1 estrela' }
];

const Avaliacoes: React.FC<IAvaliacoesProps> = (props: IAvaliacoesProps) => {
  const { servico, area, jornadaId, usuarioId } = props;
  const grupoId: string = React.useId();
  const [dados, setDados] = useState<{ lista: IAvaliacao[]; resumo: IResumoAvaliacoes; minha?: IAvaliacao } | undefined>(undefined);
  const [nota, setNota] = useState<number>(0);
  const [comentario, setComentario] = useState<string>('');
  const [filtro, setFiltro] = useState<number>(0);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<{ erro: boolean; texto: string } | undefined>(undefined);

  const carregar = useCallback(async (): Promise<void> => {
    const resultado = await servico.avaliacoes(area, jornadaId, usuarioId);
    setDados(resultado);
    setNota(resultado.minha?.nota ?? 0);
    setComentario(resultado.minha?.comentario ?? '');
  }, [servico, area, jornadaId, usuarioId]);

  useEffect(() => {
    carregar().catch((erro: unknown) => {
      setDados({ lista: [], resumo: { media: 0, total: 0, distribuicao: [0, 0, 0, 0, 0] } });
      setMensagem({ erro: true, texto: mensagemDeErro(erro, 'Carregar as avaliações') });
    });
  }, [carregar]);

  const salvar = async (): Promise<void> => {
    setSalvando(true);
    setMensagem(undefined);
    try {
      await servico.salvarAvaliacao(area, jornadaId, usuarioId, nota, comentario, dados?.minha?.id);
      await carregar();
      setMensagem({ erro: false, texto: 'Avaliação salva. Obrigado!' });
    } catch (erro: unknown) {
      setMensagem({ erro: true, texto: erro instanceof Error && !('status' in erro) ? erro.message : mensagemDeErro(erro, 'Salvar a avaliação') });
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (): Promise<void> => {
    if (!dados?.minha) {
      return;
    }
    setSalvando(true);
    setMensagem(undefined);
    try {
      await servico.excluirAvaliacao(area, jornadaId, dados.minha.id);
      await carregar();
      setMensagem({ erro: false, texto: 'Sua avaliação foi excluída.' });
    } catch (erro: unknown) {
      setMensagem({ erro: true, texto: mensagemDeErro(erro, 'Excluir a avaliação') });
    } finally {
      setSalvando(false);
    }
  };

  if (!dados) {
    return <Spinner size={SpinnerSize.small} label="Carregando avaliações..." />;
  }

  const { resumo } = dados;
  const comentarios: IAvaliacao[] = dados.lista.filter(
    (avaliacao: IAvaliacao) => avaliacao.comentario.trim() !== '' && (filtro === 0 || avaliacao.nota === filtro)
  );

  return (
    <div className={styles.avaliacoes}>
      <div className={styles.resumoAvaliacoes}>
        <div className={styles.media}>
          <span className={styles.mediaNumero}>{resumo.total ? resumo.media.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) : '–'}</span>
          <Estrelas nota={resumo.media} total={resumo.total} />
        </div>
        <ul className={styles.distribuicao} aria-label="Distribuição das notas">
          {[5, 4, 3, 2, 1].map((estrelas: number) => {
            const quantidade: number = resumo.distribuicao[estrelas - 1];
            const largura: number = resumo.total ? (quantidade / resumo.total) * 100 : 0;
            return (
              <li key={estrelas} className={styles.barraNota}>
                <span>{estrelas} ★</span>
                <span className={styles.barraFundo} aria-hidden="true">
                  <span className={styles.barraValor} style={{ width: `${largura}%` }} />
                </span>
                <span>{quantidade}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {props.liberada ? (
        <section className={`${styles.minhaAvaliacao} ${props.destaque ? styles.destaque : ''}`} aria-labelledby={`${grupoId}-titulo`}>
          <h4 id={`${grupoId}-titulo`} className={styles.secaoTitulo}>
            {dados.minha ? 'Sua avaliação' : 'Avalie esta jornada'}
          </h4>
          <div role="radiogroup" aria-label="Nota de 1 a 5 estrelas" className={styles.escolhaEstrelas}>
            {[1, 2, 3, 4, 5].map((valor: number) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={nota === valor}
                aria-label={`${valor} estrela${valor > 1 ? 's' : ''}`}
                className={styles.estrela}
                onClick={() => setNota(valor)}
                disabled={salvando}
              >
                <Icon iconName={valor <= nota ? 'FavoriteStarFill' : 'FavoriteStar'} aria-hidden="true" />
              </button>
            ))}
          </div>
          <TextField
            label="Comentário (opcional)"
            multiline
            rows={3}
            value={comentario}
            maxLength={LIMITE_COMENTARIO}
            description={`${comentario.length}/${LIMITE_COMENTARIO} caracteres`}
            onChange={(_e, valor?: string) => setComentario(valor ?? '')}
            disabled={salvando}
          />
          <div className={styles.acoesAvaliacao}>
            <PrimaryButton text={salvando ? 'Salvando...' : 'Salvar avaliação'} onClick={salvar} disabled={salvando || nota === 0} />
            {dados.minha && <DefaultButton text="Excluir minha avaliação" onClick={excluir} disabled={salvando} />}
          </div>
          {dados.minha?.oculto && <p className={styles.aviso}>Seu comentário foi ocultado pelo gestor da área e só você o vê.</p>}
        </section>
      ) : (
        <p className={styles.aviso}>A avaliação é liberada depois que você concluir ao menos metade das etapas.</p>
      )}
      {mensagem && (
        <p className={mensagem.erro ? styles.erro : styles.sucesso} role={mensagem.erro ? 'alert' : 'status'}>
          {mensagem.texto}
        </p>
      )}

      <div className={styles.barraComentarios}>
        <h4 className={styles.secaoTitulo}>Comentários</h4>
        <Dropdown
          ariaLabel="Filtrar comentários por nota"
          options={FILTRO_NOTA}
          selectedKey={filtro}
          onChange={(_e, opcao?: IDropdownOption) => setFiltro(Number(opcao?.key ?? 0))}
          styles={{ root: { minWidth: 160 } }}
        />
      </div>
      {comentarios.length === 0 ? (
        <p className={styles.aviso}>Nenhum comentário {filtro ? 'com esta nota' : 'ainda'}.</p>
      ) : (
        <ul className={styles.comentarios}>
          {comentarios.map((avaliacao: IAvaliacao) => {
            const foto: string = urlFoto(props.siteUrl, avaliacao.autorEmail);
            return (
              <li key={avaliacao.id} className={styles.comentario}>
                {foto ? <img className={styles.foto} src={foto} alt="" loading="lazy" /> : <Icon iconName="Contact" className={styles.foto} aria-hidden="true" />}
                <div>
                  <div className={styles.comentarioCabecalho}>
                    <strong>{avaliacao.autorNome}</strong>
                    <Estrelas nota={avaliacao.nota} total={1} individual />
                    <span className={styles.meta}>{avaliacao.data ? new Date(avaliacao.data).toLocaleDateString('pt-BR') : ''}</span>
                  </div>
                  <p className={styles.comentarioTexto}>{avaliacao.comentario}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Avaliacoes;
