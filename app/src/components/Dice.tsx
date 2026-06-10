import React, { useMemo } from 'react';
import './Dice.css';
import { useResponsive } from '../utils/responsive';

interface DiceProps {
  value: number;
  onClick: () => void;
  disabled?: boolean;
  isAnimating?: boolean;
  rollingDiceFrame?: number;
  isZoomIn?: boolean;
}

const Dice: React.FC<DiceProps> = ({ 
  value, 
  onClick, 
  disabled = false, 
  isAnimating = false, 
  rollingDiceFrame = 0,
  isZoomIn = false 
}) => {
  // Obter informações de responsividade
  const { isMobile, isTablet, scale } = useResponsive();

  const handleClick = () => {
    if (!disabled && !isAnimating) {
      onClick();
    }
  };

  // Se estiver animando, usa a imagem dinâmica de rolagem
  const diceAnimationClass = isAnimating
    ? 'rolling-dice-' + (rollingDiceFrame + 1).toString().padStart(2, '0')
    : '';

  const diceClass = isAnimating 
    ? 'dice lift-drop' 
    : `dice dice-${value} ${disabled ? 'disabled' : ''}`;
  
  // Aplicar escala com base no tipo de dispositivo
  const diceStyle = useMemo(() => {
    // Responsivamente ajustar o tamanho e a posição do dado
    const baseScale = isMobile ? 1.0 : isTablet ? 1.0 : 1.0;
    const adjustedScale = baseScale * scale;
    
    return {
      transform: `scale(${adjustedScale})`,
      bottom: isMobile ? '10px' : '20px'
    };
  }, [isMobile, isTablet, scale]);

  return (
    <div className={`dice-container ${isZoomIn ? 'zoomed-in' : ''}`} style={diceStyle}>
      <div 
        className={`dice-roll-animation ${diceClass} ${diceAnimationClass}`}
        onClick={handleClick}
        data-testid="dice"
        aria-label={`Dado mostrando ${value}`}
        role="button"
        aria-disabled={disabled}
      />
      <div
        className={`dice-support-image ${disabled ? 'disabled' : ''}`}
        aria-hidden="true"
      />
      </div>
  );
};

export default Dice;
