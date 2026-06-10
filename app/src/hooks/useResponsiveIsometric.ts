import { useEffect, useCallback, useRef } from 'react';
import { useOrientationDetection } from './useOrientationDetection';
import { clampCameraDistanceFactor, getDefaultCameraDistanceFactor } from '../config/camera';

interface UseResponsiveIsometricProps {
  worldWidth: number;
  worldHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  stageRef: React.RefObject<HTMLDivElement | null>;
  onScaleChange?: (scale: number) => void;
  dynamicZoomFactor?: number; // Fator de zoom aplicado sobre a escala base
}

/**
 * Hook para implementar responsividade do palco isométrico mantendo o aspecto.
 * 
 * MODIFICAÇÃO: Agora usa fator de zoom configurável (dynamicZoomFactor ou fallback responsivo).
 * 
 * Calcula automaticamente a escala que faz o palco (worldWidth x worldHeight) 
 * sempre "caber" na janela e ficar centralizado, mantendo a proporção original.
 */
export const useResponsiveIsometric = ({
  worldWidth,
  worldHeight,
  containerRef,
  stageRef,
  onScaleChange,
  dynamicZoomFactor
}: UseResponsiveIsometricProps) => {
  
  // Hook para detecção robusta de orientação
  const orientationData = useOrientationDetection();
  const rafIdRef = useRef<number | null>(null);
  
  // Função para calcular e aplicar a escala responsiva
  const fitStageToContainer = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    rafIdRef.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      const stage = stageRef.current;

      if (!container || !stage) {
        return;
      }

      const { actualWidth: orientationWidth, actualHeight: orientationHeight, isPortrait } = orientationData;

      const fallbackWidth = container.clientWidth || container.offsetWidth || container.getBoundingClientRect().width;
      const fallbackHeight = container.clientHeight || container.offsetHeight || container.getBoundingClientRect().height;

      const containerWidth = orientationWidth > 0 ? orientationWidth : fallbackWidth;
      const containerHeight = orientationHeight > 0 ? orientationHeight : fallbackHeight;

      const scaleX = containerWidth / worldWidth;
      const scaleY = containerHeight / worldHeight;

      // Calcula escala base que faz o mundo caber no container
      let scale = Math.min(scaleX, isPortrait ? scaleY * 0.85 : scaleY);
      
      // Aplica fator de zoom configurável (constante global ou prop)
      const zoomFactor = Number.isFinite(dynamicZoomFactor)
        ? clampCameraDistanceFactor(dynamicZoomFactor as number)
        : getDefaultCameraDistanceFactor();
      scale *= zoomFactor;

      const MIN_SCALE = 0.25;
      const MAX_SCALE = 3.5;
      scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

      onScaleChange?.(scale);

      rafIdRef.current = null;
    });
  }, [worldWidth, worldHeight, onScaleChange, containerRef, stageRef, orientationData, dynamicZoomFactor]);
  
  useEffect(() => {
    // Aplicar escala inicial
    fitStageToContainer();
    
    // Listener para redimensionamento da janela
    const handleResize = () => {
      fitStageToContainer();
    };
    
    // Listener para mudança de orientação (dispositivos móveis)
    const handleOrientationChange = () => {
      // Pequeno delay para aguardar a mudança de orientação se completar
      setTimeout(() => {
        fitStageToContainer();
      }, 100);
    };
    
    // Adicionar os listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Observer para mudanças no container (caso seja redimensionado programaticamente)
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        fitStageToContainer();
      });
      resizeObserver.observe(containerRef.current);
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);

      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [fitStageToContainer, containerRef]);
  
  return {
    fitStageToContainer,
    forceRecenter: fitStageToContainer // Expor função para recentralização forçada
  };
};
