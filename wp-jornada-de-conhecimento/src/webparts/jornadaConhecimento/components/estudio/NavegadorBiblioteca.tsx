// Skills aplicadas: spfx-padrao-visual-gti (lista navegável com trilha de pastas, estados de carga/vazio/erro),
// spfx-acessibilidade-conteudo (lista de opções com rótulos, progresso anunciado), sharepoint-dados-listas (pastas e arquivos
// lidos pelo usuário logado; só aparece o que ele pode ler).
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { IArea } from '../../../../jornada/modelo';
import { extensaoDe } from '../../../../jornada/estudio';
import { EstudioService, IBiblioteca, IItemPasta } from '../../../../services/EstudioService';
import { mensagemDeErro } from '../../../../services/sp';
import { Icon } from '../gti';
import styles from '../jc.module.scss';

export interface INavegadorBibliotecaProps {
  id: string;
  area: IArea;
  estudio: EstudioService;
  /** Origem (https://tenant.sharepoint.com) usada para montar a URL absoluta dos arquivos. */
  origem: string;
  /** Extensões aceitas (sem ponto). Os demais arquivos ficam ocultos. */
  extensoes: string[];
  /** Descrição do que se procura, para os textos ("vídeo", "documento", "imagem"). */
  oQue: string;
  /** URL atualmente escolhida, destacada na lista. */
  selecionada: string;
  /** Permite enviar um arquivo do computador para a pasta aberta. */
  permitirEnvio: boolean;
  aoEscolher: (arquivo: IItemPasta) => void;
}

const formatarTamanho = (bytes: number | undefined): string => {
  if (!bytes) {
    return '';
  }
  const mb: number = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const NavegadorBiblioteca: React.FC<INavegadorBibliotecaProps> = (props: INavegadorBibliotecaProps) => {
  const { estudio, area, origem } = props;
  const [bibliotecas, setBibliotecas] = useState<IBiblioteca[] | undefined>(undefined);
  const [biblioteca, setBiblioteca] = useState<IBiblioteca | undefined>(undefined);
  const [caminho, setCaminho] = useState<string>('');
  const [itens, setItens] = useState<IItemPasta[] | undefined>(undefined);
  const [erro, setErro] = useState<string>('');
  const [envio, setEnvio] = useState<number | undefined>(undefined);
  const [recarga, setRecarga] = useState<number>(0);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ativo: boolean = true;
    estudio
      .bibliotecas(area)
      .then((lista: IBiblioteca[]) => {
        if (!ativo) {
          return;
        }
        setBibliotecas(lista);
        const inicial: IBiblioteca | undefined = lista.find((b: IBiblioteca) => b.daArea) ?? lista[0];
        setBiblioteca(inicial);
        setCaminho(inicial?.raiz ?? '');
      })
      .catch((falha: unknown) => {
        if (ativo) {
          setBibliotecas([]);
          setErro(mensagemDeErro(falha, 'Listar as bibliotecas'));
        }
      });
    return () => {
      ativo = false;
    };
  }, [estudio, area]);

  useEffect(() => {
    if (!caminho) {
      return undefined;
    }
    let ativo: boolean = true;
    setItens(undefined);
    setErro('');
    estudio
      .conteudoDaPasta(caminho, origem)
      .then((lista: IItemPasta[]) => ativo && setItens(lista))
      .catch((falha: unknown) => {
        if (ativo) {
          setItens([]);
          setErro(mensagemDeErro(falha, 'Abrir a pasta'));
        }
      });
    return () => {
      ativo = false;
    };
  }, [estudio, caminho, origem, recarga]);

  const aceito = (nome: string): boolean => props.extensoes.indexOf(extensaoDe(nome)) !== -1;
  const visiveis: IItemPasta[] = (itens ?? []).filter((item: IItemPasta) => item.pasta || aceito(item.nome));
  const arquivos: number = visiveis.filter((item: IItemPasta) => !item.pasta).length;

  // Trilha: da raiz da biblioteca até a pasta aberta.
  const raiz: string = biblioteca?.raiz ?? '';
  const partes: string[] = caminho.length > raiz.length ? caminho.slice(raiz.length + 1).split('/') : [];
  const trilha: { nome: string; caminho: string }[] = [
    { nome: biblioteca?.titulo ?? '', caminho: raiz },
    ...partes.map((nome: string, i: number) => ({ nome, caminho: `${raiz}/${partes.slice(0, i + 1).join('/')}` }))
  ];

  const enviar = async (arquivo: File | undefined): Promise<void> => {
    if (!arquivo) {
      return;
    }
    if (!aceito(arquivo.name)) {
      setErro(`Este arquivo não é aceito aqui. Use: ${props.extensoes.join(', ')}.`);
      return;
    }
    setErro('');
    setEnvio(0);
    try {
      const enviado: IItemPasta = await estudio.enviarArquivo(caminho, arquivo, origem, setEnvio);
      props.aoEscolher(enviado);
      setRecarga((n: number) => n + 1);
    } catch (falha: unknown) {
      setErro(mensagemDeErro(falha, 'Enviar o arquivo'));
    } finally {
      setEnvio(undefined);
      if (entrada.current) {
        entrada.current.value = '';
      }
    }
  };

  if (bibliotecas === undefined) {
    return <p className="pi-hint">Carregando bibliotecas…</p>;
  }
  if (bibliotecas.length === 0) {
    return <p className={styles.avisoConteudo}>{erro || 'Nenhuma biblioteca de documentos disponível para você neste site.'}</p>;
  }

  return (
    <div className={styles.navegador}>
      <div className={styles.navegadorTopo}>
        <label className="pi-label" htmlFor={`${props.id}-bib`}>
          Biblioteca
        </label>
        <select
          id={`${props.id}-bib`}
          value={biblioteca?.raiz ?? ''}
          onChange={(e) => {
            const escolhida: IBiblioteca | undefined = bibliotecas.find((b: IBiblioteca) => b.raiz === e.target.value);
            setBiblioteca(escolhida);
            setCaminho(escolhida?.raiz ?? '');
          }}
        >
          {bibliotecas.map((b: IBiblioteca) => (
            <option key={b.raiz} value={b.raiz}>
              {b.daArea ? `${b.titulo} (da área)` : b.titulo}
            </option>
          ))}
        </select>
        {props.permitirEnvio && (
          <>
            <input
              ref={entrada}
              type="file"
              className="pi-sr"
              id={`${props.id}-envio`}
              accept={props.extensoes.map((e: string) => `.${e}`).join(',')}
              onChange={(e) => {
                enviar(e.target.files?.[0]).catch(() => undefined);
              }}
            />
            <button type="button" className="pi-btn" disabled={envio !== undefined} onClick={() => entrada.current?.click()}>
              <Icon nome="subir" tamanho={16} />
              {envio !== undefined ? `Enviando… ${envio}%` : 'Enviar do computador'}
            </button>
          </>
        )}
      </div>

      <nav aria-label="Pastas" className={styles.trilha}>
        {trilha.map((t, i: number) => (
          <React.Fragment key={t.caminho}>
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === trilha.length - 1 ? (
              <b aria-current="location">{t.nome}</b>
            ) : (
              <button type="button" className="pi-link-btn" onClick={() => setCaminho(t.caminho)}>
                {t.nome}
              </button>
            )}
          </React.Fragment>
        ))}
      </nav>

      {envio !== undefined && (
        <div className="pi-progress" role="progressbar" aria-label="Envio do arquivo" aria-valuenow={envio} aria-valuemin={0} aria-valuemax={100}>
          <span className="pi-bar">
            <i style={{ width: `${envio}%` }} />
          </span>
          <b>{envio}%</b>
        </div>
      )}
      {erro && (
        <p className={styles.erroInline} role="alert">
          {erro}
        </p>
      )}

      {itens === undefined ? (
        <p className="pi-hint">Abrindo a pasta…</p>
      ) : visiveis.length === 0 ? (
        <p className="pi-hint">
          Nenhuma pasta ou {props.oQue} aqui{props.permitirEnvio ? '. Envie um arquivo do computador para esta pasta.' : '.'}
        </p>
      ) : (
        <ul className={styles.arquivos} aria-label={`Pastas e arquivos (${arquivos} ${props.oQue === 'imagem' ? 'imagens' : `${props.oQue}s`})`}>
          {visiveis.map((item: IItemPasta) => {
            const escolhido: boolean = !item.pasta && item.url === props.selecionada;
            return (
              <li key={item.caminho}>
                <button
                  type="button"
                  aria-pressed={item.pasta ? undefined : escolhido}
                  className={escolhido ? styles.arquivoEscolhido : undefined}
                  onClick={() => (item.pasta ? setCaminho(item.caminho) : props.aoEscolher(item))}
                >
                  <Icon nome={item.pasta ? 'pasta' : props.oQue === 'imagem' ? 'imagem' : props.oQue === 'vídeo' ? 'video' : 'arquivo'} tamanho={18} />
                  <span className={styles.arquivoNome}>{item.nome}</span>
                  <span className="pi-hint">{item.pasta ? 'Pasta' : formatarTamanho(item.tamanho)}</span>
                  {escolhido && <Icon nome="check" tamanho={16} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default NavegadorBiblioteca;
