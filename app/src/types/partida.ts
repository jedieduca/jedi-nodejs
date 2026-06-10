export type AutoAvaliacaoResumo = 'Proplayer' | 'Avançado' | 'Casual' | 'Iniciante' | 'Noob';

export type AvatarResumo = 'Maria' | 'Caio' | 'Thiago' | 'João' | 'Júlia' | 'Larissa';

export interface ResumoPartidaJogada {
  jogadaId: number;
  noticiaId: number;
  avaliacaoCorreta: boolean;
  tempoResposta: number;
  posicaoAvatar: number;
}

export interface ResumoPartida {
  id: string;
  nome: string;
  idade: number;
  tempoGasto: number;
  jogadorEmail: string;
  dataHoraInicio: string;
  autoAvaliacao: AutoAvaliacaoResumo;
  avatar: AvatarResumo;
  jogadas: ResumoPartidaJogada[];
}
