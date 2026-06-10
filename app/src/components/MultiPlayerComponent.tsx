import React from 'react';
import PlayerComponent from './Player';
import { GamePlayer } from '../classes/PlayerManager';
import { Position, ScreenPosition } from '../classes/Player';

interface MultiPlayerComponentProps {
  players: GamePlayer[];
  activePlayerId: string | null;
  screenPositions: Record<string, ScreenPosition>;
  getPlayerOffset: (playerId: string, position: Position) => {x: number, y: number};
  isMobile: boolean;
}

const MultiPlayerComponent: React.FC<MultiPlayerComponentProps> = ({
  players,
  activePlayerId,
  screenPositions,
  getPlayerOffset,
  isMobile
}) => {
  if (players.length === 0) return null;

  return (
    <>
      {players.map(player => {
        const playerInstance = player.playerInstance;
        const position = playerInstance.position;
        const isMoving = playerInstance.isMoving;
        const direction = playerInstance.direction;
        const spriteFrame = playerInstance.spriteFrame;
        
        // Pegar a posição na tela para este jogador
        const screenPosition = screenPositions[player.id] || { isoX: 400, isoY: 300 };
        
        // Calcular offset para jogadores na mesma posição
        const offset = getPlayerOffset(player.id, position);
        
        // Destacar o jogador ativo
        const isActive = player.id === activePlayerId;
        
        return (
          <PlayerComponent
            key={player.id}
            playerId={player.id}
            position={position}
            screenPosition={{
              isoX: screenPosition.isoX + (isMobile ? 10 : 15) + offset.x,
              isoY: screenPosition.isoY - (isMobile ? 3 : 5) + offset.y
            }}
            isMoving={isMoving}
            direction={direction}
            spriteFrame={spriteFrame}
            characterType={player.character}
            isActive={isActive}
            onRegister={() => {}}
          />
        );
      })}
    </>
  );
};

export default MultiPlayerComponent; 