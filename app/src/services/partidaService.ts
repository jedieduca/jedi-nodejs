import { ResumoPartida } from '../types/partida';

const SALVAR_PARTIDA_URL = 'https://memore-net.com/api/JEDI-API/partidasperguntas/salvarPartida';

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
  const response = await fetch(SALVAR_PARTIDA_URL, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(normalizarResumoParaPayload(resumo))
  });

  const rawText = await response.text();

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

    throw new Error(`Falha ao salvar partida: HTTP ${response.status}`);
  }

  const textoNormalizado = rawText.trim();
  if (textoNormalizado.startsWith('{')) {
    const data = JSON.parse(textoNormalizado) as unknown;
    if (isPartidaApiError(data)) {
      throw new Error(data.erro);
    }
  }

  return extrairIdDaResposta(rawText);
};

const partidaService = {
  salvarPartida
};

export default partidaService;
