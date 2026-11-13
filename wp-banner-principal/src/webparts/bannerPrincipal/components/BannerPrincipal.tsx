import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './Carreiras.module.scss';
import bannerStyles from './Banner.module.scss';
import coreStyles from '../../../core/core.module.scss';
import { IBanner, IBannerPrincipalProps } from './IBannerPrincipalProps';
import { odataDate, toIsoNow } from '../../../services/CarreirasListService';
import { useCrudList } from '../../../crud/useCrudList';
import { DiagnosticsPanel } from '../../../core/diagnostics';
import { resolveListTitle } from '../../../core/config';
import BannerForm from './BannerForm';

const LIST_BASE: string = 'Carreiras - Banner';
const SELECT: string[] = ['Id', 'Title', 'DataPublicacao', 'DataExpiracao', 'Link', 'ImagemCaminho', 'Ordem'];
const HEX_COLOR: RegExp = /^#[0-9a-fA-F]{6}$/;
const MANAGE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
};

const formatBannerDate = (value: string): string => new Date(value).toLocaleString('pt-BR', MANAGE_DATE_FORMAT);

/** Situação do banner na data atual: agendado, publicado ou expirado. */
const bannerStatus = (banner: IBanner): string => {
  const now: number = Date.now();
  if (Date.parse(banner.DataPublicacao) > now) {
    return 'Agendado';
  }
  if (banner.DataExpiracao && Date.parse(banner.DataExpiracao) < now) {
    return 'Expirado';
  }
  return 'Publicado';
};

/** Texto da linha na modal "Todos": situação e datas de publicação e expiração. */
const describeBanner = (banner: IBanner): string => {
  const publication: string = `publicado em ${formatBannerDate(banner.DataPublicacao)}`;
  const expiration: string = banner.DataExpiracao ? `expira em ${formatBannerDate(banner.DataExpiracao)}` : 'sem expiração';
  return `${bannerStatus(banner)} · ${publication} · ${expiration}`;
};

/** Gradiente do overlay: a cor escolhida fica mais forte embaixo e some em direção ao topo. Cor inválida usa preto. */
const toOverlayGradient = (color: string, opacity: number): string => {
  const hex: string = HEX_COLOR.test(color) ? color : '#000000';
  const red: number = parseInt(hex.slice(1, 3), 16);
  const green: number = parseInt(hex.slice(3, 5), 16);
  const blue: number = parseInt(hex.slice(5, 7), 16);
  const alpha: number = Math.min(100, Math.max(0, opacity)) / 100;
  const base: string = `${red}, ${green}, ${blue}`;
  return `linear-gradient(to top, rgba(${base}, ${alpha}) 0%, rgba(${base}, 0) 100%)`;
};

/**
 * Carrossel de banners. Exibe os banners publicados (data de publicação já alcançada e sem expiração
 * ou expiração futura). Com mais de um banner, mostra os controles do carrossel.
 */
const BannerPrincipal: React.FC<IBannerPrincipalProps> = ({
  service,
  logger,
  environment,
  adminGroupIds,
  title,
  themeStyle,
  top,
  libraryName,
  carouselInterval,
  showArrows,
  showDots,
  overlayColor,
  overlayOpacity
}) => {
  const [current, setCurrent] = React.useState<number>(0);
  const [paused, setPaused] = React.useState<boolean>(false);
  const listTitle: string = resolveListTitle(LIST_BASE, environment);
  const libraryTitle: string = resolveListTitle(libraryName, environment);
  const origin: string = React.useMemo((): string => new URL(service.webUrl).origin, [service.webUrl]);
  const overlayGradient: string = React.useMemo((): string => toOverlayGradient(overlayColor, overlayOpacity), [overlayColor, overlayOpacity]);

  const { items, hasError, toolbar, renderActions, modals } = useCrudList<IBanner>({
    service,
    logger,
    listTitle,
    adminGroupIds,
    singular: 'banner',
    select: SELECT,
    top,
    query: () => {
      const now: string = odataDate(toIsoNow());
      return {
        filter: `DataPublicacao le ${now} and (DataExpiracao eq null or DataExpiracao ge ${now})`,
        orderBy: 'Ordem asc, DataPublicacao desc'
      };
    },
    getLabel: (banner: IBanner) => banner.Title,
    contextLabel: title || 'Banner principal',
    themeStyle,
    deps: [],
    manage: { label: 'Ordenar', title: 'Ordem de exibição dos banners', renderMeta: describeBanner, orderField: 'Ordem' },
    renderForm: (context) => <BannerForm {...context} service={service} libraryTitle={libraryTitle} />
  });

  const total: number = items ? items.length : 0;
  const index: number = total > 0 ? Math.min(current, total - 1) : 0;
  const reduceMotion: boolean =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  React.useEffect(() => {
    if (carouselInterval <= 0 || total < 2 || paused || reduceMotion) {
      return undefined;
    }
    const timer: number = window.setInterval(
      () => setCurrent((previous: number) => (previous + 1) % total),
      carouselInterval * 1000
    );
    return () => window.clearInterval(timer);
  }, [carouselInterval, total, paused, reduceMotion]);

  const renderImage = (banner: IBanner): React.ReactNode => {
    if (!banner.ImagemCaminho) {
      return <div className={bannerStyles.placeholder} />;
    }
    const image: React.ReactNode = (
      <img className={bannerStyles.image} src={`${origin}${banner.ImagemCaminho}`} alt={banner.Title} loading="lazy" />
    );
    if (!banner.Link?.Url) {
      return image;
    }
    return (
      <a
        className={bannerStyles.link}
        href={banner.Link.Url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${banner.Title} (abre em nova aba)`}
      >
        {image}
      </a>
    );
  };

  let content: React.ReactNode;
  if (hasError) {
    content = <div className={styles.message} role="alert">Não foi possível carregar os banners.</div>;
  } else if (items === undefined) {
    content = <div className={styles.skeleton} aria-busy="true" aria-label="Carregando banners" />;
  } else if (total === 0) {
    content = <div className={styles.empty}>Nenhum banner publicado no momento.</div>;
  } else {
    const banner: IBanner = items[index];
    const move = (step: number): void => setCurrent((previous: number) => (previous + step + total) % total);
    content = (
      <>
        <div className={bannerStyles.slide}>
          {renderImage(banner)}
          <div className={bannerStyles.caption} style={{ background: overlayGradient }}>
            <span className={bannerStyles.captionText}>{banner.Title}</span>
          </div>
          <div className={bannerStyles.actionsOverlay}>{renderActions(banner)}</div>
        </div>
        {total > 1 && (showArrows || showDots) && (
          <div className={styles.controls}>
            {showArrows && (
              <button type="button" className={styles.nav} onClick={() => move(-1)} aria-label="Banner anterior">
                ‹
              </button>
            )}
            {showDots && (
              <div className={styles.dots}>
                {items.map((item: IBanner, position: number) => (
                  <button
                    key={item.Id}
                    type="button"
                    className={position === index ? styles.dotActive : styles.dot}
                    onClick={() => setCurrent(position)}
                    aria-label={`Ir para o banner ${position + 1}`}
                    aria-current={position === index}
                  />
                ))}
              </div>
            )}
            {showArrows && (
              <button type="button" className={styles.nav} onClick={() => move(1)} aria-label="Próximo banner">
                ›
              </button>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <section
      className={styles.root}
      style={themeStyle}
      aria-roledescription="carrossel"
      aria-live={carouselInterval > 0 ? 'off' : 'polite'}
      aria-label={title || 'Banner principal'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <header className={coreStyles.wpHeader}>
        {title && (
          <h2 className={coreStyles.wpTitle}>
            <Icon iconName="Photo2" className={coreStyles.wpIcon} aria-hidden="true" />
            {title}
          </h2>
        )}
        {toolbar}
      </header>
      {content}
      <DiagnosticsPanel logger={logger} />
      {modals}
    </section>
  );
};

export default BannerPrincipal;
