import React, { useEffect, useMemo, useRef, useState } from 'react';
import './VictoryPanel.css';
import { RankingEntry, VictoryRankingStatus } from '../types/ranking';

const RANKING_DESIGN_WIDTH = 620;
const RANKING_DESIGN_HEIGHT = 700;

interface VictoryPanelProps {
  open: boolean;
  rankingStatus: VictoryRankingStatus;
  rankingTopEntries: RankingEntry[];
  rankingCurrentPlayerEntry: RankingEntry | null;
  rankingErrorMessage: string | null;
  onRestart: () => void;
}

interface VictoryAvatarProps {
  avatarSrc: string;
  playerName: string;
  onPreviewStart: (avatarSrc: string, playerName: string) => void;
  onPreviewEnd: () => void;
}
/*
const AVATAR_OPTIONS = [
  '/assets/sprites/avatar-jedi-caio.png',
  '/assets/sprites/avatar-jedi-julia.png',
  '/assets/sprites/avatar-jedi-thiago.png',
  '/assets/sprites/avatar-jedi-maria.png',
  '/assets/sprites/avatar-jedi-larissa.png',
  '/assets/sprites/avatar-jedi-joao.png'
];
*/

const formatPosition = (position: number): string => `${position}º`;

const formatScore = (score: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0
  }).format(score);
};





const getEntryKey = (entry: RankingEntry, index: number): string => {
  return `${entry.posicao}-${entry.jogador}-${index}`;
};

const removeAccents = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

const getAvatarSrc = (entry: RankingEntry): string => {
  return `/assets/sprites/avatar-jedi-${removeAccents(entry.jogador)}.png`;
};


const isSameRankingEntry = (left: RankingEntry, right: RankingEntry): boolean => {
  return (
    left.jogador === right.jogador &&
    left.posicao === right.posicao &&
    left.pontuacao === right.pontuacao
  );
};

const VictoryAvatar: React.FC<VictoryAvatarProps> = ({
  avatarSrc,
  playerName,
  onPreviewStart,
  onPreviewEnd
}) => {
  return (
    <div className="victory-ranking-avatar-wrap">
      <button
        aria-label={`Ver avatar ampliado de ${playerName}`}
        className="victory-ranking-avatar-button"
        onBlur={onPreviewEnd}
        onFocus={() => onPreviewStart(avatarSrc, playerName)}
        onMouseEnter={() => onPreviewStart(avatarSrc, playerName)}
        onMouseLeave={onPreviewEnd}
        type="button"
      >
        <img
          alt={`Avatar de ${playerName}`}
          className="victory-ranking-avatar"
          src={avatarSrc}
        />
      </button>
    </div>
  );
};

const VictoryPanel: React.FC<VictoryPanelProps> = ({
  open,
  rankingStatus,
  rankingTopEntries,
  rankingCurrentPlayerEntry,
  rankingErrorMessage,
  onRestart
}) => {
  const [activeAvatarPreview, setActiveAvatarPreview] = useState<{ src: string; playerName: string } | null>(null);
  const [rankingScale, setRankingScale] = useState(1);
  const rankingScaleShellRef = useRef<HTMLDivElement | null>(null);

  const displayedTopEntries = useMemo(() => {
    return rankingTopEntries.slice(0, 10);
  }, [rankingTopEntries]);

  const placeholderRowCount = Math.max(0, 10 - displayedTopEntries.length);

  const handlePreviewStart = (avatarSrc: string, playerName: string) => {
    setActiveAvatarPreview({ src: avatarSrc, playerName });
  };

  const handlePreviewEnd = () => {
    setActiveAvatarPreview(null);
  };

  useEffect(() => {
    const shellElement = rankingScaleShellRef.current;

    if (!shellElement) {
      return;
    }

    const updateScale = () => {
      const nextScale = Math.min(
        shellElement.clientWidth / RANKING_DESIGN_WIDTH,
        shellElement.clientHeight / RANKING_DESIGN_HEIGHT,
        1
      );

      setRankingScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    updateScale();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }

    const resizeObserver = new ResizeObserver(() => {
      updateScale();
    });

    resizeObserver.observe(shellElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const performanceMessage = useMemo(() => {    
    const redBold = 'style="color: var(--jedi-pink); font-size: 1.5rem; font-weight: bold;"';
    const normalText = 'style="font-size: 1.5rem; font-weight: normal;"';

    if (rankingCurrentPlayerEntry?.autoAvaliacao === rankingCurrentPlayerEntry?.avaliacaoJogo) {
      return `<p ${normalText}>Você se avaliou da mesma forma que o jogo: <br/><strong>${rankingCurrentPlayerEntry?.autoAvaliacao || ''}</strong></p>`;
    }

    return `<p ${normalText}>Você se avaliou como <strong ${redBold}>${rankingCurrentPlayerEntry?.autoAvaliacao || ''}</strong> 
    <br/> e o jogo avaliou você como <strong ${redBold}>${rankingCurrentPlayerEntry?.avaliacaoJogo || ''}</strong></p>`;
  }, [rankingCurrentPlayerEntry]);

  return (
    <div
      aria-hidden={!open}
      className="victory-panel-shell"
      style={{ visibility: open ? 'visible' : 'hidden' }}
    >
      <div className="victory-panel-card">
        <section className="victory-panel-left">
          <div className="victory-panel-image-wrap">
            <img
              src="/tiabel-trofeu-1024.png"
              alt="tIA Bel com troféu"
              className="victory-panel-image"
            />
          </div>
          <h1 className="victory-panel-title">Parabéns!!!</h1>
          <button
            className="victory-panel-restart-button"
            onClick={onRestart}
            type="button"
          >
            🔄 Reiniciar
          </button>
          <section style={{ margin: '15px 0' }} className="victory-panel-subtitle">
            <div dangerouslySetInnerHTML={{ __html: performanceMessage }} />
          </section>

          <div className="victory-panel-ranking-type">
            <label htmlFor="ranking-type-global">
              <input type="radio" id="ranking-type-global" name="ranking-type" value="global" checked />
              Global
            </label>
            <label htmlFor="ranking-type-school">
              <input type="radio" id="ranking-type-school" name="ranking-type" value="school" />
              Escola
            </label>
            <label htmlFor="ranking-type-class">
              <input type="radio" id="ranking-type-class" name="ranking-type" value="class" />
              Turma
            </label>
          </div>
        </section>

        <section className="victory-ranking">
          <div className="victory-ranking-scale-shell" ref={rankingScaleShellRef}>
            <div
              className="victory-ranking-scale-stage"
              style={{
                transform: `translate(-50%, -50%) scale(${rankingScale})`
              }}
            >
              <header className="victory-ranking-header">
                <h2 className="victory-ranking-title">
                  <span className="victory-ranking-title-icon">🏆</span>
                  Ranking da Sagacidade
                </h2>
                <div className="victory-ranking-accent" />
              </header>

              <div className="victory-ranking-board">
                <div className="victory-ranking-grid victory-ranking-head">
                  <div className="victory-ranking-cell-center">Pos.</div>
                  <div className="victory-ranking-cell-center">Avatar</div>
                  <div>Nome</div>
                  <div className="victory-ranking-cell-score">Pontuação</div>
                </div>

                {rankingStatus === 'loading' || rankingStatus === 'idle' ? (
                  <div className="victory-ranking-loading">
                    <div className="victory-ranking-loading-text">Calculando o ranking da partida...</div>
                    <div className="victory-ranking-loading-orbs" aria-hidden="true">
                      <span className="victory-ranking-loading-orb" />
                      <span className="victory-ranking-loading-orb" />
                      <span className="victory-ranking-loading-orb" />
                    </div>
                    <div className="victory-ranking-loading-skeleton" aria-hidden="true">
                      <div className="victory-ranking-loading-row" />
                      <div className="victory-ranking-loading-row" />
                      <div className="victory-ranking-loading-row" />
                      <div className="victory-ranking-loading-row" />
                    </div>
                  </div>
                ) : rankingStatus === 'error' ? (
                  <div className="victory-ranking-error">
                    <h3 className="victory-ranking-error-title">Ranking indisponível no momento</h3>
                    <p className="victory-ranking-error-text">
                      Não foi possível carregar o ranking desta partida.
                    </p>
                    {rankingErrorMessage ? (
                      <p className="victory-ranking-error-text">{rankingErrorMessage}</p>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="victory-ranking-body">
                      {displayedTopEntries.map((entry, index) => {
                        const entryKey = getEntryKey(entry, index);
                        const avatarSrc = getAvatarSrc(entry);
                        const isTopThree = entry.posicao <= 3;
                        const isCurrentPlayerDuplicate = rankingCurrentPlayerEntry
                          ? isSameRankingEntry(entry, rankingCurrentPlayerEntry)
                          : false;

                        return (
                          <div
                            className={`victory-ranking-grid victory-ranking-row${isTopThree ? ' is-top-three' : ''}${isCurrentPlayerDuplicate ? ' is-current-player-duplicate' : ''}`}
                            key={entryKey}
                          >
                            <div className="victory-ranking-cell-center victory-ranking-position">
                              {formatPosition(entry.posicao)}
                            </div>
                            <VictoryAvatar
                              avatarSrc={avatarSrc}
                              playerName={entry.jogador}
                              onPreviewStart={handlePreviewStart}
                              onPreviewEnd={handlePreviewEnd}
                            />
                            <div className="victory-ranking-name" title={entry.nome}>
                              {entry.nome} [ {entry.jogador} ]
                              {isCurrentPlayerDuplicate ? (
                                <span className="victory-ranking-player-label">(você)</span>
                              ) : null}
                            </div>
                            <div className="victory-ranking-cell-score">
                              {formatScore(entry.pontuacao)}
                            </div>
                          </div>
                        );
                      })}

                      {Array.from({ length: placeholderRowCount }).map((_, index) => (
                        <div
                          className="victory-ranking-grid victory-ranking-row is-placeholder"
                          key={`placeholder-${index}`}
                        >
                          <div className="victory-ranking-cell-center victory-ranking-position">-</div>
                          <div className="victory-ranking-avatar-wrap">
                            <div className="victory-ranking-avatar" />
                          </div>
                          <div className="victory-ranking-name">Aguardando mais recordistas...</div>
                          <div className="victory-ranking-cell-score">-</div>
                        </div>
                      ))}
                    </div>

                    {rankingCurrentPlayerEntry ? (
                      <div className="victory-ranking-grid victory-ranking-player-row">
                        <div className="victory-ranking-cell-center victory-ranking-position">
                          {formatPosition(rankingCurrentPlayerEntry.posicao)}
                        </div>
                        <VictoryAvatar
                          avatarSrc={ getAvatarSrc(rankingCurrentPlayerEntry) || '' }
                          playerName={rankingCurrentPlayerEntry.nome || ''}
                          onPreviewStart={handlePreviewStart}
                          onPreviewEnd={handlePreviewEnd}
                        />
                        <div className="victory-ranking-name" title={rankingCurrentPlayerEntry.jogador}>
                          {(rankingCurrentPlayerEntry.nome || '') +` [ ${rankingCurrentPlayerEntry.jogador} ]`}
                        </div>
                        <div className="victory-ranking-cell-score">
                          {formatScore(rankingCurrentPlayerEntry.pontuacao)}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <div
          aria-hidden={activeAvatarPreview === null}
          className={`victory-panel-avatar-overlay${activeAvatarPreview ? ' is-visible' : ''}`}
        >
          <div className="victory-panel-avatar-overlay-backdrop" />
          <div className="victory-panel-avatar-overlay-content">
            <div className="victory-panel-avatar-overlay-card">
              {activeAvatarPreview ? (
                <img
                  alt={`Avatar ampliado de ${activeAvatarPreview.playerName}`}
                  className="victory-panel-avatar-overlay-image"
                  src={activeAvatarPreview.src}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VictoryPanel;
