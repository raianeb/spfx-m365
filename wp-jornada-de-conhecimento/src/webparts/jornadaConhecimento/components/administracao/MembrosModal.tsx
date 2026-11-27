// Skills aplicadas: spfx-design-base (modal padrão), spfx-acessibilidade-conteudo. Inclui e remove membros de um
// grupo com a sessão do usuário logado: o SharePoint só permite a quem é proprietário do grupo.
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import ModalShell from '../../../../crud/ModalShell';
import crud from '../../../../crud/crud.module.scss';
import { primaryButtonStyles, secondaryButtonStyles } from '../../../../crud/modalStyles';
import { AreaService, IPessoa } from '../../../../services/AreaService';
import { mensagemDeErro } from '../../../../services/sp';
import PessoasPicker from '../comum/PessoasPicker';
import { NOME_SOLUCAO } from '../tipos';
import styles from '../JornadaConhecimento.module.scss';

export interface IMembrosModalProps {
  servico: AreaService;
  grupoId: number;
  titulo: string;
  descricao: string;
  /** Permite incluir grupos do Entra ID (ex.: área Geral). */
  incluirGrupos?: boolean;
  themeStyle?: React.CSSProperties;
  aoFechar: () => void;
}

const MembrosModal: React.FC<IMembrosModalProps> = (props: IMembrosModalProps) => {
  const { servico, grupoId } = props;
  const tituloId: string = React.useId();
  const [membros, setMembros] = useState<IPessoa[] | undefined>(undefined);
  const [novos, setNovos] = useState<IPessoa[]>([]);
  const [ocupado, setOcupado] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');

  const carregar = useCallback(async (): Promise<void> => {
    try {
      setMembros(await servico.listarMembros(grupoId));
    } catch (falha: unknown) {
      setMembros([]);
      setErro(mensagemDeErro(falha, 'Carregar os membros'));
    }
  }, [servico, grupoId]);

  useEffect(() => {
    carregar().catch(() => undefined);
  }, [carregar]);

  const executar = async (acao: () => Promise<void>, rotulo: string): Promise<void> => {
    setOcupado(true);
    setErro('');
    try {
      await acao();
      await carregar();
    } catch (falha: unknown) {
      setErro(mensagemDeErro(falha, rotulo));
    } finally {
      setOcupado(false);
    }
  };

  const incluir = (): Promise<void> =>
    executar(async () => {
      await servico.incluirMembros(grupoId, novos);
      setNovos([]);
    }, 'Incluir membros');

  return (
    <ModalShell contextLabel={NOME_SOLUCAO} titleId={tituloId} onDismiss={props.aoFechar} themeStyle={props.themeStyle}>
      <h2 id={tituloId} className={crud.modalTitle}>
        {props.titulo}
      </h2>
      <div className={crud.modalForm}>
        <p className={crud.modalText}>{props.descricao}</p>
        <div className={crud.fields}>
          <PessoasPicker
            id={`${tituloId}-novos`}
            rotulo="Incluir"
            servico={servico}
            selecionadas={novos}
            aoAlterar={setNovos}
            incluirGrupos={props.incluirGrupos}
            desabilitado={ocupado}
          />
          <div>
            <PrimaryButton
              text={ocupado ? 'Salvando...' : 'Incluir no grupo'}
              onClick={incluir}
              disabled={ocupado || novos.length === 0}
              styles={primaryButtonStyles}
            />
          </div>
          {membros === undefined ? (
            <Spinner size={SpinnerSize.small} label="Carregando membros..." />
          ) : membros.length === 0 ? (
            <p className={crud.helper}>Nenhum membro no grupo.</p>
          ) : (
            <ul className={styles.membros} aria-label="Membros do grupo">
              {membros.map((membro: IPessoa) => (
                <li key={membro.id} className={styles.membro}>
                  <span className={styles.membroTexto}>
                    <span>{membro.nome}</span>
                    <span className={styles.membroEmail}>{membro.email || membro.loginName}</span>
                  </span>
                  <IconButton
                    iconProps={{ iconName: 'Delete' }}
                    ariaLabel={`Remover ${membro.nome} do grupo`}
                    title={`Remover ${membro.nome}`}
                    disabled={ocupado}
                    onClick={() => executar(() => servico.removerMembro(grupoId, membro.id ?? 0), 'Remover membro')}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className={crud.footer}>
          {erro ? (
            <span className={crud.error} role="alert">
              {erro}
            </span>
          ) : (
            <span className={crud.helper}>As alterações valem na hora, direto no grupo do SharePoint.</span>
          )}
          <div className={crud.footerActions}>
            <DefaultButton text="Fechar" onClick={props.aoFechar} styles={secondaryButtonStyles} />
          </div>
        </footer>
      </div>
    </ModalShell>
  );
};

export default MembrosModal;
