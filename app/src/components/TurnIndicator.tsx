import React from 'react';
import { GamePlayer } from '../classes/PlayerManager';
import './TurnIndicator.css';

interface TurnIndicatorProps {
  players: GamePlayer[];
  activePlayerId: string | null;
}

const TurnIndicator: React.FC<TurnIndicatorProps> = ({ players, activePlayerId }) => {
  if (players.length === 0) return null;

  return (
    <div className="turn-indicator">
      <h3 className="turn-indicator-title">Jogadores</h3>
      <div className="players-list">
        {players.map(player => (
          <div 
            key={player.id} 
            className={`player-indicator ${player.id === activePlayerId ? 'active' : ''}`}
          >
            <div className="player-avatar">
              <img 
                src={`/assets/sprites/${player.character}/${player.character}.png`}
                alt={`Jogador ${player.character}`}
                className="player-avatar-image"
              />
            </div>
            <div className="player-info">
              <div className="player-name">
                {player.id === activePlayerId ? '➤ ' : ''}
                Jogador {players.indexOf(player) + 1}
              </div>
              {player.id === activePlayerId && (
                <div className="player-status">Sua vez</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TurnIndicator; 