import { useEffect, useState } from 'react';

export interface OrientationData {
  isPortrait: boolean;
  actualWidth: number;
  actualHeight: number;
  detectionMethod: string;
}

/**
 * Hook para detectar orientação de forma robusta usando múltiplas abordagens
 */
export const useOrientationDetection = () => {
  const [orientationData, setOrientationData] = useState<OrientationData>({
    isPortrait: false,
    actualWidth: 0,
    actualHeight: 0,
    detectionMethod: 'initial'
  });

  const detectOrientation = () => {
    // Método 1: Window dimensions (mais confiável)
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Método 2: Screen dimensions 
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    // Método 3: Visual viewport (se disponível)
    const visualViewportWidth = window.visualViewport?.width || windowWidth;
    const visualViewportHeight = window.visualViewport?.height || windowHeight;
    
    // Método 4: Document dimensions
    const documentWidth = document.documentElement.clientWidth;
    const documentHeight = document.documentElement.clientHeight;
    
    console.log('🔍 ORIENTAÇÃO DEBUG: === MÚLTIPLAS DETECÇÕES ===');
    console.log('🔍 ORIENTAÇÃO DEBUG: Window:', windowWidth, 'x', windowHeight);
    console.log('🔍 ORIENTAÇÃO DEBUG: Screen:', screenWidth, 'x', screenHeight);
    console.log('🔍 ORIENTAÇÃO DEBUG: VisualViewport:', visualViewportWidth, 'x', visualViewportHeight);
    console.log('🔍 ORIENTAÇÃO DEBUG: Document:', documentWidth, 'x', documentHeight);
    
    // Priorizar VisualViewport quando disponível para refletir a área útil real
    const width = window.visualViewport?.width || windowWidth;
    const height = window.visualViewport?.height || windowHeight;
    
    // Detectar portrait de forma mais robusta
    const isPortrait = height > width && width < 900; // Adicionar limite para desktop
    
    const detectionMethod = 'window.inner';
    
    console.log('🔍 ORIENTAÇÃO DEBUG: ESCOLHIDO:', width, 'x', height, '| Portrait:', isPortrait, '| Método:', detectionMethod);
    
    setOrientationData({
      isPortrait,
      actualWidth: width,
      actualHeight: height,
      detectionMethod
    });
  };

  useEffect(() => {
    // Detectar na inicialização
    detectOrientation();

    // Listeners para mudanças
    const handleResize = () => {
      console.log('🔍 ORIENTAÇÃO DEBUG: Evento RESIZE detectado');
      detectOrientation();
    };

    const handleOrientationChange = () => {
      console.log('🔍 ORIENTAÇÃO DEBUG: Evento ORIENTATIONCHANGE detectado');
      // Delay para aguardar a mudança se completar
      setTimeout(detectOrientation, 100);
    };

    const handleVisualViewportChange = () => {
      console.log('🔍 ORIENTAÇÃO DEBUG: Evento VISUALVIEWPORT CHANGE detectado');
      detectOrientation();
    };

    // Adicionar listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, []);

  return orientationData;
};
