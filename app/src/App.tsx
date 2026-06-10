import React, { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo, useReducer } from 'react';
import './App.css';
import Dice from './components/Dice';
import PlayerComponent from './components/Player';
import IsometricBoard, { IsometricBoardRef } from './components/IsometricBoard';
import { useDynamicZoom } from './hooks/useDynamicZoom';
//import MobileControls from './components/MobileControls';
import { Player, Position, ScreenPosition, Direction, WALKING_PACE_DURATION } from './classes/Player';
import { useResponsive } from './utils/responsive';
import useNews from './hooks/useNews';
// Removido useGameResponsive para implementação mais simples
import { News } from './types/news';
//import apiService from './services/api';
//import { Rules } from './types/rule';
//import { ChatMessage } from './types/llm';
//import llmService from './services/llmService';
import speechService from './services/speechService';
//import { defaultModel } from './config/llmModels';
//import ModelSelector from './components/ModelSelector';
import { PlayersProvider, usePlayers } from './contexts/PlayersContext';
import CharacterSelection from './components/CharacterSelection';
//import TurnIndicator from './components/TurnIndicator';
// import MultiPlayerComponent from './components/MultiPlayerComponent'; // Não usado mais - players renderizados diretamente
import { availableCharacters } from './config/characters';
import PortraitWarning from './components/PortraitWarning';
import { useOrientationDetection } from './hooks/useOrientationDetection';
import FullscreenButton from './components/FullscreenButton';
import { useFullscreen } from './hooks/useFullscreen';
import { usePerfDiagnostics } from './hooks/usePerfDiagnostics';
import { logPerfEvent, startPerfTimer } from './utils/perfDiagnostics';
import useSpriteLoading from './hooks/useSpriteLoading';
//import { noticiasJson } from './config/noticiasJson';
import { getFullVersionInfo, getSimpleVersion } from './config/version';
import { GamePreferences } from './types/preferences';
import { clampCameraDistanceFactor, getDefaultCameraDistanceFactor } from './config/camera';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import partidaService from './services/partidaService';
import { ResumoPartida, ResumoPartidaJogada } from './types/partida';
import rankingService from './services/rankingService';
import { RankingEntry, VictoryRankingStatus } from './types/ranking';
import VictoryPanel from './components/VictoryPanel';
import { getHelpContentByType } from './config/helpTexts';

// MODIFICAÇÃO: Estados de zoom removidos (AguardandoZoomIn, AnimacaoZoomIn, AguardandoZoomOut, AnimacaoZoomOut)
// Fluxo simplificado: AnimacaoDado -> AguardandoCaminhada -> AnimacaoCaminhada -> AguardandoProximaNoticia -> AguardandoNoticia1
type GameStateName =
  | 'AguardandoSelecao'
  | 'AguardandoProximaNoticia'
  | 'AguardandoNoticia1'
  | 'AvaliacaoNoticia'
  | 'FecharExplicacao'
  | 'LancamentoDado'
  | 'AnimacaoDado'
  | 'AguardandoCaminhada'
  | 'AnimacaoCaminhada'
  | 'AguardandoFinalPartida';

// Interface para estado das animações dos macacos
interface MonkeyState {
  animationIndex: number;  // 0-3: índice da animação
  isFlipped: boolean;      // true/false: espelhamento horizontal
}

// MODIFICAÇÃO: Eventos de zoom removidos
type GameEvent =
  | { type: 'INICIAR_JOGO' }
  | { type: 'PROXIMA_NOTICIA' }
  | { type: 'NEWS_TIMEOUT' }
  | { type: 'AVALIACAO_CORRETA' }
  | { type: 'AVALIACAO_INCORRETA' }
  | { type: 'FECHAR_EXPLICACAO' }
  | { type: 'DADO_CLICADO' }
  | { type: 'DADO_ANIMACAO_FIM' }
  | { type: 'CAMINHADA_TIMEOUT' }
  | { type: 'CAMINHADA_ANIMACAO_FIM' }
  | { type: 'FINAL_PARTIDA' };

// MODIFICAÇÃO: Labels de zoom removidos
const GAME_STATE_LABELS: Record<GameStateName, string> = {
  AguardandoSelecao: 'Aguardando seleção de personagens',
  AguardandoProximaNoticia: 'Aguardando confirmação para próxima notícia',
  AguardandoFinalPartida: 'Aguardando final da partida',
  AguardandoNoticia1: 'Aguardando 1 segundo para a notícia',
  AvaliacaoNoticia: 'Aguardando avaliação de notícia',
  FecharExplicacao: 'Aguardando fechar explicação',
  LancamentoDado: 'Aguardando lançamento do dado',
  AnimacaoDado: 'Aguardando final da animação do Dado',
  AguardandoCaminhada: 'Aguardando 1 segundo para caminhada',
  AnimacaoCaminhada: 'Aguardando final da animação do Player (caminhada)'
};

const BOARD_POSITIONS = [
  {position_id: 0, screen_position: { x: 20, y: 12 }, direction: Direction.DOWN },
  {position_id: 1, screen_position: { x: 20, y: 16 }, direction: Direction.DOWN },
  {position_id: 2, screen_position: { x: 20, y: 20 }, direction: Direction.DOWN },
  {position_id: 3, screen_position: { x: 21, y: 23 }, direction: Direction.RIGHT },
  {position_id: 4, screen_position: { x: 25, y: 23 }, direction: Direction.RIGHT },
  {position_id: 5, screen_position: { x: 29, y: 23 }, direction: Direction.RIGHT },
  {position_id: 6, screen_position: { x: 33, y: 23 }, direction: Direction.RIGHT },
  {position_id: 7, screen_position: { x: 36, y: 24 }, direction: Direction.DOWN },
  {position_id: 8, screen_position: { x: 36, y: 28 }, direction: Direction.DOWN },
  {position_id: 9, screen_position: { x: 36, y: 32 }, direction: Direction.DOWN },
  {position_id: 10, screen_position: { x: 36, y: 36 }, direction: Direction.DOWN },
  {position_id: 11, screen_position: { x: 36, y: 40 }, direction: Direction.DOWN },
  {position_id: 12, screen_position: { x: 36, y: 44 }, direction: Direction.DOWN },
  {position_id: 13, screen_position: { x: 33, y: 45 }, direction: Direction.LEFT },
  {position_id: 14, screen_position: { x: 29, y: 45 }, direction: Direction.LEFT },
  {position_id: 15, screen_position: { x: 25, y: 45 }, direction: Direction.LEFT },
  {position_id: 16, screen_position: { x: 21, y: 45 }, direction: Direction.LEFT },
  {position_id: 17, screen_position: { x: 17, y: 45 }, direction: Direction.LEFT },
  {position_id: 18, screen_position: { x: 13, y: 45 }, direction: Direction.LEFT },
  {position_id: 19, screen_position: { x: 9, y: 45 }, direction: Direction.LEFT },
  {position_id: 20, screen_position: { x: 5, y: 45 }, direction: Direction.LEFT },
  {position_id: 21, screen_position: { x: 2, y: 44 }, direction: Direction.UP },
  {position_id: 22, screen_position: { x: 2, y: 40 }, direction: Direction.UP },
  {position_id: 23, screen_position: { x: 2, y: 36 }, direction: Direction.UP },
  {position_id: 24, screen_position: { x: 2, y: 32 }, direction: Direction.UP },
  {position_id: 25, screen_position: { x: 3, y: 29 }, direction: Direction.RIGHT },
  {position_id: 26, screen_position: { x: 7, y: 29 }, direction: Direction.RIGHT },
  {position_id: 27, screen_position: { x: 11, y: 29 }, direction: Direction.RIGHT },
  {position_id: 28, screen_position: { x: 15, y: 29 }, direction: Direction.RIGHT },
  {position_id: 29, screen_position: { x: 16, y: 26 }, direction: Direction.UP },
  {position_id: 30, screen_position: { x: 16, y: 22 }, direction: Direction.UP },
  {position_id: 31, screen_position: { x: 16, y: 18 }, direction: Direction.UP },
  {position_id: 32, screen_position: { x: 16, y: 14 }, direction: Direction.UP }
];

const getPositionId = (tilePosition: Position): number => {
  return BOARD_POSITIONS.find(
    position => tilePosition.x === position.screen_position.x && 
    tilePosition.y === position.screen_position.y)?.position_id ?? -1;
};

const predictLandingPill = (currentPosition: Position, diceValue: number): number | null => {
  const currentId = getPositionId(currentPosition);
  if (currentId === -1) return null;
  const targetId = currentId + diceValue;
  if (targetId < 0 || targetId >= BOARD_POSITIONS.length) return null;
  const targetPos = BOARD_POSITIONS[targetId].screen_position;
  const matched = pills.find(
    pill => pill.TilePosition.x === targetPos.x && pill.TilePosition.y === targetPos.y
  );
  return matched?.id ?? null;
};

const SKATE_TRIGGER_TILE: Position = { x: 36, y: 44 };
const SKATE_PARK_POSITION: Position = { x: 33, y: 43 };
const SKATE_FLIGHT_DESTINATION: Position = { x: 3, y: 43 };
const PLAYER_FINAL_DESTINATION: Position = { x: 2, y: 44 };
const SINGLE_PLAYER_ID = 'single-player';

// === PORTAL DE DESMATERIALIZAÇÃO (CASTIGO) ===
const PORTAL_TRIGGER_TILE: Position = { x: 2, y: 36 };
const PORTAL_DESTINATION_TILE: Position = { x: 9, y: 45 };
// Posição simulada de onde o jogador "veio" (para evitar voltar nessa direção)
// Como a direção final é 'left', simulamos que veio da direita (x+1)
const PORTAL_SIMULATED_FROM_TILE: Position = { x: 10, y: 45 };
const DEMATERIALIZATION_DURATION = 4000;
const REMATERIALIZATION_DURATION = 4000;
const PORTAL_HIT_THRESHOLD = 0.90; // < 90% ativa o castigo

const shift0 = Math.floor(Math.random() * 2) * 8;
const shift1 = Math.floor(Math.random() * 2) * 8;
const shift2 = Math.floor(Math.random() * 2) * 8;
const pills = [
  { id: 0,
    TilePosition: { x: 36, y: 28 + shift0 },
    ScreenPosition: { x: 36-2, 
                      y: 28 + shift0-1 }, 
    zIndex: 450 },
  { id: 1, 
    TilePosition: { x: 3 + shift1, y: 29 },
    ScreenPosition: { x: 3 + shift1, 
                      y: 29}, 
    zIndex: 1550 },
  { id: 2, 
    TilePosition: { x: 13 + shift2, y: 45 },
    ScreenPosition: { x: 13 + shift2, 
                      y: 45 }, 
    zIndex: 1550 }   
];

let diceValueDebug = 0;

const easeInOutCubic = (t: number): number => (
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
);

const MAX_RANKING_ENTRIES = 10;

const SKATE_JUMP_DURATION = 500;
const SKATE_FLIGHT_DURATION = 5000;
const PLAYER_LAND_DURATION = 500;
const SKATE_RETURN_DURATION = 5000;
const DEFAULT_VOICE: string | null = null;
const DEFAULT_RATE = 1.2;
const DEFAULT_PITCH = 1;
const DEFAULT_VOLUME = 1;
const PREFERENCES_STORAGE_KEY = 'peterweb:game-preferences';
const defaultGamePreferences: GamePreferences = {
  walkingPaceDuration: WALKING_PACE_DURATION,
  movementSpeedMultiplier: 1.0,
  narrationVoice: DEFAULT_VOICE,
  narrationRate: DEFAULT_RATE,
  narrationPitch: DEFAULT_PITCH,
  narrationVolume: DEFAULT_VOLUME,
  cameraDistanceFactor: getDefaultCameraDistanceFactor()
};


// MODIFICAÇÃO: FSM simplificada sem estados de zoom
// Fluxo: AnimacaoDado -> AguardandoCaminhada -> AnimacaoCaminhada -> AguardandoProximaNoticia -> AguardandoNoticia1
const gameStateReducer = (state: GameStateName, event: GameEvent): GameStateName => {
  let nextState: GameStateName = state;

  switch (state) {
    case 'AguardandoSelecao':
      if (event.type === 'INICIAR_JOGO') {
        nextState = 'AguardandoProximaNoticia';
      }
      break;
    case 'AguardandoProximaNoticia':
      if (event.type === 'PROXIMA_NOTICIA') {
        nextState = 'AguardandoNoticia1';
      }
      break;
    case 'AguardandoNoticia1':
      if (event.type === 'NEWS_TIMEOUT') {
        nextState = 'AvaliacaoNoticia';
      }
      break;
    case 'AvaliacaoNoticia':
      if (event.type === 'AVALIACAO_CORRETA') {
        nextState = 'LancamentoDado';
      } else if (event.type === 'AVALIACAO_INCORRETA') {
        nextState = 'FecharExplicacao';
      }
      break;
    case 'FecharExplicacao':
      if (event.type === 'FECHAR_EXPLICACAO') {
        nextState = 'AguardandoProximaNoticia';
      }
      break;
    case 'LancamentoDado':
      if (event.type === 'DADO_CLICADO') {
        nextState = 'AnimacaoDado';
      }
      break;
    case 'AnimacaoDado':
      // MODIFICAÇÃO: Vai direto para AguardandoCaminhada (sem zoom in)
      if (event.type === 'DADO_ANIMACAO_FIM') {
        nextState = 'AguardandoCaminhada';
      }
      break;
    case 'AguardandoCaminhada':
      if (event.type === 'CAMINHADA_TIMEOUT') {
        nextState = 'AnimacaoCaminhada';
      }
      break;
    case 'AnimacaoCaminhada':
      // MODIFICAÇÃO: Vai direto para AguardandoProximaNoticia (sem zoom out)
      if (event.type === 'CAMINHADA_ANIMACAO_FIM') {
        nextState = 'AguardandoProximaNoticia';
      }
      break;
    default:
      nextState = state;
  }

  if (nextState !== state) {
    console.log(`[FSM] ${GAME_STATE_LABELS[state]} --${event.type}--> ${GAME_STATE_LABELS[nextState]}`);
  }

  return nextState;
};

interface Tile {
  type: string;
  x: number;
  y: number;
  walkable: boolean;
}

const PLAYER_LEVEL_TO_AUTO_AVALIACAO: Record<string, ResumoPartida['autoAvaliacao']> = {
  proplayer: 'Proplayer',
  avancado: 'Avançado',
  casual: 'Casual',
  iniciante: 'Iniciante',
  noob: 'Noob'
};

const PLAYER_ID_TO_AVATAR: Record<string, ResumoPartida['avatar']> = {
  maria: 'Maria',
  caio: 'Caio',
  thiago: 'Thiago',
  joao: 'João',
  julia: 'Júlia',
  larissa: 'Larissa'
};

const getAuthenticatedPlayerEmail = (): string => {
  if (typeof window === 'undefined') {
    return 'nao-informado@local';
  }

  const directEmail = window.localStorage.getItem('userEmail');
  if (directEmail && directEmail.includes('@')) {
    return directEmail;
  }

  const rawUser = window.localStorage.getItem('user');
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser) as { email?: string };
      if (parsed?.email && parsed.email.includes('@')) {
        return parsed.email;
      }
    } catch {
      // Ignorar dados malformados no storage
    }
  }

  return 'nao-informado@local';
};

const preloadImages = async (urls: (string | null | undefined)[]) => {
  const unique = Array.from(new Set(urls.filter(Boolean) as string[]));
  await Promise.all(unique.map(async (src) => {
    try {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
        if (img.decode) {
          img.decode().then(() => resolve()).catch(() => resolve());
        }
      });
    } catch {
      // Ignorar falhas de decode; não bloqueia UI
    }
  }));
};

// Constante de aceleração do dado - multiplica o número de passos
const ACELERACAO_DADO = 4;

const pillAudio = new Audio('/assets/sons/magic4c.mp3');
const portalAudio = new Audio('/assets/sons/fantasy.mp3');
const skateAudio = new Audio('/assets/sons/skate7a.mp3');


const FAKE_RETURNED_RANKING_DATA = [
  {
    idPartida: 15,
    jogador: "Marcos",
    pontuacao: 127000,
    percentualAcertos: 100.0000,
    tempoGasto: 57.3413,
    totalPartidas: 1,
    posicao: 1
  },
  {
    idPartida: 14,
    jogador: "Rafael",
    pontuacao: 119000,
    percentualAcertos: 100.0000,
    tempoGasto: 177.404,
    totalPartidas: 1,
    posicao: 2
  },
  {
    idPartida: 13,
    jogador: "Liz",
    pontuacao: 109000,
    percentualAcertos: 100.0000,
    tempoGasto: 78.3418,
    totalPartidas: 1,
    posicao: 3
  },
  {
    idPartida: 12,
    jogador: "Renato",
    pontuacao: 108000,
    percentualAcertos: 100.0000,
    tempoGasto: 46.8211,
    totalPartidas: 1,
    posicao: 4
  },
  {
    idPartida: 11,
    jogador: "Darcy",
    pontuacao: 102000,
    percentualAcertos: 100.0000,
    tempoGasto: 2.80006,
    totalPartidas: 1,
    posicao: 5
  },
  {
    idPartida: 22,
    jogador: "Ana",
    pontuacao: 102000,
    percentualAcertos: 100.0000,
    tempoGasto: 11.4203,
    totalPartidas: 1,
    posicao: 6
  },
  {
    idPartida: 21,
    jogador: "Felipe",
    pontuacao: 102000,
    percentualAcertos: 100.0000,
    tempoGasto: 21.4405,
    totalPartidas: 3,
    posicao: 7
  },
  {
    idPartida: 20,
    jogador: "Val",
    pontuacao: 102000,
    percentualAcertos: 83.3333,
    tempoGasto: 24.2606,
    totalPartidas: 2,
    posicao: 8
  },
  {
    idPartida: 10,
    jogador: "Renata",
    pontuacao: 102000,
    percentualAcertos: 47.6190,
    tempoGasto: 5.42012,
    totalPartidas: 25,
    posicao: 9
  },
  {
    idPartida: 1,
    jogador: "Treice",
    pontuacao: 101000,
    percentualAcertos: 100.0000,
    tempoGasto: 7.12016,
    totalPartidas: 5,
    posicao: 10
  },
  {
    idPartida: 11,
    jogador: "Darcy",
    pontuacao: 102000,
    percentualAcertos: 100.0000,
    tempoGasto: 2.80006,
    totalPartidas: 1,
    posicao: 5
  }
 ];

 const splitVictoryRankingEntries = (entries: RankingEntry[]) => {  
  const rankingLength =  entries.length - 1 > MAX_RANKING_ENTRIES ? MAX_RANKING_ENTRIES : entries.length - 1;
  return {
    topEntries: entries.slice(0, rankingLength),
    currentPlayerEntry: entries.length > rankingLength ? 
    entries[rankingLength] : entries[entries.length - 1] ?? null
  };
};

// Componente interno que contém o jogo real
const GameContent: React.FC = () => {
  const { logout } = useAuth();
  usePerfDiagnostics();

  // Hook para funcionalidade de tela cheia
  const { isFullscreen, toggleFullscreen } = useFullscreen();
   
  useEffect(() => {
    logPerfEvent('game:mount');
    return () => {
      logPerfEvent('game:unmount');
    };
  }, []);
  // Estados relacionados às notícias
  const { news: initialNews, loading: loadingNews } = useNews();
  //const initialNews = noticiasJson.items;

  //const loadingNews = false;
  
  // Usando useRef para manter uma referência estável das notícias
  const newsRef = useRef<News[]>([]);
  
  // Estado local para UI e sincronização
  const [currentNews, setCurrentNews] = useState<News | null>(null);
  const [newsHistory, setNewsHistory] = useState<News[]>([]);
  const resumoDaPartidaRef = useRef<ResumoPartida>({
    id: "-1",
    nome: '',
    idade: 0,
    tempoGasto: 0,
    jogadorEmail: getAuthenticatedPlayerEmail(),
    dataHoraInicio: '',
    autoAvaliacao: 'Casual',
    avatar: 'Caio',
    jogadas: []
  });
  const [hits, setHits] = useState<number>(0); // Contador de acertos nas avaliações
  const [isDiceEnabled, setIsDiceEnabled] = useState<boolean>(false);
  const [isAwaitingEvaluation, setIsAwaitingEvaluation] = useState<boolean>(false);
  //const [currentLLMModel, setCurrentLLMModel] = useState<string>(defaultModel.id);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(availableCharacters[0]?.id || 'caio');
  const [pendingSelectedCharacters, setPendingSelectedCharacters] = useState<string[] | null>(null);
  const [showVictoryPanel, setShowVictoryPanel] = useState<boolean>(false);
  const [victoryRankingStatus, setVictoryRankingStatus] = useState<VictoryRankingStatus>('idle');
  const [victoryRankingTopEntries, setVictoryRankingTopEntries] = useState<RankingEntry[]>([]);
  const [victoryRankingCurrentPlayerEntry, setVictoryRankingCurrentPlayerEntry] = useState<RankingEntry | null>(null);
  const [victoryRankingErrorMessage, setVictoryRankingErrorMessage] = useState<string | null>(null);
  const [victoryPanelLoadNonce, setVictoryPanelLoadNonce] = useState<number>(0);
  const [showExplanationPanel, setShowExplanationPanel] = useState<boolean>(false);
  const [helpPopupType, setHelpPopupType] = useState<string | null>(null);
  const [newsContentReady, setNewsContentReady] = useState<boolean>(true);
  const [explanationData, setExplanationData] = useState<{newsText: string; explanationText: string; stampType?: 'fake' | 'not-fake'} | null>(null);
  const [currentEvaluatedNews, setCurrentEvaluatedNews] = useState<News | null>(null);
  const [gameState, dispatchGameEvent] = useReducer(gameStateReducer, 'AguardandoSelecao');
  const stateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldSelectNextNewsRef = useRef<boolean>(true);
  const diceAnimationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const diceAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diceRollTimerRef = useRef<ReturnType<typeof startPerfTimer> | null>(null);
  // NOVO: Referências para animação da tiabel
  const tiabelAnimationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tiabelAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tiabelAnimationTimerRef = useRef<ReturnType<typeof startPerfTimer> | null>(null);

  const pendingNewsSelectionRef = useRef(false);
  const selectionInFlightRef = useRef(false);
  const usedNewsIdsRef = useRef<Set<number>>(new Set());
  const lastEvaluatedNewsIdRef = useRef<number | null>(null);
  const inicioTempoJogadaRef = useRef<number | null>(null);
  const inicioPartidaTimestampRef = useRef<number | null>(null);
  const resumoEmEnvioRef = useRef(false);
  const resumoPendenteEnvioRef = useRef(false);
  const newsTextRef = useRef<HTMLDivElement | null>(null);
  const [newsTextFontSize, setNewsTextFontSize] = useState<number>(20);
  const resumoFlushPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const victorySessionTokenRef = useRef(0);
  const victoryPanelRequestRef = useRef<number>(0);
  const victoryFlowStartedRef = useRef(false);
  const diceAnimationInProgressRef = useRef(false);
  const movementPromiseRef = useRef<Promise<void> | null>(null);
  // MODIFICAÇÃO: zoomInPromiseRef e zoomOutPromiseRef removidos - zoom agora é fixo
  const pendingCameraCenterRef = useRef<ScreenPosition | null>(null);
  const pendingDiceValueRef = useRef<number | null>(null);
  const preferencesLoadedRef = useRef<boolean>(false);
  const [gamePreferences, setGamePreferences] = useState<GamePreferences>(() => {
    if (typeof window === 'undefined') {
      return defaultGamePreferences;
    }

    try {
      const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) {
        preferencesLoadedRef.current = true;
        const parsed = JSON.parse(stored) as Partial<GamePreferences>;
        const merged = {
          ...defaultGamePreferences,
          ...parsed
        };
        merged.cameraDistanceFactor = clampCameraDistanceFactor(
          Number.isFinite(merged.cameraDistanceFactor)
            ? merged.cameraDistanceFactor
            : defaultGamePreferences.cameraDistanceFactor
        );
        return merged;
      }
    } catch (error) {
      console.warn('[Preferences] Falha ao carregar preferências salvas:', error);
    }

    return defaultGamePreferences;
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { 
    players, 
    activePlayerId, 
    initializePlayerManager, 
    addPlayers, 
    screenPositions,
    getPlayerOffset,
    setScreenPosition,
    setActivePlayerMoves,
    moveActivePlayerSteps,
    moveActivePlayerTo,
    teleportActivePlayer,
    setActivePlayerLastPosition,
    setActivePlayerDirection,
    nextTurn,
    setWalkingPaceDuration,
    setMovementSpeedMultiplier,
    playerLevel,
    playerName,
    playerAge
  } = usePlayers();

  const resetUsedNewsCycle = useCallback(() => {
    usedNewsIdsRef.current.clear();
  }, []);

  const atualizarTempoGastoResumo = useCallback((): ResumoPartida => {
    const inicioPartidaTimestamp = inicioPartidaTimestampRef.current;
    const tempoGasto = inicioPartidaTimestamp === null
      ? 0
      : Math.max(0, Math.round((performance.now() - inicioPartidaTimestamp) / 1000));

    resumoDaPartidaRef.current = {
      ...resumoDaPartidaRef.current,
      tempoGasto
    };

    return resumoDaPartidaRef.current;
  }, []);

  const enviarResumoPartida = useCallback(() => {
    resumoPendenteEnvioRef.current = true;

    if (resumoEmEnvioRef.current) {
      return;
    }

    resumoEmEnvioRef.current = true;

    resumoFlushPromiseRef.current = (async () => {
      try {
        while (resumoPendenteEnvioRef.current) {
          resumoPendenteEnvioRef.current = false;

          const resumoAtualizado = atualizarTempoGastoResumo();
          const idPartidaSalvo = await partidaService.salvarPartida(resumoAtualizado);

          resumoDaPartidaRef.current = {
            ...resumoDaPartidaRef.current,
            id: idPartidaSalvo
          };

          console.log('[ResumoPartida] ✅ Resumo enviado com sucesso:', {
            id: idPartidaSalvo,
            jogadas: resumoDaPartidaRef.current.jogadas.length,
            tempoGasto: resumoDaPartidaRef.current.tempoGasto
          });
        }
      } catch (error) {
        console.error('[ResumoPartida] ❌ Falha ao enviar resumo da partida:', error);
      } finally {
        resumoEmEnvioRef.current = false;

        if (resumoPendenteEnvioRef.current) {
          // Não enviar resumo da partida *DEBUG* (1 de 4)
          enviarResumoPartida();
        }
      }
    })();
  }, [atualizarTempoGastoResumo]);

  const aguardarFlushResumo = useCallback(async () => {
    await resumoFlushPromiseRef.current;
    while (resumoEmEnvioRef.current || resumoPendenteEnvioRef.current) {
      await resumoFlushPromiseRef.current;
    }
  }, []);

  const carregarRankingDaVitoria = useCallback(async (requestId: number) => {
    setVictoryRankingStatus('loading');
    setVictoryRankingErrorMessage(null);
    setVictoryRankingTopEntries([]);
    setVictoryRankingCurrentPlayerEntry(null);

    try {
      const idPartida = resumoDaPartidaRef.current.id;

      if (victoryPanelRequestRef.current !== requestId) {
        console.log(`🔍 ***ranking*** [Ranking][App] 🔍 Ranking não buscado
                    (requestId diferente): ${requestId} !== ${victoryPanelRequestRef.current}`);
        return;
      }

      resumoDaPartidaRef.current = {
        ...resumoDaPartidaRef.current,
        id: idPartida
      };

      // Esperar 1 segundo antes de buscar o ranking
      await new Promise(resolve => setTimeout(resolve, 1000));

      let rankingEntries = await rankingService.buscarRanking(idPartida);
      console.log('🔍 **** [Ranking][App] 🔍 Ranking buscado:', rankingEntries);
      if(rankingEntries.length < 2) {
        rankingEntries = FAKE_RETURNED_RANKING_DATA as RankingEntry[];
      }

      if (victoryPanelRequestRef.current !== requestId) {
        return;
      }

      const { topEntries, currentPlayerEntry } = splitVictoryRankingEntries(rankingEntries);

      setVictoryRankingTopEntries(topEntries);
      setVictoryRankingCurrentPlayerEntry(currentPlayerEntry);
      setVictoryRankingStatus('success');
    } catch (error) {
      if (victoryPanelRequestRef.current !== requestId) {
        console.log(`🔍 ***ranking*** [Ranking][App][error] 🔍 Ranking não buscado\n (requestId diferente): ${requestId} !== ${victoryPanelRequestRef.current}`);
        console.log(`🔍 ***ranking*** [Ranking][App][error] 🔍 \n (error): ${error}`);

        return;
      }

      const fallbackMessage = 'Tente novamente em instantes.';
      const errorMessage = error instanceof Error && error.message
        ? error.message
        : fallbackMessage;

      console.error('[VictoryRanking] ❌ Falha ao carregar ranking:', error);
      setVictoryRankingStatus('error');
      setVictoryRankingErrorMessage(errorMessage);
    }
  }, []);

  useEffect(() => {
    if (!showVictoryPanel || victoryPanelLoadNonce === 0) {
      return;
    }

    victoryPanelRequestRef.current = victoryPanelLoadNonce;
    void carregarRankingDaVitoria(victoryPanelLoadNonce);
  }, [showVictoryPanel, victoryPanelLoadNonce, carregarRankingDaVitoria]);
  
  // Refs para manter valores atualizados de hits e newsHistory (para evitar problemas de closure)
  const hitsRef = useRef<number>(0);
  const newsHistoryLengthRef = useRef<number>(0);
  
  const spriteLoading = useSpriteLoading(pendingSelectedCharacters ?? []);

  useEffect(() => {
    const unsubscribe = speechService.subscribeToVoices(setAvailableVoices);
    return unsubscribe;
  }, []);

  // Definir voz padrão quando vozes estiverem disponíveis e for a primeira vez (não há preferências salvas)
  useEffect(() => {
    if (availableVoices.length === 0) return;
    if (preferencesLoadedRef.current) return; // Já tem preferências carregadas do localStorage
    if (gamePreferences.narrationVoice !== null) return; // Já tem voz definida
    
    // Buscar preferencialmente pt-BR, depois pt, depois primeira voz disponível
    const ptBRVoice = availableVoices.find(voice => 
      voice.lang && voice.lang.toLowerCase().includes('pt-br')
    );
    
    if (ptBRVoice) {
      const voiceId = ptBRVoice.voiceURI || ptBRVoice.name;
      setGamePreferences(prev => ({ ...prev, narrationVoice: voiceId }));
      return;
    }
    
    const ptVoice = availableVoices.find(voice => 
      voice.lang && voice.lang.toLowerCase().startsWith('pt')
    );
    
    if (ptVoice) {
      const voiceId = ptVoice.voiceURI || ptVoice.name;
      setGamePreferences(prev => ({ ...prev, narrationVoice: voiceId }));
      return;
    }
    
    // Se não houver vozes em português, usar a primeira disponível
    if (availableVoices.length > 0) {
      const firstVoice = availableVoices[0];
      const voiceId = firstVoice.voiceURI || firstVoice.name;
      setGamePreferences(prev => ({ ...prev, narrationVoice: voiceId }));
    }
  }, [availableVoices, gamePreferences.narrationVoice]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(gamePreferences));
    } catch (error) {
      console.warn('[Preferences] Falha ao salvar preferências:', error);
    }
  }, [gamePreferences]);

  useEffect(() => {
    speechService.setPreferredVoice(gamePreferences.narrationVoice);
  }, [gamePreferences.narrationVoice]);

  // Aplicar configurações de velocidade quando preferências ou players mudarem
  useEffect(() => {
    // Aplicar no modo multiplayer (via contexto)
    setWalkingPaceDuration(gamePreferences.walkingPaceDuration);
    setMovementSpeedMultiplier(gamePreferences.movementSpeedMultiplier);
    // Também aplicar no modo single-player (legado)
    if (playerInstanceRef.current) {
      playerInstanceRef.current.setWalkingPaceDuration(gamePreferences.walkingPaceDuration);
      playerInstanceRef.current.setMovementSpeedMultiplier(gamePreferences.movementSpeedMultiplier);
    }
  }, [gamePreferences.walkingPaceDuration, gamePreferences.movementSpeedMultiplier, setWalkingPaceDuration, setMovementSpeedMultiplier, players]);

  const clearStateTimer = useCallback(() => {
    if (stateTimeoutRef.current !== null) {
      clearTimeout(stateTimeoutRef.current);
      stateTimeoutRef.current = null;
    }
  }, []);

  const scheduleStateEvent = useCallback((delay: number, event: GameEvent) => {
    clearStateTimer();
    stateTimeoutRef.current = setTimeout(() => {
      stateTimeoutRef.current = null;
      dispatchGameEvent(event);
    }, delay);
  }, [clearStateTimer]);

  useEffect(() => {
    return () => {
      clearStateTimer();
      if (diceAnimationIntervalRef.current !== null) {
        clearInterval(diceAnimationIntervalRef.current);
        diceAnimationIntervalRef.current = null;
      }
      if (diceAnimationTimeoutRef.current !== null) {
        clearTimeout(diceAnimationTimeoutRef.current);
        diceAnimationTimeoutRef.current = null;
      }
      if (diceRollTimerRef.current) {
        diceRollTimerRef.current.cancel();
        diceRollTimerRef.current = null;
      }
      diceAnimationInProgressRef.current = false;
      movementPromiseRef.current = null;
      // MODIFICAÇÃO: zoomInPromiseRef e zoomOutPromiseRef removidos
      pendingDiceValueRef.current = null;
      pendingNewsSelectionRef.current = false;
      selectionInFlightRef.current = false;
      resetUsedNewsCycle();

      // NOVO: Cleanup das animações da tiabel
      if (tiabelAnimationIntervalRef.current !== null) {
        clearInterval(tiabelAnimationIntervalRef.current);
      }
      if (tiabelAnimationTimeoutRef.current !== null) {
        clearTimeout(tiabelAnimationTimeoutRef.current);
      }

    };
  }, [clearStateTimer, resetUsedNewsCycle]);

  // Sincronizar refs com estados (para evitar problemas de closure nos callbacks)
  useEffect(() => {
    hitsRef.current = hits;
    console.log(`[HitsTracker] 🔄 Sincronizado hitsRef.current = ${hits}`);
  }, [hits]);

  useEffect(() => {
    newsHistoryLengthRef.current = newsHistory.length;
    console.log(`[HitsTracker] 🔄 Sincronizado newsHistoryLengthRef.current = ${newsHistory.length}`);
  }, [newsHistory.length]);
  
  // Hook para detectar orientação
  const orientationData = useOrientationDetection();

  // Funções para controlar o painel de explicação
  const handleSilenceNarration = useCallback(() => {
    speechService.stop();
  }, []);

  const handleCloseExplanationPanel = useCallback(() => {
    setShowExplanationPanel(false);
    setExplanationData(null);
    setCurrentEvaluatedNews(null);
    shouldSelectNextNewsRef.current = true;
    dispatchGameEvent({ type: 'FECHAR_EXPLICACAO' });
  }, []);

  const handleNextNewsClick = useCallback(() => {
    inicioTempoJogadaRef.current = performance.now();
    console.log('[ResumoPartida] ⏱️ Início da jogada (AguardandoNoticia1):', {
      jogadaNumero: resumoDaPartidaRef.current.jogadas.length + 1
    });
    dispatchGameEvent({ type: 'PROXIMA_NOTICIA' });
  }, [dispatchGameEvent]);

  const handleGamePreferencesChange = useCallback((updates: Partial<GamePreferences>) => {
    setGamePreferences((prev) => {
      const next = { ...prev, ...updates };
      if (updates.cameraDistanceFactor !== undefined) {
        next.cameraDistanceFactor = clampCameraDistanceFactor(updates.cameraDistanceFactor);
      }
      return next;
    });
  }, []);

  // Função para narrar texto
  const narrate = useCallback(async (text: string) => {
    try {
      console.log('Narrando texto:', text);
      await speechService.speak(text, { 
        voice: gamePreferences.narrationVoice ?? undefined,
        rate: gamePreferences.narrationRate,
        pitch: gamePreferences.narrationPitch,
        volume: gamePreferences.narrationVolume
      });
    } catch (error) {
      console.error(`Erro ao narrar o texto "${text}":`, error);
    }
  }, [gamePreferences]);

  const showNewsPanel = useCallback(async (news: News) => {
    setNewsContentReady(false);
    const mountTimer = startPerfTimer('ui:news-panel:mount');
    
    const preloadTimer = startPerfTimer('ui:news-panel:preload');
    await preloadImages([news.caminhoimagem]);
    preloadTimer?.end();
    
    lastEvaluatedNewsIdRef.current = null;
    setCurrentNews(news);
    setShowExplanationPanel(false);
    setCurrentEvaluatedNews(null);
    setNewsContentReady(true);

    mountTimer?.end();
    
    requestAnimationFrame(() => {
      logPerfEvent('ui:news-panel:content-ready');
    });
  }, []);

  const showExplanationPanelWithData = useCallback(async (newsText: string, explanationText: string, stampType?: 'fake' | 'not-fake') => {
    const mountTimer = startPerfTimer('ui:explanation-panel:mount');

    setExplanationData({ newsText, explanationText, stampType });
    setShowExplanationPanel(true);

    mountTimer?.end();

    requestAnimationFrame(() => {
      logPerfEvent('ui:explanation-panel:content-ready');
    });
  }, []);

  // Função para gerar resposta do LLM e narrar o texto
  const generateAndSpeakLLMResponse = useCallback(async (systemMessage: string, userMessage: string, newsText?: string) => {
    try {
      /*
      // Preparar as mensagens para o LLM
      const messages: ChatMessage[] = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ];

      // console.log('Gerando resposta do modelo', currentLLMModel);
      
      //
      // ***** Substituir pelo atributo fala_proposta do objeto da notícia
      //
      // Chamar o modelo LLM
      
      const response = await llmService.generateResponse({
        model: currentLLMModel,
        messages
      });
      
      const explanationText = response.text;
      */
      const explanationText = currentNews?.fala_proposta || 'Não há explicação para esta notícia';
      console.log('🔍 [App] 🔍 Fala proposta da notícia:', explanationText);
      
      // Narrar a explicação
      //await narrate(explanationText);
      //narrate( 'Sua avaliação está incorreta. ' + explanationText);
      narrate( 'Errou! ' + explanationText);
      
      // Aguardar um frame antes de montar o painel (sequenciar com câmera)
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Mostrar a explicação no painel
      await showExplanationPanelWithData(
        newsText || 'Notícia não disponível',
        explanationText
      );
      
      return explanationText;
    } catch (error) {
      console.error('Erro ao gerar resposta do LLM:', error);
      alert('Ocorreu um erro ao gerar a explicação.');
      
      return null;
    }
  }, [currentNews?.fala_proposta, narrate, showExplanationPanelWithData]);
  
  // Função para selecionar uma notícia que não esteja no histórico
  const selectNewsWithoutRepetition = useCallback(async () => {
    const newsArray = newsRef.current;

    if (!newsArray || newsArray.length === 0) {
      console.error('selectNewsWithoutRepetition: Array de notícias vazio');
      return;
    }

    if (selectionInFlightRef.current) {
      console.log('[NewsSelection] Seleção já em andamento, ignorando nova solicitação.');
      return;
    }

    selectionInFlightRef.current = true;

    const timer = startPerfTimer('news:selectWithoutRepetition', {
      historySize: newsHistoryRef.current.length,
      totalNews: newsArray.length
    });

    try {
      const usedNewsIds = usedNewsIdsRef.current;
      console.log('IDs já usados no ciclo:', Array.from(usedNewsIds));

      let availableNews = newsArray.filter(item => !usedNewsIds.has(item.id));
      console.log('[newsHistory] 📰 Notícias disponíveis (fora do ciclo atual):', availableNews.length, availableNews);

      if (availableNews.length === 0) {
        console.log('Todas as notícias já foram usadas. Reiniciando o ciclo.');
        resetUsedNewsCycle();
        availableNews = newsArray;
      }

      const randomIndex = Math.floor(Math.random() * availableNews.length);
      const selectedNews = availableNews[randomIndex];
      usedNewsIdsRef.current.add(selectedNews.id);
      console.log('[newsHistory] 📰 *** Notícia selecionada:', selectedNews.id);
      console.log('[newsHistory] 📰 *** IDs já usados:', Array.from(usedNewsIdsRef.current));

      // Após pegar a notícia, retirá-la do array de notícias disponíveis
      availableNews.splice(randomIndex, 1);
      console.log('[newsHistory] 📰 Notícias disponíveis (após seleção):', availableNews.length, availableNews);
    
      const newHistory = [selectedNews, ...newsHistoryRef.current];
      newsHistoryRef.current = newHistory;

      requestAnimationFrame(() => {
        startPerfTimer('ui:news-panel:frame-ready').end();
      });

      console.log(`[newsHistory] 📰 Notícia adicionada ao histórico:`, selectedNews);
      setNewsHistory(newHistory);

      await showNewsPanel(selectedNews);
      timer.end({
        selectedId: selectedNews.id,
        availableCount: availableNews.length
      });
    } finally {
      selectionInFlightRef.current = false;
    }
  }, [resetUsedNewsCycle, showNewsPanel]);

  const selectNewsWithoutRepetitionRef = useRef(selectNewsWithoutRepetition);

  useEffect(() => {
    selectNewsWithoutRepetitionRef.current = selectNewsWithoutRepetition;
  }, [selectNewsWithoutRepetition]);

  const isDebugEnabled = () => typeof window !== 'undefined' && Boolean((window as any).__JEDI_DEBUG__);

  const logPlayerDebug = useCallback((message: string, details?: Record<string, unknown>) => {
    if (!(typeof window !== 'undefined' && (window as any).__JEDI_DEBUG__)) {
      return;
    }
    const payload = {
      state: gameState,
      timestamp: performance.now().toFixed(2),
      ...details
    };
    console.log(`🎯 [PlayerDebug] ${message}`, payload);
  }, [gameState]);

  const debugSetScreenPosition = useCallback((source: string, playerId: string, screenPosition: ScreenPosition, extra?: Record<string, unknown>) => {
    logPlayerDebug(`setScreenPosition via ${source}`, {
      playerId,
      isoX: Number(screenPosition.isoX.toFixed?.(2) ?? screenPosition.isoX),
      isoY: Number(screenPosition.isoY.toFixed?.(2) ?? screenPosition.isoY),
      ...extra
    });
    setScreenPosition(playerId, screenPosition);
  }, [logPlayerDebug, setScreenPosition]);

  const notifyPlayerRender = useCallback((source: string, info: Record<string, unknown>) => {
    if (!(typeof window !== 'undefined' && (window as any).__JEDI_DEBUG__)) {
      return;
    }
    logPlayerDebug(`render ${source}`, info);
  }, [logPlayerDebug]);
    
  // Carregar notícias apenas uma vez ao inicializar a aplicação
  useEffect(() => {
    if (!loadingNews && initialNews && initialNews.length > 0) {
      newsRef.current = initialNews;
    }
  }, [initialNews, loadingNews]);  // ← Também simplificar as dependências
  

  // Função para buscar regra em caso de erro
  // const fetchRule = useCallback(async (ruleId: number): Promise<Rules| null> => {
  //   try {
  //     // Simulando a chamada de API para buscar regra - ajuste conforme a API real
  //     const response = await apiService.get<any>(`regra/${ruleId}`);
  //     return response;
  //   } catch (error) {
  //     console.error(`Falha ao buscar regra com id ${ruleId}:`, error);
  //     return null;
  //   }
  // }, []);
  
  // Função para lidar com erros de avaliação
  const errorHandle = useCallback(async () => {
    if (!newsHistory || newsHistory.length === 0) return;
    
    const currentNewsItem = newsHistory[0];

    try {
      // Buscar a regra correspondente
      //const rule = await fetchRule(currentNewsItem.idregra);
      
      // if (rule) {
        // Texto para exibição em logs
        //const explanation = rule.items.map(item => `Analisando ${item.antecedente} na notícia,\n${item.pergunta}\n`).join('\n');
        const explanation = currentNews?.fala_proposta || 'Não há explicação para esta notícia';
        console.log('Explicação:', explanation);
        
        // Texto completo para o LLM
        // const fullExplanation = rule.items.map(item => `Analisando ${item.antecedente} na notícia,\n${item.pergunta}\n
        //   Explicação:\n ${item.explicacao}`).join('\n');


/*          
        // Mensagem para o sistema LLM
        const systemMessage = `Você é uma professora simpática. Você vai apenas falar. 
          então use somente texto em português brasileiro sem símbolos.
          Você usa linguagem concisa, objetiva, simples e fácil de entender, 
          explicando de forma clara e objetiva como para uma criança de 10 anos`;

        // Mensagem para o usuário LLM
        const userMessage = `A notícia a seguir foi classificada como ${currentNewsItem.respCerta}, 
        mas não é verdade:\n ${currentNewsItem.pergunta}. \n
        Use a explicação a seguir para explicar simpaticamente para a criança:\n ${fullExplanation}`;
*/


        // Mensagem para o sistema LLM
        const systemMessage = `      Persona: Você é uma professora simpática, descolada, irreverente e divertida, mas é ainda uma professora. Portanto usa o português coloquial, mas sempre correto. 
          Você vai apenas falar, usando linguagem jovial, descolada mas correta, concisa, objetiva, simples e fácil de entender, 
          explicando de forma clara e objetiva para um adolescente quais as principais características presentes na lista apresentada observadas em uma dada notícia são as mais relevantes para classificá-la como uma notícia falsa (FAKE) ou não (NÃO FAKE).
          Seja bem sucinta.
      Contexto:
          Notícia avaliada: [notícia]
          Classificação sugerida da notícia: [resposta]
          Lista completa de características que podem ser usadas para as sugestões de classificação: [lista de características]
          A notícia acima é classificada como [resposta].`;

        // Mensagem para o usuário LLM
        const userMessage = `A notícia a seguir é ${currentNewsItem.respcerta}:\n ${currentNewsItem.pergunta}. \n
                    
          Elabore a sua fala para um adolescente, explicando no contexto da notícia a razão de essas características selecionadas contribuirem para essa classificação.
          Use, somente, texto puro, curto e coloquial de uma conversa que será narrada.   
          Use apenas um resumo das partes mais relevantes dessas características escolhidas (para explicar a razão), de modo irreverente e descolado (mas correto), para um adolescente.
          Use apenas uma frase, sem gírias ou formatações!          
          `;


        // Em vez da explicação no painel de notícias,
        // colocar a explicação em um parágrafo
        // dentro de um div com id 'explanation-panel'
        // que está sempre invisivel até a hora da explicação que é aqui
        // depois de gerar a explicação, o div passa a ser visivel
        // volta a ficar invisivel quando acabar a narração da explicação
        const explanationPanel = document.getElementById('explanation-panel');
        if (explanationPanel) {
          const explanationParagraph = document.createElement('p');
          explanationParagraph.textContent = `Você não observou alguns pontos sobre a notícia: \n\n${explanation}`;
          explanationPanel.appendChild(explanationParagraph);
        }


        //narrate('Você não acertou!');

        // Gerar resposta do LLM e narrar
        const generatedText = await generateAndSpeakLLMResponse(systemMessage, userMessage, currentNewsItem.pergunta);
        if (!generatedText) {
          alert('Observe estes pontos sobre a notícia:\n\n'+explanation);
        }

      // } else {
      //   // Mensagem padrão se não encontrar a regra
      //   alert("Não foi possível carregar a explicação para esta notícia.");
      //   await narrate("Não foi possível carregar a explicação para esta notícia.");
      // }
    } catch (error) {
      console.error("Erro ao buscar regra:", error);
      alert("Ocorreu um erro ao buscar a explicação.");
      //await narrate("Ocorreu um erro ao buscar a explicação.");
    }
    
    // Passar a vez para o próximo jogador após avaliação incorreta
    nextTurn();

    shouldSelectNextNewsRef.current = true;
  }, [newsHistory, currentNews?.fala_proposta, generateAndSpeakLLMResponse, nextTurn]);
  
  // Texto a ser exibido na notícia
  const newsText = useMemo(() => {
    if (loadingNews) return "Carregando notícias...";
    if (!currentNews) return "Não foi possível carregar as notícias.";
    
    return currentNews.pergunta;
  }, [currentNews, loadingNews]);

  useLayoutEffect(() => {
    const element = newsTextRef.current;
    if (!element) return;

    const getMaxFontSize = () => {
      if (window.matchMedia('(max-width: 768px)').matches) return 10;
      if (window.matchMedia('(max-width: 1024px)').matches) return 14;
      return 20;
    };

    const fitTextToPanel = () => {
      if (element.clientWidth === 0 || element.clientHeight === 0) return;

      const minFontSize = 8;
      let low = minFontSize;
      let high = getMaxFontSize();
      let best = minFontSize;

      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        element.style.fontSize = `${middle}px`;

        const fits =
          element.scrollHeight <= element.clientHeight &&
          element.scrollWidth <= element.clientWidth;

        if (fits) {
          best = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }

      element.style.fontSize = `${best}px`;
      setNewsTextFontSize(best);
    };

    const animationFrameId = requestAnimationFrame(fitTextToPanel);
    const resizeObserver = new ResizeObserver(fitTextToPanel);
    resizeObserver.observe(element);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [newsText, isAwaitingEvaluation, showExplanationPanel]);

  // Referência para a instância da classe Player original (mantida para compatibilidade)
  const playerInstanceRef = useRef<Player | null>(null);

  // Estados de UI
  const [playerPosition, setPlayerPosition] = useState<Position>({ x: 0, y: 0 });
  const [initialMapPosition, setInitialMapPosition] = useState<Position>({ x: 0, y: 0 }); // NOVO: posição inicial fixa
  const [playerScreenPosition, setPlayerScreenPosition] = useState<ScreenPosition>({ 
    isoX: 400, 
    isoY: 300 
  });
  const [mapTiles, setMapTiles] = useState<Tile[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false);
  const [movesLeft, setMovesLeft] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number>(1);
  const [isPlayerMoving, setIsPlayerMoving] = useState<boolean>(false);
  const [playerDirection, setPlayerDirection] = useState<string>('down');
  const [playerSpriteFrame, setPlayerSpriteFrame] = useState<number>(0);
  const [isDiceAnimating, setIsDiceAnimating] = useState<boolean>(false);
  const [rollingDiceFrame, setRollingDiceFrame] = useState<number>(0);
  // NOVO: Estados para animação da tiabel
  const [isTiabelAnimating, setIsTiabelAnimating] = useState<boolean>(false);
  const [tiabelAnimationFrame, setTiabelAnimationFrame] = useState<number>(0);
  const [tiabelDirection, setTiabelDirection] = useState<string>('down');

  // === ESTADOS DOS MACACOS (GIF) ===
  const [monkeysState, setMonkeysState] = useState<MonkeyState[]>([]);

  // === POSIÇÃO FIXA DA FONTE (GIF) ===
  const [fountainPos, setFountainPos] = useState<ScreenPosition | null>(null);
  // === POSIÇÃO FIXA DO GEÓLICO (GIF) ===
  const [windTurbinePosList, setWindTurbinePosList] = useState<ScreenPosition[]>([]);
  // === MACACOS (GIF) ===
  const [macacosPosList, setMacacosPosList] = useState<ScreenPosition[]>([]);

  // === TRANSPORTE ESPECIAL DO SKATE ===
  const isSkateTransportActiveRef = useRef<boolean>(false);
  const activeSkatePlayerIdRef = useRef<string | null>(null);
  const diceEnabledBeforeSkateRef = useRef<boolean>(false);
  const [skateDynamicPosition, setSkateDynamicPosition] = useState<ScreenPosition | null>(null);
  const [playerOverrideScreenPosition, setPlayerOverrideScreenPosition] = useState<ScreenPosition | null>(null);
  const activeSkateAnimationCancelRef = useRef<(() => void) | null>(null);
  const playerDirectionDuringSkateRef = useRef<string>('left');
  const skateTransportPendingRef = useRef<boolean>(false);

  // === PORTAL DE DESMATERIALIZAÇÃO (CASTIGO) ===
  const isPortalTransportActiveRef = useRef<boolean>(false);
  const activePortalPlayerIdRef = useRef<string | null>(null);
  const portalTransportPendingRef = useRef<boolean>(false);
  const diceEnabledBeforePortalRef = useRef<boolean>(false);
  const activePortalAnimationCancelRef = useRef<(() => void) | null>(null);
  const isJulgamentoTransportActiveRef = useRef<boolean>(false);
  const julgamentoTransportPendingRef = useRef<boolean>(false);
  // Estado da animação: 'none' | 'dematerializing' | 'rematerializing'
  const [portalAnimationState, setPortalAnimationState] = useState<'none' | 'dematerializing' | 'rematerializing'>('none');
  const [highlightedPillId, setHighlightedPillId] = useState<number | null>(null);

  // Informações de responsividade (simplificada)
  const { isMobile, isTablet } = useResponsive();


  useEffect(() => {
    if (isMapLoaded && getTilePositionFn.current) {
      setFountainPos(getTilePositionFn.current({ x: 23, y: 30 }));
    }
  }, [isMapLoaded]);

  useEffect(() => {
    if (isMapLoaded && getTilePositionFn.current) {
      const tiles = [
        { x: 18, y: 49 },
        { x: 23, y: 49 },
        { x: 28, y: 49 }
      ];
      const positions = tiles
        .map(t => getTilePositionFn.current!(t))
        .filter(Boolean) as ScreenPosition[];
      setWindTurbinePosList(positions);
    }
  }, [isMapLoaded]);


  useEffect(() => {
    const monkeysPositions = [
      { x: 9, y: 31 },
      { x: 10, y: 40 },
      { x: 14, y: 38 },
      { x: 5, y: 36 },
    ];

    console.log('isMobile:', isMobile);
    console.log('isTablet:', isTablet);

    // isMobile = 1, isTablet = 2, isDesktop = 3
    const monkeysQuantity = isMobile ? 1 : isTablet ? 2 : 3;

    if (isMapLoaded && getTilePositionFn.current) {
      // Obter somente as posições dos três primeiros macacos no mapa
      const positions = monkeysPositions
        .map(t => getTilePositionFn.current!(t))
        .filter(Boolean) as ScreenPosition[];
      setMacacosPosList(positions.slice(0, monkeysQuantity));
    }
  }, [isMapLoaded, isMobile, isTablet]);

  // Inicializar estado dos macacos aleatoriamente
  useEffect(() => {
    // Inicializa os 4 macacos com animação e flip aleatórios
    const initialState = Array.from({ length: 4 }, () => ({
      animationIndex: Math.floor(Math.random() * 4),
      isFlipped: Math.random() < 0.5
    }));
    setMonkeysState(initialState);
    
    console.log('🐵 Macacos inicializados:', initialState);
  }, []); // Roda apenas uma vez no mount

  // Atualizar animação dos macacos a cada 24 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setMonkeysState(prevState => {
        return prevState.map((monkey) => {
          // 50% de chance de trocar a animação
          const shouldChangeAnimation = Math.random() < 0.5;
          const newAnimationIndex = shouldChangeAnimation 
            ? Math.floor(Math.random() * 4) 
            : monkey.animationIndex;
          
          // 50% de chance de trocar o flip
          const shouldChangeFlip = Math.random() < 0.5;
          const newIsFlipped = shouldChangeFlip 
            ? !monkey.isFlipped 
            : monkey.isFlipped;
          
          return {
            animationIndex: newAnimationIndex,
            isFlipped: newIsFlipped
          };
        });
      });
      
      console.log('🐵 Macacos atualizados após 24 segundos');
    }, 24000); // 24 segundos
    
    return () => clearInterval(interval);
  }, []);


  const playerDirectionRef = useRef(playerDirection);
  const playerSpriteFrameRef = useRef(playerSpriteFrame);

  // Efeito para iniciar o jogo após carregar sprites
  useEffect(() => {
    console.log('🎮 [GameStart] Estado atual:', {
      pendingSelectedCharacters,
      isLoading: spriteLoading.isLoading,
      error: spriteLoading.error,
      progress: spriteLoading.progress,
      playerPosition
    });

    if (!pendingSelectedCharacters || pendingSelectedCharacters.length === 0) {
      console.log('⏭️ [GameStart] Sem personagens pendentes, pulando...');
      return;
    }

    if (spriteLoading.isLoading) {
      console.log('⏳ [GameStart] Sprites ainda carregando, aguardando...');
      return;
    }

    if (spriteLoading.error) {
      console.error('❌ [GameStart] Erro no carregamento:', spriteLoading.error);
      return;
    }

    // IMPORTANTE: só inicia o jogo quando progress === 1 (100%)
    if (spriteLoading.progress < 1) {
      console.log(`⏳ [GameStart] Aguardando sprites... Progresso: ${Math.round(spriteLoading.progress * 100)}%`);
      return;
    }

    console.log('🚀 [GameStart] Iniciando jogo com personagens:', pendingSelectedCharacters);
    console.log('📍 [GameStart] Posição inicial do jogador:', playerPosition);

    resetUsedNewsCycle();
    pendingNewsSelectionRef.current = false;
    selectionInFlightRef.current = false;
    lastEvaluatedNewsIdRef.current = null;
    newsHistoryRef.current = [];
    setNewsHistory([]);
    setCurrentNews(null);

    addPlayers(pendingSelectedCharacters, playerPosition);
    console.log('✅ [GameStart] addPlayers executado');

    const user = window.localStorage.getItem('user');
    console.log('[ResumoPartida][USER] 🎬 Usuário autenticado:', user);

    const avatarSelecionado = PLAYER_ID_TO_AVATAR[selectedCharacterId] ?? 'Caio';
    const autoAvaliacaoSelecionada = PLAYER_LEVEL_TO_AUTO_AVALIACAO[playerLevel ?? 'casual'] ?? 'Casual';
    const dataHoraInicioPartida = new Date().toISOString();
    inicioPartidaTimestampRef.current = performance.now();

    resumoDaPartidaRef.current = {
      id: "-1",
      nome: playerName.trim(),
      idade: playerAge ?? 0,
      tempoGasto: 0,
      jogadorEmail: getAuthenticatedPlayerEmail(),
      dataHoraInicio: dataHoraInicioPartida,
      autoAvaliacao: autoAvaliacaoSelecionada,
      avatar: avatarSelecionado,
      jogadas: []
    };
    console.log('[ResumoPartida] 🎬 Partida iniciada:', {
      id: resumoDaPartidaRef.current.id,
      nome: resumoDaPartidaRef.current.nome,
      idade: resumoDaPartidaRef.current.idade,
      dataHoraInicio: dataHoraInicioPartida,
      autoAvaliacao: autoAvaliacaoSelecionada,
      avatar: avatarSelecionado
    });
    // Não enviar resumo da partida *DEBUG* (2 de 4)
    enviarResumoPartida();
    
    dispatchGameEvent({ type: 'INICIAR_JOGO' });
    console.log('✅ [GameStart] Evento INICIAR_JOGO disparado');
    
    setPendingSelectedCharacters(null);
    setGameStarted(true);
    console.log('✅ [GameStart] gameStarted = true');
  }, [pendingSelectedCharacters, spriteLoading.isLoading, spriteLoading.error, spriteLoading.progress, addPlayers, playerPosition, dispatchGameEvent, selectedCharacterId, playerLevel, playerName, playerAge, enviarResumoPartida, resetUsedNewsCycle]);
  
  // === SISTEMA DE ZOOM FIXO (configurável) ===
  // MODIFICAÇÃO: Zoom agora é fixo via preferências (cameraDistanceFactor)
  const {
    currentZoomFactor
    // setZoomToNormal e setZoomToDice removidos - não são mais necessários
  } = useDynamicZoom({ normalZoomFactor: gamePreferences.cameraDistanceFactor });
  
  // Referência para controlar o board
  const boardRef = useRef<IsometricBoardRef>(null);
  
  // Dimensões do mapa (removidas pois não são mais usadas no novo sistema de câmera)
  // const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 });
  
  // Referência do elemento container do jogo
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Função para obter a posição do tile
  const getTilePositionFn = useRef<(position: Position) => ScreenPosition | null>(null);
  const tileFnRegisteringRef = useRef(false);

  // NOVO: Estado para controles da câmera
  const cameraControlsRef = useRef<{
    centerOnPlayer: (playerScreenPosition: ScreenPosition, duration?: number) => Promise<void>;
    resetCamera: (duration?: number) => Promise<void>;
  } | null>(null);

  // CORREÇÃO: Refs para evitar loop infinito em handlePlayerPositionChange
  const newsHistoryRef = useRef<News[]>([]);
  const previousGameStateRef = useRef<GameStateName | null>(null);
  
  // CORREÇÃO: Ref para playerPosition atual (sem causar re-renders)
  const currentPlayerPositionRef = useRef<Position>(playerPosition);

  // Sincronizar refs com valores atuais
  useEffect(() => {
    newsHistoryRef.current = newsHistory;
    console.log('[newsHistory] 📰 newsHistoryRef.current:', newsHistoryRef.current);
  }, [newsHistory]);

  useEffect(() => {
    currentPlayerPositionRef.current = playerPosition;
  }, [playerPosition]);

  // Função para registrar a função de obtenção de posição do tile
  const registerTilePositionFn = useCallback((fn: (position: Position) => ScreenPosition | null) => {
    if (tileFnRegisteringRef.current) {
      return;
    }
    tileFnRegisteringRef.current = true;

    console.log('Função de obtenção de posição do tile registrada');
    getTilePositionFn.current = fn;
    if (playerPosition && fn) {
      const pos = fn(playerPosition);
      if (pos) {
        logPlayerDebug('tileFn:updateInitialScreenPosition', { pos });
        setPlayerScreenPosition(pos);
      }
    }

    tileFnRegisteringRef.current = false;
  }, [playerPosition, logPlayerDebug]);

  // NOVO: Callback para quando a câmera estiver pronta
  const handleCameraReady = useCallback((cameraControls: {
    centerOnPlayer: (playerScreenPosition: ScreenPosition, duration?: number) => Promise<void>;
    resetCamera: (duration?: number) => Promise<void>;
  }) => {
    cameraControlsRef.current = cameraControls;
    console.log('🎥 Controles de câmera inicializados');
  }, []);

  // NOVO: Função para centralizar após movimento do player
  const handlePlayerMovementComplete = useCallback(async (playerId: string, position: Position) => {
    if (playerId !== activePlayerId) {
      // console.log(`⏭️ Movimento completo do jogador ${playerId}, mas não é o ativo (${activePlayerId})`);
      return;
    }
    
    // console.log(`🎯 Movimento completo do jogador ativo ${playerId}, centralizando câmera...`);
    // console.log(`📍 Posição final: (${position.x}, ${position.y})`);
    
    if (!cameraControlsRef.current || !getTilePositionFn.current) {
      // console.log('⚠️ Controles de câmera ou função de posição não disponíveis');
      return;
    }
    
    const screenPosition = getTilePositionFn.current(position);
    if (!screenPosition) {
      // console.log('⚠️ Não foi possível obter posição na tela do player');
      return;
    }
    
    const ajusteFinoPlayerX = -35;
    const ajusteFinoPlayerY = -40;
    const tileWidth = 128;
    const spriteOffsetX = (tileWidth / 2) - 32;
    const spriteOffsetY = -46;
    
    const adjustedScreenPos = {
      isoX: screenPosition.isoX + spriteOffsetX + ajusteFinoPlayerX,
      isoY: screenPosition.isoY + spriteOffsetY + ajusteFinoPlayerY
    };
    
    pendingCameraCenterRef.current = adjustedScreenPos;
  }, [activePlayerId]);

  // Validador de movimento para o jogador - usando useMemo para evitar recriações desnecessárias
  const movementValidator = useMemo(() => ({
    isValidMove: (from: Position, to: Position): boolean => {
      // Verifica se o destino está dentro do alcance baseado nos movimentos restantes
      const dx = Math.abs(to.x - from.x);
      const dy = Math.abs(to.y - from.y);
      const distance = dx + dy;
      
      // No modo multiplayer, usar os movimentos do jogador ativo
      const activePlayer = players.find(p => p.id === activePlayerId);
      const movesLeft = activePlayer ? activePlayer.movesLeft : (playerInstanceRef.current?.movesLeft || 0);

      console.log(`Verificando movimento de (${from.x},${from.y}) para (${to.x},${to.y})`);
      console.log(`Distância: ${distance}, Movimentos restantes: ${movesLeft}`);

      if (distance > movesLeft+1) {
        console.log('Movimento inválido: distância maior que movimentos restantes');
        return false;
      }

      // Interromper movimento normal se transporte especial estiver ativo
      // Verifica se o destino é caminhável
      const destinationTile = mapTiles.find(tile => tile.x === to.x && tile.y === to.y);
      if (destinationTile && destinationTile.type === 'fim') {
        if (victoryFlowStartedRef.current) {
          return true;
        }
        victoryFlowStartedRef.current = true;
        console.log('🏆 [movementValidator] Jogador chegou ao fim do mapa! Preparando jogada final e mostrando painel de vitória...');

        setVictoryRankingStatus('loading');
        setVictoryRankingErrorMessage(null);
        setVictoryRankingTopEntries([]);
        setVictoryRankingCurrentPlayerEntry(null);
        setShowVictoryPanel(true);
        narrate('Parabéns! Você arrazou!');
        if (activePlayer) {
          activePlayer.movesLeft = 0;
        }

        const sessionToken = ++victorySessionTokenRef.current;
        enviarResumoFinalPartida();

        void (async () => {
          await aguardarFlushResumo();
          if (victorySessionTokenRef.current === sessionToken) {
            setVictoryPanelLoadNonce((prev) => prev + 1);
          }
        })();

        setActivePlayerMoves(0);
        setIsPlayerMoving(false);
        setIsPlayerMoving(true);
        setIsPlayerMoving(false);
        return true;
      }
      if (!destinationTile || !destinationTile.walkable) {
        console.log(`Movimento inválido: destino (${destinationTile?.x|| '?'},${destinationTile?.y|| '?'}) não é caminhável`);
        return false;
      }

      console.log('Movimento válido!');
      return true;

      function enviarResumoFinalPartida() {
        dispatchGameEvent({ type: 'FINAL_PARTIDA' });
        const resumoAnterior = resumoDaPartidaRef.current;
        const ultimaJogada = resumoAnterior.jogadas[resumoAnterior.jogadas.length - 1];

        if( ultimaJogada?.posicaoAvatar === 32) {
          console.log('[ResumoPartida] 🏁 Jogada final não adicionada ao resumo da partida: Jogada duplicada. Posição anterior do avatar: 32');
          return;
        }

        const jogadaFinal: ResumoPartidaJogada = {
          jogadaId: (ultimaJogada?.jogadaId ?? 0) + 1,
          noticiaId: ultimaJogada?.noticiaId ?? -1,
          avaliacaoCorreta: true,
          tempoResposta: 0,
          posicaoAvatar: 32
        };

        resumoDaPartidaRef.current = {
          ...resumoAnterior,
          jogadas: [...resumoAnterior.jogadas, jogadaFinal]
        };

        console.log('[ResumoPartida] 🏁 Jogada final adicionada ao resumo da partida:', jogadaFinal);
        // Não enviar resumo da partida *DEBUG* (3 de 4)
        enviarResumoPartida();
      }
    },
    getTileScreenPosition: (position: Position): ScreenPosition | null => {
      return getTilePositionFn.current ? getTilePositionFn.current(position) : null;
    }
  }), [players, mapTiles, activePlayerId, narrate, enviarResumoPartida, aguardarFlushResumo, setActivePlayerMoves]);

  // Função para lidar com alterações na posição do jogador (compatibilidade com modo single player)
  const handlePlayerPositionChange = useCallback((position: Position, isMoving: boolean) => {
    // Para depuração detalhada, reativar os logs abaixo:
    // logPlayerDebug('single:positionChange', {
    //   hasScreenPosition: Object.prototype.hasOwnProperty.call(position, '_screenPosition'),
    //   isoX: (position as any)._screenPosition?.isoX,
    //   isoY: (position as any)._screenPosition?.isoY,
    //   isMoving
    // });
    if (!isSkateTransportActiveRef.current) {
      setIsPlayerMoving(isMoving);
    }
    const currentDirection = playerDirectionRef.current;
    const nextDir = playerInstanceRef.current?.direction ?? currentDirection;
    if (nextDir && nextDir !== currentDirection) {
      playerDirectionRef.current = nextDir;
      setPlayerDirection(nextDir);
    }

    const currentFrame = playerSpriteFrameRef.current;
    const nextFrame = playerInstanceRef.current?.spriteFrame ?? currentFrame;
    if (nextFrame !== currentFrame) {
      playerSpriteFrameRef.current = nextFrame;
      setPlayerSpriteFrame(nextFrame);
    }

    if (isSkateTransportActiveRef.current && playerOverrideScreenPosition) {
      setPlayerScreenPosition(playerOverrideScreenPosition);
    } else {
      if ('_screenPosition' in position) {
        notifyPlayerRender('legacy:screenPosition', {
          isoX: (position as any)._screenPosition?.isoX,
          isoY: (position as any)._screenPosition?.isoY,
          isMoving
        });
        setPlayerScreenPosition(position._screenPosition as ScreenPosition);
      } else if (!isMoving) {
        const fallback = getTilePositionFn.current?.(position);
        if (fallback) {
          notifyPlayerRender('legacy:fallback', {
            isoX: fallback.isoX,
            isoY: fallback.isoY,
            isMoving
          });
          setPlayerScreenPosition(fallback);
        }
      }
    }

    if (!isMoving) {
      const { _screenPosition, _progress, ...logicalPosition } = position as any;
      const nextLogicalPosition: Position = {
        x: Number(logicalPosition.x ?? playerPosition.x),
        y: Number(logicalPosition.y ?? playerPosition.y)
      };
      if (!isSkateTransportActiveRef.current && !isPortalTransportActiveRef.current) {
        setPlayerPosition(nextLogicalPosition);
        currentPlayerPositionRef.current = nextLogicalPosition;
      }

      // Verificar se atingiu o tile 36,44
      if (!isSkateTransportActiveRef.current &&
          !skateTransportPendingRef.current &&
          !isPortalTransportActiveRef.current &&
          !portalTransportPendingRef.current &&
          nextLogicalPosition.x === SKATE_TRIGGER_TILE.x &&
          nextLogicalPosition.y === SKATE_TRIGGER_TILE.y) {
        
        // Usar refs para obter valores atualizados (evitar problemas de closure)
        const currentHits = hitsRef.current;
        const currentNewsHistoryLength = newsHistoryLengthRef.current;
        console.log(`[HitsTracker] 🎯 Verificando condições no tile 36,44: hits=${currentHits}, newsHistory.length=${currentNewsHistoryLength}`);
        
        const currentHitsPercent = currentNewsHistoryLength === 0 ? 0 : currentHits / currentNewsHistoryLength;
        console.log(`[HitsTracker] 📊 Porcentagem calculada: ${(currentHitsPercent * 100).toFixed(0)}%`);
        
        if (currentHitsPercent > 0.60) {
          console.log(`[SkateDetection] ✅ Tile 36,44 detectado com ${(currentHitsPercent * 100).toFixed(0)}% de acertos (${currentHits}/${currentNewsHistoryLength})! Ativando transporte de skate.`);
          skateTransportPendingRef.current = true;

          if (players.length > 0) {
            setActivePlayerDirection(Direction.LEFT);
          } else if (playerInstanceRef.current) {
            playerInstanceRef.current.setDirection(Direction.LEFT);
          }
          
          // Parar o personagem imediatamente
          if (playerInstanceRef.current) {
            playerInstanceRef.current.setMovesLeft(0);
            setMovesLeft(0);
          }
          
          // Iniciar transporte imediatamente (zoom out removido)
          if (triggerSkateTransportRef.current) {
            triggerSkateTransportRef.current(SINGLE_PLAYER_ID);
          } else {
            console.warn('[SkateTransport] triggerSkateTransportRef indisponível (single).');
            skateTransportPendingRef.current = false;
          }
          return;
        } else {
          console.log(`[SkateDetection] ❌ Tile 36,44 detectado mas porcentagem de acertos insuficiente: ${(currentHitsPercent * 100).toFixed(0)}% (${currentHits}/${currentNewsHistoryLength}). Necessário: >60%. Seguindo caminho normal.`);
          // Continua o fluxo normal (não retorna, deixa o personagem continuar)
        }
      }

      // === VERIFICAR TILE DO PORTAL DE DESMATERIALIZAÇÃO (CASTIGO) ===
      // Este trigger deve ser ativado SOMENTE se:
      // 1. O jogador parou de se mover (isMoving === false)
      // 2. O jogador não tem mais passos restantes (movesLeft === 0) - ou seja, é a parada FINAL
      // Isso evita ativar o portal quando o jogador está apenas passando pelo tile
      const playerMovesLeft = playerInstanceRef.current?.movesLeft ?? 0;
      const isWalkComplete = !isMoving && playerMovesLeft === 0;
      
      if (isWalkComplete &&
          !isSkateTransportActiveRef.current &&
          !skateTransportPendingRef.current &&
          !isPortalTransportActiveRef.current &&
          !portalTransportPendingRef.current &&
          nextLogicalPosition.x === PORTAL_TRIGGER_TILE.x &&
          nextLogicalPosition.y === PORTAL_TRIGGER_TILE.y) {
        
        // Usar refs para obter valores atualizados (evitar problemas de closure)
        const currentHits = hitsRef.current;
        const currentNewsHistoryLength = newsHistoryLengthRef.current;
        console.log(`[HitsTracker] 🎯 Verificando condições no tile ${PORTAL_TRIGGER_TILE.x},${PORTAL_TRIGGER_TILE.y} (Portal): hits=${currentHits}, newsHistory.length=${currentNewsHistoryLength}`);
        
        const currentHitsPercent = currentNewsHistoryLength === 0 ? 1 : currentHits / currentNewsHistoryLength;
        console.log(`[HitsTracker] 📊 Porcentagem calculada (Portal): ${(currentHitsPercent * 100).toFixed(0)}%`);
        
        // Ativar castigo se porcentagem < 90%
        if (currentHitsPercent < PORTAL_HIT_THRESHOLD) {
          console.log(`[PortalDetection] ⚠️ Tile ${PORTAL_TRIGGER_TILE.x},${PORTAL_TRIGGER_TILE.y} detectado com ${(currentHitsPercent * 100).toFixed(0)}% de acertos (${currentHits}/${currentNewsHistoryLength})! Ativando Portal de Desmaterialização (castigo).`);
          portalTransportPendingRef.current = true;
          
          // Parar o personagem imediatamente (já está com movesLeft === 0, mas garantir)
          if (playerInstanceRef.current) {
            playerInstanceRef.current.setMovesLeft(0);
            setMovesLeft(0);
          }
          
          // Iniciar transporte do portal
          if (triggerPortalTransportRef.current) {
            triggerPortalTransportRef.current(SINGLE_PLAYER_ID);
          } else {
            console.warn('[PortalTransport] triggerPortalTransportRef indisponível (single).');
            portalTransportPendingRef.current = false;
          }
          return;
        } else {
          console.log(`[PortalDetection] ✅ Tile ${PORTAL_TRIGGER_TILE.x},${PORTAL_TRIGGER_TILE.y} detectado mas porcentagem de acertos suficiente: ${(currentHitsPercent * 100).toFixed(0)}% (${currentHits}/${currentNewsHistoryLength}). Necessário: <90%. Seguindo caminho normal.`);
        }
      }

      const isPillTile = pills.some((pill) =>
        nextLogicalPosition.x === pill.TilePosition.x &&
        nextLogicalPosition.y === pill.TilePosition.y
      );
      if (isWalkComplete && isPillTile) {
        pillAudio.play();
      }

      if (isWalkComplete &&
          isPillTile &&
          !isSkateTransportActiveRef.current &&
          !skateTransportPendingRef.current &&
          !isPortalTransportActiveRef.current &&
          !portalTransportPendingRef.current &&
          !isJulgamentoTransportActiveRef.current &&
          !julgamentoTransportPendingRef.current) {
        julgamentoTransportPendingRef.current = true;
        if (triggerJulgamentoTransportRef.current) {
          triggerJulgamentoTransportRef.current(SINGLE_PLAYER_ID);
        } else {
          console.warn('[Julgamento] triggerJulgamentoTransportRef indisponível (single).');
          julgamentoTransportPendingRef.current = false;
        }
        return;
      }

      // Para depuração detalhada, reativar os logs abaixo:
      // logPlayerDebug('single:logicalPositionUpdate', {
      //   x: nextLogicalPosition.x,
      //   y: nextLogicalPosition.y
      // });
    }
  }, [getTilePositionFn, notifyPlayerRender, 
    playerOverrideScreenPosition, playerPosition, 
    setActivePlayerDirection, players]);
//}, [getTilePositionFn, logPlayerDebug, notifyPlayerRender, playerPosition]);

  // Função para lidar com alterações na posição do jogador no modo multiplayer
  const handleMultiPlayerPositionChange = useCallback((playerId: string, position: Position, isMoving: boolean) => {
    console.log(`Atualizando posição do jogador ${playerId}:`, position, 'isMoving:', isMoving);
    
    // Se for o jogador ativo, atualizar os estados gerais
    if (playerId === activePlayerId) {
      setIsPlayerMoving(isMoving);
    }
    
    // Atualizar a posição na tela para este jogador
    if (getTilePositionFn.current) {
      if ('_screenPosition' in position) {
        if (gameState === 'AnimacaoCaminhada') {
          debugSetScreenPosition('notify:interpolated', playerId, position._screenPosition as ScreenPosition, {
            isMoving,
            progressTracking: (position as any)._progress
          });
      } else {
          logPlayerDebug('ignoring interpolated position fora da AnimacaoCaminhada', {
            playerId,
            sourceState: gameState
          });
        }
      } else if (gameState !== 'AnimacaoCaminhada') {
        const screenPos = getTilePositionFn.current(position);
        if (screenPos) {
          debugSetScreenPosition('notify:calculated', playerId, screenPos, { isMoving });
        }
      }
    }

    if (!isMoving && playerId === activePlayerId && !isSkateTransportActiveRef.current) {
      console.log(`🏁 Detectado fim de movimento do jogador ativo ${playerId}`);
      handlePlayerMovementComplete(playerId, position);
      
      // // Verificar se o jogador chegou ao tile final 'F'
      // const currentTile = mapTiles.find(t => t.x === position.x && t.y === position.y);
      // console.log('🔍 Tile atual (x,y) - tipo:', currentTile?.x, currentTile?.y, currentTile?.type);
      // if (currentTile && currentTile.type === 'fim') {
      //   console.log('🏆 [handleMultiPlayerPositionChange] Jogador chegou ao fim do mapa! Mostrando painel de vitória...');
      //   setShowVictoryPanel(true);
      //   narrate('Parabéns! Você arrazou!');
      //   return;
      // }
      // Verificar se atingiu o tile 36,44 (multiplayer)
      if (playerId === activePlayerId && 
          !isSkateTransportActiveRef.current &&
          !skateTransportPendingRef.current &&
          !isPortalTransportActiveRef.current &&
          !portalTransportPendingRef.current &&
          position.x === SKATE_TRIGGER_TILE.x && 
          position.y === SKATE_TRIGGER_TILE.y) {
        
        // Usar refs para obter valores atualizados (evitar problemas de closure)
        const currentHits = hitsRef.current;
        const currentNewsHistoryLength = newsHistoryLengthRef.current;
        console.log(`[HitsTracker] 🎯 Verificando condições no tile 36,44 (multiplayer): hits=${currentHits}, newsHistory.length=${currentNewsHistoryLength}`);
        
        const currentHitsPercent = currentNewsHistoryLength === 0 ? 0 : currentHits / currentNewsHistoryLength;
        console.log(`[HitsTracker] 📊 Porcentagem calculada (multiplayer): ${(currentHitsPercent * 100).toFixed(0)}%`);
        
        if (currentHitsPercent > 0.60) {
          console.log(`[SkateDetection] ✅ Tile 36,44 detectado (multiplayer) com ${(currentHitsPercent * 100).toFixed(0)}% de acertos (${currentHits}/${currentNewsHistoryLength})! Ativando transporte de skate.`);
          skateTransportPendingRef.current = true;
          activeSkatePlayerIdRef.current = playerId;
          
          // Parar o personagem imediatamente
          setActivePlayerMoves(0);
          
          // Iniciar transporte imediatamente (zoom out removido)
          if (triggerSkateTransportRef.current) {
            triggerSkateTransportRef.current(playerId);
          } else {
            console.warn('[SkateTransport] triggerSkateTransportRef indisponível (multiplayer).');
            skateTransportPendingRef.current = false;
          }
          return;
        } else {
          console.log(`[SkateDetection] ❌ Tile 36,44 detectado (multiplayer) mas porcentagem de acertos insuficiente: ${(currentHitsPercent * 100).toFixed(0)}% (${currentHits}/${currentNewsHistoryLength}). Necessário: >60%. Seguindo caminho normal.`);
          // Continua o fluxo normal (não retorna, deixa o personagem continuar)
        }
      }

      // === VERIFICAR TILE DO PORTAL DE DESMATERIALIZAÇÃO (CASTIGO) - MULTIPLAYER ===
      // Verificar se o jogador terminou TODA a caminhada (movesLeft === 0)
      // para evitar ativar o portal quando ele está apenas passando pelo tile
      const multiPlayerActive = playersRef.current.find(p => p.id === playerId);
      const multiPlayerMovesLeft = multiPlayerActive?.movesLeft ?? 0;
      const isMultiPlayerWalkComplete = multiPlayerMovesLeft === 0;
      
      if (isMultiPlayerWalkComplete &&
          playerId === activePlayerId && 
          !isSkateTransportActiveRef.current &&
          !skateTransportPendingRef.current &&
          !isPortalTransportActiveRef.current &&
          !portalTransportPendingRef.current &&
          position.x === PORTAL_TRIGGER_TILE.x && 
          position.y === PORTAL_TRIGGER_TILE.y) {
        
        // Usar refs para obter valores atualizados (evitar problemas de closure)
        const currentHits = hitsRef.current;
        const currentNewsHistoryLength = newsHistoryLengthRef.current;
        console.log(`[HitsTracker] 🎯 Verificando condições no tile ${PORTAL_TRIGGER_TILE.x},${PORTAL_TRIGGER_TILE.y} (Portal - multiplayer): hits=${currentHits}, newsHistory.length=${currentNewsHistoryLength}`);
        
        const currentHitsPercent = currentNewsHistoryLength === 0 ? 1 : currentHits / currentNewsHistoryLength;
        console.log(`[HitsTracker] 📊 Porcentagem calculada (Portal - multiplayer): ${(currentHitsPercent * 100).toFixed(0)}%`);
        
        // Ativar castigo se porcentagem < 90%
        if (currentHitsPercent < PORTAL_HIT_THRESHOLD) {
          console.log(`[PortalDetection] ⚠️ Tile ${PORTAL_TRIGGER_TILE.x},${PORTAL_TRIGGER_TILE.y} detectado (multiplayer) com ${(currentHitsPercent * 100).toFixed(0)}% de acertos (${currentHits}/${currentNewsHistoryLength})! Ativando Portal de Desmaterialização (castigo).`);
          portalTransportPendingRef.current = true;
          activePortalPlayerIdRef.current = playerId;
          
          // Parar o personagem imediatamente (já está com movesLeft === 0, mas garantir)
          setActivePlayerMoves(0);
          
          // Iniciar transporte do portal
          if (triggerPortalTransportRef.current) {
            triggerPortalTransportRef.current(playerId);
          } else {
            console.warn('[PortalTransport] triggerPortalTransportRef indisponível (multiplayer).');
            portalTransportPendingRef.current = false;
          }
          return;
        } else {
          console.log(`[PortalDetection] ✅ Tile ${PORTAL_TRIGGER_TILE.x},${PORTAL_TRIGGER_TILE.y} detectado (multiplayer) mas porcentagem de acertos suficiente: ${(currentHitsPercent * 100).toFixed(0)}% (${currentHits}/${currentNewsHistoryLength}). Necessário: <90%. Seguindo caminho normal.`);
        }
      }
    }
    
    // Se o jogador ativo parou de se mover e não tem mais movimentos, passar a vez
    const currentPlayers = playersRef.current;
    const activePlayer = currentPlayers.find(p => p.id === activePlayerId);
    if (playerId === activePlayerId && !isMoving && activePlayer && activePlayer.movesLeft === 0) {
      shouldSelectNextNewsRef.current = true;
      nextTurnRef.current();
    }
  }, [activePlayerId, gameState, debugSetScreenPosition, logPlayerDebug, handlePlayerMovementComplete, getTilePositionFn, setActivePlayerMoves]);

  // Criar a instância do jogador quando o mapa for carregado (modo single player, mantido para compatibilidade)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isMapLoaded && !playerInstanceRef.current) {
      console.log('Criando instância do jogador (legado)');
      // CORREÇÃO: Usar ref para posição atual evitando dependência circular
      playerInstanceRef.current = new Player(
        currentPlayerPositionRef.current, 
        movementValidator, 
        handlePlayerPositionChange
      );
      // Aplicar preferências de velocidade ao novo player
      playerInstanceRef.current.setWalkingPaceDuration(gamePreferences.walkingPaceDuration);
      playerInstanceRef.current.setMovementSpeedMultiplier(gamePreferences.movementSpeedMultiplier);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapLoaded, movementValidator]); // CORREÇÃO: Remover dependências que causam loop infinito
  
  // Referência para controlar se o gerenciador já foi inicializado
  const playerManagerInitializedRef = useRef(false);
  
  // Inicializar o gerenciador de jogadores quando o mapa for carregado
  useEffect(() => {
    if (isMapLoaded && movementValidator && !playerManagerInitializedRef.current) {
      console.log('Inicializando gerenciador de jogadores');
      initializePlayerManager(movementValidator, handleMultiPlayerPositionChange);
      playerManagerInitializedRef.current = true;
    }
  }, [isMapLoaded, movementValidator, initializePlayerManager, handleMultiPlayerPositionChange]);

  // Iniciar jogo após seleção de personagens
  const handlePlayersSelected = useCallback((characterIds: string[]) => {
    console.log('🎯 [CharacterSelection] Personagens selecionados:', characterIds);
    
    // Adicionar 'tiabel36' automaticamente se não estiver presente
    const charactersWithTiabel = characterIds.includes('tiabel36')
      ? characterIds
      : ['tiabel36', ...characterIds];
    
    console.log('🤖 [CharacterSelection] Adicionando tiabel36 automaticamente:', charactersWithTiabel);
    
    // CORREÇÃO: Definir o personagem selecionado pelo usuário (não o tiabel)
    if (characterIds.length > 0) {
      setSelectedCharacterId(characterIds[0]); // Usar o primeiro personagem selecionado pelo usuário
    }
    setPendingSelectedCharacters(charactersWithTiabel);
    console.log('✅ [CharacterSelection] Personagens definidos como pendentes');
    // NÃO definir setGameStarted(false) aqui - o useEffect vai gerenciar o gameStarted
  }, []);  

  // Resetar o frame do player quando ele parar de se mover (animação de passos é dirigida por rAF em Player.moveTo)
  useEffect(() => {
    if (!isPlayerMoving && playerInstanceRef.current) {
      playerInstanceRef.current.resetSpriteFrame();
    }
  }, [isPlayerMoving]);

  // Quando o dado é rolado
  const handleDiceClick = useCallback(() => {
    // const timer = startPerfTimer('dice:click', {
    //   enabled: isDiceEnabled,
    //   animating: isDiceAnimating,
    //   moving: isPlayerMoving
    // });
    // logPerfEvent('dice:click', {
    //   enabled: isDiceEnabled,
    //   animating: isDiceAnimating,
    //   moving: isPlayerMoving
    // });

    // Verificar se o dado está habilitado
    if (!isDiceEnabled) {
      // console.log('Dado desabilitado. Complete a avaliação da notícia primeiro.');
      // timer.end({ result: 'disabled' });
      return;
    }
    setIsDiceEnabled(false);

    // Verificar condições adicionais
    const isActive = players.length === 0 || players.some(p => p.id === activePlayerId && p.isActive);
    const isPlayerAnimationOnGoing = gameState === 'AnimacaoCaminhada';

    if (isActive && !isPlayerAnimationOnGoing && !isDiceAnimating) {
      const newValue = Math.floor(Math.random() * 6) + 1;
      pendingDiceValueRef.current = newValue;
      if(diceValueDebug > 0 ) {
         pendingDiceValueRef.current = diceValueDebug;
         diceValueDebug = 0;
      }
      dispatchGameEvent({ type: 'DADO_CLICADO' });
      // timer.end({ result: 'queued', value: newValue });
    } else {
      // timer.end({ result: 'blocked' });
    }

  }, [
    isDiceEnabled, isDiceAnimating,
    players, activePlayerId, gameState, dispatchGameEvent
  ]);

  // Quando um tile é clicado
  const handleTileClick = useCallback((position: Position) => {
    console.log(`Tile clicado em (${position.x},${position.y})`);
    
    // Verificar se estamos no modo multiplayer
    if (players.length > 0) {
      const activePlayer = players.find(p => p.id === activePlayerId);
      if (activePlayer && activePlayer.movesLeft > 0 && !isPlayerMoving) {
        moveActivePlayerTo(position);
      } else {
        console.log('Movimento não permitido para o jogador ativo');
      }
    } else if (movesLeft > 0 && !isPlayerMoving && playerInstanceRef.current) {
      // Modo single player (compatibilidade)
      playerInstanceRef.current.moveTo(position);
    } else {
      console.log('Movimento não permitido');
    }
  }, [players, activePlayerId, movesLeft, isPlayerMoving, moveActivePlayerTo]);

  // Lidar com as teclas de direção e F11 para tela cheia
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tecla F11 para alternar tela cheia
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // ESC para sair da tela cheia
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
        return;
      }

      // No modo multiplayer
      if (players.length > 0) {
        const activePlayer = players.find(p => p.id === activePlayerId);
        if (!activePlayer || activePlayer.movesLeft <= 0 || isPlayerMoving) {
          console.log('Não pode se mover agora: sem movimentos ou já está em movimento');
          return;
        }

        const playerPos = activePlayer.position;
        let targetPosition: Position | null = null;

        switch (e.key) {
          case 'ArrowUp':
            targetPosition = { x: playerPos.x, y: playerPos.y - 1 };
            console.log('Tecla para cima pressionada');
            break;
          case 'ArrowDown':
            targetPosition = { x: playerPos.x, y: playerPos.y + 1 };
            console.log('Tecla para baixo pressionada');
            break;
          case 'ArrowLeft':
            targetPosition = { x: playerPos.x - 1, y: playerPos.y };
            console.log('Tecla para esquerda pressionada');
            break;
          case 'ArrowRight':
            targetPosition = { x: playerPos.x + 1, y: playerPos.y };
            console.log('Tecla para direita pressionada');
            break;
          default:
            return;
        }

        if (targetPosition) {
          console.log('Movendo para', targetPosition);
          moveActivePlayerTo(targetPosition);
        }
      } else {
        // Modo single player (compatibilidade)
        if (movesLeft <= 0 || isPlayerMoving || !playerInstanceRef.current) {
          console.log('Não pode se mover agora: sem movimentos ou já está em movimento');
          return;
        }

        let targetPosition: Position | null = null;

        switch (e.key) {
          case 'ArrowUp':
            targetPosition = { x: playerPosition.x, y: playerPosition.y - 1 };
            console.log('Tecla para cima pressionada');
            break;
          case 'ArrowDown':
            targetPosition = { x: playerPosition.x, y: playerPosition.y + 1 };
            console.log('Tecla para baixo pressionada');
            break;
          case 'ArrowLeft':
            targetPosition = { x: playerPosition.x - 1, y: playerPosition.y };
            console.log('Tecla para esquerda pressionada');
            break;
          case 'ArrowRight':
            targetPosition = { x: playerPosition.x + 1, y: playerPosition.y };
            console.log('Tecla para direita pressionada');
            break;
          default:
            return;
        }

        if (targetPosition) {
          console.log('Movendo para', targetPosition);
          playerInstanceRef.current.moveTo(targetPosition);
        }
      }
    };

    // Somente adiciona o listener de teclado se não for um dispositivo móvel
    if (!isMobile && !isTablet) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    playerPosition, movesLeft, isPlayerMoving, isMobile, isTablet,
    players, activePlayerId, moveActivePlayerTo, toggleFullscreen, isFullscreen
  ]);

  // Função para lidar com o carregamento do mapa
  const handleMapLoaded = useCallback((tiles: Tile[], startPosition: Position, tiabelPosition: Position) => {
    console.log('Mapa carregado com', tiles.length, 'tiles');
    console.log('Posição inicial:', startPosition);
    console.log('Posição do tiabel:', tiabelPosition);
    
    setMapTiles(tiles);
    setPlayerPosition(startPosition);
    setInitialMapPosition(startPosition); // NOVO: armazenar posição inicial fixa
    setIsMapLoaded(true);

    // Armazenar posição do tiabel para uso posterior
    // criar um estado específico para isso se necessário
    // setTiabelPosition(tiabelPosition);
    
    if (playerInstanceRef.current) {
      const currentPos = playerInstanceRef.current.position;
      if (currentPos.x !== startPosition.x || currentPos.y !== startPosition.y) {
        // console.log('Teleportando player para nova posição:', startPosition);
        playerInstanceRef.current.teleportTo(startPosition);
      } else {
        // console.log('Player já está na posição correta, pulando teleportTo');
      }
    }
  }, []);

  const handleLogoutFromCharacterSelection = useCallback(() => {
    logout();
  }, [logout]);

  const handleExitCurrentMatch = useCallback(() => {
    const confirmed = window.confirm('Deseja abandonar a partida e voltar para seleção de personagens?');
    if (!confirmed) return;

    window.location.reload();
  }, []);

  // NOVO: Centralização inicial quando o jogo está completamente carregado
  useEffect(() => {
    if (!isMapLoaded || !cameraControlsRef.current || !getTilePositionFn.current) {
      return;
    }

    const centerInitialPosition = () => {
      console.log('🏁 Aplicando centralização inicial...');
      
      let targetPosition = null;
      
      if (players.length > 0) {
        const activePlayer = players.find(p => p.id === activePlayerId);
        if (activePlayer) {
          targetPosition = activePlayer.position;
          console.log('📍 Centralizando em jogador multiplayer:', activePlayer.id, targetPosition);
        }
      } else if (playerPosition) {
        targetPosition = playerPosition;
        console.log('📍 Centralizando em jogador single player:', targetPosition);
      }

      if (!targetPosition) {
        console.log('⚠️ Nenhuma posição de jogador encontrada para centralização inicial');
        return;
      }

      const screenPosition = getTilePositionFn.current!(targetPosition);
      if (!screenPosition) {
        console.log('⚠️ Não foi possível obter posição na tela para centralização inicial');
        return;
      }

      const ajusteFinoPlayerX = -35;
      const ajusteFinoPlayerY = -40;
      const tileWidth = 128;
      const spriteOffsetX = (tileWidth / 2) - 32;
      const spriteOffsetY = -46;
      
      const adjustedScreenPos = {
        isoX: screenPosition.isoX + spriteOffsetX + ajusteFinoPlayerX,
        isoY: screenPosition.isoY + spriteOffsetY + ajusteFinoPlayerY
      };

      cameraControlsRef.current!.centerOnPlayer(adjustedScreenPos, 1000);
      console.log('✅ Centralização inicial aplicada');
    };

    centerInitialPosition();
  }, [isMapLoaded, players, activePlayerId, playerPosition]);

  // === CONTAINER ESTILO SIMPLIFICADO (baseado no editor-iso.html) ===
  
  // Container do jogo com estilo simples
  const gameContainerStyle = useMemo(() => {
    return {
      position: 'relative' as 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#000'
    };
  }, []);

  // NOVO: Função para animar sprites da tiabel
  const startTiabelAnimation = useCallback((): Promise<void> => {
    // Limpar animações anteriores
    if (tiabelAnimationIntervalRef.current !== null) {
      clearInterval(tiabelAnimationIntervalRef.current);
      tiabelAnimationIntervalRef.current = null;
    }
    if (tiabelAnimationTimeoutRef.current !== null) {
      clearTimeout(tiabelAnimationTimeoutRef.current);
      tiabelAnimationTimeoutRef.current = null;
    }
    if (tiabelAnimationTimerRef.current !== null) {
      tiabelAnimationTimerRef.current.cancel();
      tiabelAnimationTimerRef.current = null;
    }

    tiabelAnimationTimerRef.current = startPerfTimer('tiabel:animation');

    return new Promise<void>((resolve) => {
      setIsTiabelAnimating(true);
      setTiabelAnimationFrame(0);
      
      // Sequência de animação: down -> right -> up -> left -> down
      const animationSequence = ['down'];
      let currentSequenceIndex = 0;
      let frameCount = 0;
      //const totalFrames = 30; // Total de frames da animação
      const framesPerDirection = 36; // Frames por direção

      tiabelAnimationIntervalRef.current = setInterval(() => {
        frameCount++;
        
        // Mudar direção a cada 4 frames
        if (frameCount % framesPerDirection === 0 && currentSequenceIndex < animationSequence.length - 1) {
          currentSequenceIndex++;
          setTiabelDirection(animationSequence[currentSequenceIndex]);
          setTiabelAnimationFrame(0);
        } else {
          // Avançar frame da animação (0-35 para cada direção)
          setTiabelAnimationFrame(prev => (prev + 1) % 36);
        }
      }, 150); // 150ms por frame = animação suave

      tiabelAnimationTimeoutRef.current = setTimeout(() => {
        // Limpar intervalos
        if (tiabelAnimationIntervalRef.current !== null) {
          clearInterval(tiabelAnimationIntervalRef.current);
          tiabelAnimationIntervalRef.current = null;
        }
        tiabelAnimationTimeoutRef.current = null;
        
        // Resetar para estado inicial
        setIsTiabelAnimating(false);
        setTiabelAnimationFrame(0);
        setTiabelDirection('down');

        if (tiabelAnimationTimerRef.current) {
          tiabelAnimationTimerRef.current.end();
          tiabelAnimationTimerRef.current = null;
        }

        resolve();
      }, 5400); // 3 segundos de animação
    });
  }, []);


  // Função para tratar os cliques nos botões de avaliação
  const evaluationFunction = useCallback(async (evaluation: string) => {
    const currentNewsItem = newsHistory[0];
    const noticiaId = Number(currentNewsItem.id);
    const prev = resumoDaPartidaRef.current;

    if (!isAwaitingEvaluation || newsHistory.length === 0 ||
      lastEvaluatedNewsIdRef.current === noticiaId) {
      console.log('Nenhuma notícia para avaliar');
      return;
    }

    lastEvaluatedNewsIdRef.current = noticiaId;
    setCurrentEvaluatedNews(currentNewsItem);
    // console.log(`Avaliação selecionada: ${evaluation}`);
    // console.log(`Resposta correta: ${currentNewsItem.respCerta}`);
    
    // Comparar a avaliação com a resposta correta
    const isCorrect = 
      (evaluation === 'fake' && currentNewsItem.respcerta === 'FAKE') || 
      (evaluation === 'not-fake' && currentNewsItem.respcerta === 'NÃO FAKE');

    const fimTempoJogadaMs = performance.now();
    const inicioTempoJogadaMs = inicioTempoJogadaRef.current;
    const tempoRespostaSegundos = inicioTempoJogadaMs === null
      ? 0
      : Math.max(0, Math.round((fimTempoJogadaMs - inicioTempoJogadaMs) / 1000));

    if (inicioTempoJogadaMs === null) {
      console.warn('[ResumoPartida] ⚠️ Início do tempo da jogada não encontrado ao avaliar notícia.');
    }

    const noticiaIdNormalizada = Number.isFinite(noticiaId) ? noticiaId : -1;
    const avatarPosition =
      players.find((player) => player.character === selectedCharacterId)?.position
      ?? players.find((player) => player.id === activePlayerId)?.position
      ?? playerPosition;
    const posicaoAvatar = getPositionId(avatarPosition);

    // Atualizar o resumo da partida com a nova jogada
    const registroJogada: ResumoPartidaJogada = {
      jogadaId: prev.jogadas.length + 1,
      noticiaId: noticiaIdNormalizada,
      avaliacaoCorreta: isCorrect,
      tempoResposta: tempoRespostaSegundos,
      posicaoAvatar
    };
    resumoDaPartidaRef.current = {
      ...prev,
      jogadas: [...prev.jogadas, registroJogada]
    };

    atualizarTempoGastoResumo();
    
    // Não estamos mais aguardando avaliação (fazer isso primeiro para liberar UI)
    setIsAwaitingEvaluation(false);

    if (isCorrect) {
      // Resposta correta - incrementar contador de acertos
      setHits(prevHits => {
        const newHits = prevHits + 1;
        console.log(`[HitsTracker] ✅ Acerto registrado! hits: ${prevHits} → ${newHits}, newsHistory.length: ${newsHistory.length}`);
        return newHits;
      });
      narrate('Parabêhiins!!!!!!!!!. Role o dado!');
  
      // NOVO: Disparar animação da tiabel
      startTiabelAnimation().then(() => {
        console.log('🎉 [TiabelAnimation] Animação da tiabel concluída!');
      }).catch((error) => {
        console.error('❌ [TiabelAnimation] Erro na animação da tiabel:', error);
      });
            
      setIsDiceEnabled(true); 
      dispatchGameEvent({ type: 'AVALIACAO_CORRETA' });
      
    } else {
      // Resposta incorreta - despachar evento primeiro
      dispatchGameEvent({ type: 'AVALIACAO_INCORRETA' });
      
      setTimeout(() => {
      errorHandle();
      }, 32);
    }

    console.log(`[ResumoPartida] 🧪 JOGADA JSON de debug:\n${JSON.stringify(registroJogada, null, 2)}`);
    console.log(`[ResumoPartida] 🧪 JSON de debug (resumoDaPartida atualizado):\n${JSON.stringify(resumoDaPartidaRef.current, null, 2)}`);
    // Não enviar resumo da partida *DEBUG* (4 de 4)
    enviarResumoPartida();

    inicioTempoJogadaRef.current = null;

  }, [isAwaitingEvaluation, newsHistory, players, playerPosition, atualizarTempoGastoResumo, enviarResumoPartida, selectedCharacterId, activePlayerId, narrate, startTiabelAnimation, errorHandle]);

  // Função para trocar o modelo LLM
  // const handleModelChange = useCallback((modelId: string) => {
  //   console.log('Alterando modelo para:', modelId);
  //   setCurrentLLMModel(modelId);
  // }, []);

  // Função para reiniciar o jogo (volta para seleção de personagens)
  const handleRestartGame = useCallback(() => {
    console.log('🔄 Reiniciando jogo...');
    victorySessionTokenRef.current += 1;
    victoryPanelRequestRef.current += 1;
    victoryFlowStartedRef.current = false;
    setShowVictoryPanel(false);
    setVictoryRankingStatus('idle');
    setVictoryRankingTopEntries([]);
    setVictoryRankingCurrentPlayerEntry(null);
    setVictoryRankingErrorMessage(null);
    setVictoryPanelLoadNonce(0);
    setGameStarted(false);
    setPendingSelectedCharacters(null);
    setSelectedCharacterId(availableCharacters[0]?.id || 'caio');
    // Recarregar a página para garantir um reset completo
    window.location.reload();
  }, []);

  const startDiceAnimation = useCallback((value: number): Promise<void> => {
    if (diceAnimationIntervalRef.current !== null) {
      clearInterval(diceAnimationIntervalRef.current);
      diceAnimationIntervalRef.current = null;
    }
    if (diceAnimationTimeoutRef.current !== null) {
      clearTimeout(diceAnimationTimeoutRef.current);
      diceAnimationTimeoutRef.current = null;
    }
    if (diceRollTimerRef.current !== null) {
      diceRollTimerRef.current.cancel();
      diceRollTimerRef.current = null;
    }

    diceRollTimerRef.current = startPerfTimer('dice:animation', { targetValue: value });

    return new Promise<void>((resolve) => {
      diceAnimationIntervalRef.current = setInterval(() => {
        setRollingDiceFrame(prev => (prev + 1) % 32);
      }, 15);

      diceAnimationTimeoutRef.current = setTimeout(() => {
        if (diceAnimationIntervalRef.current !== null) {
          clearInterval(diceAnimationIntervalRef.current);
          diceAnimationIntervalRef.current = null;
        }
        diceAnimationTimeoutRef.current = null;
        setRollingDiceFrame(0);

        if (diceRollTimerRef.current) {
          diceRollTimerRef.current.end({ value });
          diceRollTimerRef.current = null;
        }

        resolve();
      }, 2000);
    });
  }, []);


  const startDiceFlow = useCallback(async () => {
    if (diceAnimationInProgressRef.current) {
      return;
    }
    diceAnimationInProgressRef.current = true;

    const value = pendingDiceValueRef.current ?? Math.floor(Math.random() * 6) + 1;
    pendingDiceValueRef.current = value;

    setIsDiceAnimating(true);

    try {
      // MODIFICAÇÃO: Chamada a setZoomToDice() removida - zoom agora é fixo via preferências
      await startDiceAnimation(value);

      setDiceValue(value);

      const currentPos = playerInstanceRef.current?.position
        ?? playersRef.current?.find(p => p.movesLeft !== undefined)?.position;
      if (currentPos) {
        setHighlightedPillId(predictLandingPill(currentPos, value));
      }

      // Aplicar aceleração do dado - multiplicar por ACELERACAO_DADO
      const acceleratedMoves = value * ACELERACAO_DADO;
      console.log(`🎲 Dado rolado: ${value}, Movimentos acelerados: ${acceleratedMoves} (${value} × ${ACELERACAO_DADO})`);

      if (players.length > 0) {
        setActivePlayerMoves(acceleratedMoves);
      } else if (playerInstanceRef.current) {
        playerInstanceRef.current.setMovesLeft(acceleratedMoves);
        setMovesLeft(playerInstanceRef.current.movesLeft);
      }
    } catch (flowError) {
      console.error('[FSM] Erro durante a animação do dado:', flowError);
    } finally {
      setIsDiceAnimating(false);
      //setIsDiceEnabled(false);
      diceAnimationInProgressRef.current = false;
      dispatchGameEvent({ type: 'DADO_ANIMACAO_FIM' });
    }
  }, [dispatchGameEvent, players.length, setActivePlayerMoves, setMovesLeft, startDiceAnimation]);

  // MODIFICAÇÃO: Funções startZoomIn e startZoomOut removidas
  // O zoom agora é fixo via preferências, não há mais transições de zoom

  const advanceToNextNews = useCallback(() => {
    shouldSelectNextNewsRef.current = true;
    dispatchGameEvent({ type: 'CAMINHADA_ANIMACAO_FIM' });
  }, [dispatchGameEvent]);

  const completeMovement = advanceToNextNews;

  const triggerSkateTransportRef = useRef<((playerId: string) => void) | null>(null);

  const triggerSkateTransport = useCallback(async (playerId: string) => {
    console.log('[SkateTransport] ========== INICIANDO TRANSPORTE DO SKATE ==========');
    console.log('[SkateTransport] Player ID:', playerId);
    
    if (isSkateTransportActiveRef.current) {
      console.warn('[SkateTransport] Transporte já está ativo, abortando');
      return;
    }

    // Liberar o estado pendente assim que iniciar o transporte
    skateTransportPendingRef.current = false;

    const getTileScreenPosition = getTilePositionFn.current;
    if (!getTileScreenPosition) {
      console.error('[SkateTransport] getTilePositionFn não disponível');
      return;
    }

    const triggerScreen = getTileScreenPosition(SKATE_TRIGGER_TILE);
    const skateStartScreen = getTileScreenPosition(SKATE_PARK_POSITION);
    const skateFlightScreen = getTileScreenPosition(SKATE_FLIGHT_DESTINATION);
    const playerFinalScreen = getTileScreenPosition(PLAYER_FINAL_DESTINATION);

    console.log('[SkateTransport] Posições calculadas:', {
      trigger: SKATE_TRIGGER_TILE,
      triggerScreen,
      skateStart: SKATE_PARK_POSITION,
      skateStartScreen,
      skateFlight: SKATE_FLIGHT_DESTINATION,
      skateFlightScreen,
      playerFinal: PLAYER_FINAL_DESTINATION,
      playerFinalScreen
    });

    if (!triggerScreen || !skateStartScreen || !skateFlightScreen || !playerFinalScreen) {
      console.error('[SkateTransport] Posições necessárias não encontradas, abortando transporte.');
      return;
    }

    console.log('[SkateTransport] Etapa 0: Entrando no estado de transporte');
    isSkateTransportActiveRef.current = true;
    activeSkatePlayerIdRef.current = playerId;
    diceEnabledBeforeSkateRef.current = isDiceEnabled;
    if (isDiceEnabled) {
      setIsDiceEnabled(false);
    }

    playerDirectionDuringSkateRef.current = playerDirectionRef.current;
    console.log('[SkateTransport] Direção anterior do jogador salva:', playerDirectionDuringSkateRef.current);
    
    const setPlayerSkateDirection = (direction: string) => {
      console.log('[SkateTransport] Mudando direção do jogador para:', direction);
      playerDirectionRef.current = direction;
      setPlayerDirection(direction);
      
      // IMPORTANTE: Também atualizar a direção na instância do Player
      const directionEnum = direction === 'up' ? Direction.UP :
                           direction === 'down' ? Direction.DOWN :
                           direction === 'left' ? Direction.LEFT :
                           direction === 'right' ? Direction.RIGHT : Direction.DOWN;
      
      if (players.length > 0) {
        setActivePlayerDirection(directionEnum);
      } else if (playerInstanceRef.current) {
        playerInstanceRef.current.setDirection(directionEnum);
      }
    };

    setIsPlayerMoving(true);

    const ongoingMovementPromise = movementPromiseRef.current;

    console.log('[SkateTransport] Zerando movesLeft do jogador');
    if (players.length > 0) {
      setActivePlayerMoves(0);
    } else if (playerInstanceRef.current) {
      playerInstanceRef.current.setMovesLeft(0);
      setMovesLeft(playerInstanceRef.current.movesLeft);
    }

    // Virar o personagem para a direita (conforme requisito)
    console.log('[SkateTransport] Virando personagem para a sua direita');
    setPlayerSkateDirection('left');

    const updatePlayerScreenForRender = (screenPosition: ScreenPosition, isMovingOverride: boolean) => {
      setPlayerOverrideScreenPosition(screenPosition);
      if (players.length > 0 && activeSkatePlayerIdRef.current) {
        debugSetScreenPosition('skate:override', activeSkatePlayerIdRef.current, screenPosition, {
          isMoving: isMovingOverride
        });
      } else {
        setPlayerScreenPosition(screenPosition);
      }
    };

    const setSkateScreenPosition = (screenPosition: ScreenPosition | null) => {
      console.log('[SkateTransport] Atualizando posição do skate:', screenPosition);
      setSkateDynamicPosition(screenPosition);
    };

    const animateSegment = (from: ScreenPosition, to: ScreenPosition, duration: number, onFrame: (screenPosition: ScreenPosition, easedProgress: number) => void) => {
      const startPosition = { ...from };
      const endPosition = { ...to };

      return new Promise<void>((resolve) => {
        let rafId: number;
        let cancelled = false;
        const startTime = performance.now();

        const step = (now: number) => {
          if (cancelled) {
            resolve();
            return;
          }

          const elapsed = now - startTime;
          const linearProgress = Math.min(elapsed / duration, 1);
          const eased = easeInOutCubic(linearProgress);
          const currentPosition: ScreenPosition = {
            isoX: startPosition.isoX + (endPosition.isoX - startPosition.isoX) * eased,
            isoY: startPosition.isoY + (endPosition.isoY - startPosition.isoY) * eased
          };

          onFrame(currentPosition, eased);

          if (linearProgress < 1) {
            rafId = requestAnimationFrame(step);
          } else {
            resolve();
          }
        };

        rafId = requestAnimationFrame(step);
        activeSkateAnimationCancelRef.current = () => {
          cancelled = true;
          cancelAnimationFrame(rafId);
        };
      }).finally(() => {
        if (activeSkateAnimationCancelRef.current) {
          activeSkateAnimationCancelRef.current = null;
        }
      });
    };

    const finalizeTransport = () => {
      setPlayerOverrideScreenPosition(null);
      setSkateScreenPosition(null);
      activeSkatePlayerIdRef.current = null;
      skateTransportPendingRef.current = false;
      
      // Manter a direção final do transporte (UP), não restaurar a anterior
      // Atualizar tanto o ref quanto a instância do Player
      playerDirectionRef.current = 'up';
      setPlayerDirection('up');
      
      // Também atualizar a direção na instância do Player para evitar sobrescrita
      if (players.length > 0) {
        // Modo multiplayer: usar o contexto
        setActivePlayerDirection(Direction.UP);
      } else if (playerInstanceRef.current) {
        // Modo single player: atualizar diretamente
        playerInstanceRef.current.setDirection(Direction.UP);
      }
      
      isSkateTransportActiveRef.current = false;
      setIsPlayerMoving(false);
      if (diceEnabledBeforeSkateRef.current) {
        setIsDiceEnabled(true);
        diceEnabledBeforeSkateRef.current = false;
      }
    };

    try {
      console.log('[SkateTransport] Etapa 1: Iniciando - Personagem salta para o skate (500ms)');
      updatePlayerScreenForRender(triggerScreen, true);
      setSkateScreenPosition(skateStartScreen);

      await animateSegment(triggerScreen, skateStartScreen, SKATE_JUMP_DURATION, (pos) => {
        updatePlayerScreenForRender(pos, true);
      });
      console.log('[SkateTransport] Etapa 1: Concluída - Personagem chegou ao skate');

      updatePlayerScreenForRender(skateStartScreen, true);

      console.log('[SkateTransport] Etapa 2: Iniciando - Skate flutua com personagem (5000ms)');
      skateAudio.play();
      await animateSegment(skateStartScreen, skateFlightScreen, SKATE_FLIGHT_DURATION, (pos) => {
        setSkateScreenPosition(pos);
        updatePlayerScreenForRender(pos, true);
      });
      console.log('[SkateTransport] Etapa 2: Concluída - Skate chegou ao destino');

      console.log('[SkateTransport] Etapa 3: Iniciando - Personagem salta para tile final (500ms)');
      // Virar o personagem para cima (conforme requisito)
      setPlayerSkateDirection('up');
      await animateSegment(skateFlightScreen, playerFinalScreen, PLAYER_LAND_DURATION, (pos) => {
        updatePlayerScreenForRender(pos, true);
      });
      console.log('[SkateTransport] Etapa 3: Concluída - Personagem pousou no tile 2,44');

      updatePlayerScreenForRender(playerFinalScreen, false);
      setSkateScreenPosition(skateFlightScreen);

      console.log('[SkateTransport] Etapa 4: Iniciando - Skate retorna à origem (5000ms)');
      await animateSegment(skateFlightScreen, skateStartScreen, SKATE_RETURN_DURATION, (pos) => {
        setSkateScreenPosition(pos);
      });
      console.log('[SkateTransport] Etapa 4: Concluída - Skate retornou à origem');

      setSkateScreenPosition(skateStartScreen);

      await ongoingMovementPromise?.catch(() => {});

      if (players.length > 0) {
        teleportActivePlayer(PLAYER_FINAL_DESTINATION);
      } else if (playerInstanceRef.current) {
        playerInstanceRef.current.teleportTo(PLAYER_FINAL_DESTINATION);
      }

      setPlayerPosition(PLAYER_FINAL_DESTINATION);
      currentPlayerPositionRef.current = PLAYER_FINAL_DESTINATION;
      setPlayerScreenPosition(playerFinalScreen);
      if (players.length > 0 && activeSkatePlayerIdRef.current) {
        debugSetScreenPosition('skate:final', activeSkatePlayerIdRef.current, playerFinalScreen, { isMoving: false });
      }

      console.log('[SkateTransport] Transporte concluído com sucesso, avançando para notícia');
      advanceToNextNews();
    } catch (error) {
      console.error('[SkateTransport] Erro durante sequência de transporte:', error);
    } finally {
      finalizeTransport();
    }
  }, [
    players,
    setActivePlayerMoves,
    playerInstanceRef,
    setMovesLeft,
    debugSetScreenPosition,
    setPlayerScreenPosition,
    teleportActivePlayer,
    setActivePlayerDirection,
    setPlayerPosition,
    isDiceEnabled,
    setIsDiceEnabled,
    advanceToNextNews
  ]);

  useEffect(() => {
    triggerSkateTransportRef.current = triggerSkateTransport;
    return () => {
      if (triggerSkateTransportRef.current === triggerSkateTransport) {
        triggerSkateTransportRef.current = null;
      }
    };
  }, [triggerSkateTransport]);

  // === PORTAL DE DESMATERIALIZAÇÃO - TRIGGER FUNCTION ===
  const triggerPortalTransportRef = useRef<((playerId: string) => void) | null>(null);

  const triggerPortalTransport = useCallback(async (playerId: string) => {
    console.log('[PortalTransport] ========== INICIANDO TRANSPORTE DO PORTAL ==========');
    console.log('[PortalTransport] Player ID:', playerId);
    
    if (isPortalTransportActiveRef.current) {
      console.warn('[PortalTransport] Transporte já está ativo, abortando');
      return;
    }

    // Liberar o estado pendente assim que iniciar o transporte
    portalTransportPendingRef.current = false;

    const getTileScreenPosition = getTilePositionFn.current;
    if (!getTileScreenPosition) {
      console.error('[PortalTransport] getTilePositionFn não disponível');
      return;
    }

    const triggerScreen = getTileScreenPosition(PORTAL_TRIGGER_TILE);
    const destinationScreen = getTileScreenPosition(PORTAL_DESTINATION_TILE);

    console.log('[PortalTransport] Posições calculadas:', {
      trigger: PORTAL_TRIGGER_TILE,
      triggerScreen,
      destination: PORTAL_DESTINATION_TILE,
      destinationScreen
    });

    if (!triggerScreen || !destinationScreen) {
      console.error('[PortalTransport] Posições necessárias não encontradas, abortando transporte.');
      return;
    }

    console.log('[PortalTransport] Etapa 0: Entrando no estado de transporte');
    isPortalTransportActiveRef.current = true;
    activePortalPlayerIdRef.current = playerId;
    diceEnabledBeforePortalRef.current = isDiceEnabled;
    if (isDiceEnabled) {
      setIsDiceEnabled(false);
    }

    setIsPlayerMoving(true);

    const ongoingMovementPromise = movementPromiseRef.current;

    console.log('[PortalTransport] Zerando movesLeft do jogador');
    if (players.length > 0) {
      setActivePlayerMoves(0);
    } else if (playerInstanceRef.current) {
      playerInstanceRef.current.setMovesLeft(0);
      setMovesLeft(playerInstanceRef.current.movesLeft);
    }

    const updatePlayerScreenForRender = (screenPosition: ScreenPosition, isMovingOverride: boolean) => {
      setPlayerOverrideScreenPosition(screenPosition);
      if (players.length > 0 && activePortalPlayerIdRef.current) {
        debugSetScreenPosition('portal:override', activePortalPlayerIdRef.current, screenPosition, {
          isMoving: isMovingOverride
        });
      } else {
        setPlayerScreenPosition(screenPosition);
      }
    };

    const setPlayerPortalDirection = (direction: string) => {
      console.log('[PortalTransport] Mudando direção do jogador para:', direction);
      playerDirectionRef.current = direction;
      setPlayerDirection(direction);
      
      const directionEnum = direction === 'up' ? Direction.UP :
                           direction === 'down' ? Direction.DOWN :
                           direction === 'left' ? Direction.LEFT :
                           direction === 'right' ? Direction.RIGHT : Direction.DOWN;
      
      if (players.length > 0) {
        setActivePlayerDirection(directionEnum);
      } else if (playerInstanceRef.current) {
        playerInstanceRef.current.setDirection(directionEnum);
      }
    };

    const finalizePortalTransport = () => {
      setPlayerOverrideScreenPosition(null);
      activePortalPlayerIdRef.current = null;
      portalTransportPendingRef.current = false;
      setPortalAnimationState('none');
      
      // Definir a direção final como 'left' (CE - Caminho Esquerdo)
      playerDirectionRef.current = 'left';
      setPlayerDirection('left');
      
      if (players.length > 0) {
        setActivePlayerDirection(Direction.LEFT);
      } else if (playerInstanceRef.current) {
        playerInstanceRef.current.setDirection(Direction.LEFT);
      }
      
      isPortalTransportActiveRef.current = false;
      setIsPlayerMoving(false);
      if (diceEnabledBeforePortalRef.current) {
        setIsDiceEnabled(true);
        diceEnabledBeforePortalRef.current = false;
      }
    };

    // Função para aguardar um tempo específico (com possibilidade de cancelamento)
    const waitWithCancel = (ms: number): Promise<void> => {
      return new Promise((resolve) => {
        const timeoutId = setTimeout(resolve, ms);
        activePortalAnimationCancelRef.current = () => {
          clearTimeout(timeoutId);
          resolve();
        };
      });
    };

    try {
      // === ETAPA 1: DESMATERIALIZAÇÃO (4 segundos) ===
      console.log('[PortalTransport] Etapa 1: Iniciando desmaterialização (4000ms)');
      portalAudio.play();
      setPortalAnimationState('dematerializing');
      updatePlayerScreenForRender(triggerScreen, true);
      
      await waitWithCancel(DEMATERIALIZATION_DURATION);
      
      console.log('[PortalTransport] Etapa 1: Concluída - Jogador desmaterializado');

      // === ETAPA 2: TELETRANSPORTE INSTANTÂNEO ===
      console.log('[PortalTransport] Etapa 2: Teletransportando para destino');
      await ongoingMovementPromise?.catch(() => {});

      // Teletransportar com posição simulada de origem para controlar a direção do próximo movimento
      // Isso evita que o jogador "volte" na direção errada após o teletransporte
      if (players.length > 0) {
        teleportActivePlayer(PORTAL_DESTINATION_TILE, PORTAL_SIMULATED_FROM_TILE);
      } else if (playerInstanceRef.current) {
        playerInstanceRef.current.teleportTo(PORTAL_DESTINATION_TILE, PORTAL_SIMULATED_FROM_TILE);
      }

      setPlayerPosition(PORTAL_DESTINATION_TILE);
      currentPlayerPositionRef.current = PORTAL_DESTINATION_TILE;
      setPlayerScreenPosition(destinationScreen);
      updatePlayerScreenForRender(destinationScreen, true);
      
      if (players.length > 0 && activePortalPlayerIdRef.current) {
        debugSetScreenPosition('portal:teleport', activePortalPlayerIdRef.current, destinationScreen, { isMoving: true });
      }
      
      console.log('[PortalTransport] Etapa 2: Concluída - Jogador teletransportado para', PORTAL_DESTINATION_TILE, 'com lastPosition simulada', PORTAL_SIMULATED_FROM_TILE);

      // === ETAPA 3: REMATERIALIZAÇÃO (4 segundos) ===
      console.log('[PortalTransport] Etapa 3: Iniciando rematerialização (4000ms)');
      portalAudio.play();
      setPortalAnimationState('rematerializing');
      setPlayerPortalDirection('left'); // Orientação CE (left)
      
      await waitWithCancel(REMATERIALIZATION_DURATION);
      
      console.log('[PortalTransport] Etapa 3: Concluída - Jogador rematerializado');

      // === FINALIZAÇÃO ===
      updatePlayerScreenForRender(destinationScreen, false);
      if (players.length > 0 && activePortalPlayerIdRef.current) {
        debugSetScreenPosition('portal:final', activePortalPlayerIdRef.current, destinationScreen, { isMoving: false });
      }

      console.log('[PortalTransport] Transporte concluído com sucesso, avançando para próxima notícia');
      advanceToNextNews();
    } catch (error) {
      console.error('[PortalTransport] Erro durante sequência de transporte:', error);
    } finally {
      finalizePortalTransport();
    }
  }, [
    players,
    setActivePlayerMoves,
    playerInstanceRef,
    setMovesLeft,
    debugSetScreenPosition,
    setPlayerScreenPosition,
    teleportActivePlayer,
    setActivePlayerDirection,
    setPlayerPosition,
    isDiceEnabled,
    setIsDiceEnabled,
    advanceToNextNews
  ]);

  useEffect(() => {
    triggerPortalTransportRef.current = triggerPortalTransport;
    return () => {
      if (triggerPortalTransportRef.current === triggerPortalTransport) {
        triggerPortalTransportRef.current = null;
      }
    };
  }, [triggerPortalTransport]);

  const triggerJulgamentoTransportRef = useRef<((playerId: string) => void) | null>(null);

  const getOppositeDirection = (direction: Direction): Direction => {
    if (direction === Direction.UP) return Direction.DOWN;
    if (direction === Direction.DOWN) return Direction.UP;
    if (direction === Direction.LEFT) return Direction.RIGHT;
    if (direction === Direction.RIGHT) return Direction.LEFT;
    if (direction === Direction.UP_LEFT) return Direction.DOWN_RIGHT;
    if (direction === Direction.UP_RIGHT) return Direction.DOWN_LEFT;
    if (direction === Direction.DOWN_LEFT) return Direction.UP_RIGHT;
    return Direction.UP_LEFT;
  };

  const getSimulatedLastPosition = (position: Position, forwardDirection: Direction): Position => {
    if (forwardDirection === Direction.UP) return { x: position.x, y: position.y + 1 };
    if (forwardDirection === Direction.DOWN) return { x: position.x, y: position.y - 1 };
    if (forwardDirection === Direction.LEFT) return { x: position.x + 1, y: position.y };
    if (forwardDirection === Direction.RIGHT) return { x: position.x - 1, y: position.y };
    if (forwardDirection === Direction.UP_LEFT) return { x: position.x + 1, y: position.y + 1 };
    if (forwardDirection === Direction.UP_RIGHT) return { x: position.x - 1, y: position.y + 1 };
    if (forwardDirection === Direction.DOWN_LEFT) return { x: position.x + 1, y: position.y - 1 };
    return { x: position.x - 1, y: position.y - 1 };
  };

  const setDirectionForJulgamento = useCallback((direction: Direction) => {
    playerDirectionRef.current = direction;
    setPlayerDirection(direction);
    if (players.length > 0) {
      setActivePlayerDirection(direction);
    } else if (playerInstanceRef.current) {
      playerInstanceRef.current.setDirection(direction);
    }
  }, [players.length, setActivePlayerDirection]);

  const judgment = useCallback((): number => {
    const pillColor = getPillColor();
    const hitsRate = newsHistoryLengthRef.current === 0
      ? 0
      : hitsRef.current / newsHistoryLengthRef.current;
    const lastDiceRaw = Math.max(1, diceValue);

    if (pillColor === 'vermelha') return -4;
    if (pillColor === 'amarela') return -Math.ceil(lastDiceRaw/2);
    if (pillColor === 'azul') return hitsRate > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;
    if (pillColor === 'verde') return Math.floor(Math.random() * 3) + 4;
    return 0;
  }, [diceValue]);

  const triggerJulgamentoTransport = useCallback(async (playerId: string) => {
    if (playerId !== SINGLE_PLAYER_ID) {
      return;
    }

    if (isJulgamentoTransportActiveRef.current) {
      console.warn('[Julgamento] Transporte já está ativo, abortando nova execução.');
      return;
    }

    julgamentoTransportPendingRef.current = false;
    isJulgamentoTransportActiveRef.current = true;
    setIsPlayerMoving(true);

    const ongoingMovementPromise = movementPromiseRef.current;
    const stepsToMove = judgment();
    const shouldReverse = stepsToMove < 0;
    const absoluteTiles = Math.abs(stepsToMove);
    const absoluteAcceleratedSteps = absoluteTiles * ACELERACAO_DADO;
    const initialDirection = playerInstanceRef.current?.direction ?? Direction.DOWN;

    console.log('[Julgamento] casas:', stepsToMove, 'passos acelerados:', absoluteAcceleratedSteps);

    const finalizeJulgamento = () => {
      isJulgamentoTransportActiveRef.current = false;
      julgamentoTransportPendingRef.current = false;
      setIsPlayerMoving(false);
    };

    try {
      await ongoingMovementPromise?.catch(() => {});

      if (stepsToMove === 0) {
        advanceToNextNews();
        return;
      }

      if (!playerInstanceRef.current) {
        console.warn('[Julgamento] playerInstanceRef indisponível, abortando.');
        advanceToNextNews();
        return;
      }

      playerInstanceRef.current.setMovesLeft(absoluteAcceleratedSteps);
      setMovesLeft(playerInstanceRef.current.movesLeft);

      if (shouldReverse) {
        setDirectionForJulgamento(getOppositeDirection(initialDirection));
        await playerInstanceRef.current.gotoBackward(absoluteAcceleratedSteps);
        
        //setDirectionForJulgamento(initialDirection);

        const finalPosition = playerInstanceRef.current.position;
        const simulatedLastPosition = getSimulatedLastPosition(finalPosition, initialDirection);
        playerInstanceRef.current.setLastPosition(simulatedLastPosition);
        if (players.length > 0) {
          setActivePlayerLastPosition(simulatedLastPosition);
        }


        const currentPosition = playerInstanceRef.current?.position;
        const currentPositionId = getPositionId(currentPosition ?? { x: 0, y: 0 });
        const finalDirection = BOARD_POSITIONS.find(
          position => position.position_id === currentPositionId)?.direction
                    ?? Direction.DOWN;    
        console.log('[Julgamento] posição atual:', currentPosition, 'id:', currentPositionId);
        console.log('[Julgamento] direção inicial:', initialDirection, 'direção final:', finalDirection);
   
        setDirectionForJulgamento(finalDirection);



      } else {
        await playerInstanceRef.current.goto(absoluteAcceleratedSteps);
      }

      setMovesLeft(playerInstanceRef.current.movesLeft);
      advanceToNextNews();
    } catch (error) {
      console.error('[Julgamento] Erro durante execução do julgamento:', error);
      advanceToNextNews();
    } finally {
      finalizeJulgamento();
    }
  }, [advanceToNextNews, judgment, players.length, setActivePlayerLastPosition, setDirectionForJulgamento]);

  useEffect(() => {
    triggerJulgamentoTransportRef.current = triggerJulgamentoTransport;
    return () => {
      if (triggerJulgamentoTransportRef.current === triggerJulgamentoTransport) {
        triggerJulgamentoTransportRef.current = null;
      }
    };
  }, [triggerJulgamentoTransport]);

  const startMovement = useCallback(() => {
  if (movementPromiseRef.current) {
    return;
  }

    const isMultiplayer = players.length > 0;
    const activePlayer = isMultiplayer ? players.find(p => p.id === activePlayerId) : null;
    const steps = isMultiplayer
      ? (activePlayer?.movesLeft ?? 0)
      : (playerInstanceRef.current?.movesLeft ?? movesLeft);

    if (steps <= 0) {
      completeMovement();
      return;
    }

    let movementPromise: Promise<void> | null = null;

    if (isMultiplayer && activePlayer) {
      movementPromise = moveActivePlayerSteps(steps);
    } else if (!isMultiplayer && playerInstanceRef.current) {
      movementPromise = playerInstanceRef.current.goto(steps);
    }

    if (!movementPromise) {
      completeMovement();
      return;
    }

    movementPromiseRef.current = movementPromise
      .then(() => {
        movementPromiseRef.current = null;
        if (!isSkateTransportActiveRef.current &&
            !isPortalTransportActiveRef.current &&
            !isJulgamentoTransportActiveRef.current) {
          completeMovement();
        }
      })
      .catch(error => {
        console.error('[FSM] Erro durante a caminhada do jogador:', error);
        movementPromiseRef.current = null;
        if (!isSkateTransportActiveRef.current &&
            !isPortalTransportActiveRef.current &&
            !isJulgamentoTransportActiveRef.current) {
          completeMovement();
        }
      });
  }, [completeMovement, moveActivePlayerSteps, movesLeft, players, activePlayerId]);

  const enterAguardandoNoticia1 = useCallback(() => {
    console.log('[FSM] Entrou em AguardandoNoticia1, aguardando 1s para mostrar notícia');
    if (newsRef.current.length > 0) {
      pendingNewsSelectionRef.current = true;
    }
    setIsAwaitingEvaluation(false);
    scheduleStateEvent(1000, { type: 'NEWS_TIMEOUT' });
  }, [scheduleStateEvent]);

  const enterAvaliacaoNoticia = useCallback(() => {
    console.log('[FSM] Entrou em AvaliacaoNoticia, habilitando avaliação');
    setIsAwaitingEvaluation(true);
  }, []);

  const enterAguardandoProximaNoticia = useCallback(() => {
    console.log('[FSM] Entrou em AguardandoProximaNoticia, aguardando botão para seguir');
    setIsAwaitingEvaluation(false);
    setHighlightedPillId(null);
  }, []);

  const enterStateHandlers = useMemo(() => {
    // MODIFICAÇÃO: Handlers de zoom removidos (AguardandoZoomIn, AnimacaoZoomIn, AguardandoZoomOut, AnimacaoZoomOut)
    return {
      AguardandoSelecao: () => {
        shouldSelectNextNewsRef.current = true;
        pendingNewsSelectionRef.current = false;
        selectionInFlightRef.current = false;
        lastEvaluatedNewsIdRef.current = null;
        resetUsedNewsCycle();
      },
      AguardandoFinalPartida: () => {
        console.log('[FSM] Entrou em AguardandoFinalPartida, aguardando final da partida');        
      },
      AguardandoProximaNoticia: enterAguardandoProximaNoticia,
      AguardandoNoticia1: enterAguardandoNoticia1,
      AvaliacaoNoticia: enterAvaliacaoNoticia,
      FecharExplicacao: () => {
        console.log('[FSM] Entrou em FecharExplicacao, aguardando usuário fechar explicação');
        setIsAwaitingEvaluation(false);
      },
      LancamentoDado: () => {
        console.log('[FSM] Entrou em LancamentoDado, habilitando dado');
        setIsDiceEnabled(true);
      },
      AnimacaoDado: () => {
        console.log('[FSM] Entrou em AnimacaoDado, aguardando término da animação do dado');
        startDiceFlow();
      },
      AguardandoCaminhada: () => {
        console.log('[FSM] Entrou em AguardandoCaminhada, aguardando 1s para iniciar caminhada');
        scheduleStateEvent(1000, { type: 'CAMINHADA_TIMEOUT' });
      },
      AnimacaoCaminhada: () => {
        console.log('[FSM] Entrou em AnimacaoCaminhada, aguardando final da caminhada');
        startMovement();
      }
    } satisfies Partial<Record<GameStateName, () => void>>;
  }, [enterAguardandoNoticia1, enterAvaliacaoNoticia, enterAguardandoProximaNoticia, resetUsedNewsCycle, scheduleStateEvent, startDiceFlow, startMovement]);

  useEffect(() => {
    if (previousGameStateRef.current === gameState) {
      return;
    }

    previousGameStateRef.current = gameState;
    const handler = enterStateHandlers[gameState];
    if (handler) {
      handler();
    }
  }, [enterStateHandlers, gameState]);

  useEffect(() => {
    if (gameState !== 'AguardandoNoticia1') {
      return;
    }

    if (pendingNewsSelectionRef.current) {
      pendingNewsSelectionRef.current = false;
      void selectNewsWithoutRepetitionRef.current();
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'AguardandoNoticia1') {
      setIsAwaitingEvaluation(false);
    }
  }, [gameState]);

  const playersRef = useRef(players);
  const nextTurnRef = useRef(nextTurn);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    nextTurnRef.current = nextTurn;
  }, [nextTurn]);


  const getPillColor = (): string => {
    const hitsRate = newsHistoryLengthRef.current === 0
      ? 0
      : hitsRef.current / newsHistoryLengthRef.current;
    if (hitsRate <  0.3) {
      return 'vermelha';
    } else if (hitsRate < 0.5) {
      return 'amarela';
    } else if (hitsRate < 1.0) {
      return 'azul';
    }
    return 'verde';
  }


  // Nenhum cleanup necessário depois de mover para refs booleanas

  // Renderização condicional da seleção de personagens ou do jogo
  if (!gameStarted || pendingSelectedCharacters) {
    return (
      <CharacterSelection 
        availableCharacters={availableCharacters}
        maxPlayers={1}
        minPlayers={1}
        onPlayersSelected={handlePlayersSelected}
        loadingSprites={spriteLoading.isLoading}
        spriteLoadingProgress={spriteLoading.progress}
        loadingCharacters={pendingSelectedCharacters ?? []}
        loadingError={spriteLoading.error}
        gamePreferences={gamePreferences}
        availableVoices={availableVoices}
        onPreferencesChange={handleGamePreferencesChange}
        onLogout={handleLogoutFromCharacterSelection}
      />
    );
  }

  function explanationPowerUpPopup(type: string, _id: number) {
    setHelpPopupType(type);
  }

  return (
    <div className="game-viewport-container">
      {/*Portrait Warning - aparece acima de tudo quando em modo retrato */}
      <PortraitWarning isVisible={orientationData.isPortrait} />
      {/* ================================================ */}
      <div className="game-container game-responsive" ref={gameContainerRef} style={gameContainerStyle}>
          {/* Seletor de Modelo LLM * /}
          <ModelSelector 
            currentModel={currentLLMModel} 
            onModelChange={handleModelChange} 
          />

          {/* Indicador de turno para mostrar qual jogador está ativo * /}
          <TurnIndicator 
            players={players}
            activePlayerId={activePlayerId}
          />
          */}

      {/* Camada isolada para UI - melhora composição e reduz reflow */}
      <div className="ui-layer">
      <button
        type="button"
        className="game-exit-button"
        onClick={handleExitCurrentMatch}
      >
        Sair
      </button>
      {/* Painel de notícias */}
      <div className={`news-board`} style={{ 
        visibility: (isAwaitingEvaluation && !showExplanationPanel) ? 'visible' : 'hidden',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000
      }}>
        <div className="news-board-content-image">
          <div className="airport-panel">
            <div className="airport-panel-content airport-panel-content--news">
              {newsContentReady ? (
                <div
                  ref={newsTextRef}
                  className="news-board-content-text"
                  style={{ fontSize: `${newsTextFontSize}px` }}
                >
                  <span className="news-board-content-text-inner">{newsText}</span>
                </div>
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.2)' }} />
              )}
            </div>
            <div className="airport-panel-footer">
              <div className="rolling-text">
                <span>Jogos Educacionais Digitais inteligentes é com a Edu4Up</span>
                <span></span>
                <span>Fato ou Fake? Aprenda a diferenciar com a JEDi Educa</span>
              </div>
            </div>
          </div>
        </div>
        <div className="button-container">
          <button 
            className="button-fake" 
            onClick={() => evaluationFunction('fake')}
            disabled={!isAwaitingEvaluation}
          />
          <button 
            className="button-not-fake" 
            onClick={() => evaluationFunction('not-fake')}
            disabled={!isAwaitingEvaluation}
          />
        </div>
      </div>

      {/* Painel de explicação */}
      <div className={`explanation-panel`} style={{ 
        visibility: showExplanationPanel ? 'visible' : 'hidden',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1100
      }}>

<div className="explanation-panel-content-image">
  <div className="airport-panel">
    <div
      className="airport-panel-content"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
    >
      {/* 1. Contêiner principal ajustado: sem 'alignItems' e sem 'flex' */}
      <div
        className="explanation-panel-content-image-content"
        style={{ display: 'flex', flexDirection: 'row', width: '100%', padding: '2px', margin: '2px' }}
      >
        {/* 2. Wrapper para a imagem com largura fixa */}
        <div style={{ flex: '0 0 160px', marginRight: '16px' }}>
          <img
            src="/tiabel-explicando-1024.png"
            alt="Imagem da tIA Bel"
            /* 3. Imagem preenche o wrapper sem distorcer */
            style={{ width: '110%', height: '110%', objectFit: 'cover', borderRadius: '50%' }}
          />
        </div>

        {/* 4. Seção de notícias cresce para preencher o espaço */}
        <div className="explanation-news-section" style={{ position: 'relative', flex: '1', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', alignContent: 'center' }}>
          <div style={{ display: 'flex', alignSelf: 'center' }}>
            <p style={{ fontSize: '30px' }}>📰 </p>
          </div>
          <div>
            <p>{explanationData?.newsText}</p>
          </div>

          {/* Carimbo FAKE - Aparece apenas para notícias FAKE com animação */}
          {currentEvaluatedNews && currentEvaluatedNews.respcerta === 'FAKE' && (
            <div className="fake-news-stamp explanation-stamp">
              <img
                src="/assets/Fake.png"
                alt="Carimbo Fake News"
                className="fake-stamp-image"
              />
            </div>
          )}
          {currentEvaluatedNews && currentEvaluatedNews.respcerta === 'NÃO FAKE' && (
            <div className="fake-news-stamp explanation-stamp">
              <img
                src="/assets/Real.png"
                alt="Carimbo Fake News"
                className="fake-stamp-image"
              />
            </div>
          )}
        </div>
      </div>

      <div className="explanation-panel-content">
        <div className="explanation-text-section" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', alignContent: 'center' }}>
          <div style={{ display: 'flex', alignSelf: 'center' }}>
            <p style={{ fontSize: '30px' }}>💡 </p>
          </div>
          <div>
            <p>{explanationData?.explanationText}</p>
          </div>
        </div>        
      </div>
    </div>
  </div>
</div>
        
        <div className="explanation-buttons">
          <button 
            className="explanation-button silence-button" 
            onClick={handleSilenceNarration}
          >
            🔇 Silenciar
          </button>
          <button 
            className="explanation-button close-button" 
            onClick={handleCloseExplanationPanel}
          >
            ❌ Fechar
          </button>
        </div>
      </div>

      {/* Painel de vitória/conclusão */}
      <VictoryPanel
        open={showVictoryPanel}
        rankingStatus={victoryRankingStatus}
        rankingTopEntries={victoryRankingTopEntries}
        rankingCurrentPlayerEntry={victoryRankingCurrentPlayerEntry}
        rankingErrorMessage={victoryRankingErrorMessage}
        onRestart={handleRestartGame}
      />

      {helpPopupType && (() => {
        const helpContent = getHelpContentByType(helpPopupType);
        return (
          <div className="help-overlay" onClick={() => setHelpPopupType(null)}>
            <div className="help-card" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="help-card-close"
                onClick={() => setHelpPopupType(null)}
                aria-label="Fechar ajuda"
              >
                ✕
              </button>
              <h2 className="help-card-title">{helpContent.title}</h2>
              <div className="help-card-body">
                {helpContent.sections.map((section, idx) => (
                  <div key={idx} className="help-section">
                    <h3 className="help-section-title">{section.title}</h3>
                    {section.paragraphs.map((p, pIdx) => (
                      <p key={pIdx} className="help-section-text">{p}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      </div>
      {/* Fim da ui-layer */}

      {/* Board isométrico com jogadores sincronizados */}
      <IsometricBoard
        ref={boardRef}
        onTileClick={handleTileClick}
        onMapLoaded={handleMapLoaded}
        onRegisterTilePosition={registerTilePositionFn}
        activePlayerPosition={
          players.length > 0 
          ? players.find(p => p.id === activePlayerId)?.position || playerPosition 
          : playerPosition
        }
        backgroundImageUrl={'cenario_jogo_fundo_1.9.png'} // MODIFICAÇÃO: Atualizado para nova imagem de fundo
        containerRef={gameContainerRef as React.RefObject<HTMLDivElement>}
        onCameraReady={handleCameraReady} // NOVO: callback para câmera
        dynamicZoomFactor={currentZoomFactor} // NOVO: zoom dinâmico
      >
        {/* === IMG do Portal no tile {x:2, y:36} === */}
          <div 
          className={`portal-container ${ hitsRef.current / newsHistoryLengthRef.current < 0.9 ? 'portal-active-effect' : ''}`}
          onClick={() => explanationPowerUpPopup('portal', 0)}
          aria-label="Portal de Desmaterialização — clique para ver as regras"
          style={{
            position: 'absolute',
            pointerEvents: 'auto',
            cursor: 'pointer',
            width: 300,
            height: 300,
            transform: `translate3d(${(getTilePositionFn.current?.({ x: 0, y: 28 })?.isoX ?? 0)-512}px, 
            ${(getTilePositionFn.current?.({ x: 0, y: 28 })?.isoY ?? 0)}px, 0)`,
            zIndex: 450
          }}>
          <img
            src="/Portal2.png"
            alt="Portal de Desmaterialização"
            style={{
              position: 'relative',
              pointerEvents: 'none',
              width: 300,
              height: 300,
              zIndex: 450
            }}
          />
          </div>

        {/* === GIF da fonte fixo no tile {x:26, y:25} === */}
        {fountainPos && (
          <img
            src="/fonte_animada.gif"
            alt="Fonte animada"
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              width: 400,
              height: 300,
              transform: `translate3d(${fountainPos.isoX + 16}px, ${fountainPos.isoY - 80}px, 0)`,
              zIndex: 450
            }}
          />
        )}
        {/* === GIF do troféu no tile {x:14, y:15} === */}
          <img
            src="/Piso_Holograma_1.png"
            alt="Piso Holograma"
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              width: 79,
              height: 118,
              transform: `translate3d(${getTilePositionFn.current?.({ x: 14, y: 14 })?.isoX}px, 
              ${(getTilePositionFn.current?.({ x: 14, y: 15 })?.isoY ?? 0) + 15}px, 0)`,

              zIndex: 450
            }}
          />
        {/* === GIF do troféu no tile {x:14, y:15} === */}
        <img
            className="ranking-image"
            src="/Ranking.png"
            alt="Troféu"
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              width: 79,
              height: 118,
              top: '-30px',
              transform: `translate3d(${getTilePositionFn.current?.({ x: 14, y: 14 })?.isoX}px, 
              ${(getTilePositionFn.current?.({ x: 14, y: 14 })?.isoY ?? 0) + 15}px, 0)`,

              zIndex: 450
            }}
          />

        {/* === GIF do skate no tile {x:34, y:44} (dinâmico) === */}
        <div 
          className={`skate-container ${ hitsRef.current / newsHistoryLengthRef.current > 0.6 ? 'skate-active-effect' : ''}`}
          onClick={() => explanationPowerUpPopup('skate', 0)}
          aria-label="Skate Magnético — clique para ver as regras"
          style={{
            fontSize: '50px',
            color: 'white',
            position: 'absolute',
            pointerEvents: 'auto',
            cursor: 'pointer',
            transform: skateDynamicPosition
              ? `translate3d(${skateDynamicPosition.isoX}px, ${skateDynamicPosition.isoY}px, 0)`
              : `translate3d(${getTilePositionFn.current?.({ x: 33, y: 43 })?.isoX || 0}px, ${getTilePositionFn.current?.({ x: 33, y: 43 })?.isoY || 0}px, 0)`,
            zIndex: 450
          }}
        >
          <img
            src="/skate-mag.png"
            alt="Skete Magnético"            
            className={`skate-mag-image ${skateDynamicPosition ? 'skate-floating-disabled' : ''}`}
            style={{
              position: 'relative',
              pointerEvents: 'none',
              width: 128,
              height: 74,
              animationPlayState: skateDynamicPosition ? 'paused' as const : 'running',
              zIndex: 1
            }}
          />
        </div>

        {/* === IMG da pirula para o tile pills[0] === */}
        <div
          className={`pirula-container${highlightedPillId === 0 ? ' pirula-active-effect' : ''}`}          
          data-pill-color={getPillColor()}
          onClick={() => explanationPowerUpPopup('pilula', 0)}
          aria-label="Pílula do Julgamento — clique para ver as regras"
          style={{
            position: 'absolute',
            pointerEvents: 'auto',
            cursor: 'pointer',
            transform: `translate3d(
              ${(getTilePositionFn.current?.(pills[0].ScreenPosition)?.isoX ?? 0)+20}px, 
              ${(getTilePositionFn.current?.(pills[0].ScreenPosition)?.isoY ?? 0)-4}px, 0)`,
            zIndex: pills[0].zIndex
          }}>
          <img
            className="pirula-image"
            src={`/pilula_${getPillColor()}.png`}
            alt="Pílula colorida"
            style={{ width: 43, height: 89, pointerEvents: 'none' }}
          />
        </div>
        {/* === IMG da pirula para o tile pills[1] === */}
        <div
          className={`pirula-container${highlightedPillId === 1 ? ' pirula-active-effect' : ''}`}
          data-pill-color={getPillColor()}
          onClick={() => explanationPowerUpPopup('pilula', 1)}
          aria-label="Pílula do Julgamento — clique para ver as regras"
          style={{
            position: 'absolute',
            pointerEvents: 'auto',
            cursor: 'pointer',
            transform: `translate3d(
              ${(getTilePositionFn.current?.(pills[1].ScreenPosition)?.isoX ?? 0)}px, 
              ${(getTilePositionFn.current?.(pills[1].ScreenPosition)?.isoY ?? 0)}px, 0)`,
            zIndex: pills[1].zIndex
          }}>
          <img
            className="pirula-image"
            src={`/pilula_${getPillColor()}.png`}
            alt="Pílula colorida"
            style={{ width: 43, height: 89, pointerEvents: 'none' }}
          />
        </div>
        {/* === IMG da pirula para o tile pills[2] === */}
        <div
          className={`pirula-container${highlightedPillId === 2 ? ' pirula-active-effect' : ''}`}
          data-pill-color={getPillColor()}
          onClick={() => explanationPowerUpPopup('pilula', 2)}
          aria-label="Pílula do Julgamento — clique para ver as regras"
          style={{
            position: 'absolute',
            pointerEvents: 'auto',
            cursor: 'pointer',
            transform: `translate3d(
              ${(getTilePositionFn.current?.(pills[2].ScreenPosition)?.isoX ?? 0)}px, 
              ${(getTilePositionFn.current?.(pills[2].ScreenPosition)?.isoY ?? 0)}px, 0)`,
            zIndex: pills[2].zIndex
          }}>
          <img
            className="pirula-image"
            src={`/pilula_${getPillColor()}.png`}
            alt="Pílula colorida"
            style={{ width: 43, height: 89, pointerEvents: 'none' }}
          />
        </div>

        {/* === GIF do lago no tile {x:34, y:44} === */}
        <div 
        className="lake-container"
        >
        <img
            src="/lake_animation.gif"
            alt="Lago"            
            className="lake-image"
            style={{
              position: 'absolute',
              imageRendering: 'auto',
              pointerEvents: 'none',
              width: 1152,
              height: 896,
              transform: `translate(0, 0) translate3d(
              ${(getTilePositionFn.current?.({ x: 0, y: 38 })?.isoX?.valueOf() ?? 0) -900}px, 
              ${getTilePositionFn.current?.({ x: 0, y: 48 })?.isoY}px, 0)`,

              zIndex: 450
            }}
          />
        </div>
        

        {/* === GIFs do GEÓLICO fixos nos tiles {19,47}, {24,47}, {29,47} === */}
        {windTurbinePosList.map((pos, idx) => (
          geradorEolico(pos, `wind-${idx}`)
        ))}

        {/* === GIFs do GEÓLICO fixos nos tiles {19,47}, {24,47}, {29,47} === */}
        {macacosPosList.map((pos, idx) => (
          macacoAnimado(pos, idx)
        ))}

        {/* 
          === JOGADORES RENDERIZADOS DENTRO DO SISTEMA DE VIEWPORT ===
          IMPORTANTE: Os jogadores são renderizados aqui para herdar automaticamente
          as transformações de zoom/pan, garantindo sincronismo perfeito com os tiles
        */}
        
        {/* Jogadores no modo multiplayer */}
        {isMapLoaded && players.length > 0 && players.map(player => {
          const isSkatePlayer = isSkateTransportActiveRef.current && player.id === activeSkatePlayerIdRef.current;
          const isPortalPlayer = isPortalTransportActiveRef.current && player.id === activePortalPlayerIdRef.current;
          const playerInstance = player.playerInstance;
          const position = playerInstance.position;
          const isMoving = playerInstance.isMoving;
          const direction = playerInstance.direction;
          const spriteFrame = playerInstance.spriteFrame;
          
          // Pegar a posição na tela para este jogador
          const screenPosition = (isSkatePlayer || isPortalPlayer) && playerOverrideScreenPosition
            ? playerOverrideScreenPosition
            : (screenPositions[player.id] || { isoX: 400, isoY: 300 });
          notifyPlayerRender('isometricBoard:multiplayer', {
            playerId: player.id,
            isMoving,
            direction,
            spriteFrame,
            isoX: screenPosition.isoX,
            isoY: screenPosition.isoY
          });
          
          // Calcular offset para jogadores na mesma posição
          const offset = getPlayerOffset(player.id, position);
          
          // Destacar o jogador ativo
          const isActive = player.id === activePlayerId;

          // Determinar estado de animação do portal para este jogador
          const playerPortalAnimationState = isPortalPlayer ? portalAnimationState : 'none';
          
          return (
            <PlayerComponent
              key={player.id}
              playerId={player.id}
              position={position}
              screenPosition={{
                isoX: screenPosition.isoX + offset.x,
                isoY: screenPosition.isoY + offset.y
              }}
              isMoving={isSkatePlayer || isPortalPlayer ? true : isMoving}
              direction={isSkatePlayer ? playerDirectionRef.current : (isPortalPlayer ? playerDirectionRef.current : direction)}
              spriteFrame={isSkatePlayer || isPortalPlayer ? playerSpriteFrameRef.current : spriteFrame}
              characterType={player.character}
              isActive={isActive}
              tileWidth={128}
              tileHeight={84}
              onRegister={() => {}}
              portalAnimationState={playerPortalAnimationState}
            />
          );
        })}

        {/* Jogador no modo single player (compatibilidade) */}
        {isMapLoaded && players.length === 0 && (
          <PlayerComponent
            playerId="single-player"
            position={playerPosition}
            screenPosition={playerScreenPosition}
            isMoving={isPlayerMoving}
            direction={playerDirection}
            spriteFrame={playerSpriteFrame}
            characterType={selectedCharacterId}
            isActive={true}
            tileWidth={128}
            tileHeight={84}
            onRegister={() => {
              if (isDebugEnabled()) {
                notifyPlayerRender('isometricBoard:single', {
                  playerId: 'single-player',
                  direction: playerDirection,
                  spriteFrame: playerSpriteFrame,
                  isoX: playerScreenPosition.isoX,
                  isoY: playerScreenPosition.isoY
                });
              }
            }}
            portalAnimationState={portalAnimationState}
          />
        )}


      {/* Tiabel sempre presente na posição fixa (x_inicial-1, y_inicial-1) */}
      {isMapLoaded && (
        <div 
          className={`tiabel-container ${isTiabelAnimating ? 'tiabel-celebrating' : ''}`}
          style={{ 
            position: 'absolute', 
            zIndex: 1000
         }}
        >
          <PlayerComponent
            playerId="tiabel-npc"
            position={{ x: initialMapPosition.x + 1, y: initialMapPosition.y - 1 }}
//            screenPosition={getTilePositionFn.current?.({ x: initialMapPosition.x + 1, y: initialMapPosition.y - 1 }) || { isoX: 0, isoY: 0 }}
            screenPosition={getTilePositionFn.current?.({ x: 18, y: 17 }) || { isoX: 0, isoY: 0 }}
            isMoving={isTiabelAnimating}
            direction={tiabelDirection}
            spriteFrame={tiabelAnimationFrame}
            characterType="tiabel36"
            isActive={isTiabelAnimating}
            tileWidth={128}
            tileHeight={84}
            idleGifSrc="/tiabel-balanco-320x180.gif"//"/tiabel-idle-39.gif"
            onRegister={() => {
              if (isDebugEnabled()) {
                console.log('🎯 [TiabelNPC] Renderizado em posição fixa:', { 
                  x: initialMapPosition.x + 1, 
                  y: initialMapPosition.y - 1,
                  animating: isTiabelAnimating,
                  direction: tiabelDirection,
                  frame: tiabelAnimationFrame
                });
              }
            }}
          />
        </div>
      )}



        {/* versão do jogo no canto inferior direito. 
        Fonte com contorno */}
        <div className="game-version" style={{
          position: 'absolute',
          top: '650px',
          left: '2650px',          
          zIndex: 10000,
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#5DAF11',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 1.0)'
        }}>
          <p style={{ transform: 'rotate(-30deg)' }}>Versão {getSimpleVersion()}</p>      
          <p style={{ display: 'none' }}>Build: {getFullVersionInfo()}</p>
        </div>


      </IsometricBoard>


      {/* Botão de tela cheia */}
      <FullscreenButton />

      {/* Painel de Status de Acertos - Sempre visível */}
      {gameStarted && (
        <div className="hits-status-panel" onClick={() => { diceValueDebug+=1; console.log('🎲 Dado debug: ', diceValueDebug); }}>
          <p className="hits-status-text">
            {hits} {hits === 1 ? 'acerto' : 'acertos'} de {newsHistory.length + (isAwaitingEvaluation? -1:0)} {newsHistory.length === 1 ? 'notícia' : 'notícias'}.
          </p>
        </div>
      )}

      {gameState === 'AguardandoProximaNoticia' && (
        <button
          className="next-news-button"
          onClick={handleNextNewsClick}
        >
          Próxima Notícia
        </button>
      )}

      {/* Dado */}
      <Dice
        value={diceValue}
        onClick={handleDiceClick}
        disabled={!isDiceEnabled || isPlayerMoving || isDiceAnimating || (players.length > 0 && (players.find(p => p.id === activePlayerId)?.movesLeft || 0) > 0)}
        isAnimating={isDiceAnimating}
        rollingDiceFrame={rollingDiceFrame}
        isZoomIn={false} // MODIFICAÇÃO: Zoom fixo via preferências - não há mais estados de zoom dinâmico
      />
      
      </div>
    </div>
  );

  function geradorEolico( windTurbinePos: ScreenPosition, key?: string ): React.ReactNode {
    return <img
      key={key}
      src="/geolico.gif"
      alt="Turbina eólica"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        width: 180,
        height: 320,
        transform: `translate3d(${windTurbinePos.isoX + 24}px, ${windTurbinePos.isoY - 132}px, 0)`,
        zIndex: 5000
      }} />;
  }

  function macacoAnimado(screenPos: ScreenPosition, index?: number): React.ReactNode {
    const monkeyIndex = typeof index === "number" ? index : 0;
    
    // Se ainda não tiver sido inicializado, retorna null
    if (monkeysState.length === 0 || !monkeysState[monkeyIndex]) {
      return null;
    }
    
    const monkey = monkeysState[monkeyIndex];
    const animations = [
      '/macaco-olhando.gif', 
      '/macaco-levantando.gif', 
      '/macaco-colorindo.gif', 
      '/macaco-batendo-palmas.gif'
    ];
    const animation = animations[monkey.animationIndex];
    
    // Calcula o scaleX baseado no flip: -1 inverte, 1 mantém normal
    const scaleX = monkey.isFlipped ? -1 : 1;

    return <img
      key={`macaco-${index}`}
      src={animation}
      alt="Macaco animado"
      style={{
        transformOrigin: 'center center',
        position: 'absolute',
        pointerEvents: 'none',
        width: 80,
        height: 80,
        transform: `translate3d(${screenPos.isoX}px, ${screenPos.isoY}px, 0) scaleX(${scaleX})`,
        zIndex: 5000
      }} 
    />;
  }


};

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (user) {
      setAuthScreen('login');
    }
  }, [user]);

  if (isLoading) {
    return null;
  }

  if (!user) {
    if (authScreen === 'register') {
      return <RegisterScreen onGoToLogin={() => setAuthScreen('login')} />;
    }

    return <LoginScreen onGoToRegister={() => setAuthScreen('register')} />;
  }

  return (
    <PlayersProvider>
      <GameContent />
    </PlayersProvider>
  );
};

// Componente App principal com Provider de contexto
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

declare global {
  interface Window {
    __JEDI_DEBUG__?: boolean;
  }
}
