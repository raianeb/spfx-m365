// Skills aplicadas: spfx-design-base (modal padrão, validação por campo), spfx-acessibilidade-conteudo.
import * as React from 'react';
import { useState } from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { TextField } from '@fluentui/react/lib/TextField';
import ModalShell from '../../../../crud/ModalShell';
import crud from '../../../../crud/crud.module.scss';
import { primaryButtonStyles, secondaryButtonStyles, textFieldStyles } from '../../../../crud/modalStyles';
import RichTextEditor from '../../../../comum/RichTextEditor';
import { ErrosFormulario, arquivoCombina, regraPadrao, validarEtapa } from '../../../../jornada/estudio';
import { IEtapa, PERCENTUAL_MINIMO_PADRAO, RegraConclusao, TipoEtapa } from '../../../../jornada/progresso';
import { IArquivoBiblioteca } from '../../../../services/EstudioService';
import { NOME_SOLUCAO } from '../tipos';

export interface IEtapaFormProps {
  etapa: IEtapa;
  siteUrl: string;
  arquivos: IArquivoBiblioteca[] | undefined;
  themeStyle?: React.CSSProperties;
  aoFechar: () => void;
  aoSalvar: (etapa: IEtapa) => void;
}

const TIPOS: IDropdownOption[] = [
  { key: 'YouTube', text: 'Vídeo do YouTube' },
  { key: 'Video', text: 'Vídeo da biblioteca da área' },
  { key: 'Documento', text: 'Documento' },
  { key: 'Link', text: 'Link' }
];

const regrasPara = (tipo: TipoEtapa): IDropdownOption[] => [
  ...(tipo === 'YouTube' || tipo === 'Video' ? [{ key: 'PercentualAssistido', text: 'Assistir a um percentual do vídeo' }] : []),
  { key: 'AbrirConteudo', text: 'Abrir o conteúdo' },
  { key: 'Manual', text: 'Marcar como concluída (manual)' }
];

const EtapaForm: React.FC<IEtapaFormProps> = (props: IEtapaFormProps) => {
  const tituloId: string = React.useId();
  const [etapa, setEtapa] = useState<IEtapa>(props.etapa);
  const [erros, setErros] = useState<ErrosFormulario>({});

  const alterar = (parcial: Partial<IEtapa>): void => setEtapa((atual: IEtapa) => ({ ...atual, ...parcial }));

  const alterarTipo = (tipo: TipoEtapa): void => {
    const regra: RegraConclusao = regrasPara(tipo).some((opcao) => opcao.key === etapa.regra) ? etapa.regra : regraPadrao(tipo);
    alterar({ tipo, regra, percentualMinimo: etapa.percentualMinimo || PERCENTUAL_MINIMO_PADRAO });
  };

  const salvar = (): void => {
    const encontrados: ErrosFormulario = validarEtapa(etapa, props.siteUrl);
    setErros(encontrados);
    if (Object.keys(encontrados).length === 0) {
      props.aoSalvar(etapa);
    }
  };

  const arquivos: IArquivoBiblioteca[] = (props.arquivos ?? []).filter((arquivo: IArquivoBiblioteca) => arquivoCombina(arquivo.nome, etapa.tipo));
  const usaBiblioteca: boolean = etapa.tipo === 'Video' || etapa.tipo === 'Documento';

  return (
    <ModalShell contextLabel={NOME_SOLUCAO} titleId={tituloId} firstFocusableClass={crud.firstField} onDismiss={props.aoFechar} themeStyle={props.themeStyle}>
      <h2 id={tituloId} className={crud.modalTitle}>
        {props.etapa.titulo ? 'Editar etapa' : 'Nova etapa'}
      </h2>
      <div className={crud.modalForm}>
        <div className={crud.fields}>
          <TextField
            label="Nome da etapa"
            required
            className={crud.firstField}
            value={etapa.titulo}
            maxLength={255}
            onChange={(_e, valor?: string) => alterar({ titulo: valor ?? '' })}
            errorMessage={erros.titulo}
            styles={textFieldStyles}
          />
          <Dropdown label="Tipo de conteúdo" required options={TIPOS} selectedKey={etapa.tipo} onChange={(_e, opcao) => opcao && alterarTipo(opcao.key as TipoEtapa)} />
          {usaBiblioteca && (
            <Dropdown
              label="Escolher da biblioteca da área"
              placeholder={props.arquivos === undefined ? 'Carregando arquivos...' : arquivos.length ? 'Selecione um arquivo' : 'Nenhum arquivo deste tipo na biblioteca'}
              options={arquivos.map((arquivo: IArquivoBiblioteca) => ({ key: arquivo.url, text: arquivo.nome }))}
              selectedKey={arquivos.some((arquivo) => arquivo.url === etapa.url) ? etapa.url : null}
              onChange={(_e, opcao) => opcao && alterar({ url: String(opcao.key) })}
              disabled={!arquivos.length}
            />
          )}
          <TextField
            label={etapa.tipo === 'YouTube' ? 'Link do YouTube' : 'Endereço do conteúdo'}
            required
            value={etapa.url}
            onChange={(_e, valor?: string) => alterar({ url: valor ?? '' })}
            description={usaBiblioteca ? 'Escolha um arquivo acima ou cole o endereço de um arquivo deste SharePoint.' : undefined}
            errorMessage={erros.url}
            styles={textFieldStyles}
          />
          <TextField
            label="Duração (minutos)"
            type="number"
            min={0}
            value={String(etapa.duracaoMin)}
            onChange={(_e, valor?: string) => alterar({ duracaoMin: Number(valor || 0) })}
            errorMessage={erros.duracaoMin}
            styles={textFieldStyles}
          />
          <Dropdown
            label="Como a etapa é concluída"
            options={regrasPara(etapa.tipo)}
            selectedKey={etapa.regra}
            onChange={(_e, opcao) => opcao && alterar({ regra: opcao.key as RegraConclusao })}
            errorMessage={erros.regra}
          />
          {etapa.regra === 'PercentualAssistido' && (
            <TextField
              label="Percentual mínimo assistido"
              type="number"
              min={1}
              max={100}
              suffix="%"
              value={String(etapa.percentualMinimo || PERCENTUAL_MINIMO_PADRAO)}
              onChange={(_e, valor?: string) => alterar({ percentualMinimo: Number(valor || 0) })}
              errorMessage={erros.percentualMinimo}
              styles={textFieldStyles}
            />
          )}
          <RichTextEditor label="Instruções (opcional)" value={etapa.instrucoes} onChange={(html: string) => alterar({ instrucoes: html })} />
        </div>
        <footer className={crud.footer}>
          <span className={crud.helper}>As etapas são gravadas ao salvar a jornada.</span>
          <div className={crud.footerActions}>
            <DefaultButton text="Cancelar" onClick={props.aoFechar} styles={secondaryButtonStyles} />
            <PrimaryButton text="Aplicar" onClick={salvar} styles={primaryButtonStyles} />
          </div>
        </footer>
      </div>
    </ModalShell>
  );
};

export default EtapaForm;
