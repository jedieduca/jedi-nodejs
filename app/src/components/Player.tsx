import React, { memo, useEffect, useRef, useState } from 'react';
import './Player.css';
import { Position, ScreenPosition } from '../classes/Player';
import { getCharacterSpriteConfig } from '../utils/spriteSystem';
import { availableCharacters } from '../config/characters';

export interface PlayerDomRefs {
  element: HTMLDivElement | null;
  sprite: HTMLDivElement | null;
}

const isMultiplayerMode = false;

interface PlayerProps {
  playerId: string;
  position: Position;
  screenPosition: ScreenPosition;
  isMoving: boolean;
  direction: string;
  spriteFrame: number;
  characterType?: string;
  isActive?: boolean;
  tileWidth?: number;
  tileHeight?: number;
  onRegister?: (playerId: string, refs: PlayerDomRefs | null) => void;
  /** Estado de animação do portal: 'none' | 'dematerializing' | 'rematerializing' */
  portalAnimationState?: 'none' | 'dematerializing' | 'rematerializing';
  /**
   * URL de GIF animado a exibir quando o personagem está em idle (!isMoving).
   * Quando fornecido, substitui o frame 0 do sprite pelo GIF.
   * Arquivos em public/ devem ser referenciados com caminho absoluto: "/nome.gif"
   */
  idleGifSrc?: string;
}

const PlayerComponent: React.FC<PlayerProps> = ({
  playerId,
  position,
  screenPosition,
  isMoving = false,
  direction = 'down',
  spriteFrame = 0,
  characterType = availableCharacters[0]?.id || 'caio',
  isActive = false,
  tileWidth = 128,
  tileHeight = 84,
  onRegister,
  portalAnimationState = 'none',
  idleGifSrc
}) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const config = getCharacterSpriteConfig(characterType);
  const normalizedSpriteFrame = ((spriteFrame % config.maxFrames) + config.maxFrames) % config.maxFrames;

  const canIdle = !idleGifSrc && characterType !== 'tiabel36';
  const [isConfirmedIdle, setIsConfirmedIdle] = useState(false);
  const [idleSpriteFrame, setIdleSpriteFrame] = useState<number>(normalizedSpriteFrame);

  // Debounce: só considera idle real após isMoving=false estável por 80ms,
  // evitando flash de idle entre passos consecutivos de goto().
  useEffect(() => {
    if (isMoving) {
      setIsConfirmedIdle(false);
      return;
    }
    const debounceTimer = window.setTimeout(() => {
      setIsConfirmedIdle(true);
    }, 80);
    return () => window.clearTimeout(debounceTimer);
  }, [isMoving]);

  const shouldAnimateIdleWithSprites = isConfirmedIdle && canIdle;
  const effectiveSpriteFrame = shouldAnimateIdleWithSprites ? idleSpriteFrame : normalizedSpriteFrame;

  useEffect(() => {
    if (!shouldAnimateIdleWithSprites) {
      return;
    }

    setIdleSpriteFrame(normalizedSpriteFrame);

    const idleFrameInterval = window.setInterval(() => {
      setIdleSpriteFrame((prev) => (prev + 1) % config.maxFrames);
    }, 140);

    return () => {
      window.clearInterval(idleFrameInterval);
    };
  }, [shouldAnimateIdleWithSprites, normalizedSpriteFrame, config.maxFrames]);

  useEffect(() => {
    onRegister?.(playerId, { element: playerRef.current, sprite: spriteRef.current });
    return () => onRegister?.(playerId, null);
  }, [onRegister, playerId]);

  useEffect(() => {
    const element = playerRef.current;
    if (!element) return;

    const ajusteFinoPlayerX = -35;
    const ajusteFinoPlayerY = -40;
    const spriteOffsetX = (tileWidth / 2) - 32;
    const spriteOffsetY = -46;

    const isoX = screenPosition.isoX + spriteOffsetX + ajusteFinoPlayerX;
    const isoY = screenPosition.isoY + spriteOffsetY + ajusteFinoPlayerY;

    element.style.transform = `translate(${isoX}px, ${isoY}px)`;
    element.style.zIndex = `${Math.floor(isoY) + 1000}`;

    // Logs de debug podem ser reativados quando necessário
    // if (typeof window !== 'undefined' && (window as any).__JEDI_DEBUG__) {
    //   console.log(`🎯 [PlayerRender] position`, {
    //     playerId,
    //     isoX: Number(isoX.toFixed(2)),
    //     isoY: Number(isoY.toFixed(2)),
    //     source: 'props'
    //   });
    // }
  }, [playerId, screenPosition, tileWidth, tileHeight]);

  useEffect(() => {
    const sprite = spriteRef.current;
    if (!sprite) return;
    sprite.style.backgroundSize = config.backgroundSize;
    sprite.style.backgroundPosition = 'center';
    sprite.style.backgroundRepeat = 'no-repeat';

    // Quando há um GIF de idle e o personagem não está em movimento,
    // aplicamos o GIF via inline style com !important para garantir que
    // vença as regras do robust-sprite-css (que também usam !important e
    // são injetadas dinamicamente no document.head, portanto aparecem depois
    // do CSS estático no DOM — o que torna a cascata CSS imprevisível neste caso).
    // Inline style com !important tem precedência absoluta sobre qualquer regra de stylesheet.
    if (idleGifSrc && !isMoving) {
      sprite.style.setProperty('background-image', `url(${idleGifSrc})`, 'important');
    } else {
      // Remover o inline style para que o robust-sprite-css controle o frame atual.
      sprite.style.removeProperty('background-image');
    }

    //console.debug(`[Player][props] ${playerId} -> dir=${direction} frame=${effectiveSpriteFrame} idleGif=${!isMoving && !!idleGifSrc}`);
  }, [config, direction, effectiveSpriteFrame, playerId, idleGifSrc, isMoving]);

  // Construir classes de animação do portal
  const portalAnimationClass = portalAnimationState === 'dematerializing' 
    ? 'portal-dematerializing' 
    : portalAnimationState === 'rematerializing' 
      ? 'portal-rematerializing' 
      : '';

// Log para determinar o instante em que 
// portalAnimationState é alterado
// em segundos
useEffect(() => {
  console.log(`[Player][portalAnimationState] ${playerId} -> ${portalAnimationState} -> ${new Date().getTime() / 1000}`);
}, [portalAnimationState, playerId]);


  return (
    <div
      ref={playerRef}
      className={`player ${isMoving || !isConfirmedIdle ? 'walking' : 'idle'} character-${characterType} player-${direction}-${effectiveSpriteFrame} ${portalAnimationClass}`}
      data-id={playerId}
      data-x={position.x}
      data-y={position.y}
      data-direction={direction}
      data-frame={effectiveSpriteFrame}
      data-portal-animation={portalAnimationState}
    >
      <div ref={spriteRef} className="player-sprite" />
      {isMultiplayerMode && isActive && <div className="player-active-indicator" />}
    </div>
  );
};

export default memo(PlayerComponent);
