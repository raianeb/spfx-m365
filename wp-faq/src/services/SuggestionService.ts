/** Tempo máximo de espera do fluxo. Acima disso, o envio é tratado como falha e pode ser repetido. */
export const SUGGESTION_TIMEOUT_MS: number = 15000;

const FAILURE_MESSAGE: string = 'Não foi possível enviar a sugestão. Tente novamente.';

/**
 * Envia a sugestão ao fluxo do Power Automate (HTTP Trigger) por POST com JSON. O fluxo recebe a
 * requisição e encaminha à equipe responsável. Resposta fora de 2xx, tempo esgotado e falha de rede
 * geram erro com mensagem amigável.
 */
export const sendSuggestion = async (
  url: string,
  payload: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch
): Promise<void> => {
  const controller: AbortController = new AbortController();
  const timer: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), SUGGESTION_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
      mode: 'cors',
      signal: controller.signal
    });
  } catch (error: unknown) {
    const timedOut: boolean = error instanceof Error && error.name === 'AbortError';
    throw new Error(timedOut ? 'O envio demorou demais. Tente novamente.' : FAILURE_MESSAGE);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new Error(`${FAILURE_MESSAGE} (HTTP ${response.status}).`);
  }
};
