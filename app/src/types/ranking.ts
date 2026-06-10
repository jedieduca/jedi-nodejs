export interface RankingRequestPayload {
  idPartida: number;
}

export interface RankingApiEntryRaw {
  idPartida: number;
  nome: string;
  jogador: string;
  pontuacao: string | number;
  percentualAcertos: string | number;
  tempoGasto: string | number;
  totalPartidas: string | number;
  posicao: string | number;
  autoAvaliacao: string;
  avaliacaoJogo: string;  
}

export interface RankingApiError {
  erro: string;
}

export interface RankingEntry {
  idPartida: number;
  nome: string | undefined;
  jogador: string;
  pontuacao: number;
  percentualAcertos: number;
  tempoGasto: number;
  totalPartidas: number;
  posicao: number;
  autoAvaliacao: string;
  avaliacaoJogo: string;
}

export type VictoryRankingStatus = 'idle' | 'loading' | 'success' | 'error';
