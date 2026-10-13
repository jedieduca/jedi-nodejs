import { render, screen } from '@testing-library/react';
import VictoryPanel from './VictoryPanel';
import { RankingEntry, RankingTipo } from '../types/ranking';

const entry = (overrides: Partial<RankingEntry>): RankingEntry => ({
  idPartida: 1,
  nome: 'maria',
  jogador: 'Maria',
  pontuacao: 101000,
  percentualAcertos: 100,
  tempoGasto: 300,
  totalPartidas: 1,
  posicao: 1,
  autoAvaliacao: '',
  avaliacaoJogo: '',
  nomeCurto: 'Maria F.',
  escola: 'Alm. Tamandaré',
  turma: 'DS 315',
  ...overrides
});

const renderPanel = (rankingTipo: RankingTipo, entries: RankingEntry[]) => render(
  <VictoryPanel
    open
    rankingStatus="success"
    rankingTopEntries={entries}
    rankingCurrentPlayerEntry={null}
    rankingErrorMessage={null}
    rankingTipo={rankingTipo}
    onRankingTipoChange={() => {}}
    onRestart={() => {}}
  />
);

describe('VictoryPanel - identificação do jogador no ranking', () => {
  it('no Global mostra nome curto, turma, apelido e escola', () => {
    renderPanel('global', [entry({})]);

    expect(screen.getByText('Maria F.')).toBeInTheDocument();
    expect(screen.getByText('DS 315')).toBeInTheDocument();
    expect(screen.getByText('“maria” · Alm. Tamandaré')).toBeInTheDocument();
  });

  it('na Escola esconde a escola e mantém a turma', () => {
    renderPanel('escola', [entry({})]);

    expect(screen.getByText('DS 315')).toBeInTheDocument();
    expect(screen.getByText('“maria”')).toBeInTheDocument();
    expect(screen.queryByText(/Alm\. Tamandaré/)).not.toBeInTheDocument();
  });

  it('na Turma esconde escola e turma', () => {
    renderPanel('turma', [entry({})]);

    expect(screen.queryByText('DS 315')).not.toBeInTheDocument();
    expect(screen.queryByText(/Alm\. Tamandaré/)).not.toBeInTheDocument();
    expect(screen.getByText('“maria”')).toBeInTheDocument();
  });

  it('sem cadastro usa o apelido como nome e, sem apelido, o avatar', () => {
    renderPanel('global', [
      entry({ nomeCurto: '', nome: 'RafaGamer', escola: '', turma: '' }),
      entry({ nomeCurto: '', nome: '', jogador: 'Thiago', escola: '', turma: '', posicao: 2 })
    ]);

    expect(screen.getByText('RafaGamer')).toBeInTheDocument();
    expect(screen.queryByText('“RafaGamer”')).not.toBeInTheDocument();
    expect(screen.getByText('Thiago')).toBeInTheDocument();
  });
});
