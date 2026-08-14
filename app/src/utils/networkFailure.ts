export type NetworkFailureContext = 'auth' | 'character-selection' | 'match' | 'victory';

export interface NetworkFailureDetails {
  resourceLabel: string;
  context?: NetworkFailureContext;
  source?: string;
  cause?: unknown;
}

export class NetworkFailureError extends Error {
  public readonly resourceLabel: string;
  public readonly context?: NetworkFailureContext;
  public readonly source?: string;
  public readonly cause?: unknown;

  constructor(details: NetworkFailureDetails) {
    super(formatNetworkFailureMessage(details.resourceLabel));
    this.name = 'NetworkFailureError';
    this.resourceLabel = details.resourceLabel;
    this.context = details.context;
    this.source = details.source;
    this.cause = details.cause;
  }
}

export const formatNetworkFailureMessage = (resourceLabel: string): string => (
  `Problemas ao acessar “${resourceLabel}”.\n` +
  'Recomendações: Verifique o sinal de internet e as configurações do seu equipamento. Reinicie o jogo.'
);

export const isNetworkFailureError = (error: unknown): error is NetworkFailureError => {
  return error instanceof NetworkFailureError;
};

export const createNetworkFailureError = (
  resourceLabel: string,
  source: string,
  cause?: unknown,
  context?: NetworkFailureContext
): NetworkFailureError => {
  return new NetworkFailureError({
    resourceLabel,
    source,
    cause,
    context
  });
};

export const isFetchFailure = (error: unknown): boolean => {
  return error instanceof TypeError || (
    error instanceof DOMException &&
    error.name === 'AbortError'
  );
};

export const ensureOkResponse = (
  response: Response,
  resourceLabel: string,
  source: string,
  context?: NetworkFailureContext
): void => {
  if (!response.ok) {
    throw createNetworkFailureError(
      resourceLabel,
      source,
      new Error(`HTTP ${response.status}`),
      context
    );
  }
};

export const toNetworkFailureError = (
  error: unknown,
  resourceLabel: string,
  source: string,
  context?: NetworkFailureContext
): NetworkFailureError => {
  if (isNetworkFailureError(error)) {
    return error;
  }

  return createNetworkFailureError(resourceLabel, source, error, context);
};

export const preloadRequiredImage = (
  src: string,
  resourceLabel: string,
  source: string,
  context?: NetworkFailureContext
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(createNetworkFailureError(resourceLabel, source, new Error('URL vazia'), context));
      return;
    }

    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => {
      reject(createNetworkFailureError(resourceLabel, source, new Error(`Falha ao carregar imagem: ${src}`), context));
    };
    img.src = src;
  });
};

export const preloadOptionalImage = (src: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!src) {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
};
