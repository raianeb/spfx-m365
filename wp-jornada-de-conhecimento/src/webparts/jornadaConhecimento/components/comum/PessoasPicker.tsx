// Skills aplicadas: spfx-acessibilidade-conteudo (rótulo e teclado), sharepoint-dados-listas (atraso na pesquisa).
import * as React from 'react';
import { useCallback } from 'react';
import { Label } from '@fluentui/react/lib/Label';
import { IBasePickerSuggestionsProps, NormalPeoplePicker } from '@fluentui/react/lib/Pickers';
import { IPersonaProps } from '@fluentui/react/lib/Persona';
import { AreaService, IPessoa } from '../../../../services/AreaService';

export interface IPessoasPickerProps {
  id: string;
  rotulo: string;
  servico: AreaService;
  selecionadas: IPessoa[];
  aoAlterar: (pessoas: IPessoa[]) => void;
  /** Permite escolher grupos do Entra ID além de pessoas. */
  incluirGrupos?: boolean;
  desabilitado?: boolean;
}

const SUGESTOES: IBasePickerSuggestionsProps = {
  suggestionsHeaderText: 'Sugestões',
  noResultsFoundText: 'Nenhum resultado. Digite ao menos 3 letras do nome ou do e-mail.',
  loadingText: 'Pesquisando...'
};

const paraPersona = (pessoa: IPessoa): IPersonaProps & { pessoa: IPessoa } => ({
  key: pessoa.loginName,
  text: pessoa.nome,
  secondaryText: pessoa.email,
  pessoa
});

const PessoasPicker: React.FC<IPessoasPickerProps> = (props: IPessoasPickerProps) => {
  const { servico, incluirGrupos, selecionadas, aoAlterar } = props;

  const pesquisar = useCallback(
    async (termo: string, atuais?: IPersonaProps[]): Promise<IPersonaProps[]> => {
      const encontradas: IPessoa[] = await servico.pesquisarPessoas(termo, incluirGrupos === true);
      const escolhidas: string[] = (atuais ?? []).map((persona: IPersonaProps) => String(persona.key));
      return encontradas.filter((pessoa: IPessoa) => escolhidas.indexOf(pessoa.loginName) === -1).map(paraPersona);
    },
    [servico, incluirGrupos]
  );

  return (
    <div>
      <Label htmlFor={props.id}>{props.rotulo}</Label>
      <NormalPeoplePicker
        onResolveSuggestions={(termo: string, atuais?: IPersonaProps[]) => pesquisar(termo, atuais).catch(() => [])}
        selectedItems={selecionadas.map(paraPersona)}
        onChange={(itens?: IPersonaProps[]) =>
          aoAlterar((itens ?? []).map((item: IPersonaProps) => (item as IPersonaProps & { pessoa: IPessoa }).pessoa))
        }
        pickerSuggestionsProps={SUGESTOES}
        resolveDelay={400}
        disabled={props.desabilitado}
        inputProps={{ id: props.id, 'aria-label': props.rotulo }}
      />
    </div>
  );
};

export default PessoasPicker;
