import React from 'react';
import { useFullscreen } from '../hooks/useFullscreen';

interface FullscreenButtonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente de botão para controlar tela cheia
 * Mostra ícones diferentes para entrar/sair da tela cheia
 */
const FullscreenButton: React.FC<FullscreenButtonProps> = ({ 
  className = '', 
  style = {} 
}) => {
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen();

  if (!isSupported) {
    return null; // Não mostrar o botão se não houver suporte
  }

  return (
    <button
      onClick={toggleFullscreen}
      className={`fullscreen-button ${className}`}
      style={style}
      title={isFullscreen ? 'Sair da tela cheia (F11)' : 'Entrar em tela cheia (F11)'}
      aria-label={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
    >
      {isFullscreen ? (
        // Ícone para sair da tela cheia
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
        </svg>
      ) : (
        // Ícone para entrar em tela cheia
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
        </svg>
      )}
    </button>
  );
};

export default FullscreenButton;
