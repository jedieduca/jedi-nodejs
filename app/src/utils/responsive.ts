import { useState, useEffect } from 'react';

// Tipos de dispositivos
export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop'
}

// Interface para o estado de responsividade
export interface ResponsiveState {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  width: number;
  height: number;
  scale: number;
}

// Função para detectar se é um dispositivo touch
export const isTouchDevice = (): boolean => {
  return (('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0));
};

// Hook personalizado para gerenciar responsividade
export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>({
    deviceType: DeviceType.DESKTOP,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isPortrait: false,
    isLandscape: true,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: 1.0
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;
      
      // Determinar tipo de dispositivo baseado no tamanho da tela e touch
      let deviceType = DeviceType.DESKTOP;
      let scale = 1.0;
      
      if (width < 768 || isTouchDevice()) {
        deviceType = DeviceType.MOBILE;
        // Escala reduzida para dispositivos móveis
        scale = width < 480 ? 0.6 : 0.8;
      } else if (width < 1024) {
        deviceType = DeviceType.TABLET;
        scale = 0.85;
      }

      setState({
        deviceType,
        isMobile: deviceType === DeviceType.MOBILE,
        isTablet: deviceType === DeviceType.TABLET,
        isDesktop: deviceType === DeviceType.DESKTOP,
        isPortrait,
        isLandscape: !isPortrait,
        width,
        height,
        scale
      });
    };

    // Executar uma vez na inicialização
    handleResize();

    // Adicionar listener para redimensionamento
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return state;
};

// Função para calcular tamanho com base na escala
export const getScaledSize = (baseSize: number, scale: number): number => {
  return Math.round(baseSize * scale);
};

// Função para calcular a escala ideal para ajustar o mapa na tela
export const calculateOptimalScale = (
  mapWidth: number, 
  mapHeight: number, 
  containerWidth: number, 
  containerHeight: number,
  minScale: number = 0.3,
  maxScale: number = 1.2
): number => {
  // Calcular a escala com base na largura e altura disponíveis
  const scaleX = containerWidth / mapWidth;
  const scaleY = containerHeight / mapHeight;
  
  // Usar a menor escala para garantir que todo o mapa caiba na tela
  let scale = Math.min(scaleX, scaleY);
  
  // Garantir que a escala esteja dentro dos limites mínimos e máximos
  scale = Math.max(minScale, Math.min(scale, maxScale));
  
  // Para dispositivos móveis, ajustar um pouco para deixar espaço para os controles
  if (isTouchDevice() || window.innerWidth < 768) {
    scale *= 0.9; // Reduzir 10% para deixar espaço para controles
  }
  
  return scale;
}; 