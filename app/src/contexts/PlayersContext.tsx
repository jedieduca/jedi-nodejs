import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { GamePlayer, PlayerManager } from '../classes/PlayerManager';
import { Position, ScreenPosition, Direction } from '../classes/Player';
import { startPerfTimer, useRenderDiagnostics } from '../utils/perfDiagnostics';

export type PlayerLevel = 'proplayer' | 'avancado' | 'casual' | 'iniciante' | 'noob';

interface PlayersContextProps {
  playerManager: PlayerManager | null;
  players: GamePlayer[];
  activePlayerId: string | null;
  playerLevel: PlayerLevel | null;
  playerName: string;
  playerAge: number | null;
  screenPositions: Record<string, ScreenPosition>;
  initializePlayerManager: (
    movementValidator: any, 
    onPlayerPositionChange: (playerId: string, position: Position, isMoving: boolean) => void
  ) => void;
  setScreenPosition: (playerId: string, position: ScreenPosition) => void;
  addPlayers: (characterIds: string[], initialPosition: Position) => void;
  nextTurn: () => void;
  setActivePlayerMoves: (moves: number) => void;
  moveActivePlayerTo: (position: Position) => Promise<boolean>;
  moveActivePlayerSteps: (steps: number) => Promise<void>;
  teleportActivePlayer: (position: Position, simulatedFromPosition?: Position) => void;
  setActivePlayerLastPosition: (position: Position | null) => void;
  setActivePlayerDirection: (direction: Direction) => void;
  getPlayerOffset: (playerId: string, position: Position) => {x: number, y: number};
  setWalkingPaceDuration: (duration: number) => void;
  setMovementSpeedMultiplier: (multiplier: number) => void;
  setPlayerLevel: (level: PlayerLevel) => void;
  setPlayerName: (name: string) => void;
  setPlayerAge: (age: number | null) => void;
}

const PlayersContext = createContext<PlayersContextProps>({
  playerManager: null,
  players: [],
  activePlayerId: null,
  playerLevel: null,
  playerName: '',
  playerAge: null,
  screenPositions: {},
  initializePlayerManager: () => {},
  setScreenPosition: () => {},
  addPlayers: () => {},
  nextTurn: () => {},
  setActivePlayerMoves: () => {},
  moveActivePlayerTo: async () => false,
  moveActivePlayerSteps: async () => {},
  teleportActivePlayer: () => {},
  setActivePlayerLastPosition: () => {},
  setActivePlayerDirection: () => {},
  getPlayerOffset: () => ({ x: 0, y: 0 }),
  setWalkingPaceDuration: () => {},
  setMovementSpeedMultiplier: () => {},
  setPlayerLevel: () => {},
  setPlayerName: () => {},
  setPlayerAge: () => {}
});

export const usePlayers = () => useContext(PlayersContext);

export const PlayersProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [playerManager, setPlayerManager] = useState<PlayerManager | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [playerLevel, setPlayerLevel] = useState<PlayerLevel | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [playerAge, setPlayerAge] = useState<number | null>(null);
  const [screenPositions, setScreenPositions] = useState<Record<string, ScreenPosition>>({});
  const playersRef = useRef<GamePlayer[]>([]);

  useRenderDiagnostics('PlayersProvider', () => ({ players: players.length }));

  // Inicializa o gerenciador de jogadores
  const initializePlayerManager = useCallback((
    movementValidator: any,
    onPlayerPositionChange: (playerId: string, position: Position, isMoving: boolean) => void
  ) => {
    if (playerManager) {
      console.log('Gerenciador de jogadores já foi inicializado, ignorando chamada');
      return;
    }
    
    console.log('Inicializando novo gerenciador de jogadores no contexto');
    const manager = new PlayerManager(movementValidator, onPlayerPositionChange);
    setPlayerManager(manager);
  }, [playerManager]);

  // Adiciona jogadores ao gerenciador
  const addPlayers = useCallback((characterIds: string[], initialPosition: Position) => {
    if (!playerManager) return;
    
    const timer = startPerfTimer('playerManager:addPlayers', {
      characters: characterIds.join(','),
      count: characterIds.length
    });

    // Limpar jogadores existentes
    players.forEach(player => {
      playerManager.removePlayer(player.id);
    });
    
    // Adicionar novos jogadores
    const newPlayers: GamePlayer[] = [];
    
    characterIds.forEach(characterId => {
      const player = playerManager.addPlayer(characterId, initialPosition);
      newPlayers.push(player);
    });
    
    setPlayers(newPlayers);
    playersRef.current = newPlayers;
    
    // Definir o jogador ativo como o primeiro
    if (newPlayers.length > 0) {
      setActivePlayerId(newPlayers[0].id);
    }

    timer.end();
  }, [playerManager, players]);

  // Atualiza a lista de jogadores quando o gerenciador muda
  useEffect(() => {
    if (playerManager) {
      const timer = startPerfTimer('playerManager:getState');
      const allPlayers = playerManager.getAllPlayers();
      setPlayers(allPlayers);
      playersRef.current = allPlayers;
      const activePlayer = playerManager.getActivePlayer();
      setActivePlayerId(activePlayer ? activePlayer.id : null);
      timer.end({ players: allPlayers.length });
    }
  }, [playerManager]);

  // Passa a vez para o próximo jogador
  const nextTurn = useCallback(() => {
    if (!playerManager) return;
    
    const timer = startPerfTimer('playerManager:nextTurn');
    playerManager.nextTurn();
    const allPlayers = playerManager.getAllPlayers();
    setPlayers(allPlayers);
    playersRef.current = allPlayers;
    
    const activePlayer = playerManager.getActivePlayer();
    setActivePlayerId(activePlayer ? activePlayer.id : null);
    timer.end({ activePlayer: activePlayer?.id });
  }, [playerManager]);

  // Define a posição na tela para um jogador
  const setScreenPosition = useCallback((playerId: string, position: ScreenPosition) => {
    setScreenPositions(prev => ({
      ...prev,
      [playerId]: position
    }));
  }, []);

  // Define o número de movimentos para o jogador ativo
  const setActivePlayerMoves = useCallback((moves: number) => {
    if (!playerManager) return;
    const timer = startPerfTimer('playerManager:setActivePlayerMoves', { moves });
    playerManager.setActivePlayerMoves(moves);
    const allPlayers = playerManager.getAllPlayers();
    setPlayers(allPlayers);
    playersRef.current = allPlayers;
    timer.end();
  }, [playerManager]);

  // Move o jogador ativo para uma posição específica
  const moveActivePlayerTo = useCallback(async (position: Position): Promise<boolean> => {
    if (!playerManager) return false;
    
    const timer = startPerfTimer('playerManager:moveActivePlayerTo', {
      targetX: position.x,
      targetY: position.y
    });
    const result = await playerManager.moveActivePlayerTo(position);
    const allPlayers = playerManager.getAllPlayers();
    setPlayers(allPlayers);
    playersRef.current = allPlayers;
    timer.end({ result });
    return result;
  }, [playerManager]);

  // Move o jogador ativo um número de passos
  const moveActivePlayerSteps = useCallback(async (steps: number): Promise<void> => {
    if (!playerManager) return;
    
    const timer = startPerfTimer('playerManager:moveActivePlayerSteps', { steps });
    await playerManager.moveActivePlayerSteps(steps);
    const allPlayers = playerManager.getAllPlayers();
    setPlayers(allPlayers);
    playersRef.current = allPlayers;
    timer.end();
  }, [playerManager]);

  // Calcula o deslocamento para jogadores na mesma posição
  const getPlayerOffset = useCallback((playerId: string, position: Position): {x: number, y: number} => {
    if (!playerManager) return { x: 0, y: 0 };
    return playerManager.getPlayerOffset(playerId, position);
  }, [playerManager]);

  const teleportActivePlayer = useCallback((position: Position, simulatedFromPosition?: Position) => {
    if (!playerManager) return;
    playerManager.teleportActivePlayer(position, simulatedFromPosition);
    const allPlayers = playerManager.getAllPlayers();
    setPlayers(allPlayers);
    playersRef.current = allPlayers;
  }, [playerManager]);

  const setActivePlayerLastPosition = useCallback((position: Position | null) => {
    if (!playerManager) return;
    playerManager.setActivePlayerLastPosition(position);
  }, [playerManager]);

  const setActivePlayerDirection = useCallback((direction: Direction) => {
    if (!playerManager) return;
    playerManager.setActivePlayerDirection(direction);
  }, [playerManager]);

  const setWalkingPaceDuration = useCallback((duration: number) => {
    if (!playerManager) return;
    playerManager.setWalkingPaceDuration(duration);
  }, [playerManager]);

  const setMovementSpeedMultiplier = useCallback((multiplier: number) => {
    if (!playerManager) return;
    playerManager.setMovementSpeedMultiplier(multiplier);
  }, [playerManager]);

  const value = {
    playerManager,
    players,
    activePlayerId,
    playerLevel,
    playerName,
    playerAge,
    screenPositions,
    initializePlayerManager,
    setScreenPosition,
    addPlayers,
    nextTurn,
    setActivePlayerMoves,
    moveActivePlayerTo,
    moveActivePlayerSteps,
    teleportActivePlayer,
    setActivePlayerLastPosition,
    setActivePlayerDirection,
    getPlayerOffset,
    setWalkingPaceDuration,
    setMovementSpeedMultiplier,
    setPlayerLevel,
    setPlayerName,
    setPlayerAge
  };

  return (
    <PlayersContext.Provider value={value}>
      {children}
    </PlayersContext.Provider>
  );
};

export default PlayersContext; 