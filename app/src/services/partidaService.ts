import { ResumoPartida } from '../types/partida';
import { getBackendEndpoint } from '../config/backend';
import { isFetchFailure, toNetworkFailureError } from '../utils/networkFailure';

const SALVAR_PARTIDA_URL = getBackendEndpoint('salvarPartida');

interface PartidaApiError {
  erro: string;
}

interface SalvarPartidaPayload extends Omit<ResumoPartida, 'id'> {
  id: number;
}

const isPartidaApiError = (value: unknown): value is PartidaApiError => {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'erro' in value &&
    typeof (value as PartidaApiError).erro === 'string'
  );
};

const normalizarResumoParaPayload = (resumo: ResumoPartida): SalvarPartidaPayload => {
  const idNumerico = Number.parseInt(resumo.id, 10);

  return {
    ...resumo,
    id: Number.isFinite(idNumerico) ? idNumerico : -1,
    idade: Number.isFinite(resumo.idade) ? resumo.idade : 0,
    tempoGasto: Number.isFinite(resumo.tempoGasto) ? resumo.tempoGasto : 0
  };
};

const extrairIdDaResposta = (rawText: string): string => {
  const data = JSON.parse(rawText) as { id: string };
  return data.id;
};

export const salvarPartida = async (resumo: ResumoPartida): Promise<string> => {
  let response: Response;
  try {
    response = await fetch(SALVAR_PARTIDA_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(normalizarResumoParaPayload(resumo))
    });
  } catch (error) {
    if (isFetchFailure(error)) {
      throw toNetworkFailureError(error, 'RESUMO DA PARTIDA', SALVAR_PARTIDA_URL, 'match');
    }
    throw error;
  }

  let rawText = '';
  try {
    rawText = await response.text();
  } catch (error) {
    throw toNetworkFailureError(error, 'RESUMO DA PARTIDA', SALVAR_PARTIDA_URL, 'match');
  }

  if (!response.ok) {
    const textoNormalizado = rawText.trim();
    if (textoNormalizado.startsWith('{')) {
      try {
        const data = JSON.parse(textoNormalizado) as unknown;
        if (isPartidaApiError(data)) {
          throw new Error(data.erro);
        }
      } catch (error) {
        if (error instanceof Error && error.message !== 'Unexpected end of JSON input') {
          throw error;
        }
      }
    }

    throw toNetworkFailureError(new Error(`Falha ao salvar partida: HTTP ${response.status}`), 'RESUMO DA PARTIDA', SALVAR_PARTIDA_URL, 'match');
  }

  const textoNormalizado = rawText.trim();
  if (textoNormalizado.startsWith('{')) {
    const data = JSON.parse(textoNormalizado) as unknown;
    if (isPartidaApiError(data)) {
      throw new Error(data.erro);
    }
  }

  try {
    return extrairIdDaResposta(rawText);
  } catch (error) {
    throw toNetworkFailureError(error, 'RESUMO DA PARTIDA', SALVAR_PARTIDA_URL, 'match');
  }
};

const partidaService = {
  salvarPartida
};

export default partidaService;
