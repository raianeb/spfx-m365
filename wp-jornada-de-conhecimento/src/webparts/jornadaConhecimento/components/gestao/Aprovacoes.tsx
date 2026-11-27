// Skills aplicadas: spfx-design-base (fila com ações claras, confirmação com comentário), spfx-acessibilidade-conteudo.
// Escopo, seção 6.3 ("Aprovações"): jornadas enviadas pelo Apoio, com Publicar e Devolver com comentário.
import * as React from 'react';
import { useEffect, useState } from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { TextField } from '@fluentui/react/lib/TextField';
import ModalShell from '../../../../crud/ModalShell';
import crud from '../../../../crud/crud.module.scss';
import { primaryButtonStyles, secondaryButtonStyles } from '../../../../crud/modalStyles';
import { IArea } from '../../../../jornada/modelo';
import { IEtapa } from '../../../../jornada/progresso';
import { IJornadaEstudio, ROTULO_SITUACAO, SituacaoPublicacao, situacaoPublicacao } from '../../../../jornada/estudio';
import { mensagemDeErro } from '../../../../services/sp';
import { IServicosJornada, NOME_SOLUCAO } from '../tipos';
import Estado from '../comum/Estado';
import PreviaJornada from '../estudio/PreviaJornada';
import styles from './Gestao.module.scss';

export interface IAprovacoesProps {
  area: IArea;
  servicos: IServicosJornada;
  siteUrl: string;
  themeStyle?: React.CSSProperties;
  aoPublicar: () => void;
}

const aguardando = (jornada: IJornadaEstudio): boolean => {
  const situacao: SituacaoPublicacao = situacaoPublicacao(jornada.status, jornada.moderacao, !!jornada.dataPublicacao);
  return situacao === 'emAprovacao' || situacao === 'alteracoesPendentes';
};

const Aprovacoes: React.FC<IAprovacoesProps> = ({ area, servicos, siteUrl, themeStyle, aoPublicar }: IAprovacoesProps) => {
  const [lista, setLista] = useState<IJornadaEstudio[] | undefined>(undefined);
  const [previa, setPrevia] = useState<{ jornada: IJornadaEstudio; etapas: IEtapa[] } | undefined>(undefined);
  const [devolvendo, setDevolvendo] = useState<IJornadaEstudio | undefined>(undefined);
  const [comentario, setComentario] = useState<string>('');
  const [ocupado, setOcupado] = useState<number | undefined>(undefined);
  const [aviso, setAviso] = useState<{ tipo: MessageBarType; texto: string } | undefined>(undefined);
  const [versao, setVersao] = useState<number>(0);

  useEffect(() => {
    let ativo: boolean = true;
    servicos.estudio
      .listar(area)
      .then((todas: IJornadaEstudio[]) => ativo && setLista(todas.filter(aguardando)))
      .catch((erro: unknown) => ativo && setAviso({ tipo: MessageBarType.error, texto: mensagemDeErro(erro, 'Carregar as aprovações') }));
    return () => {
      ativo = false;
    };
  }, [servicos, area, versao]);

  const executar = async (jornada: IJornadaEstudio, acao: () => Promise<void>, sucesso: string): Promise<void> => {
    setOcupado(jornada.id);
    setAviso(undefined);
    try {
      await acao();
      setAviso({ tipo: MessageBarType.success, texto: sucesso });
      setVersao((v: number) => v + 1);
      aoPublicar();
    } catch (erro: unknown) {
      setAviso({ tipo: MessageBarType.error, texto: erro instanceof Error && !('status' in erro) ? erro.message : mensagemDeErro(erro, 'Atualizar a jornada') });
    } finally {
      setOcupado(undefined);
    }
  };

  const devolver = async (): Promise<void> => {
    if (!devolvendo) {
      return;
    }
    const alvo: IJornadaEstudio = devolvendo;
    setDevolvendo(undefined);
    await executar(alvo, () => servicos.estudio.devolver(area, alvo.id, comentario), `"${alvo.titulo}" foi devolvida para ajustes.`);
    setComentario('');
  };

  if (!lista) {
    return aviso ? <MessageBar messageBarType={aviso.tipo}>{aviso.texto}</MessageBar> : <Spinner size={SpinnerSize.small} label="Carregando aprovações..." />;
  }

  return (
    <div className={styles.secao}>
      {aviso && (
        <MessageBar messageBarType={aviso.tipo} onDismiss={() => setAviso(undefined)} dismissButtonAriaLabel="Fechar aviso">
          {aviso.texto}
        </MessageBar>
      )}
      {lista.length === 0 ? (
        <Estado titulo="Nada aguardando aprovação" texto="Quando a Equipe de apoio enviar uma jornada, ela aparece aqui." />
      ) : (
        <ul className={styles.listaAprovacoes}>
          {lista.map((jornada: IJornadaEstudio) => (
            <li key={jornada.id} className={styles.cartaoAprovacao}>
              <div>
                <strong>{jornada.titulo}</strong>
                <span className={styles.ajuda}>
                  {ROTULO_SITUACAO[situacaoPublicacao(jornada.status, jornada.moderacao, !!jornada.dataPublicacao)]} · enviada por {jornada.autor}
                </span>
              </div>
              <div className={styles.acoes}>
                <DefaultButton
                  text="Pré-visualizar"
                  onClick={() =>
                    servicos.jornadas
                      .etapasDaJornada(area, jornada.id)
                      .then((etapas: IEtapa[]) => setPrevia({ jornada, etapas }))
                      .catch((erro: unknown) => setAviso({ tipo: MessageBarType.error, texto: mensagemDeErro(erro, 'Abrir a pré-visualização') }))
                  }
                />
                <DefaultButton text="Devolver" disabled={ocupado !== undefined} onClick={() => setDevolvendo(jornada)} />
                <PrimaryButton
                  text={ocupado === jornada.id ? 'Publicando...' : 'Publicar'}
                  disabled={ocupado !== undefined}
                  onClick={() => executar(jornada, () => servicos.estudio.publicar(area, jornada), `"${jornada.titulo}" foi publicada.`)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {previa && (
        <PreviaJornada
          titulo={previa.jornada.titulo}
          descricao={previa.jornada.descricao}
          etapas={previa.etapas}
          siteUrl={siteUrl}
          themeStyle={themeStyle}
          aoFechar={() => setPrevia(undefined)}
        />
      )}
      {devolvendo && (
        <ModalShell contextLabel={NOME_SOLUCAO} titleId="devolver-titulo" onDismiss={() => setDevolvendo(undefined)} themeStyle={themeStyle}>
          <h2 id="devolver-titulo" className={crud.modalTitle}>
            Devolver: {devolvendo.titulo}
          </h2>
          <div className={crud.modalForm}>
            <TextField
              label="O que precisa ser ajustado"
              required
              multiline
              rows={4}
              maxLength={1000}
              value={comentario}
              onChange={(_e, valor?: string) => setComentario(valor ?? '')}
            />
            <footer className={crud.footer}>
              <span className={crud.helper}>O comentário aparece para quem enviou a jornada.</span>
              <div className={crud.footerActions}>
                <DefaultButton text="Cancelar" onClick={() => setDevolvendo(undefined)} styles={secondaryButtonStyles} />
                <PrimaryButton text="Devolver" onClick={devolver} disabled={comentario.trim() === ''} styles={primaryButtonStyles} />
              </div>
            </footer>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default Aprovacoes;
