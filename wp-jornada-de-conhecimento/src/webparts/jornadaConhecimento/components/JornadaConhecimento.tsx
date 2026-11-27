// Skills aplicadas: spfx-design-base (cabeçalho, estados), spfx-acessibilidade-conteudo, spfx-configuracao-webpart
// (ambiente visível, troca de contexto descarta respostas antigas), spfx-implementacao-base (diagnóstico).
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { DiagnosticsPanel } from '../../../core/diagnostics';
import { prefixosValidos } from '../../../core/prefixos';
import { Aba } from '../../../jornada/modelo';
import { IPerfil, PerfilService } from '../../../services/PerfilService';
import { mensagemDeErro } from '../../../services/sp';
import { IJornadaConhecimentoProps, NOME_SOLUCAO } from './tipos';
import AdministracaoTab from './administracao/AdministracaoTab';
import EmBreve from './comum/EmBreve';
import Estado from './comum/Estado';
import styles from './JornadaConhecimento.module.scss';

const ROTULO_ABA: Record<Aba, string> = {
  minhas: 'Minhas Jornadas',
  gestao: 'Gestão da Área',
  estudio: 'Estúdio',
  administracao: 'Administração'
};

type Carga = { tipo: 'carregando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'pronto'; perfil: IPerfil };

const JornadaConhecimento: React.FC<IJornadaConhecimentoProps> = (props: IJornadaConhecimentoProps) => {
  const { sp, environment, prefixos, adminGroupIds, logger, siteUrl } = props;
  const [carga, setCarga] = useState<Carga>({ tipo: 'carregando' });
  const [aba, setAba] = useState<Aba>('minhas');
  const [versao, setVersao] = useState<number>(0);

  // Contexto de dados: trocar site, ambiente, prefixos ou grupos de Administradores recarrega o perfil.
  const chaveContexto: string = `${siteUrl}|${environment}|${prefixos.PROD}|${prefixos.HML}|${adminGroupIds.join(',')}`;
  const servico: PerfilService = useMemo(
    () => new PerfilService(sp, environment, prefixos, adminGroupIds, logger),
    [sp, chaveContexto]
  );

  useEffect(() => {
    let ativo: boolean = true;
    setCarga({ tipo: 'carregando' });
    if (environment === 'HML' && !prefixosValidos(prefixos)) {
      setCarga({ tipo: 'pronto', perfil: { situacao: 'configuracaoPendente', administrador: false, podePrepararSite: false, usuarioId: 0, areas: [], abas: ['minhas'], listaAreas: '' } });
      return undefined;
    }
    servico
      .carregar()
      .then((perfil: IPerfil) => {
        if (ativo) {
          setCarga({ tipo: 'pronto', perfil });
          setAba((atual: Aba) => (perfil.abas.indexOf(atual) !== -1 ? atual : 'minhas'));
        }
      })
      .catch((erro: unknown) => {
        if (ativo) {
          const mensagem: string = mensagemDeErro(erro, 'Carregar o perfil');
          logger.log('error', 'Perfil', mensagem);
          setCarga({ tipo: 'erro', mensagem });
        }
      });
    // Respostas de um contexto anterior são descartadas.
    return () => {
      ativo = false;
    };
  }, [servico, versao]);

  const recarregar = useCallback(() => setVersao((v: number) => v + 1), []);

  return (
    <section className={styles.root} style={props.themeStyle} aria-label={props.title || NOME_SOLUCAO}>
      <header className={styles.cabecalho}>
        {props.title ? (
          <h2 className={styles.titulo}>
            <Icon iconName="Education" className={styles.tituloIcone} aria-hidden="true" />
            {props.title}
          </h2>
        ) : (
          <span />
        )}
        <span
          className={`${styles.ambiente} ${environment === 'HML' ? styles.ambienteHml : ''}`}
          title={environment === 'HML' ? 'Homologação' : 'Produção'}
        >
          {environment}
        </span>
      </header>

      {carga.tipo === 'carregando' && <Spinner size={SpinnerSize.medium} label="Carregando seu perfil..." />}

      {carga.tipo === 'erro' && (
        <Estado titulo="Não foi possível carregar" texto={carga.mensagem} papel="alert">
          <DefaultButton text="Tentar novamente" onClick={recarregar} />
        </Estado>
      )}

      {carga.tipo === 'pronto' && carga.perfil.situacao === 'configuracaoPendente' && (
        <Estado
          titulo="Configuração pendente"
          texto="O ambiente HML precisa de um prefixo próprio, diferente do de PROD (padrão: HML_). Ajuste em Propriedades da web part > Dados e ambiente."
        />
      )}

      {carga.tipo === 'pronto' && carga.perfil.situacao !== 'configuracaoPendente' && (
        <>
          {carga.perfil.abas.length > 1 && (
            <Pivot
              selectedKey={aba}
              onLinkClick={(item?: PivotItem) => item?.props.itemKey && setAba(item.props.itemKey as Aba)}
              headersOnly
              aria-label="Seções da Jornada de Conhecimento"
            >
              {carga.perfil.abas.map((chave: Aba) => (
                <PivotItem key={chave} itemKey={chave} headerText={ROTULO_ABA[chave]} />
              ))}
            </Pivot>
          )}
          <div className={styles.conteudo}>
            {aba === 'administracao' ? (
              <AdministracaoTab {...props} perfil={carga.perfil} aoAlterar={recarregar} />
            ) : (
              <EmBreve secao={ROTULO_ABA[aba]} semListaCentral={carga.perfil.situacao === 'semListaCentral'} />
            )}
          </div>
        </>
      )}

      <DiagnosticsPanel logger={logger} />
    </section>
  );
};

export default JornadaConhecimento;
