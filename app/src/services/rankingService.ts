import {
  RankingApiEntryRaw,
  RankingApiError,
  RankingEntry,
  RankingRequestPayload
} from '../types/ranking';

const RANKING_URL = 'https://memore-net.com/api/JEDI-API/partidasperguntas/ranking';

const isRankingApiError = (value: unknown): value is RankingApiError => {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'erro' in value &&
    typeof (value as RankingApiError).erro === 'string'
  );
};

const parseNumericField = (value: string | number, fieldName: string): number => {
  const parsed = typeof value === 'number' ? value : 
                  Number.parseFloat(String(value)) || Number.parseInt(String(value), 10) || 0;

  if (!Number.isFinite(parsed)) {
    throw new Error(`Campo inválido no ranking: ${fieldName}`);
  }

  return parsed;
};

const normalizeRankingEntry = (rawEntry: RankingApiEntryRaw): RankingEntry => {
  if (!rawEntry || typeof rawEntry !== 'object') {
    throw new Error('Item inválido no ranking');
  }

  return {
    idPartida: parseNumericField(rawEntry.idPartida, 'idPartida'),
    nome: String(rawEntry.nome ?? '').trim(),
    autoAvaliacao: String(rawEntry.autoAvaliacao ?? '').trim(),
    avaliacaoJogo: String(rawEntry.avaliacaoJogo ?? '').trim(),
    jogador: String(rawEntry.jogador ?? '').trim(),
    pontuacao: parseNumericField(rawEntry.pontuacao, 'pontuacao'),
    percentualAcertos: parseNumericField(rawEntry.percentualAcertos, 'percentualAcertos'),
    tempoGasto: parseNumericField(rawEntry.tempoGasto, 'tempoGasto'),
    totalPartidas: parseNumericField(rawEntry.totalPartidas, 'totalPartidas'),
    posicao: parseNumericField(rawEntry.posicao, 'posicao')
  };
};

const parseRankingResponse = (rawText: string): RankingEntry[] => {
  const trimmed = rawText.trim();

  if (!trimmed) {
    throw new Error('Resposta vazia ao buscar ranking');
  }

  const parsed = JSON.parse(trimmed) as unknown;

  if (isRankingApiError(parsed)) {
    throw new Error(parsed.erro);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Formato inesperado na resposta do ranking');
  }

  return parsed.map((entry) => normalizeRankingEntry(entry as RankingApiEntryRaw));
};

export const buscarRanking = async (idPartida: number | string): Promise<RankingEntry[]> => {
  const payload: RankingRequestPayload = {
    idPartida: Number.parseInt(String(idPartida), 10)
  };

  if (!Number.isFinite(payload.idPartida)) {
    throw new Error('idPartida inválido para consulta do ranking');
  }

  const response = await fetch(RANKING_URL, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const rawText = await response.text();

  if (!response.ok) {
    try {
      parseRankingResponse(rawText);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
    }

    throw new Error(`Falha ao buscar ranking: HTTP ${response.status}`);
  }

  return parseRankingResponse(rawText);
};

const rankingService = {
  buscarRanking
};

export default rankingService;
