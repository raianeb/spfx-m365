// Skills aplicadas: spfx-padrao-visual-gti (painel lateral de item, escolha de tipo em cartões, validação por campo),
// spfx-acessibilidade-conteudo (tipo como grupo de opções, erros ligados aos campos).
import * as React from 'react';
import { useState } from 'react';
import RichTextEditor from '../../../../comum/RichTextEditor';
import { ErrosFormulario, arquivoCombina, regraPadrao, validarEtapa } from '../../../../jornada/estudio';
import { IEtapa, PERCENTUAL_MINIMO_PADRAO, RegraConclusao, TipoEtapa } from '../../../../jornada/progresso';
import { IArquivoBiblioteca } from '../../../../services/EstudioService';
import { Field, GtiDialog, Icon } from '../gti';
import { ICONE_TIPO } from '../comum/ui';
import styles from '../jc.module.scss';

export interface IEtapaFormProps {
  id: string;
  etapa: IEtapa;
  nova: boolean;
  siteUrl: string;
  arquivos: IArquivoBiblioteca[] | undefined;
  sufixoBiblioteca: string;
  aoFechar: () => void;
  aoSalvar: (etapa: IEtapa) => void;
}

const TIPOS: { tipo: TipoEtapa; rotulo: string }[] = [
  { tipo: 'YouTube', rotulo: 'YouTube' },
  { tipo: 'Video', rotulo: 'Vídeo da área' },
  { tipo: 'Documento', rotulo: 'Documento' },
  { tipo: 'Link', rotulo: 'Link' }
];

const regrasPara = (tipo: TipoEtapa): { regra: RegraConclusao; rotulo: string }[] => [
  ...(tipo === 'YouTube' || tipo === 'Video' ? [{ regra: 'PercentualAssistido' as RegraConclusao, rotulo: 'Assistir a um percentual do vídeo' }] : []),
  { regra: 'AbrirConteudo', rotulo: 'Abrir o conteúdo' },
  { regra: 'Manual', rotulo: 'Marcar como concluída' }
];

const EtapaForm: React.FC<IEtapaFormProps> = (props: IEtapaFormProps) => {
  const [etapa, setEtapa] = useState<IEtapa>(props.etapa);
  const [erros, setErros] = useState<ErrosFormulario>({});
  const id: string = props.id;

  const alterar = (parcial: Partial<IEtapa>): void => setEtapa((atual: IEtapa) => ({ ...atual, ...parcial }));

  const alterarTipo = (tipo: TipoEtapa): void => {
    const regra: RegraConclusao = regrasPara(tipo).some((o) => o.regra === etapa.regra) ? etapa.regra : regraPadrao(tipo);
    alterar({ tipo, regra, percentualMinimo: etapa.percentualMinimo || PERCENTUAL_MINIMO_PADRAO });
  };

  const aplicar = (): void => {
    const encontrados: ErrosFormulario = validarEtapa(etapa, props.siteUrl);
    setErros(encontrados);
    if (Object.keys(encontrados).length === 0) {
      props.aoSalvar(etapa);
    }
  };

  const arquivos: IArquivoBiblioteca[] = (props.arquivos ?? []).filter((a: IArquivoBiblioteca) => arquivoCombina(a.nome, etapa.tipo));
  const usaBiblioteca: boolean = etapa.tipo === 'Video' || etapa.tipo === 'Documento';

  return (
    <GtiDialog
      id={id}
      sobretitulo="Estúdio"
      titulo={props.nova ? 'Nova etapa' : 'Editar etapa'}
      aoFechar={props.aoFechar}
      textoRodape="As etapas são gravadas ao salvar a jornada."
      rodape={
        <>
          <button type="button" className="pi-btn" onClick={props.aoFechar}>
            Cancelar
          </button>
          <button type="button" className="pi-btn primary" onClick={aplicar}>
            Aplicar
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="pi-field">
          <span className="pi-label" id={`${id}-tipo`}>
            Tipo de conteúdo
          </span>
          <div className={styles.tipos} role="radiogroup" aria-labelledby={`${id}-tipo`}>
            {TIPOS.map((t) => (
              <button key={t.tipo} type="button" role="radio" aria-checked={etapa.tipo === t.tipo} onClick={() => alterarTipo(t.tipo)}>
                <Icon nome={ICONE_TIPO[t.tipo]} tamanho={22} />
                {t.rotulo}
              </button>
            ))}
          </div>
        </div>
        <Field id={`${id}-nome`} rotulo="Nome da etapa" obrigatorio erro={erros.titulo}>
          {(aria) => <input {...aria} autoFocus maxLength={255} value={etapa.titulo} onChange={(e) => alterar({ titulo: e.target.value })} />}
        </Field>
        {usaBiblioteca && (
          <Field
            id={`${id}-arquivo`}
            rotulo="Escolher da biblioteca da área"
            dica={props.arquivos === undefined ? 'Carregando arquivos…' : arquivos.length ? `Biblioteca de conteúdos da área ${props.sufixoBiblioteca}.` : 'Nenhum arquivo deste tipo na biblioteca da área.'}
          >
            {(aria) => (
              <select {...aria} disabled={!arquivos.length} value={arquivos.some((a) => a.url === etapa.url) ? etapa.url : ''} onChange={(e) => e.target.value && alterar({ url: e.target.value })}>
                <option value="">Selecione um arquivo</option>
                {arquivos.map((a: IArquivoBiblioteca) => (
                  <option key={a.url} value={a.url}>
                    {a.nome}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        <Field
          id={`${id}-url`}
          rotulo={etapa.tipo === 'YouTube' ? 'Link do YouTube' : 'Endereço do conteúdo'}
          obrigatorio
          erro={erros.url}
          dica={
            etapa.tipo === 'YouTube'
              ? 'Aceita youtube.com, youtu.be e shorts. O player usa youtube-nocookie.'
              : usaBiblioteca
                ? 'Escolha um arquivo acima ou cole o endereço de um arquivo deste SharePoint.'
                : 'Abre em nova aba.'
          }
        >
          {(aria) => <input {...aria} type="url" placeholder="https://" value={etapa.url} onChange={(e) => alterar({ url: e.target.value })} />}
        </Field>
        <div className="pi-form-grid">
          <Field id={`${id}-dur`} rotulo="Duração (minutos)" erro={erros.duracaoMin}>
            {(aria) => <input {...aria} type="number" min={0} max={1440} value={String(etapa.duracaoMin)} onChange={(e) => alterar({ duracaoMin: Number(e.target.value || 0) })} />}
          </Field>
          <Field id={`${id}-regra`} rotulo="Como a etapa é concluída" erro={erros.regra}>
            {(aria) => (
              <select {...aria} value={etapa.regra} onChange={(e) => alterar({ regra: e.target.value as RegraConclusao })}>
                {regrasPara(etapa.tipo).map((o) => (
                  <option key={o.regra} value={o.regra}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        {etapa.regra === 'PercentualAssistido' && (
          <Field id={`${id}-pct`} rotulo="Percentual mínimo assistido (%)" erro={erros.percentualMinimo}>
            {(aria) => (
              <input
                {...aria}
                type="number"
                min={1}
                max={100}
                value={String(etapa.percentualMinimo || PERCENTUAL_MINIMO_PADRAO)}
                onChange={(e) => alterar({ percentualMinimo: Number(e.target.value || 0) })}
              />
            )}
          </Field>
        )}
        <RichTextEditor label="Instruções (opcional)" value={etapa.instrucoes} onChange={(html: string) => alterar({ instrucoes: html })} />
      </div>
    </GtiDialog>
  );
};

export default EtapaForm;
