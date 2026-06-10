import React from 'react';
import './MobileControls.css';

interface MobileControlsProps {
  onMove: (direction: string) => void;
  onRollDice: () => void;
  movesLeft: number;
  isDisabled: boolean;
}

const MobileControls: React.FC<MobileControlsProps> = ({ 
  onMove,
  onRollDice,
  movesLeft,
  isDisabled
}) => {
  return (
    <div className="mobile-controls">
      <div className="directional-pad">
        <button 
          className="control-button up" 
          onClick={() => onMove('up')}
          disabled={isDisabled || movesLeft <= 0}
          aria-label="Mover para cima"
        >
          <span className="arrow-icon">▲</span>
        </button>
        
        <div className="middle-row">
          <button 
            className="control-button left" 
            onClick={() => onMove('left')}
            disabled={isDisabled || movesLeft <= 0}
            aria-label="Mover para esquerda"
          >
            <span className="arrow-icon">◀</span>
          </button>
          
          <div className="center-button"></div>
          
          <button 
            className="control-button right" 
            onClick={() => onMove('right')}
            disabled={isDisabled || movesLeft <= 0}
            aria-label="Mover para direita"
          >
            <span className="arrow-icon">▶</span>
          </button>
        </div>
        
        <button 
          className="control-button down" 
          onClick={() => onMove('down')}
          disabled={isDisabled || movesLeft <= 0}
          aria-label="Mover para baixo"
        >
          <span className="arrow-icon">▼</span>
        </button>
      </div>
      
      <div className="action-button-container">
        <button 
          className="action-button" 
          onClick={onRollDice}
          disabled={isDisabled || movesLeft > 0}
          aria-label="Rolar dado"
        >
          Rolar Dado
        </button>
      </div>
    </div>
  );
};

export default MobileControls; 