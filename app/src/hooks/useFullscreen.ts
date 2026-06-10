import { useState, useEffect, useCallback } from 'react';

// Declarações de tipo para APIs de fullscreen específicas do navegador
interface HTMLElementWithFullscreen extends HTMLElement {
  webkitRequestFullscreen?: () => void;
  mozRequestFullScreen?: () => void;
  msRequestFullscreen?: () => void;
}

interface DocumentWithFullscreen extends Document {
  requestFullscreen?: () => void;
  webkitRequestFullscreen?: () => void;
  mozRequestFullScreen?: () => void;
  msRequestFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  mozCancelFullScreen?: () => void;
  msExitFullscreen?: () => void;
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  mozFullScreenEnabled?: boolean;
  msFullscreenEnabled?: boolean;
}

interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  isSupported: boolean;
}

/**
 * Hook para gerenciar funcionalidade de tela cheia
 * Suporta diferentes navegadores e dispositivos
 */
export const useFullscreen = (): UseFullscreenReturn => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Verificar suporte a fullscreen
  useEffect(() => {
    const checkSupport = () => {
      const doc = document as DocumentWithFullscreen;
      const isSupported = !!(
        doc.fullscreenEnabled ||
        doc.webkitFullscreenEnabled ||
        doc.mozFullScreenEnabled ||
        doc.msFullscreenEnabled
      );
      setIsSupported(isSupported);
    };

    checkSupport();
  }, []);

  // Escutar mudanças no estado de fullscreen
  useEffect(() => {
    if (!isSupported) return;

    const handleFullscreenChange = () => {
      const doc = document as DocumentWithFullscreen;
      const isCurrentlyFullscreen = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    // Adicionar listeners para diferentes navegadores
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isSupported]);

  // Entrar em tela cheia
  const enterFullscreen = useCallback(() => {
    if (!isSupported) {
      console.warn('Fullscreen não é suportado neste navegador');
      return;
    }

    const element = document.documentElement as HTMLElementWithFullscreen;
    const doc = document as DocumentWithFullscreen;

    if (doc.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }, [isSupported]);

  // Sair da tela cheia
  const exitFullscreen = useCallback(() => {
    if (!isSupported) {
      console.warn('Fullscreen não é suportado neste navegador');
      return;
    }

    const doc = document as DocumentWithFullscreen;

    if (doc.exitFullscreen) {
      doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen) {
      doc.msExitFullscreen();
    }
  }, [isSupported]);

  // Alternar entre tela cheia e normal
  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    isSupported
  };
};
