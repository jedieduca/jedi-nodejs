import React, { useEffect, useMemo, useRef, useState } from 'react';
import './VictoryPanel.css';
import { RankingEntry, RankingTipo, VictoryRankingStatus } from '../types/ranking';

const RANKING_DESIGN_WIDTH = 620;
const RANKING_DESIGN_HEIGHT = 700;

interface VictoryPanelProps {
  open: boolean;
  rankingStatus: VictoryRankingStatus;
  rankingTopEntries: RankingEntry[];
  rankingCurrentPlayerEntry: RankingEntry | null;
  rankingErrorMessage: string | null;
  rankingTipo: RankingTipo;
  onRankingTipoChange: (tipo: RankingTipo) => void;
  onRestart: () => void;
}

const RANKING_TIPO_OPTIONS: { value: RankingTipo; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'escola', label: 'Escola' },
  { value: 'turma', label: 'Turma' }
];

interface VictoryAvatarProps {
  avatarName: string;
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

const AVATAR_BASE_PATH = `${process.env.PUBLIC_URL ?? ''}/assets/sprites/avatar-jedi-`;

// Imagem original (752x926, ~600 KB): usada só na prévia ampliada
const getAvatarSrc = (avatarName: string): string => {
  return `${AVATAR_BASE_PATH}${removeAccents(avatarName)}.png`;
};

// Miniatura (120x148, ~30 KB): usada nas linhas do ranking
const getAvatarThumbSrc = (avatarName: string): string => {
  return `${AVATAR_BASE_PATH}${removeAccents(avatarName)}-mini.png`;
};


// Nome exibido: primeiro nome + inicial do cadastro; sem cadastro, o apelido; sem apelido, o avatar
const getDisplayName = (entry: RankingEntry): string => {
  return entry.nomeCurto || entry.nome?.trim() || entry.jogador;
};

interface RankingPlayerNameProps {
  entry: RankingEntry;
  rankingTipo: RankingTipo;
  isCurrentPlayer?: boolean;
}

// Linha 1: nome + etiqueta da turma; linha 2: apelido · escola.
// A escola só aparece no ranking Global e a turma some no ranking da Turma (seriam iguais para todos).
const RankingPlayerName: React.FC<RankingPlayerNameProps> = ({ entry, rankingTipo, isCurrentPlayer = false }) => {
  const displayName = getDisplayName(entry);
  const apelido = entry.nomeCurto ? entry.nome?.trim() ?? '' : '';
  const turma = rankingTipo !== 'turma' ? entry.turma : '';
  const escola = rankingTipo === 'global' ? entry.escola : '';
  const subParts = [apelido ? `“${apelido}”` : '', escola].filter(Boolean);
  const title = [displayName, turma, apelido, escola].filter(Boolean).join(' · ');

  return (
    <div className="victory-ranking-name" title={title}>
      <span className="victory-ranking-name-main">
        <span className="victory-ranking-name-text">{displayName}</span>
        {turma ? <span className="victory-ranking-turma">{turma}</span> : null}
        {isCurrentPlayer ? <span className="victory-ranking-player-label">(você)</span> : null}
      </span>
      {subParts.length > 0 ? (
        <span className="victory-ranking-name-sub">{subParts.join(' · ')}</span>
      ) : null}
    </div>
  );
};

const isSameRankingEntry = (left: RankingEntry, right: RankingEntry): boolean => {
  return (
    left.jogador === right.jogador &&
    left.posicao === right.posicao &&
    left.pontuacao === right.pontuacao
  );
};

const VictoryAvatar: React.FC<VictoryAvatarProps> = ({
  avatarName,
  playerName,
  onPreviewStart,
  onPreviewEnd
}) => {
  const thumbSrc = getAvatarThumbSrc(avatarName);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  // Avatar ausente ou que não carregou: mostra a inicial no lugar da imagem, sem prévia ampliada
  if (!avatarName.trim() || failedSrc === thumbSrc) {
    return (
      <div className="victory-ranking-avatar-wrap">
        <span
          aria-label={`Avatar de ${playerName}`}
          className="victory-ranking-avatar victory-ranking-avatar-fallback"
          role="img"
        >
          {avatarName.trim().charAt(0).toUpperCase() || '?'}
        </span>
      </div>
    );
  }

  const avatarSrc = getAvatarSrc(avatarName);

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
          src={thumbSrc}
          onError={() => setFailedSrc(thumbSrc)}
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
  rankingTipo,
  onRankingTipoChange,
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

    const autoAvaliacao = rankingCurrentPlayerEntry?.autoAvaliacao || '';
    const avaliacaoJogo = rankingCurrentPlayerEntry?.avaliacaoJogo || '';
    // Destaca em vermelho apenas quando as avaliações divergem
    const valueStyle = autoAvaliacao === avaliacaoJogo ? '' : redBold;

    return `<p ${normalText}>Você se avaliou como: <strong ${valueStyle}>${autoAvaliacao}</strong>
    <br/>Você foi avaliado pelo JEDI como: <strong ${valueStyle}>${avaliacaoJogo}</strong></p>`;
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
            🔄 Reiniciar/Sair
          </button>
          <section style={{ margin: '15px 0' }} className="victory-panel-subtitle">
            <div dangerouslySetInnerHTML={{ __html: performanceMessage }} />
          </section>

          <div className="victory-panel-ranking-type">
            {RANKING_TIPO_OPTIONS.map(({ value, label }) => (
              <label htmlFor={`ranking-type-${value}`} key={value}>
                <input
                  type="radio"
                  id={`ranking-type-${value}`}
                  name="ranking-type"
                  value={value}
                  checked={rankingTipo === value}
                  disabled={rankingStatus === 'loading' || rankingStatus === 'idle'}
                  onChange={() => onRankingTipoChange(value)}
                />
                {label}
              </label>
            ))}
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
                              avatarName={entry.jogador}
                              playerName={getDisplayName(entry)}
                              onPreviewStart={handlePreviewStart}
                              onPreviewEnd={handlePreviewEnd}
                            />
                            <RankingPlayerName
                              entry={entry}
                              rankingTipo={rankingTipo}
                              isCurrentPlayer={isCurrentPlayerDuplicate}
                            />
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
                          avatarName={rankingCurrentPlayerEntry.jogador}
                          playerName={getDisplayName(rankingCurrentPlayerEntry)}
                          onPreviewStart={handlePreviewStart}
                          onPreviewEnd={handlePreviewEnd}
                        />
                        <RankingPlayerName entry={rankingCurrentPlayerEntry} rankingTipo={rankingTipo} />
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
                  onError={handlePreviewEnd}
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
