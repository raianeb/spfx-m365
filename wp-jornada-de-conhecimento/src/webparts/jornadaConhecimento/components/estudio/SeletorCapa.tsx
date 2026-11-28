// Skills aplicadas: spfx-padrao-visual-gti (prévia do card, ações secundárias), spfx-imagens-midia (capa decorativa,
// enquadramento object-fit), spfx-acessibilidade-conteudo (estado da capa em texto, erros ligados ao campo).
// A capa é gravada na coluna Capa (URL). Imagens enviadas vão para a pasta Imagens da biblioteca da área.
import * as React from 'react';
import { useRef, useState } from 'react';
import { urlSegura } from '../../../../jornada/conteudo';
import { EXTENSOES_IMAGEM, ehImagem } from '../../../../jornada/estudio';
import { IArea } from '../../../../jornada/modelo';
import { EstudioService, IItemPasta } from '../../../../services/EstudioService';
import { mensagemDeErro } from '../../../../services/sp';
import { Icon } from '../gti';
import { IconeArea, PadraoCapa, fundoArea } from '../comum/ui';
import NavegadorBiblioteca from './NavegadorBiblioteca';
import styles from '../jc.module.scss';

export interface ISeletorCapaProps {
  id: string;
  area: IArea;
  titulo: string;
  capa: string;
  erro?: string;
  siteUrl: string;
  origem: string;
  estudio: EstudioService;
  aoAlterar: (capa: string) => void;
}

type Modo = 'biblioteca' | 'endereco' | undefined;

const SeletorCapa: React.FC<ISeletorCapaProps> = (props: ISeletorCapaProps) => {
  const { area, estudio, origem } = props;
  const [modo, setModo] = useState<Modo>(undefined);
  const [enviando, setEnviando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');
  const [quebrada, setQuebrada] = useState<string>('');
  const entrada = useRef<HTMLInputElement>(null);
  const capa: string = urlSegura(props.capa, props.siteUrl);

  const enviar = async (arquivo: File | undefined): Promise<void> => {
    if (!arquivo) {
      return;
    }
    if (!ehImagem(arquivo.name)) {
      setErro(`Use uma imagem ${EXTENSOES_IMAGEM.join(', ')}.`);
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      props.aoAlterar(await estudio.enviarImagem(area, arquivo, origem));
      setModo(undefined);
    } catch (falha: unknown) {
      setErro(mensagemDeErro(falha, 'Enviar a capa'));
    } finally {
      setEnviando(false);
      if (entrada.current) {
        entrada.current.value = '';
      }
    }
  };

  return (
    <div className={`pi-field full ${props.erro ? 'invalid' : ''}`}>
      <span className="pi-label" id={`${props.id}-rotulo`}>
        Capa
      </span>
      <div className={styles.seletorCapa}>
        <div className={`${styles.capa} ${styles.capaPrevia}`} style={fundoArea(area)} aria-hidden="true">
          {capa && quebrada !== capa ? <img src={capa} alt="" onError={() => setQuebrada(capa)} /> : <PadraoCapa semente={7} />}
          <span className={styles.capaIcone}>
            <IconeArea area={area} />
          </span>
          <b className={styles.capaPreviaTitulo}>{props.titulo.trim() || 'Nome da jornada'}</b>
        </div>
        <div className={styles.seletorCapaAcoes}>
          <p className="pi-hint" style={{ margin: 0 }}>
            {capa
              ? quebrada === capa
                ? 'Não foi possível carregar esta imagem. Verifique o endereço ou escolha outra.'
                : 'Capa personalizada. A imagem é recortada para preencher o card (use 1200 × 400 px ou proporção parecida).'
              : 'Sem capa: o card usa a cor e o ícone da área.'}
          </p>
          <div className={styles.editorLinha}>
            <input
              ref={entrada}
              type="file"
              className="pi-sr"
              aria-label="Imagem da capa"
              accept={EXTENSOES_IMAGEM.map((e: string) => `.${e}`).join(',')}
              onChange={(e) => {
                enviar(e.target.files?.[0]).catch(() => undefined);
              }}
            />
            <button type="button" className="pi-btn" disabled={enviando} onClick={() => entrada.current?.click()}>
              <Icon nome="subir" tamanho={16} />
              {enviando ? 'Enviando…' : capa ? 'Trocar imagem' : 'Enviar imagem'}
            </button>
            <button type="button" className="pi-btn" aria-expanded={modo === 'biblioteca'} onClick={() => setModo(modo === 'biblioteca' ? undefined : 'biblioteca')}>
              <Icon nome="pasta" tamanho={16} />
              Da biblioteca
            </button>
            <button type="button" className="pi-btn" aria-expanded={modo === 'endereco'} onClick={() => setModo(modo === 'endereco' ? undefined : 'endereco')}>
              <Icon nome="link" tamanho={16} />
              Por endereço
            </button>
            {props.capa && (
              <button type="button" className="pi-btn" onClick={() => props.aoAlterar('')}>
                <Icon nome="lixeira" tamanho={16} />
                Remover capa
              </button>
            )}
          </div>
        </div>
      </div>
      {modo === 'biblioteca' && (
        <NavegadorBiblioteca
          id={`${props.id}-nav`}
          area={area}
          estudio={estudio}
          origem={origem}
          extensoes={EXTENSOES_IMAGEM}
          oQue="imagem"
          selecionada={capa}
          permitirEnvio={true}
          aoEscolher={(item: IItemPasta) => {
            props.aoAlterar(item.url);
            setModo(undefined);
          }}
        />
      )}
      {modo === 'endereco' && (
        <>
          <label className="pi-label" htmlFor={props.id}>
            Endereço da imagem
          </label>
          <input
            id={props.id}
            type="url"
            placeholder="https://"
            aria-invalid={props.erro ? true : undefined}
            aria-describedby={props.erro ? `${props.id}-erro` : undefined}
            value={props.capa}
            onChange={(e) => props.aoAlterar(e.target.value)}
          />
        </>
      )}
      {(props.erro || erro) && (
        <span className="pi-field-error" id={`${props.id}-erro`} role="alert">
          {props.erro || erro}
        </span>
      )}
    </div>
  );
};

export default SeletorCapa;
