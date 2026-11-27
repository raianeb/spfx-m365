// Skills aplicadas: spfx-design-base, spfx-acessibilidade-conteudo. Escopo, seção 5 ("Moderação"): o Gestor oculta
// comentários direto, pelo nível Editar na lista Avaliações.
import * as React from 'react';
import { useEffect, useState } from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { IArea } from '../../../../jornada/modelo';
import { IJornada } from '../../../../jornada/progresso';
import { IAvaliacao } from '../../../../services/EngajamentoService';
import { mensagemDeErro } from '../../../../services/sp';
import { IServicosJornada } from '../tipos';
import { Estrelas } from '../comum/Indicadores';
import styles from './Gestao.module.scss';

export interface IModeracaoProps {
  area: IArea;
  jornadas: IJornada[];
  servicos: IServicosJornada;
}

const Moderacao: React.FC<IModeracaoProps> = ({ area, jornadas, servicos }: IModeracaoProps) => {
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
      setComentarios((atual: IAvaliacao[] | undefined) =>
        (atual ?? []).map((item: IAvaliacao) => (item.id === avaliacao.id ? { ...item, oculto: !item.oculto } : item))
      );
    } catch (falha: unknown) {
      setErro(mensagemDeErro(falha, 'Moderar o comentário'));
    } finally {
      setOcupado(undefined);
    }
  };

  if (jornadas.length === 0) {
    return <p className={styles.ajuda}>Nenhuma jornada publicada nesta área.</p>;
  }

  return (
    <div className={styles.secao}>
      <Dropdown
        label="Jornada"
        options={jornadas.map((jornada: IJornada): IDropdownOption => ({ key: jornada.id, text: jornada.titulo }))}
        selectedKey={jornadaId}
        onChange={(_e, opcao?: IDropdownOption) => opcao && setJornadaId(Number(opcao.key))}
        styles={{ root: { maxWidth: 420 } }}
      />
      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}
      {comentarios === undefined ? (
        <Spinner size={SpinnerSize.small} label="Carregando comentários..." />
      ) : comentarios.length === 0 ? (
        <p className={styles.ajuda}>Nenhum comentário nesta jornada.</p>
      ) : (
        <ul className={styles.listaAprovacoes}>
          {comentarios.map((avaliacao: IAvaliacao) => (
            <li key={avaliacao.id} className={styles.cartaoAprovacao}>
              <div>
                <strong>{avaliacao.autorNome}</strong> <Estrelas nota={avaliacao.nota} total={1} individual />
                {avaliacao.oculto && <span className={styles.seloOculto}>Oculto</span>}
                <p className={styles.comentarioTexto}>{avaliacao.comentario}</p>
              </div>
              <DefaultButton
                text={avaliacao.oculto ? 'Mostrar' : 'Ocultar'}
                ariaLabel={`${avaliacao.oculto ? 'Mostrar' : 'Ocultar'} comentário de ${avaliacao.autorNome}`}
                disabled={ocupado !== undefined}
                onClick={() => alternar(avaliacao)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Moderacao;
