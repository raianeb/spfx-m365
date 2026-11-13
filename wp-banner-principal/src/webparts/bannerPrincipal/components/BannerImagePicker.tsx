import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { TextField } from '@fluentui/react/lib/TextField';
import { SpListService, ILibraryImage } from '../../../services/SpListService';
import formStyles from '../../../crud/crud.module.scss';
import bannerStyles from './Banner.module.scss';
import { secondaryButtonStyles, textFieldStyles } from '../../../crud/modalStyles';

export interface IBannerImagePickerProps {
  service: SpListService;
  libraryTitle: string;
  origin: string;
  value: ILibraryImage | undefined;
  error?: string;
  onSelect: (image: ILibraryImage) => void;
}

const MAX_IMAGE_BYTES: number = 10 * 1024 * 1024;
const ACCEPTED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const PAGE_SIZE: number = 24;

/** Escolha da imagem: consulta à biblioteca e envio do computador. */
const BannerImagePicker: React.FC<IBannerImagePickerProps> = ({ service, libraryTitle, origin, value, error, onSelect }) => {
  const [open, setOpen] = React.useState<boolean>(false);
  const [term, setTerm] = React.useState<string>('');
  const [debouncedTerm, setDebouncedTerm] = React.useState<string>('');
  const [files, setFiles] = React.useState<ILibraryImage[] | undefined>(undefined);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [uploading, setUploading] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<string | undefined>(undefined);
  const inputRef: React.RefObject<HTMLInputElement> = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const timer: number = window.setTimeout(() => setDebouncedTerm(term.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [term]);

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }
    let active: boolean = true;
    setLoading(true);
    setMessage(undefined);
    service
      .getLibraryImages(libraryTitle, debouncedTerm, PAGE_SIZE)
      .then((result: ILibraryImage[]) => {
        if (active) {
          setFiles(result);
        }
      })
      .catch(() => {
        if (active) {
          setFiles([]);
          setMessage('Não foi possível consultar a biblioteca. Verifique o nome configurado na Web Part.');
        }
      })
      .then(() => {
        if (active) {
          setLoading(false);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [open, debouncedTerm, service, libraryTitle]);

  const onFileChosen = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file: File | undefined = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    if (ACCEPTED_TYPES.indexOf(file.type) === -1) {
      setMessage('Envie uma imagem JPG, PNG, GIF ou WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setMessage('A imagem deve ter no máximo 10 MB.');
      return;
    }
    setUploading(true);
    setMessage(undefined);
    file
      .arrayBuffer()
      .then((content: ArrayBuffer) => service.uploadLibraryImage(libraryTitle, file.name, content))
      .then((uploaded: ILibraryImage) => onSelect(uploaded))
      .catch(() => setMessage('Não foi possível enviar a imagem. Verifique se você pode gravar na biblioteca.'))
      .then(() => setUploading(false))
      .catch(() => undefined);
  };

  return (
    <div className={bannerStyles.picker}>
      {value && (
        <figure className={bannerStyles.current}>
          <img src={`${origin}${value.serverRelativeUrl}`} alt={value.name} />
          <figcaption>{value.name}</figcaption>
        </figure>
      )}
      <div className={bannerStyles.pickerActions}>
        <DefaultButton
          text={open ? 'Fechar biblioteca' : 'Escolher da biblioteca'}
          onClick={() => setOpen((previous: boolean) => !previous)}
          styles={secondaryButtonStyles}
        />
        <DefaultButton
          text={uploading ? 'Enviando...' : 'Enviar do computador'}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          styles={secondaryButtonStyles}
        />
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
          hidden
          aria-label="Selecionar imagem do computador"
          onChange={onFileChosen}
        />
      </div>
      {open && (
        <div className={bannerStyles.library}>
          <TextField
            placeholder="Pesquisar por nome do arquivo"
            value={term}
            ariaLabel="Pesquisar imagens na biblioteca"
            styles={textFieldStyles}
            onChange={(_event, text) => setTerm(text ?? '')}
          />
          {loading && <p className={bannerStyles.status}>Carregando imagens...</p>}
          {!loading && files && files.length === 0 && <p className={bannerStyles.status}>Nenhuma imagem encontrada.</p>}
          {files && files.length > 0 && (
            <ul className={bannerStyles.grid}>
              {files.map((file: ILibraryImage) => {
                const selected: boolean = value?.serverRelativeUrl === file.serverRelativeUrl;
                return (
                  <li key={file.serverRelativeUrl}>
                    <button
                      type="button"
                      className={selected ? `${bannerStyles.thumb} ${bannerStyles.thumbSelected}` : bannerStyles.thumb}
                      aria-pressed={selected}
                      aria-label={`Selecionar ${file.name}`}
                      onClick={() => onSelect(file)}
                    >
                      <img src={`${origin}${file.serverRelativeUrl}`} alt="" loading="lazy" />
                      <span>{file.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {message && (
        <div className={formStyles.error} role="alert">
          {message}
        </div>
      )}
      {error && (
        <div className={formStyles.error} role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default BannerImagePicker;
