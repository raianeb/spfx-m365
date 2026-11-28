// Skills aplicadas: spfx-padrao-visual-gti (painel lateral de criação com os passos visíveis), spfx-acessibilidade-conteudo
// (cores como grupo de opções com nome, progresso anunciado), spfx-tema-marca (cor e ícone da área de listas fechadas).
import * as React from 'react';
import { useMemo, useState } from 'react';
import { normalizarSigla, validarSigla } from '../../../../jornada/nomes';
import { AreaService, INovaArea, IPessoa } from '../../../../services/AreaService';
import { Field, GtiDialog, Icon } from '../gti';
import { IconeArea } from '../comum/ui';
import PessoasPicker from '../comum/PessoasPicker';
import styles from '../jc.module.scss';

/** Paleta e ícones oferecidos; a área guarda só valores destas listas (validados de novo ao exibir). */
export const CORES_AREA: { color: string; label: string }[] = [
  { color: '#164B78', label: 'Azul institucional' },
  { color: '#258783', label: 'Petróleo' },
  { color: '#3D5A98', label: 'Índigo' },
  { color: '#107C10', label: 'Verde' },
  { color: '#5C2E91', label: 'Roxo' },
  { color: '#C43E00', label: 'Laranja' },
  { color: '#8E192E', label: 'Vinho' },
  { color: '#8A6100', label: 'Dourado' }
];

export const ICONES_AREA: { key: string; text: string }[] = [
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

const O_QUE_SERA_CRIADO: string[] = [
  'Grupos Gestores, Apoio e Usuários, com proprietários',
  'Listas Jornadas, Etapas, Matrículas, Curtidas e Avaliações',
  'Biblioteca de conteúdos da área',
  'Permissões com os níveis padrão do SharePoint',
  'Item da área visível só para os grupos da área'
];

export interface INovaAreaModalProps {
  id: string;
  servico: AreaService;
  siglasExistentes: string[];
  ambiente: string;
  aoFechar: () => void;
  aoCriar: (area: INovaArea, progresso: (passo: string) => void) => Promise<void>;
}

const NovaAreaModal: React.FC<INovaAreaModalProps> = (props: INovaAreaModalProps) => {
  const id: string = props.id;
  const [nome, setNome] = useState<string>('');
  const [sigla, setSigla] = useState<string>('');
  const [siglaEditada, setSiglaEditada] = useState<boolean>(false);
  const [cor, setCor] = useState<string>(CORES_AREA[0].color);
  const [icone, setIcone] = useState<string>(ICONES_AREA[0].key);
  const [gestores, setGestores] = useState<IPessoa[]>([]);
  const [tentou, setTentou] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [passos, setPassos] = useState<string[]>([]);
  const [erro, setErro] = useState<string>('');

  const erroNome: string = nome.trim() === '' ? 'Informe o nome da área.' : '';
  const erroSigla: string = useMemo(() => validarSigla(sigla, props.siglasExistentes), [sigla, props.siglasExistentes]);
  const erroGestores: string = gestores.length === 0 ? 'Indique ao menos um gestor.' : '';

  const alterarNome = (valor: string): void => {
    setNome(valor);
    if (!siglaEditada) {
      setSigla(normalizarSigla(valor).slice(0, 10));
    }
  };

  const criar = async (): Promise<void> => {
    setTentou(true);
    if (erroNome || erroSigla || erroGestores) {
      return;
    }
    setSalvando(true);
    setErro('');
    setPassos([]);
    try {
      await props.aoCriar({ nome: nome.trim(), sigla, cor, icone, gestores }, (passo: string) => setPassos((atuais: string[]) => [...atuais, passo]));
    } catch (falha: unknown) {
      setErro(`${falha instanceof Error ? falha.message : 'Falha ao criar a área.'} A área ficou com situação Erro e pode ser reprocessada.`);
      setSalvando(false);
    }
  };

  return (
    <GtiDialog
      id={id}
      sobretitulo={`Administração · ${props.ambiente}`}
      titulo="Nova área"
      bloquearFechamento={salvando}
      aoFechar={props.aoFechar}
      textoRodape={erro ? undefined : 'Leva cerca de um minuto. Reprocessar nunca duplica.'}
      rodape={
        <>
          <button type="button" className="pi-btn" disabled={salvando} onClick={props.aoFechar}>
            Cancelar
          </button>
          <button type="button" className="pi-btn primary" disabled={salvando} onClick={criar}>
            {salvando ? 'Criando…' : 'Criar área'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="pi-form-grid">
          <Field id={`${id}-nome`} rotulo="Nome da área" obrigatorio erro={tentou ? erroNome : undefined}>
            {(aria) => <input {...aria} autoFocus maxLength={120} disabled={salvando} placeholder="Ex.: Secretaria Acadêmica" value={nome} onChange={(e) => alterarNome(e.target.value)} />}
          </Field>
          <Field
            id={`${id}-sigla`}
            rotulo="Sigla"
            obrigatorio
            erro={tentou || sigla.length > 1 ? erroSigla || undefined : undefined}
            dica="Usada nos nomes de grupos e listas (ex.: FIN). Não muda depois."
          >
            {(aria) => (
              <input
                {...aria}
                maxLength={10}
                disabled={salvando}
                value={sigla}
                onChange={(e) => {
                  setSiglaEditada(true);
                  setSigla(normalizarSigla(e.target.value));
                }}
              />
            )}
          </Field>
        </div>
        <div className="pi-field">
          <span className="pi-label" id={`${id}-cor`}>
            Cor
          </span>
          <div className={styles.cores} role="radiogroup" aria-labelledby={`${id}-cor`}>
            {CORES_AREA.map((c) => (
              <button key={c.color} type="button" role="radio" aria-checked={cor === c.color} aria-label={c.label} title={c.label} disabled={salvando} style={{ background: c.color }} onClick={() => setCor(c.color)} />
            ))}
          </div>
        </div>
        <Field id={`${id}-icone`} rotulo="Ícone">
          {(aria) => (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className={styles.areaIcone} style={{ background: `${cor}1f`, color: cor }}>
                <IconeArea area={{ icone }} />
              </span>
              <select {...aria} disabled={salvando} value={icone} onChange={(e) => setIcone(e.target.value)}>
                {ICONES_AREA.map((i) => (
                  <option key={i.key} value={i.key}>
                    {i.text}
                  </option>
                ))}
              </select>
            </div>
          )}
        </Field>
        <PessoasPicker
          id={`${id}-gestores`}
          rotulo="Gestores da área *"
          servico={props.servico}
          selecionadas={gestores}
          aoAlterar={setGestores}
          desabilitado={salvando}
          erro={tentou ? erroGestores || undefined : undefined}
          dica="Gestores veem tudo da área, aprovam jornadas e incluem pessoas nos grupos."
        />
        <section className="pi-card pi-panel" style={{ background: '#f8fafc' }} aria-live="polite">
          <span className="pi-eyebrow">{salvando || passos.length ? 'Andamento' : 'O que será criado'}</span>
          <ul className={styles.checklist}>
            {salvando || passos.length
              ? passos.map((p: string, i: number) => {
                  const atual: boolean = salvando && i === passos.length - 1;
                  return (
                    <li key={`${p}-${i}`} className={atual ? undefined : styles.ok}>
                      <span className={styles.marca} aria-hidden="true">
                        <Icon nome={atual ? 'atualizar' : 'check'} tamanho={13} />
                      </span>
                      {p}
                      {atual ? '…' : ''}
                    </li>
                  );
                })
              : O_QUE_SERA_CRIADO.map((p: string) => (
                  <li key={p}>
                    <span className={styles.marca} aria-hidden="true">
                      <Icon nome="camadas" tamanho={12} />
                    </span>
                    {p}
                  </li>
                ))}
          </ul>
        </section>
        {erro && (
          <div className="pi-error" role="alert">
            {erro}
          </div>
        )}
      </div>
    </GtiDialog>
  );
};

export default NovaAreaModal;
