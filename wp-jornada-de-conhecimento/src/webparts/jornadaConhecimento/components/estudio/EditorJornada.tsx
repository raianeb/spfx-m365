// Skills aplicadas: spfx-design-base (editor em passos, ação principal por perfil, erro visível), spfx-acessibilidade-
// conteudo (passo atual anunciado, reordenar por botões além de arrastar). Escopo, seção 6.4.
import * as React from 'react';
import { useEffect, useState } from 'react';
import { DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { ChoiceGroup, IChoiceGroupOption } from '@fluentui/react/lib/ChoiceGroup';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { TextField } from '@fluentui/react/lib/TextField';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { IArea } from '../../../../jornada/modelo';
import { IEtapa, PERCENTUAL_MINIMO_PADRAO, ordenarEtapas } from '../../../../jornada/progresso';
import { ErrosFormulario, IJornadaEstudio, IPessoaPublico, StatusJornada, moverEtapa, renumerar, validarJornada } from '../../../../jornada/estudio';
import { AreaService, IPessoa } from '../../../../services/AreaService';
import { IArquivoBiblioteca } from '../../../../services/EstudioService';
import { mensagemDeErro } from '../../../../services/sp';
import { IServicosJornada } from '../tipos';
import PessoasPicker from '../comum/PessoasPicker';
import EtapaForm from './EtapaForm';
import PreviaJornada from './PreviaJornada';
import styles from './Estudio.module.scss';

export interface IEditorJornadaProps {
  area: IArea;
  jornada: IJornadaEstudio;
  gestor: boolean;
  servicos: IServicosJornada;
  pessoas: AreaService;
  siteUrl: string;
  themeStyle?: React.CSSProperties;
  aoFechar: (alterou: boolean) => void;
}

const PASSOS: string[] = ['Dados gerais', 'Etapas', 'Público', 'Regras', 'Publicação'];

const novaEtapa = (ordem: number, id: number): IEtapa => ({
  id,
  jornadaId: 0,
  titulo: '',
  ordem,
  tipo: 'YouTube',
  url: '',
  duracaoMin: 0,
  instrucoes: '',
  regra: 'PercentualAssistido',
  percentualMinimo: PERCENTUAL_MINIMO_PADRAO
});

const EditorJornada: React.FC<IEditorJornadaProps> = (props: IEditorJornadaProps) => {
  const { area, servicos, gestor } = props;
  const [jornada, setJornada] = useState<IJornadaEstudio>(props.jornada);
  const [etapas, setEtapas] = useState<IEtapa[] | undefined>(props.jornada.id > 0 ? undefined : []);
  const [removidas, setRemovidas] = useState<number[]>([]);
  const [curtidas, setCurtidas] = useState<Map<number, number>>(new Map<number, number>());
  const [arquivos, setArquivos] = useState<IArquivoBiblioteca[] | undefined>(undefined);
  const [passo, setPasso] = useState<number>(0);
  const [erros, setErros] = useState<ErrosFormulario>({});
  const [editando, setEditando] = useState<IEtapa | undefined>(undefined);
  const [previa, setPrevia] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<{ tipo: MessageBarType; texto: string } | undefined>(undefined);
  const [proximoId, setProximoId] = useState<number>(-1);
  const publicoTodos: boolean = jornada.publicoDetalhado.length === 0;
  const [publicoModo, setPublicoModo] = useState<'todos' | 'especifico'>(publicoTodos ? 'todos' : 'especifico');

  useEffect(() => {
    let ativo: boolean = true;
    if (props.jornada.id > 0) {
      servicos.jornadas
        .etapasDaJornada(area, props.jornada.id)
        .then((lidas: IEtapa[]) => ativo && setEtapas(ordenarEtapas(lidas)))
        .catch((erro: unknown) => ativo && setMensagem({ tipo: MessageBarType.error, texto: mensagemDeErro(erro, 'Carregar as etapas') }));
      servicos.estudio
        .curtidasPorEtapa(area, props.jornada.id)
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
  }, [servicos, area, props.jornada.id]);

  const alterar = (parcial: Partial<IJornadaEstudio>): void => setJornada((atual: IJornadaEstudio) => ({ ...atual, ...parcial }));

  const aplicarEtapa = (etapa: IEtapa): void => {
    setEtapas((atuais: IEtapa[] | undefined) => {
      const lista: IEtapa[] = atuais ?? [];
      const existe: boolean = lista.some((item: IEtapa) => item.id === etapa.id);
      return renumerar(existe ? lista.map((item: IEtapa) => (item.id === etapa.id ? etapa : item)) : [...lista, etapa]);
    });
    setEditando(undefined);
  };

  const removerEtapa = (etapa: IEtapa): void => {
    setEtapas((atuais: IEtapa[] | undefined) => renumerar((atuais ?? []).filter((item: IEtapa) => item.id !== etapa.id)));
    if (etapa.id > 0) {
      setRemovidas((atuais: number[]) => [...atuais, etapa.id]);
    }
  };

  /** Salva como rascunho, envia para aprovação (Apoio) ou publica (Gestor). */
  const salvar = async (acao: 'rascunho' | 'enviar' | 'publicar'): Promise<void> => {
    const encontrados: ErrosFormulario = validarJornada(jornada, props.siteUrl);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setPasso(encontrados.prazoDias ? 3 : 0);
      setMensagem({ tipo: MessageBarType.error, texto: 'Corrija os campos destacados antes de salvar.' });
      return;
    }
    if (acao !== 'rascunho' && (!etapas || etapas.length === 0)) {
      setPasso(1);
      setMensagem({ tipo: MessageBarType.error, texto: 'Adicione ao menos uma etapa antes de publicar.' });
      return;
    }
    setSalvando(true);
    setMensagem(undefined);
    // Jornada já publicada segue "Publicada" para os Usuários até a nova versão ser aprovada.
    const status: StatusJornada =
      acao === 'enviar' ? 'EmAprovacao' : acao === 'publicar' ? 'Publicada' : jornada.status === 'Publicada' ? 'Publicada' : 'Rascunho';
    const dados: IJornadaEstudio = { ...jornada, publicoDetalhado: publicoModo === 'todos' ? [] : jornada.publicoDetalhado };
    try {
      const id: number = await servicos.estudio.salvar(area, dados, etapas ?? [], removidas, status);
      if (acao === 'publicar') {
        await servicos.estudio.publicar(area, { ...dados, id });
      }
      props.aoFechar(true);
    } catch (erro: unknown) {
      setMensagem({
        tipo: MessageBarType.error,
        texto: erro instanceof Error && !('status' in erro) ? erro.message : mensagemDeErro(erro, 'Salvar a jornada')
      });
      setSalvando(false);
    }
  };

  const publicoPessoas: IPessoa[] = jornada.publicoDetalhado.map((pessoa: IPessoaPublico) => ({ loginName: pessoa.loginName, nome: pessoa.nome, email: '' }));
  const opcoesPublico: IChoiceGroupOption[] = [
    { key: 'todos', text: 'Todos os Usuários da área' },
    { key: 'especifico', text: 'Pessoas específicas' }
  ];

  return (
    <div className={styles.editor}>
      <div className={styles.editorTopo}>
        <DefaultButton iconProps={{ iconName: 'Back' }} text="Voltar ao Estúdio" onClick={() => props.aoFechar(false)} disabled={salvando} />
        <h3 className={styles.editorTitulo}>{props.jornada.id > 0 ? `Editar: ${props.jornada.titulo}` : 'Nova jornada'}</h3>
        <DefaultButton iconProps={{ iconName: 'View' }} text="Pré-visualizar" onClick={() => setPrevia(true)} disabled={!etapas} />
      </div>

      <nav aria-label="Passos do editor">
        <ol className={styles.passos}>
          {PASSOS.map((rotulo: string, indice: number) => (
            <li key={rotulo}>
              <button type="button" className={styles.passo} aria-current={indice === passo ? 'step' : undefined} onClick={() => setPasso(indice)}>
                <span className={styles.passoNumero} aria-hidden="true">
                  {indice + 1}
                </span>
                {indice === 4 ? (gestor ? 'Publicar' : 'Enviar para publicação') : rotulo}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {mensagem && (
        <MessageBar messageBarType={mensagem.tipo} onDismiss={() => setMensagem(undefined)} dismissButtonAriaLabel="Fechar aviso">
          {mensagem.texto}
        </MessageBar>
      )}
      {jornada.comentarioModeracao && jornada.moderacao === 1 && (
        <MessageBar messageBarType={MessageBarType.warning}>Devolvida pelo gestor: {jornada.comentarioModeracao}</MessageBar>
      )}

      <section className={styles.painelPasso} aria-label={PASSOS[passo]}>
        {passo === 0 && (
          <div className={styles.campos}>
            <TextField label="Nome da jornada" required value={jornada.titulo} maxLength={255} onChange={(_e, v?: string) => alterar({ titulo: v ?? '' })} errorMessage={erros.titulo} />
            <TextField label="Descrição" multiline rows={4} value={jornada.descricao} onChange={(_e, v?: string) => alterar({ descricao: v ?? '' })} />
            <TextField
              label="Capa (endereço da imagem)"
              value={jornada.capa}
              onChange={(_e, v?: string) => alterar({ capa: v ?? '' })}
              description="Opcional. Sem capa, o card usa a cor e o ícone da área."
              errorMessage={erros.capa}
            />
            <TextField label="Categoria" value={jornada.categoria} maxLength={255} onChange={(_e, v?: string) => alterar({ categoria: v ?? '' })} />
          </div>
        )}

        {passo === 1 && (
          <div className={styles.campos}>
            {jornada.status === 'Publicada' && (
              <MessageBar messageBarType={MessageBarType.info}>
                Esta jornada já está publicada: alterações nas etapas valem para os Usuários assim que você salvar.
              </MessageBar>
            )}
            {etapas === undefined ? (
              <p className={styles.ajuda}>Carregando etapas...</p>
            ) : etapas.length === 0 ? (
              <p className={styles.ajuda}>Nenhuma etapa ainda. Adicione vídeos, documentos ou links na ordem em que devem ser feitos.</p>
            ) : (
              <ol className={styles.listaEtapas} aria-label="Etapas">
                {etapas.map((etapa: IEtapa, indice: number) => (
                  <li key={etapa.id} className={styles.itemEtapa}>
                    <span className={styles.ordem} aria-hidden="true">
                      {indice + 1}
                    </span>
                    <span className={styles.itemTexto}>
                      <strong>{etapa.titulo}</strong>
                      <span className={styles.ajuda}>
                        {etapa.tipo} · {etapa.duracaoMin} min
                        {etapa.id > 0 && ` · ${curtidas.get(etapa.id) ?? 0} curtida(s)`}
                      </span>
                    </span>
                    <IconButton
                      iconProps={{ iconName: 'Up' }}
                      ariaLabel={`Mover ${etapa.titulo} para cima`}
                      disabled={indice === 0}
                      onClick={() => setEtapas(moverEtapa(etapas, indice, -1))}
                    />
                    <IconButton
                      iconProps={{ iconName: 'Down' }}
                      ariaLabel={`Mover ${etapa.titulo} para baixo`}
                      disabled={indice === etapas.length - 1}
                      onClick={() => setEtapas(moverEtapa(etapas, indice, 1))}
                    />
                    <IconButton iconProps={{ iconName: 'Edit' }} ariaLabel={`Editar ${etapa.titulo}`} onClick={() => setEditando(etapa)} />
                    <IconButton iconProps={{ iconName: 'Delete' }} ariaLabel={`Remover ${etapa.titulo}`} onClick={() => removerEtapa(etapa)} />
                  </li>
                ))}
              </ol>
            )}
            <div>
              <DefaultButton
                iconProps={{ iconName: 'Add' }}
                text="Adicionar etapa"
                disabled={etapas === undefined}
                onClick={() => {
                  setEditando(novaEtapa(((etapas?.length ?? 0) + 1) * 10, proximoId));
                  setProximoId((id: number) => id - 1);
                }}
              />
            </div>
          </div>
        )}

        {passo === 2 && (
          <div className={styles.campos}>
            <ChoiceGroup
              label="Quem deve fazer esta jornada"
              options={opcoesPublico}
              selectedKey={publicoModo}
              onChange={(_e, opcao?: IChoiceGroupOption) => opcao && setPublicoModo(opcao.key as 'todos' | 'especifico')}
            />
            {publicoModo === 'especifico' && (
              <PessoasPicker
                id="publico-especifico"
                rotulo="Pessoas"
                servico={props.pessoas}
                selecionadas={publicoPessoas}
                aoAlterar={(pessoas: IPessoa[]) => alterar({ publicoDetalhado: pessoas.map((p: IPessoa) => ({ loginName: p.loginName, nome: p.nome })) })}
              />
            )}
            <p className={styles.ajuda}>
              O público organiza a tela de cada pessoa. Quem não está no público não vê a jornada em Minhas Jornadas, mas o conteúdo segue legível para toda a área.
            </p>
          </div>
        )}

        {passo === 3 && (
          <div className={styles.campos}>
            <Toggle label="Obrigatória" checked={jornada.obrigatoria} onChange={(_e, v?: boolean) => alterar({ obrigatoria: !!v })} onText="Sim" offText="Não" />
            <TextField
              label="Prazo (dias a partir da publicação)"
              type="number"
              min={1}
              value={jornada.prazoDias === undefined ? '' : String(jornada.prazoDias)}
              onChange={(_e, v?: string) => alterar({ prazoDias: v ? Number(v) : undefined })}
              description="Vazio = sem prazo."
              errorMessage={erros.prazoDias}
            />
            <Toggle
              label="Ordem livre"
              checked={jornada.ordemLivre}
              onChange={(_e, v?: boolean) => alterar({ ordemLivre: !!v })}
              onText="As etapas podem ser feitas em qualquer ordem"
              offText="Cada etapa libera a próxima"
            />
            <Toggle
              label="Emite certificado (fase 4)"
              checked={jornada.emiteCertificado}
              onChange={(_e, v?: boolean) => alterar({ emiteCertificado: !!v })}
              onText="Sim"
              offText="Não"
            />
            {jornada.emiteCertificado && (
              <TextField label="Modelo de certificado" value={jornada.modeloCertificado} onChange={(_e, v?: string) => alterar({ modeloCertificado: v ?? '' })} />
            )}
          </div>
        )}

        {passo === 4 && (
          <div className={styles.campos}>
            <p>
              <Icon iconName="Info" aria-hidden="true" />{' '}
              {gestor
                ? 'Ao publicar, a jornada aparece na hora para o público escolhido.'
                : 'Ao enviar, um gestor da área revisa e publica. Até lá, só você e os gestores veem esta versão.'}
            </p>
            <p className={styles.ajuda}>{etapas?.length ?? 0} etapa(s).</p>
          </div>
        )}
      </section>

      <div className={styles.editorRodape}>
        <div className={styles.navegacao}>
          <DefaultButton text="Anterior" onClick={() => setPasso((p: number) => p - 1)} disabled={passo === 0 || salvando} />
          {passo < 4 && <DefaultButton text="Próximo" onClick={() => setPasso((p: number) => p + 1)} disabled={salvando} />}
        </div>
        <div className={styles.navegacao}>
          <DefaultButton text={salvando ? 'Salvando...' : 'Salvar rascunho'} onClick={() => salvar('rascunho')} disabled={salvando || !etapas} />
          {passo === 4 &&
            (gestor ? (
              <PrimaryButton text={salvando ? 'Publicando...' : 'Publicar'} onClick={() => salvar('publicar')} disabled={salvando || !etapas} />
            ) : (
              <PrimaryButton text={salvando ? 'Enviando...' : 'Enviar para publicação'} onClick={() => salvar('enviar')} disabled={salvando || !etapas} />
            ))}
        </div>
      </div>

      {editando && (
        <EtapaForm
          etapa={editando}
          siteUrl={props.siteUrl}
          arquivos={arquivos}
          themeStyle={props.themeStyle}
          aoFechar={() => setEditando(undefined)}
          aoSalvar={aplicarEtapa}
        />
      )}
      {previa && etapas && (
        <PreviaJornada
          titulo={jornada.titulo}
          descricao={jornada.descricao}
          etapas={etapas}
          siteUrl={props.siteUrl}
          themeStyle={props.themeStyle}
          aoFechar={() => setPrevia(false)}
        />
      )}
    </div>
  );
};

export default EditorJornada;
