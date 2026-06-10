/**
 * Hook simplificado para zoom fixo do tabuleiro
 * 
 * MODIFICAÇÃO: Sistema de zoom dinâmico removido.
 * Agora usa fator fixo configurável via preferências.
 * 
 * Histórico:
 * - Antes: zoom dinâmico entre 1x (normal) e 3x (dice) com transições animadas
 * - Agora: fator fixo configurável sem transições
 */

import { clampCameraDistanceFactor, getDefaultCameraDistanceFactor } from '../config/camera';

// Mantém o tipo para compatibilidade com código existente
export type ZoomState = 'normal' | 'dice' | 'transitioning';

// Props mantidas para compatibilidade (normalZoomFactor é usado como fator fixo)
interface UseDynamicZoomProps {
  normalZoomFactor?: number;
  diceZoomFactor?: number;
  transitionDuration?: number;
}

interface ZoomControls {
  currentZoomState: ZoomState;
  currentZoomFactor: number;
  setZoomToNormal: () => Promise<void>;
  setZoomToDice: () => Promise<void>;
  isTransitioning: boolean;
}

/**
 * Hook simplificado que retorna fator de zoom fixo.
 * 
 * As funções setZoomToNormal e setZoomToDice são mantidas para compatibilidade
 * mas agora são no-ops (não fazem nada).
 */
export const useDynamicZoom = (props: UseDynamicZoomProps = {}): ZoomControls => {
  const resolvedFactor = Number.isFinite(props.normalZoomFactor)
    ? clampCameraDistanceFactor(props.normalZoomFactor as number)
    : getDefaultCameraDistanceFactor();

  // Funções no-op para compatibilidade - não alteram o zoom
  const setZoomToNormal = async (): Promise<void> => {
    // No-op: zoom fixo, não há transição
    return Promise.resolve();
  };

  const setZoomToDice = async (): Promise<void> => {
    // No-op: zoom fixo, não há transição
    return Promise.resolve();
  };

  return {
    currentZoomState: 'normal', // Sempre 'normal' com zoom fixo
    currentZoomFactor: resolvedFactor, // Fator fixo configurável
    setZoomToNormal,
    setZoomToDice,
    isTransitioning: false // Nunca está em transição
  };
};
