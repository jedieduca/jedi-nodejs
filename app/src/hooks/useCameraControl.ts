import { useCallback, useRef } from 'react';
import { ScreenPosition } from '../classes/Player';

interface UseCameraControlProps {
  stageRef: React.RefObject<HTMLDivElement | null>;
  worldWidth: number;
  worldHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  worldCenterX?: number; // centro em coordenadas isométricas (px)
  worldCenterY?: number; // centro em coordenadas isométricas (px)
}

interface CameraState {
  offsetX: number;
  offsetY: number;
  currentScale: number;
}

export const useCameraControl = ({
  stageRef,
  worldWidth,
  worldHeight,
  containerRef,
  worldCenterX,
  worldCenterY
}: UseCameraControlProps) => {
  
  // Estado da câmera (offset + escala atual do sistema responsivo)
  const cameraStateRef = useRef<CameraState>({
    offsetX: 0,
    offsetY: 0,
    currentScale: 1 // Será sincronizada pelo sistema responsivo
  });

  // Função para atualizar a transformação do stage mantendo compatibilidade
  const updateStageTransform = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const { offsetX, offsetY } = cameraStateRef.current;
    
    // CORREÇÃO: Aplicar transformações na ordem correta
    // 1. Centralização base (-50%, -50%)
    // 2. Escala explícita
    // 3. Offset da câmera (pós-escala)
    const scale = cameraStateRef.current.currentScale;
    stage.style.transform = `translate(-50%, -50%) scale(${scale}) translate(${offsetX / scale}px, ${offsetY / scale}px)`;
    
    //console.log(`🔄 Transform aplicado: translate(-50%, -50%) scale(var(--scale, 1)) translate(${offsetX}px, ${offsetY}px)`);
  }, [stageRef]);

  // Função para sincronizar com mudanças de escala do sistema responsivo
  const syncScale = useCallback((newScale: number) => {
    const prevScale = cameraStateRef.current.currentScale;
    if (prevScale !== 0 && prevScale !== newScale) {
      const ratio = newScale / prevScale;
      cameraStateRef.current.offsetX *= ratio;
      cameraStateRef.current.offsetY *= ratio;
    }
    cameraStateRef.current.currentScale = newScale;
    // Reaplica a transformação com a nova escala
    updateStageTransform();
  }, [updateStageTransform]);

  // Função para centralizar suavemente o player na tela
  const centerOnPlayer = useCallback(async (
    playerScreenPosition: ScreenPosition,
    duration: number = 1000
  ): Promise<void> => {
    const stage = stageRef.current;
    const container = containerRef.current;
    
    if (!stage || !container) {
      console.warn('Stage ou container não disponível para centralização da câmera');
      return;
    }

    // Obter dimensões atuais do container
    const containerRect = container.getBoundingClientRect();

    const currentScale = cameraStateRef.current.currentScale;
    console.log(`🔍 Escala detectada: ${currentScale}, Container: ${containerRect.width}x${containerRect.height}`);

    // Posição do player no mundo escalado (relativa ao centro do stage)
    // O stage já está centralizado com translate(-50%, -50%), então precisamos
    // calcular a posição relativa ao centro do mundo
    const centerX = (typeof worldCenterX === 'number') ? worldCenterX : (worldWidth / 2);
    const centerY = (typeof worldCenterY === 'number') ? worldCenterY : (worldHeight / 2);
    
    // Calcular offset necessário para alinhar o player ao centro do palco, em pixels de tela
    const targetOffsetX = (centerX - playerScreenPosition.isoX) * currentScale;
    const targetOffsetY = (centerY - playerScreenPosition.isoY) * currentScale;

    // Aplicar limites para não sair dos bounds do mundo (em pixels de tela)
    const stageHalfWidth = (worldWidth * currentScale) / 2;
    const stageHalfHeight = (worldHeight * currentScale) / 2;
    const containerHalfWidth = containerRect.width / 2;
    const containerHalfHeight = containerRect.height / 2;

    let minOffsetX = containerHalfWidth - stageHalfWidth;
    let maxOffsetX = stageHalfWidth - containerHalfWidth;
    let minOffsetY = containerHalfHeight - stageHalfHeight;
    let maxOffsetY = stageHalfHeight - containerHalfHeight;

    if (minOffsetX > maxOffsetX) {
      minOffsetX = 0;
      maxOffsetX = 0;
    }
    if (minOffsetY > maxOffsetY) {
      minOffsetY = 0;
      maxOffsetY = 0;
    }

    const clampedOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, targetOffsetX));
    const clampedOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, targetOffsetY));

    // Posições inicial e final para animação
    const startOffsetX = cameraStateRef.current.offsetX;
    const startOffsetY = cameraStateRef.current.offsetY;
    const startTime = performance.now();

    console.log(`🎥 Centralizando câmera no player:`);
    console.log(`  📍 Player: (${playerScreenPosition.isoX}, ${playerScreenPosition.isoY})`);
    console.log(`  🌍 World Center: (${centerX}, ${centerY})`);
    console.log(`  📏 Container: ${containerRect.width}x${containerRect.height}`);
    console.log(`  🔍 Scale: ${currentScale}`);
    console.log(`  ➡️ Target Offset: (${targetOffsetX}, ${targetOffsetY})`);
    console.log(`  📐 Clamped Offset: (${clampedOffsetX}, ${clampedOffsetY})`);
    console.log(`  🔒 Max Offset: (${maxOffsetX}, ${maxOffsetY})`);

    return new Promise<void>((resolve) => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Aplicar easing suave (ease-out) para movimento natural
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        // Interpolar offsets
        const currentOffsetX = startOffsetX + (clampedOffsetX - startOffsetX) * easedProgress;
        const currentOffsetY = startOffsetY + (clampedOffsetY - startOffsetY) * easedProgress;
        
        // Atualizar estado da câmera
        cameraStateRef.current.offsetX = currentOffsetX;
        cameraStateRef.current.offsetY = currentOffsetY;
        
        // Aplicar transformação
        updateStageTransform();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          console.log('✅ Centralização da câmera concluída');
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }, [stageRef, containerRef, worldWidth, worldHeight, updateStageTransform, worldCenterX, worldCenterY]);

  // Função para resetar a câmera (voltar ao centro)
  const resetCamera = useCallback(async (duration: number = 500): Promise<void> => {
    const startOffsetX = cameraStateRef.current.offsetX;
    const startOffsetY = cameraStateRef.current.offsetY;
    const startTime = performance.now();

    console.log('🔄 Resetando câmera para posição central');

    return new Promise<void>((resolve) => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentOffsetX = startOffsetX + (0 - startOffsetX) * easedProgress;
        const currentOffsetY = startOffsetY + (0 - startOffsetY) * easedProgress;
        
        cameraStateRef.current.offsetX = currentOffsetX;
        cameraStateRef.current.offsetY = currentOffsetY;
        
        updateStageTransform();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          console.log('✅ Reset da câmera concluído');
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }, [updateStageTransform]);

  // Função para obter o offset atual da câmera
  const getCurrentOffset = useCallback(() => ({
    x: cameraStateRef.current.offsetX,
    y: cameraStateRef.current.offsetY
  }), []);

  return {
    centerOnPlayer,
    resetCamera,
    syncScale,
    getCurrentOffset
  };
};
