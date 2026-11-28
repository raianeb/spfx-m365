// Skills aplicadas: spfx-padrao-visual-gti (barra de ferramentas, painel de inserção, estados de envio),
// spfx-acessibilidade-conteudo (barra com role=toolbar, texto alternativo obrigatório nas imagens, erros anunciados).
// Conteúdo de etapa montado na tela: texto com títulos, listas, citação, links e imagens. Toda saída passa por
// sanitizarConteudo (allowlist); imagens vão para a pasta Imagens da biblioteca da área, nunca em base64.
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { isSafeImage, isSafeLink, sanitizarConteudo } from '../../../../comum/richText';
import { EXTENSOES_IMAGEM, LIMITE_CONTEUDO_ETAPA, ehImagem } from '../../../../jornada/estudio';
import { IArea } from '../../../../jornada/modelo';
import { EstudioService, IItemPasta } from '../../../../services/EstudioService';
import { mensagemDeErro } from '../../../../services/sp';
import { Icon, NomeIcone } from '../gti';
import NavegadorBiblioteca from './NavegadorBiblioteca';
import styles from '../jc.module.scss';

export interface IEditorConteudoProps {
  id: string;
  rotulo: string;
  valor: string;
  erro?: string;
  area: IArea;
  estudio: EstudioService;
  origem: string;
  aoAlterar: (html: string) => void;
}

interface IFerramenta {
  rotulo: string;
  icone: NomeIcone;
  comando: string;
  argumento?: string;
}

const FERRAMENTAS: IFerramenta[] = [
  { rotulo: 'Negrito', icone: 'negrito', comando: 'bold' },
  { rotulo: 'Itálico', icone: 'italico', comando: 'italic' },
  { rotulo: 'Sublinhado', icone: 'sublinhado', comando: 'underline' },
  { rotulo: 'Lista com marcadores', icone: 'lista', comando: 'insertUnorderedList' },
  { rotulo: 'Lista numerada', icone: 'listaNumerada', comando: 'insertOrderedList' },
  { rotulo: 'Citação ou destaque', icone: 'citacao', comando: 'formatBlock', argumento: 'blockquote' },
  { rotulo: 'Linha divisória', icone: 'divisor', comando: 'insertHorizontalRule' }
];

const BLOCOS: { valor: string; rotulo: string }[] = [
  { valor: 'p', rotulo: 'Parágrafo' },
  { valor: 'h2', rotulo: 'Título' },
  { valor: 'h3', rotulo: 'Subtítulo' },
  { valor: 'h4', rotulo: 'Tópico' }
];

type Painel = 'link' | 'imagem' | undefined;
type OrigemImagem = 'computador' | 'biblioteca' | 'endereco';

const escaparAtributo = (valor: string): string => valor.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Impede que o clique na barra tire o cursor do texto. */
const manterSelecao = (evento: React.MouseEvent<HTMLElement>): void => evento.preventDefault();

const EditorConteudo: React.FC<IEditorConteudoProps> = (props: IEditorConteudoProps) => {
  const { id, estudio, area, origem } = props;
  const editor = useRef<HTMLDivElement>(null);
  const faixa = useRef<Range | undefined>(undefined);
  const entradaImagem = useRef<HTMLInputElement>(null);
  const [inicial] = useState<string>(() => sanitizarConteudo(props.valor));
  const [tamanho, setTamanho] = useState<number>(inicial.length);
  const [painel, setPainel] = useState<Painel>(undefined);
  const [origemImagem, setOrigemImagem] = useState<OrigemImagem>('computador');
  const [link, setLink] = useState<string>('');
  const [imagem, setImagem] = useState<string>('');
  const [alt, setAlt] = useState<string>('');
  const [erroPainel, setErroPainel] = useState<string>('');
  const [enviando, setEnviando] = useState<boolean>(false);

  useEffect(() => {
    if (editor.current) {
      editor.current.innerHTML = inicial;
    }
  }, [inicial]);

  const emitir = (): void => {
    if (editor.current) {
      const html: string = sanitizarConteudo(editor.current.innerHTML);
      setTamanho(html.length);
      props.aoAlterar(html);
    }
  };

  const guardarSelecao = (): void => {
    const selecao: Selection | null = window.getSelection();
    const dentro: boolean = Boolean(selecao && selecao.rangeCount > 0 && editor.current?.contains(selecao.anchorNode));
    faixa.current = dentro && selecao ? selecao.getRangeAt(0).cloneRange() : undefined;
  };

  const restaurarSelecao = (): void => {
    editor.current?.focus();
    const selecao: Selection | null = window.getSelection();
    if (faixa.current && selecao) {
      selecao.removeAllRanges();
      selecao.addRange(faixa.current);
    } else if (editor.current && selecao) {
      // Sem posição guardada: insere no fim do conteúdo.
      const fim: Range = document.createRange();
      fim.selectNodeContents(editor.current);
      fim.collapse(false);
      selecao.removeAllRanges();
      selecao.addRange(fim);
    }
  };

  const executar = (comando: string, argumento?: string): void => {
    editor.current?.focus();
    document.execCommand(comando, false, argumento);
    emitir();
  };

  const fecharPainel = (): void => {
    setPainel(undefined);
    setErroPainel('');
  };

  const abrirPainel = (qual: Painel): void => {
    guardarSelecao();
    setErroPainel('');
    setLink('');
    setImagem('');
    setAlt('');
    setPainel(painel === qual ? undefined : qual);
  };

  const inserirImagem = (url: string, texto: string): void => {
    restaurarSelecao();
    document.execCommand('insertHTML', false, `<img src="${escaparAtributo(url)}" alt="${escaparAtributo(texto)}"><p><br></p>`);
    emitir();
  };

  const aplicarLink = (): void => {
    const url: string = link.trim();
    if (!isSafeLink(url)) {
      setErroPainel('Informe um endereço que comece com https://, http:// ou mailto:.');
      return;
    }
    restaurarSelecao();
    const selecao: Selection | null = window.getSelection();
    if (!selecao || selecao.isCollapsed) {
      // Sem texto selecionado: insere o próprio endereço como link.
      document.execCommand('insertHTML', false, `<a href="${escaparAtributo(url)}">${escaparAtributo(url)}</a>&nbsp;`);
    } else {
      document.execCommand('createLink', false, url);
    }
    emitir();
    setErroPainel('');
    setPainel(undefined);
  };

  const aplicarImagem = (): void => {
    if (!isSafeImage(imagem)) {
      setErroPainel(origemImagem === 'endereco' ? 'Informe o endereço https da imagem.' : 'Escolha ou envie uma imagem.');
      return;
    }
    if (alt.trim() === '') {
      setErroPainel('Descreva a imagem em poucas palavras (texto alternativo), para quem usa leitor de tela.');
      return;
    }
    inserirImagem(imagem, alt.trim());
    setErroPainel('');
    setPainel(undefined);
  };

  const enviarImagem = async (arquivo: File | undefined, inserirDireto: boolean): Promise<void> => {
    if (!arquivo) {
      return;
    }
    if (!ehImagem(arquivo.name)) {
      setErroPainel(`Use uma imagem ${EXTENSOES_IMAGEM.join(', ')}.`);
      return;
    }
    setErroPainel('');
    setEnviando(true);
    try {
      const url: string = await estudio.enviarImagem(area, arquivo, origem);
      if (inserirDireto) {
        // Imagem colada ou arrastada: entra já, com o nome do arquivo como descrição inicial.
        inserirImagem(url, arquivo.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
      } else {
        setImagem(url);
        if (!alt) {
          setAlt(arquivo.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
        }
      }
    } catch (falha: unknown) {
      setErroPainel(mensagemDeErro(falha, 'Enviar a imagem'));
      if (inserirDireto) {
        setPainel('imagem');
      }
    } finally {
      setEnviando(false);
      if (entradaImagem.current) {
        entradaImagem.current.value = '';
      }
    }
  };

  const colar = (evento: React.ClipboardEvent<HTMLDivElement>): void => {
    const arquivo: File | undefined = Array.from(evento.clipboardData.files).find((f: File) => ehImagem(f.name) || f.type.indexOf('image/') === 0);
    evento.preventDefault();
    if (arquivo) {
      guardarSelecao();
      const nome: string = ehImagem(arquivo.name) ? arquivo.name : `imagem-colada.${arquivo.type.split('/')[1] || 'png'}`;
      enviarImagem(new File([arquivo], nome, { type: arquivo.type }), true).catch(() => undefined);
      return;
    }
    // Texto colado de outra página ou do Word mantém a estrutura permitida; o resto é descartado.
    const html: string = evento.clipboardData.getData('text/html');
    if (html) {
      document.execCommand('insertHTML', false, sanitizarConteudo(html));
    } else {
      document.execCommand('insertText', false, evento.clipboardData.getData('text/plain'));
    }
    emitir();
  };

  const soltar = (evento: React.DragEvent<HTMLDivElement>): void => {
    const arquivo: File | undefined = Array.from(evento.dataTransfer.files).find((f: File) => ehImagem(f.name));
    if (!arquivo) {
      return;
    }
    evento.preventDefault();
    guardarSelecao();
    enviarImagem(arquivo, true).catch(() => undefined);
  };

  const idRotulo: string = `${id}-rotulo`;
  const perto: boolean = tamanho > LIMITE_CONTEUDO_ETAPA * 0.85;

  return (
    <div className={`pi-field ${props.erro ? 'invalid' : ''}`}>
      <span className="pi-label" id={idRotulo}>
        {props.rotulo} *
      </span>
      <div className={styles.editorConteudo}>
        <div role="toolbar" aria-label={`Formatação: ${props.rotulo}`} className={styles.editorBarra}>
          <select
            aria-label="Estilo do bloco"
            onChange={(e) => {
              executar('formatBlock', e.target.value);
              e.target.value = '';
            }}
            value=""
          >
            <option value="" disabled>
              Estilo
            </option>
            {BLOCOS.map((b) => (
              <option key={b.valor} value={b.valor}>
                {b.rotulo}
              </option>
            ))}
          </select>
          <span className={styles.editorSep} aria-hidden="true" />
          {FERRAMENTAS.map((f: IFerramenta) => (
            <button key={f.rotulo} type="button" className="pi-icon-btn" title={f.rotulo} aria-label={f.rotulo} onMouseDown={manterSelecao} onClick={() => executar(f.comando, f.argumento)}>
              <Icon nome={f.icone} tamanho={17} />
            </button>
          ))}
          <span className={styles.editorSep} aria-hidden="true" />
          <button type="button" className="pi-icon-btn" title="Link" aria-label="Inserir link" aria-expanded={painel === 'link'} onMouseDown={manterSelecao} onClick={() => abrirPainel('link')}>
            <Icon nome="link" tamanho={17} />
          </button>
          <button type="button" className="pi-icon-btn" title="Imagem" aria-label="Inserir imagem" aria-expanded={painel === 'imagem'} onMouseDown={manterSelecao} onClick={() => abrirPainel('imagem')}>
            <Icon nome="imagem" tamanho={17} />
          </button>
          <button type="button" className="pi-icon-btn" title="Limpar formatação" aria-label="Limpar formatação" onMouseDown={manterSelecao} onClick={() => executar('removeFormat')}>
            <Icon nome="limparFormato" tamanho={17} />
          </button>
          {enviando && <span className="pi-hint" style={{ marginLeft: 'auto' }}>Enviando imagem…</span>}
        </div>

        {painel === 'link' && (
          <div className={styles.editorPainel}>
            <label className="pi-label" htmlFor={`${id}-link`}>
              Endereço do link
            </label>
            <div className={styles.editorLinha}>
              <input
                id={`${id}-link`}
                type="url"
                autoFocus
                placeholder="https://"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    aplicarLink();
                  }
                }}
              />
              <button type="button" className="pi-btn primary" onClick={aplicarLink}>
                Inserir
              </button>
              <button type="button" className="pi-btn" onClick={fecharPainel}>
                Cancelar
              </button>
            </div>
            <span className="pi-hint">Selecione um trecho do texto antes para transformá-lo em link. O link abre em nova aba.</span>
          </div>
        )}

        {painel === 'imagem' && (
          <div className={styles.editorPainel}>
            <div className="pi-chips" role="group" aria-label="De onde vem a imagem">
              {(
                [
                  ['computador', 'Do computador'],
                  ['biblioteca', 'Da biblioteca'],
                  ['endereco', 'Por endereço']
                ] as [OrigemImagem, string][]
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={origemImagem === valor}
                  className="pi-chip"
                  onClick={() => {
                    setOrigemImagem(valor);
                    setErroPainel('');
                  }}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            {origemImagem === 'computador' && (
              <div className={styles.editorLinha}>
                <input
                  ref={entradaImagem}
                  id={`${id}-arquivo`}
                  type="file"
                  className="pi-sr"
                  accept={EXTENSOES_IMAGEM.map((e: string) => `.${e}`).join(',')}
                  onChange={(e) => {
                    enviarImagem(e.target.files?.[0], false).catch(() => undefined);
                  }}
                />
                <button type="button" className="pi-btn" disabled={enviando} onClick={() => entradaImagem.current?.click()}>
                  <Icon nome="subir" tamanho={16} />
                  {enviando ? 'Enviando…' : imagem ? 'Trocar imagem' : 'Escolher imagem'}
                </button>
                <span className="pi-hint">Vai para a pasta Imagens da biblioteca da área. Dica: também dá para colar ou arrastar a imagem no texto.</span>
              </div>
            )}
            {origemImagem === 'biblioteca' && (
              <NavegadorBiblioteca
                id={`${id}-nav`}
                area={area}
                estudio={estudio}
                origem={origem}
                extensoes={EXTENSOES_IMAGEM}
                oQue="imagem"
                selecionada={imagem}
                permitirEnvio={false}
                aoEscolher={(item: IItemPasta) => {
                  setImagem(item.url);
                  if (!alt) {
                    setAlt(item.nome.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
                  }
                }}
              />
            )}
            {origemImagem === 'endereco' && (
              <>
                <label className="pi-label" htmlFor={`${id}-img-url`}>
                  Endereço da imagem
                </label>
                <input id={`${id}-img-url`} type="url" placeholder="https://" value={imagem} onChange={(e) => setImagem(e.target.value)} />
              </>
            )}
            {imagem && isSafeImage(imagem) && <img className={styles.editorMiniatura} src={imagem} alt="" />}
            <label className="pi-label" htmlFor={`${id}-alt`}>
              Descrição da imagem (texto alternativo) *
            </label>
            <input id={`${id}-alt`} maxLength={300} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Ex.: Tela de cadastro com o botão Salvar destacado" />
            <div className={styles.editorLinha}>
              <button type="button" className="pi-btn primary" disabled={enviando} onClick={aplicarImagem}>
                Inserir imagem
              </button>
              <button type="button" className="pi-btn" onClick={fecharPainel}>
                Cancelar
              </button>
            </div>
          </div>
        )}
        {erroPainel && (
          <p className={styles.erroInline} role="alert">
            {erroPainel}
          </p>
        )}

        <div
          ref={editor}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={idRotulo}
          aria-describedby={`${id}-ajuda`}
          aria-invalid={props.erro ? true : undefined}
          contentEditable={true}
          spellCheck={true}
          className={`${styles.editorArea} ${styles.conteudoRico}`}
          onInput={emitir}
          onBlur={guardarSelecao}
          onKeyUp={guardarSelecao}
          onMouseUp={guardarSelecao}
          onPaste={colar}
          onDrop={soltar}
          data-placeholder="Escreva aqui o conteúdo da etapa. Use Estilo para títulos, insira imagens e links pela barra."
        />
      </div>
      {props.erro ? (
        <span className="pi-field-error" id={`${id}-ajuda`}>
          {props.erro}
        </span>
      ) : (
        <span className="pi-hint" id={`${id}-ajuda`} style={perto ? { color: 'var(--pi-warning)' } : undefined}>
          {perto
            ? `Conteúdo grande (${Math.round((tamanho / LIMITE_CONTEUDO_ETAPA) * 100)}% do limite). Se precisar de mais, divida em duas etapas.`
            : 'A pessoa lê este conteúdo direto no player. Imagens ficam na biblioteca da área.'}
        </span>
      )}
    </div>
  );
};

export default EditorConteudo;
