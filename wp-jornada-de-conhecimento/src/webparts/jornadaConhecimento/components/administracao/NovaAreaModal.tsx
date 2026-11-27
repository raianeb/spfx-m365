// Skills aplicadas: spfx-design-base (modal padrão: coluna única, obrigatórios, erro no rodapé, gravação desabilita
// ações), spfx-acessibilidade-conteudo, spfx-tema-marca (cores da área como dado validado).
import * as React from 'react';
import { useMemo, useState } from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Label } from '@fluentui/react/lib/Label';
import { SwatchColorPicker } from '@fluentui/react/lib/SwatchColorPicker';
import { Icon } from '@fluentui/react/lib/Icon';
import ModalShell from '../../../../crud/ModalShell';
import crud from '../../../../crud/crud.module.scss';
import { primaryButtonStyles, secondaryButtonStyles, textFieldStyles } from '../../../../crud/modalStyles';
import { normalizarSigla, validarSigla } from '../../../../jornada/nomes';
import { AreaService, INovaArea, IPessoa } from '../../../../services/AreaService';
import PessoasPicker from '../comum/PessoasPicker';
import { NOME_SOLUCAO } from '../tipos';
import styles from '../JornadaConhecimento.module.scss';

/** Paleta e ícones oferecidos; a área guarda só valores desta lista (validados de novo ao exibir). */
export const CORES_AREA: { id: string; color: string; label: string }[] = [
  { id: 'azul', color: '#0F6CBD', label: 'Azul' },
  { id: 'verde', color: '#107C10', label: 'Verde' },
  { id: 'roxo', color: '#5C2E91', label: 'Roxo' },
  { id: 'laranja', color: '#C43E00', label: 'Laranja' },
  { id: 'petroleo', color: '#005B70', label: 'Petróleo' },
  { id: 'vinho', color: '#8E192E', label: 'Vinho' },
  { id: 'grafite', color: '#484644', label: 'Grafite' },
  { id: 'dourado', color: '#8A6100', label: 'Dourado' }
];

export const ICONES_AREA: IDropdownOption[] = [
  { key: 'Education', text: 'Educação' },
  { key: 'Money', text: 'Financeiro' },
  { key: 'People', text: 'Pessoas' },
  { key: 'Settings', text: 'Tecnologia' },
  { key: 'Shield', text: 'Segurança' },
  { key: 'Heart', text: 'Saúde' },
  { key: 'Megaphone', text: 'Comunicação' },
  { key: 'Globe', text: 'Geral' },
  { key: 'Lightbulb', text: 'Inovação' },
  { key: 'Library', text: 'Biblioteca' }
];

export interface INovaAreaModalProps {
  servico: AreaService;
  siglasExistentes: string[];
  themeStyle?: React.CSSProperties;
  aoFechar: () => void;
  aoCriar: (area: INovaArea, progresso: (passo: string) => void) => Promise<void>;
}

const NovaAreaModal: React.FC<INovaAreaModalProps> = (props: INovaAreaModalProps) => {
  const tituloId: string = React.useId();
  const [nome, setNome] = useState<string>('');
  const [sigla, setSigla] = useState<string>('');
  const [siglaEditada, setSiglaEditada] = useState<boolean>(false);
  const [cor, setCor] = useState<string>(CORES_AREA[0].color);
  const [icone, setIcone] = useState<string>(String(ICONES_AREA[0].key));
  const [gestores, setGestores] = useState<IPessoa[]>([]);
  const [tentouSalvar, setTentouSalvar] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [passo, setPasso] = useState<string>('');
  const [erro, setErro] = useState<string>('');

  const erroNome: string = nome.trim() === '' ? 'Informe o nome da área.' : '';
  const erroSigla: string = useMemo(() => validarSigla(sigla, props.siglasExistentes), [sigla, props.siglasExistentes]);
  const erroGestores: string = gestores.length === 0 ? 'Indique ao menos um gestor.' : '';
  const valido: boolean = !erroNome && !erroSigla && !erroGestores;

  const alterarNome = (valor: string): void => {
    setNome(valor);
    if (!siglaEditada) {
      setSigla(normalizarSigla(valor).slice(0, 10));
    }
  };

  const salvar = async (): Promise<void> => {
    setTentouSalvar(true);
    if (!valido) {
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await props.aoCriar({ nome: nome.trim(), sigla, cor, icone, gestores }, setPasso);
    } catch (falha: unknown) {
      setErro(
        `${falha instanceof Error ? falha.message : 'Falha ao criar a área.'} A área ficou com status Erro e pode ser reprocessada.`
      );
      setSalvando(false);
    }
  };

  return (
    <ModalShell
      contextLabel={NOME_SOLUCAO}
      titleId={tituloId}
      firstFocusableClass={crud.firstField}
      onDismiss={salvando ? () => undefined : props.aoFechar}
      themeStyle={props.themeStyle}
    >
      <h2 id={tituloId} className={crud.modalTitle}>
        Nova área
      </h2>
      <div className={crud.modalForm}>
        <div className={crud.fields}>
          <TextField
            label="Nome da área"
            required
            className={crud.firstField}
            value={nome}
            maxLength={120}
            onChange={(_e, valor?: string) => alterarNome(valor ?? '')}
            errorMessage={tentouSalvar ? erroNome : undefined}
            disabled={salvando}
            styles={textFieldStyles}
          />
          <TextField
            label="Sigla"
            required
            value={sigla}
            maxLength={10}
            description="Usada nos nomes de grupos e listas (ex.: FIN). Não pode ser alterada depois."
            onChange={(_e, valor?: string) => {
              setSiglaEditada(true);
              setSigla(normalizarSigla(valor ?? ''));
            }}
            errorMessage={tentouSalvar || sigla.length > 1 ? erroSigla : undefined}
            disabled={salvando}
            styles={textFieldStyles}
          />
          <div>
            <Label id={`${tituloId}-cor`}>Cor</Label>
            <SwatchColorPicker
              columnCount={8}
              cellShape="circle"
              colorCells={CORES_AREA}
              selectedId={CORES_AREA.find((item) => item.color === cor)?.id}
              onChange={(_e, _id?: string, valor?: string) => valor && setCor(valor)}
              aria-labelledby={`${tituloId}-cor`}
              disabled={salvando}
            />
          </div>
          <Dropdown
            label="Ícone"
            options={ICONES_AREA}
            selectedKey={icone}
            onChange={(_e, opcao?: IDropdownOption) => opcao && setIcone(String(opcao.key))}
            onRenderTitle={(opcoes?: IDropdownOption[]) => (
              <span>
                <Icon iconName={String(opcoes?.[0]?.key ?? icone)} aria-hidden="true" /> {opcoes?.[0]?.text}
              </span>
            )}
            disabled={salvando}
          />
          <PessoasPicker
            id={`${tituloId}-gestores`}
            rotulo="Gestores da área *"
            servico={props.servico}
            selecionadas={gestores}
            aoAlterar={setGestores}
            desabilitado={salvando}
          />
          {tentouSalvar && erroGestores && <span className={crud.error}>{erroGestores}</span>}
        </div>
        {salvando && passo && (
          <p className={styles.progresso} role="status">
            {passo}...
          </p>
        )}
        <footer className={crud.footer}>
          {erro ? (
            <span className={crud.error} role="alert">
              {erro}
            </span>
          ) : (
            <span className={crud.helper}>Cria os grupos, as listas, a biblioteca e as permissões da área (cerca de um minuto).</span>
          )}
          <div className={crud.footerActions}>
            <DefaultButton text="Cancelar" onClick={props.aoFechar} disabled={salvando} styles={secondaryButtonStyles} />
            <PrimaryButton
              text={salvando ? 'Criando...' : 'Criar área'}
              onClick={salvar}
              disabled={salvando}
              styles={primaryButtonStyles}
            />
          </div>
        </footer>
      </div>
    </ModalShell>
  );
};

export default NovaAreaModal;
