// Skills aplicadas: spfx-padrao-visual-gti (componentes de apresentação), spfx-acessibilidade-conteudo (valor em texto,
// não só cor), spfx-tema-marca (cores da área como dado validado em modelo.ts).
import * as React from 'react';
import { Icon as IconeFluent } from '@fluentui/react/lib/Icon';
import { IArea } from '../../../../jornada/modelo';
import { IEtapa, PERCENTUAL_MINIMO_PADRAO, TipoEtapa } from '../../../../jornada/progresso';
import { Icon, NomeIcone } from '../gti';
import styles from '../jc.module.scss';

export const formatarDuracao = (minutos: number): string =>
  minutos >= 60 ? `${Math.floor(minutos / 60)} h${minutos % 60 ? ` ${minutos % 60} min` : ''}` : `${minutos} min`;

export const formatarData = (valor: Date | string | undefined): string =>
  valor ? new Date(valor).toLocaleDateString('pt-BR') : '';

export const dataCurta = (valor: Date | string | undefined): string =>
  valor ? new Date(valor).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : '';

export const iniciais = (nome: string): string =>
  nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte: string) => parte[0].toUpperCase())
    .join('');

export const ICONE_TIPO: Record<TipoEtapa, NomeIcone> = { YouTube: 'video', Video: 'video', Documento: 'arquivo', Conteudo: 'texto', Link: 'link' };
export const ROTULO_TIPO: Record<TipoEtapa, string> = {
  YouTube: 'Vídeo do YouTube',
  Video: 'Vídeo da biblioteca',
  Documento: 'Documento',
  Conteudo: 'Texto e imagens',
  Link: 'Link'
};

export const rotuloRegra = (etapa: Pick<IEtapa, 'regra' | 'percentualMinimo'> & { tipo?: IEtapa['tipo'] }): string =>
  etapa.regra === 'PercentualAssistido'
    ? `assistir ${etapa.percentualMinimo || PERCENTUAL_MINIMO_PADRAO}%`
    : etapa.regra === 'AbrirConteudo'
      ? etapa.tipo === 'Conteudo'
        ? 'ler até o fim'
        : 'abrir o conteúdo'
      : 'conclusão manual';

/** Fundo da capa: cor da área em gradiente até o azul-marinho do padrão. */
export const fundoArea = (area: Pick<IArea, 'cor'>): React.CSSProperties => ({
  background: `linear-gradient(135deg, ${area.cor} 0%, ${area.cor}d9 55%, #112f49 140%)`
});

/** Desenho decorativo da capa (círculos e caminho tracejado), variando pela semente. */
export const PadraoCapa: React.FC<{ semente: number }> = ({ semente }: { semente: number }) => (
  <svg className={styles.padrao} viewBox="0 0 400 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    {[0, 1, 2, 3, 4].map((k: number) => (
      <circle
        key={k}
        cx={(semente * 67 + k * 97) % 420}
        cy={(semente * 31 + k * 53) % 160}
        r={28 + ((k * 17 + semente * 7) % 60)}
        fill="none"
        stroke="#fff"
        strokeWidth="1.2"
      />
    ))}
    <path
      d={`M-10 ${110 - (semente % 30)} C 90 ${60 + (semente % 40)}, 200 ${140 - (semente % 50)}, 410 ${70 + (semente % 30)}`}
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      strokeDasharray="2 8"
      strokeLinecap="round"
    />
  </svg>
);

/** Ícone da área: nome de ícone do SharePoint guardado na lista de áreas (validado em modelo.ts). */
export const IconeArea: React.FC<{ area: Pick<IArea, 'icone'>; className?: string }> = ({ area, className }: { area: Pick<IArea, 'icone'>; className?: string }) => (
  <IconeFluent iconName={area.icone} className={className} aria-hidden="true" />
);

const formatarNota = (nota: number): string => nota.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Nota em estrelas, com o valor em texto e no rótulo acessível. */
export const Estrelas: React.FC<{ nota: number; total?: number; individual?: boolean }> = ({
  nota,
  total,
  individual
}: {
  nota: number;
  total?: number;
  individual?: boolean;
}) => {
  if (!total) {
    return <span className={styles.semNota}>Sem avaliações ainda</span>;
  }
  const cheias: number = Math.round(nota);
  return (
    <span className={styles.estrelas} role="img" aria-label={individual ? `Nota ${nota} de 5` : `Nota ${formatarNota(nota)} de 5, ${total} avaliação(ões)`}>
      {[1, 2, 3, 4, 5].map((posicao: number) => (
        <svg key={posicao} width="13" height="13" viewBox="0 0 24 24" fill={posicao <= cheias ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" />
        </svg>
      ))}
      {!individual && (
        <em aria-hidden="true">
          {formatarNota(nota)} ({total})
        </em>
      )}
    </span>
  );
};

export type TomAviso = 'erro' | 'info' | 'sucesso';

/** Aviso na tela (erros importantes ficam aqui, não no toast). */
export const Aviso: React.FC<{ tom: TomAviso; children: React.ReactNode; aoFechar?: () => void }> = ({
  tom,
  children,
  aoFechar
}: {
  tom: TomAviso;
  children: React.ReactNode;
  aoFechar?: () => void;
}) => (
  <div
    className={`${styles.avisoBox} ${tom === 'erro' ? styles.avisoErro : tom === 'sucesso' ? styles.avisoSucesso : styles.avisoInfo}`}
    role={tom === 'erro' ? 'alert' : 'status'}
    style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
  >
    <span style={{ flex: 1 }}>{children}</span>
    {aoFechar && (
      <button type="button" className="pi-icon-btn" style={{ width: 28, height: 28 }} aria-label="Fechar aviso" onClick={aoFechar}>
        <Icon nome="fechar" tamanho={16} />
      </button>
    )}
  </div>
);

/** Interruptor Sim/Não com rótulo e explicação. */
export const Alternar: React.FC<{ rotulo: string; explicacao?: string; ligado: boolean; aoAlterar: (valor: boolean) => void; desabilitado?: boolean }> = (props: {
  rotulo: string;
  explicacao?: string;
  ligado: boolean;
  aoAlterar: (valor: boolean) => void;
  desabilitado?: boolean;
}) => (
  <div className={styles.alternar}>
    <div>
      <b>{props.rotulo}</b>
      {props.explicacao && <span>{props.explicacao}</span>}
    </div>
    <button
      type="button"
      role="switch"
      className={styles.chave}
      aria-checked={props.ligado}
      aria-label={props.rotulo}
      disabled={props.desabilitado}
      onClick={() => props.aoAlterar(!props.ligado)}
    />
  </div>
);

/** Mensagem de erro de uma operação, preservando o texto de validação lançado pelos serviços. */
export const textoErro = (erro: unknown, padrao: (e: unknown) => string): string =>
  erro instanceof Error && !('status' in erro) ? erro.message : padrao(erro);
