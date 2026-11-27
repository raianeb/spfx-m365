// Skills aplicadas: spfx-design-base (estado de primeiro uso). Seções das fases 2 e 3 do roteiro.
import * as React from 'react';
import Estado from './Estado';

export interface IEmBreveProps {
  secao: string;
  semListaCentral: boolean;
}

const EmBreve: React.FC<IEmBreveProps> = ({ secao, semListaCentral }: IEmBreveProps) =>
  semListaCentral ? (
    <Estado
      titulo="Estrutura ainda não criada"
      texto="A lista central deste ambiente ainda não existe. Peça ao administrador para executar o provisionamento."
    />
  ) : (
    <Estado titulo={secao} texto="Esta seção será liberada na próxima etapa de implantação." />
  );

export default EmBreve;
