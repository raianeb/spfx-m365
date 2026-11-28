// Skills aplicadas: spfx-padrao-visual-gti (painel lateral de item, escolha de tipo em cartões, validação por campo),
// spfx-acessibilidade-conteudo (tipo como grupo de opções, erros ligados aos campos).
// Vídeo e documento: navegador das bibliotecas do site (pastas, filtro por tipo, envio do computador).
// Texto e imagens: conteúdo montado no próprio editor (EditorConteudo).
import * as React from 'react';
import { useState } from 'react';
import RichTextEditor from '../../../../comum/RichTextEditor';
import { conteudoTemAlgo } from '../../../../comum/richText';
import { EXTENSOES_POR_TIPO, ErrosFormulario, regraPadrao, validarEtapa } from '../../../../jornada/estudio';
import { IArea } from '../../../../jornada/modelo';
import { IEtapa, PERCENTUAL_MINIMO_PADRAO, RegraConclusao, TipoEtapa } from '../../../../jornada/progresso';
import { EstudioService, IItemPasta } from '../../../../services/EstudioService';
import EditorConteudo from './EditorConteudo';
import NavegadorBiblioteca from './NavegadorBiblioteca';
import { Field, GtiDialog, Icon } from '../gti';
import { ICONE_TIPO } from '../comum/ui';
import styles from '../jc.module.scss';

export interface IEtapaFormProps {
  id: string;
  etapa: IEtapa;
  nova: boolean;
  siteUrl: string;
  area: IArea;
  estudio: EstudioService;
  /** Origem do site de dados (https://tenant.sharepoint.com). */
  origem: string;
  aoFechar: () => void;
  aoSalvar: (etapa: IEtapa) => void;
}

const TIPOS: { tipo: TipoEtapa; rotulo: string }[] = [
  { tipo: 'YouTube', rotulo: 'YouTube' },
  { tipo: 'Video', rotulo: 'Vídeo da biblioteca' },
  { tipo: 'Documento', rotulo: 'Documento' },
  { tipo: 'Conteudo', rotulo: 'Texto e imagens' }
];

/** "Link" saiu das opções; continua aparecendo só para editar etapas antigas desse tipo. */
const TIPO_LINK_ANTIGO: { tipo: TipoEtapa; rotulo: string } = { tipo: 'Link', rotulo: 'Link (antigo)' };

const regrasPara = (tipo: TipoEtapa): { regra: RegraConclusao; rotulo: string }[] => [
  ...(tipo === 'YouTube' || tipo === 'Video' ? [{ regra: 'PercentualAssistido' as RegraConclusao, rotulo: 'Assistir a um percentual do vídeo' }] : []),
  { regra: 'AbrirConteudo', rotulo: tipo === 'Conteudo' ? 'Ler até o fim do conteúdo' : 'Abrir o conteúdo' },
  { regra: 'Manual', rotulo: 'Marcar como concluída' }
];

const EtapaForm: React.FC<IEtapaFormProps> = (props: IEtapaFormProps) => {
  const [etapa, setEtapa] = useState<IEtapa>(props.etapa);
  const [erros, setErros] = useState<ErrosFormulario>({});
  const id: string = props.id;

  const alterar = (parcial: Partial<IEtapa>): void => {
    setEtapa((atual: IEtapa) => ({ ...atual, ...parcial }));
    // O erro de um campo some assim que ele é alterado.
    if (Object.keys(parcial).some((chave: string) => erros[chave])) {
      setErros((atuais: ErrosFormulario) => {
        const proximos: ErrosFormulario = { ...atuais };
        Object.keys(parcial).forEach((chave: string) => delete proximos[chave]);
        return proximos;
      });
    }
  };

  const alterarTipo = (tipo: TipoEtapa): void => {
    const regra: RegraConclusao = regrasPara(tipo).some((o) => o.regra === etapa.regra) ? etapa.regra : regraPadrao(tipo);
    alterar({ tipo, regra, percentualMinimo: etapa.percentualMinimo || PERCENTUAL_MINIMO_PADRAO });
  };

  const aplicar = (): void => {
    const encontrados: ErrosFormulario = validarEtapa(etapa, props.siteUrl, conteudoTemAlgo);
    setErros(encontrados);
    if (Object.keys(encontrados).length === 0) {
      props.aoSalvar(etapa);
    }
  };

  const usaBiblioteca: boolean = etapa.tipo === 'Video' || etapa.tipo === 'Documento';
  const ehConteudo: boolean = etapa.tipo === 'Conteudo';
  const tipos: { tipo: TipoEtapa; rotulo: string }[] = props.etapa.tipo === 'Link' ? [...TIPOS, TIPO_LINK_ANTIGO] : TIPOS;

  return (
    <GtiDialog
      id={id}
      sobretitulo="Estúdio"
      titulo={props.nova ? 'Nova etapa' : 'Editar etapa'}
      variante="lateral-ampla"
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
          <div className={styles.tipos} role="radiogroup" aria-labelledby={`${id}-tipo`} style={tipos.length > 4 ? { gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' } : undefined}>
            {tipos.map((t) => (
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
          <div className="pi-field">
            <span className="pi-label">{etapa.tipo === 'Video' ? 'Escolher o vídeo' : 'Escolher o documento'}</span>
            <NavegadorBiblioteca
              key={etapa.tipo}
              id={`${id}-nav`}
              area={props.area}
              estudio={props.estudio}
              origem={props.origem}
              extensoes={EXTENSOES_POR_TIPO[etapa.tipo] ?? []}
              oQue={etapa.tipo === 'Video' ? 'vídeo' : 'documento'}
              selecionada={etapa.url}
              permitirEnvio={true}
              aoEscolher={(item: IItemPasta) =>
                alterar({ url: item.url, titulo: etapa.titulo.trim() ? etapa.titulo : item.nome.replace(/\.[^.]+$/, '') })
              }
            />
          </div>
        )}
        {ehConteudo ? (
          <EditorConteudo
            key={`${etapa.id}-conteudo`}
            id={`${id}-conteudo`}
            rotulo="Conteúdo da etapa"
            valor={etapa.conteudo ?? ''}
            erro={erros.conteudo}
            area={props.area}
            estudio={props.estudio}
            origem={props.origem}
            aoAlterar={(html: string) => alterar({ conteudo: html })}
          />
        ) : (
          <Field
            id={`${id}-url`}
            rotulo={etapa.tipo === 'YouTube' ? 'Link do YouTube' : usaBiblioteca ? 'Endereço do arquivo' : 'Endereço do conteúdo'}
            obrigatorio
            erro={erros.url}
            dica={
              etapa.tipo === 'YouTube'
                ? 'Aceita youtube.com, youtu.be e shorts. O player usa youtube-nocookie.'
                : usaBiblioteca
                  ? 'Preenchido ao escolher um arquivo acima. Também aceita o endereço de um arquivo deste SharePoint.'
                  : 'Abre em nova aba.'
            }
          >
            {(aria) => <input {...aria} type="url" placeholder="https://" value={etapa.url} onChange={(e) => alterar({ url: e.target.value })} />}
          </Field>
        )}
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
        {(!ehConteudo || etapa.instrucoes) && (
          <RichTextEditor label="Instruções (opcional)" value={etapa.instrucoes} onChange={(html: string) => alterar({ instrucoes: html })} />
        )}
      </div>
    </GtiDialog>
  );
};

export default EtapaForm;
