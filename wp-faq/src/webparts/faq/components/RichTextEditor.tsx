import * as React from 'react';
import { DefaultButton, IconButton } from '@fluentui/react/lib/Button';
import { TextField } from '@fluentui/react/lib/TextField';
import { textFieldStyles, secondaryButtonStyles } from '../../../crud/modalStyles';
import faqStyles from './Faq.module.scss';
import { isSafeLink, sanitizeRichText, toSafeHtml } from './richText';

export interface IRichTextEditorProps {
  /** Rótulo visível, também usado pelas tecnologias assistivas. */
  label: string;
  /** Conteúdo atual (HTML guardado ou texto antigo). Lido somente na montagem do editor. */
  value: string;
  errorMessage?: string;
  /** Recebe sempre o HTML já sanitizado. */
  onChange: (html: string) => void;
}

interface IFormatTool {
  command: string;
  icon: string;
  label: string;
}

/** Comandos da barra. Negrito, itálico e sublinhado usam os atalhos nativos do navegador. */
const FORMAT_TOOLS: IFormatTool[] = [
  { command: 'bold', icon: 'Bold', label: 'Negrito' },
  { command: 'italic', icon: 'Italic', label: 'Itálico' },
  { command: 'underline', icon: 'Underline', label: 'Sublinhado' },
  { command: 'insertUnorderedList', icon: 'BulletedList', label: 'Lista com marcadores' },
  { command: 'insertOrderedList', icon: 'NumberedList', label: 'Lista numerada' },
  { command: 'removeFormat', icon: 'ClearFormatting', label: 'Limpar formatação' }
];

/** Impede que o clique na barra tire o cursor do texto. */
const keepSelection = (event: React.MouseEvent<HTMLElement>): void => event.preventDefault();

/**
 * Editor de texto rico em contentEditable, com barra de formatação. Não usa biblioteca externa.
 * Colar insere somente texto puro, e toda alteração é sanitizada antes de sair do editor.
 * Observação: document.execCommand é considerado legado pelo padrão, mas segue suportado pelos
 * navegadores e dispensa dependência nova. Trocar por um editor dedicado é a alternativa.
 */
const RichTextEditor: React.FC<IRichTextEditorProps> = ({ label, value, errorMessage, onChange }) => {
  const labelId: string = React.useId();
  const editorRef: React.RefObject<HTMLDivElement> = React.useRef<HTMLDivElement>(null);
  const savedRange: React.MutableRefObject<Range | undefined> = React.useRef<Range | undefined>(undefined);
  const [initialHtml] = React.useState<string>((): string => toSafeHtml(value));
  const [linkOpen, setLinkOpen] = React.useState<boolean>(false);
  const [linkUrl, setLinkUrl] = React.useState<string>('');
  const [linkError, setLinkError] = React.useState<string | undefined>(undefined);

  // Carga única: o conteúdo entra sanitizado e não é reescrito enquanto o usuário edita.
  React.useEffect((): void => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml;
    }
  }, [initialHtml]);

  const emit = (): void => {
    if (editorRef.current) {
      onChange(sanitizeRichText(editorRef.current.innerHTML));
    }
  };

  const runCommand = (command: string, argument?: string): void => {
    document.execCommand(command, false, argument);
    emit();
  };

  const openLink = (): void => {
    const selection: Selection | null = window.getSelection();
    const inside: boolean = Boolean(selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode));
    savedRange.current = inside && selection ? selection.getRangeAt(0).cloneRange() : undefined;
    setLinkUrl('');
    setLinkError(undefined);
    setLinkOpen(true);
  };

  const applyLink = (): void => {
    const url: string = linkUrl.trim();
    const range: Range | undefined = savedRange.current;
    if (!isSafeLink(url)) {
      setLinkError('Informe um endereço que comece com http://, https:// ou mailto:.');
      return;
    }
    if (!range || range.collapsed) {
      setLinkError('Selecione no texto a parte que será o link, depois clique em Link.');
      return;
    }
    const selection: Selection | null = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    runCommand('createLink', url);
    setLinkOpen(false);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>): void => {
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    emit();
  };

  return (
    <div className={faqStyles.editorField}>
      <span id={labelId} className={faqStyles.editorLabel}>
        {label}
      </span>
      <div role="toolbar" aria-label={`Formatação: ${label}`} className={faqStyles.editorToolbar}>
        {FORMAT_TOOLS.map((tool: IFormatTool) => (
          <IconButton
            key={tool.command}
            iconProps={{ iconName: tool.icon }}
            ariaLabel={tool.label}
            title={tool.label}
            onMouseDown={keepSelection}
            onClick={() => runCommand(tool.command)}
          />
        ))}
        <IconButton
          iconProps={{ iconName: 'Link' }}
          ariaLabel="Adicionar link"
          title="Adicionar link"
          onMouseDown={keepSelection}
          onClick={openLink}
        />
      </div>
      {linkOpen && (
        <div className={faqStyles.linkRow}>
          <TextField
            label="Endereço do link"
            value={linkUrl}
            errorMessage={linkError}
            styles={textFieldStyles}
            onChange={(_event, text) => setLinkUrl(text ?? '')}
            onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyLink();
              }
            }}
          />
          <DefaultButton text="Aplicar" onClick={applyLink} styles={secondaryButtonStyles} />
          <DefaultButton text="Cancelar" onClick={() => setLinkOpen(false)} styles={secondaryButtonStyles} />
        </div>
      )}
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-labelledby={labelId}
        aria-invalid={errorMessage ? true : undefined}
        contentEditable={true}
        spellCheck={true}
        className={faqStyles.editor}
        onInput={emit}
        onPaste={handlePaste}
      />
      {errorMessage && (
        <div className={faqStyles.editorError} role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
