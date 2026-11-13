import * as React from 'react';
import { TextField } from '@fluentui/react/lib/TextField';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import formStyles from '../../../crud/crud.module.scss';
import ModalShell from '../../../crud/ModalShell';
import { primaryButtonStyles, secondaryButtonStyles, textFieldStyles } from '../../../crud/modalStyles';
import { ICrudFormContext } from '../../../crud/useCrudList';
import { SpListService, ILibraryImage } from '../../../services/SpListService';
import { IBanner } from './IBannerPrincipalProps';
import BannerImagePicker from './BannerImagePicker';

export interface IBannerFormProps extends ICrudFormContext<IBanner> {
  service: SpListService;
  libraryTitle: string;
}

/** Valores do formulário. Datas em texto local (datetime-local), como o navegador entrega. */
export interface IBannerValues {
  title: string;
  publish: string;
  expire: string;
  link: string;
  image: ILibraryImage | undefined;
}

const pad = (value: number): string => (value < 10 ? `0${value}` : String(value));

/** ISO (UTC) para o valor datetime-local no horário local. */
export const toLocalInput = (iso?: string): string => {
  if (!iso) {
    return '';
  }
  const date: Date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatLocal = (value: string): string => {
  const date: Date = new Date(value);
  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

const isHttpUrl = (value: string): boolean => {
  try {
    const url: URL = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const fileNameOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1);

const toValues = (item: IBanner | undefined): IBannerValues => {
  if (!item) {
    return { title: '', publish: toLocalInput(new Date().toISOString()), expire: '', link: '', image: undefined };
  }
  return {
    title: item.Title,
    publish: toLocalInput(item.DataPublicacao),
    expire: toLocalInput(item.DataExpiracao),
    link: item.Link?.Url ?? '',
    image: item.ImagemCaminho ? { name: fileNameOf(item.ImagemCaminho), serverRelativeUrl: item.ImagemCaminho } : undefined
  };
};

/**
 * Regras do banner:
 * - título e publicação obrigatórios; imagem obrigatória;
 * - expiração opcional: vazia significa que nunca expira;
 * - expiração posterior à publicação e, ao ser alterada, futura;
 * - link opcional, mas quando informado deve ser http(s).
 */
export const validateBanner = (values: IBannerValues, initial: IBannerValues, now: Date): Record<string, string> => {
  const errors: Record<string, string> = {};
  const title: string = values.title.trim();
  if (!title) {
    errors.title = 'Informe o título.';
  } else if (title.length > 255) {
    errors.title = 'Use no máximo 255 caracteres.';
  }
  const publish: Date | undefined = values.publish ? new Date(values.publish) : undefined;
  if (!publish || isNaN(publish.getTime())) {
    errors.publish = 'Informe a data e hora de publicação.';
  }
  if (values.expire) {
    const expire: Date = new Date(values.expire);
    if (isNaN(expire.getTime())) {
      errors.expire = 'Data e hora de expiração inválidas.';
    } else if (publish && expire.getTime() <= publish.getTime()) {
      errors.expire = 'A expiração deve ser posterior à publicação.';
    } else if (values.expire !== initial.expire && expire.getTime() <= now.getTime()) {
      errors.expire = 'Informe uma expiração futura ou deixe o campo vazio para não expirar.';
    }
  }
  if (values.link.trim() && !isHttpUrl(values.link.trim())) {
    errors.link = 'Informe um endereço completo iniciando com https:// ou http://.';
  }
  if (!values.image) {
    errors.image = 'Selecione uma imagem da biblioteca ou envie do computador.';
  }
  return errors;
};

const toBody = (values: IBannerValues): Record<string, unknown> => ({
  Title: values.title.trim(),
  DataPublicacao: new Date(values.publish).toISOString(),
  DataExpiracao: values.expire ? new Date(values.expire).toISOString() : null,
  Link: values.link.trim() ? { Description: 'Abrir banner', Url: values.link.trim() } : null,
  ImagemCaminho: values.image ? values.image.serverRelativeUrl : null
});

/** Formulário de inclusão e edição de banner, no layout padrão de modais. */
const BannerForm: React.FC<IBannerFormProps> = ({
  mode,
  item,
  contextLabel,
  themeStyle,
  diagnostics,
  onDismiss,
  save,
  service,
  libraryTitle
}) => {
  const titleId: string = React.useId();
  const origin: string = React.useMemo((): string => new URL(service.webUrl).origin, [service.webUrl]);
  const initial: IBannerValues = React.useMemo((): IBannerValues => toValues(item), [item]);
  const [values, setValues] = React.useState<IBannerValues>(initial);
  const [submitted, setSubmitted] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState<boolean>(false);
  const [saveError, setSaveError] = React.useState<string | undefined>(undefined);

  const patch = (changes: Partial<IBannerValues>): void => {
    const next: IBannerValues = { ...values, ...changes };
    setValues(next);
    if (submitted) {
      setErrors(validateBanner(next, initial, new Date()));
    }
  };

  const publishFuture: boolean = !!values.publish && new Date(values.publish).getTime() > Date.now();
  const expireHint: string = values.expire
    ? `Exibido até ${formatLocal(values.expire)}.`
    : 'Sem data de expiração, o banner não expira.';

  const submit = async (): Promise<void> => {
    setSubmitted(true);
    const found: Record<string, string> = validateBanner(values, initial, new Date());
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSaving(true);
    setSaveError(undefined);
    try {
      await save(toBody(values));
    } catch {
      setSaveError('Não foi possível salvar. Verifique os dados e tente novamente.');
      setSaving(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submit().catch(() => undefined);
  };

  return (
    <ModalShell
      contextLabel={contextLabel}
      titleId={titleId}
      firstFocusableClass={formStyles.firstField}
      onDismiss={onDismiss}
      themeStyle={themeStyle}
    >
      <h2 id={titleId} className={formStyles.modalTitle}>
        {mode === 'add' ? 'Novo banner' : 'Editar banner'}
      </h2>
      <form className={formStyles.modalForm} noValidate onSubmit={handleSubmit}>
        <div className={formStyles.fields}>
          <TextField
            className={formStyles.firstField}
            label="Título"
            required
            value={values.title}
            errorMessage={errors.title}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ title: text ?? '' })}
          />
          <TextField
            label="Data e hora de publicação"
            type="datetime-local"
            required
            value={values.publish}
            errorMessage={errors.publish}
            description={publishFuture ? 'Publicação futura: o banner será exibido a partir desta data e hora.' : undefined}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ publish: text ?? '' })}
          />
          <TextField
            label="Data e hora de expiração"
            type="datetime-local"
            value={values.expire}
            errorMessage={errors.expire}
            description={expireHint}
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ expire: text ?? '' })}
          />
          <TextField
            label="Link ao clicar no banner (opcional)"
            placeholder="https://"
            value={values.link}
            errorMessage={errors.link}
            description="Se vazio, clicar no banner não faz nada."
            styles={textFieldStyles}
            onChange={(_event, text) => patch({ link: text ?? '' })}
          />
          <div>
            <span className={formStyles.helper} id={`${titleId}-imagem`}>
              Imagem *
            </span>
            <BannerImagePicker
              service={service}
              libraryTitle={libraryTitle}
              origin={origin}
              value={values.image}
              error={errors.image}
              onSelect={(image: ILibraryImage) => patch({ image })}
            />
          </div>
        </div>
        {saveError && (
          <div className={formStyles.error} role="alert">
            {saveError}
          </div>
        )}
        <div className={formStyles.footer}>
          <span className={formStyles.helper}>Campos marcados com * são obrigatórios.</span>
          <div className={formStyles.footerActions}>
            <DefaultButton text="Cancelar" onClick={onDismiss} disabled={saving} styles={secondaryButtonStyles} />
            <PrimaryButton
              type="submit"
              text={saving ? 'Salvando...' : 'Salvar'}
              disabled={saving}
              styles={primaryButtonStyles}
            />
          </div>
        </div>
      </form>
      {diagnostics && <div className={formStyles.diagnosticsArea}>{diagnostics}</div>}
    </ModalShell>
  );
};

export default BannerForm;
