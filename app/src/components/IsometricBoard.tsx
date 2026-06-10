import React, { useEffect, useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import './IsometricBoard.css';
import { useResponsiveIsometric } from '../hooks/useResponsiveIsometric';
import { useCameraControl } from '../hooks/useCameraControl';
import tileFundoSrc from '../assets/tiles/fundo.png';
import tileCaminhoSrc from '../assets/tiles/caminho.png';
import tileInicioSrc from '../assets/tiles/inicio.png';
import tileFimSrc from '../assets/tiles/final.png';

type TileType = 'fundo' | 'caminho' | 'inicio' | 'fim';

interface Tile {
  type: TileType;
  x: number;
  y: number;
  walkable: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface ScreenPosition {
  isoX: number;
  isoY: number;
}

interface MapBounds {
  width: number;
  height: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Interface removida - não usa mais viewport personalizado

interface IsometricBoardProps {
  onMapLoaded: (tiles: Tile[], startPosition: Position, tiabelPosition: Position) => void;
  onTileClick: (position: Position) => void;
  onRegisterTilePosition: (fn: (position: Position) => ScreenPosition | null) => void;
  activePlayerPosition?: Position;
  backgroundImageUrl: string;
  containerRef?: React.RefObject<HTMLDivElement>; // Referência do container pai (legado)
  
  // Novas props para renderização sincronizada de jogadores
  children?: React.ReactNode; // Para renderizar jogadores dentro do board
  onCameraReady?: (cameraControls: { // NOVO: callback para expor controles da câmera
    centerOnPlayer: (playerScreenPosition: ScreenPosition, duration?: number) => Promise<void>;
    resetCamera: (duration?: number) => Promise<void>;
  }) => void;
  
  // NOVO: Props para zoom dinâmico
  dynamicZoomFactor?: number; // Fator de zoom atual
}

// NOVO: Interface para expor controles do board
export interface IsometricBoardRef {
  setDynamicZoom: (factor: number) => void;
  forceRecenter: () => void; // Nova função para forçar recentralização
}

const IsometricBoard = forwardRef<IsometricBoardRef, IsometricBoardProps>(({ 
  onMapLoaded, 
  onTileClick, 
  onRegisterTilePosition,
  activePlayerPosition,
  backgroundImageUrl,
  containerRef,
  children,
  onCameraReady, // NOVO: prop para callback de câmera
  dynamicZoomFactor = 1 // NOVO: fator de zoom dinâmico (padrão: cenario aberto)
}, ref) => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tilePositions, setTilePositions] = useState<Map<string, ScreenPosition>>(new Map());
  const [stageDimensions, setStageDimensions] = useState<{ width: number; height: number }>({
    width: 3072,
    height: 1536
  });
  
  // Estado de viewport removido - usa apenas CSS responsivo
  
  // Referências para os elementos DOM
  const boardRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const internalContainerRef = useRef<HTMLDivElement>(null);

  // === SISTEMA DE COORDENADAS ISOMÉTRICAS (baseado no editor-iso.html) ===
  
  // Constantes de tile (equivalentes ao editor)
  const TILE_WIDTH = 128;
  const TILE_HEIGHT = 84;
  const ISO_TILE_CALC_WIDTH = 64;
  const ISO_TILE_CALC_HEIGHT = 32;
  
  // Constantes do mundo/palco (calculadas para um mapa 48x48)
  // Largura: 48 tiles × 64px (ISO_TILE_CALC_WIDTH) = 3072px
  // Altura: 48 tiles × 32px (ISO_TILE_CALC_HEIGHT) = 1536px
  const WORLD_WIDTH = 3072;
  const WORLD_HEIGHT = 1536;
  const SHIFT_X = 1575+TILE_WIDTH*(-0.8);
  const SHIFT_Y = 130+TILE_HEIGHT*(0.82);

  // Ajustar altura do palco para cobrir totalmente o background sem cortar
  useEffect(() => {
    let cancelled = false;

    if (!backgroundImageUrl) {
      setStageDimensions({ width: WORLD_WIDTH, height: WORLD_HEIGHT });
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const naturalWidth = img.naturalWidth || WORLD_WIDTH;
      const naturalHeight = img.naturalHeight || WORLD_HEIGHT;
      const aspect = naturalHeight / naturalWidth;
      const backgroundHeightForWorldWidth = WORLD_WIDTH * aspect;
      const nextHeight = Math.max(WORLD_HEIGHT, backgroundHeightForWorldWidth);
      setStageDimensions({ width: WORLD_WIDTH, height: nextHeight });
    };
    img.onerror = () => {
      if (cancelled) return;
      setStageDimensions({ width: WORLD_WIDTH, height: WORLD_HEIGHT });
    };
    img.src = backgroundImageUrl;

    return () => {
      cancelled = true;
    };
  }, [backgroundImageUrl, WORLD_WIDTH, WORLD_HEIGHT]);


  // Hook para controle de câmera (definido após derivar centro)

  
  // Hook para responsividade automática do palco isométrico será inicializado depois
  
  // NOVO: Expor controles do board via ref (declarado após forceRecenter existir)

  // Função para obter a posição isométrica de coordenadas da grade
  const getIsoPosition = useCallback((x: number, y: number) => {
    // Converte coordenadas de grade para coordenadas isométricas
    // Usa os mesmos cálculos do editor-iso.html
    const isoX = (x - y) * ISO_TILE_CALC_WIDTH * 0.748 + 605 +SHIFT_X;
    const isoY = (x + y) * ISO_TILE_CALC_HEIGHT * 0.748 - 370 +SHIFT_Y;
    return { isoX, isoY };
  }, [SHIFT_X, SHIFT_Y]);

  // Derivar bounds/centro reais do mundo a partir dos cantos (evita drift)
  const worldDerived = React.useMemo(() => {
    const maxX = 47; // mapa 48x48
    const maxY = 47;
    const corners = [
      getIsoPosition(0, 0),
      getIsoPosition(maxX, 0),
      getIsoPosition(0, maxY),
      getIsoPosition(maxX, maxY)
    ];
    const minX = Math.min(...corners.map(c => c.isoX));
    const maxXX = Math.max(...corners.map(c => c.isoX));
    const minY = Math.min(...corners.map(c => c.isoY));
    const maxYY = Math.max(...corners.map(c => c.isoY));
    return {
      width: maxXX - minX,
      height: maxYY - minY,
      centerX: (minX + maxXX) / 2,
      centerY: (minY + maxYY) / 2
    };
  }, [getIsoPosition]);

  // Agora que worldDerived existe, inicializar o hook de câmera
  const { centerOnPlayer, resetCamera, syncScale } = useCameraControl({
    stageRef,
    worldWidth: stageDimensions.width,
    worldHeight: stageDimensions.height,
    containerRef: internalContainerRef,
    worldCenterX: worldDerived.centerX,
    worldCenterY: worldDerived.centerY
  });

  // Somente propagar escala após o mapa estar carregado
  const onScaleChangeWhenReady = React.useCallback((scale: number) => {
    if (!loading) {
      syncScale(scale);
    }
  }, [loading, syncScale]);

  // Agora, com syncScale disponível, inicializar responsividade
  const { forceRecenter } = useResponsiveIsometric({
    worldWidth: stageDimensions.width,
    worldHeight: stageDimensions.height,
    containerRef: internalContainerRef as React.RefObject<HTMLDivElement | null>,
    stageRef: stageRef as React.RefObject<HTMLDivElement | null>,
    onScaleChange: onScaleChangeWhenReady,
    dynamicZoomFactor
  });

  // Após concluir o carregamento, forçar recentralização no próximo frame
  useEffect(() => {
    if (!loading) {
      requestAnimationFrame(() => {
        forceRecenter();
      });
    }
  }, [loading, forceRecenter]);

  // Expor controles via ref agora que forceRecenter existe
  useImperativeHandle(ref, () => ({
    setDynamicZoom: (factor: number) => {
      console.log(`🔍 Board: Aplicando zoom dinâmico ${factor}x`);
      // O zoom será aplicado na próxima renderização via prop dynamicZoomFactor
    },
    forceRecenter
  }), [forceRecenter]);

  // === SISTEMA DE VIEWPORT/CÂMERA (removido - agora usa apenas CSS responsivo) ===
  
  // Sistema antigo de transformações removido para evitar conflitos
  // com o sistema CSS responsivo do palco (.iso-stage)

  // Função centerMap removida pois não é usada no fluxo atual

  // === SISTEMA DE CÂMERA REMOVIDO ===
  
  // Sistema de câmera suave removido - agora usa apenas CSS responsivo centralizado

  // === CONFIGURAÇÃO SIMPLES DE BACKGROUND ===
  
  // Função simplificada para configurar apenas a imagem de background
  const updateMapBackgroundLayout = useCallback(() => {
    if (!backgroundRef.current) return;
    
    // Configurar apenas a imagem de background - tamanho e posição via CSS
    if (backgroundImageUrl) {
      backgroundRef.current.style.backgroundImage = `url(${backgroundImageUrl})`;
      backgroundRef.current.style.backgroundRepeat = 'no-repeat';
      backgroundRef.current.style.backgroundSize = 'cover';
      backgroundRef.current.style.backgroundPosition = 'center';
    } else {
      backgroundRef.current.style.backgroundImage = 'none';
    }
  }, [backgroundImageUrl]);

  // Função para obter a posição de um tile específico (simplificada)
  const getTileScreenPosition = useCallback((position: Position): ScreenPosition | null => {
    const key = `${position.x},${position.y}`;
    const basePosition = tilePositions.get(key);
    if (!basePosition) return null;
    
    // Retorna a posição base do tile (sem aplicar transformações aqui)
    // As transformações são aplicadas via CSS pelo sistema de viewport
    return basePosition;
  }, [tilePositions]);

  // === EFEITOS E LIFECYCLE ===
  
  // Registrar a função de obtenção de posição de tile
  useEffect(() => {
    console.log('Registrando função getTileScreenPosition');
    onRegisterTilePosition(getTileScreenPosition);
  }, [getTileScreenPosition, onRegisterTilePosition]);

  // Expor controles da câmera para o componente pai
  useEffect(() => {
    if (onCameraReady) {
      onCameraReady({
        centerOnPlayer,
        resetCamera
      });
      console.log('🎥 Controles de câmera expostos para componente pai');
    }
  }, [onCameraReady, centerOnPlayer, resetCamera]);

  // Função para calcular as dimensões do mapa
  const calculateMapBounds = (parsedTiles: Tile[]): MapBounds => {
    let minX = Number.MAX_SAFE_INTEGER;
    let minY = Number.MAX_SAFE_INTEGER;
    let maxX = Number.MIN_SAFE_INTEGER;
    let maxY = Number.MIN_SAFE_INTEGER;
    
    parsedTiles.forEach(tile => {
      minX = Math.min(minX, tile.x);
      minY = Math.min(minY, tile.y);
      maxX = Math.max(maxX, tile.x);
      maxY = Math.max(maxY, tile.y);
    });
    
    return {
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      minX,
      minY,
      maxX,
      maxY
    };
  };

  // Efeito removido - transformações agora são aplicadas via CSS no palco

  // Efeito para configurar o background quando a imagem muda
  useEffect(() => {
    updateMapBackgroundLayout();
  }, [backgroundImageUrl, updateMapBackgroundLayout]);

  // === CONTROLE DE CÂMERA REMOVIDO ===
  
  // Sistema de seguimento de jogador removido - o palco CSS centralizado é suficiente

  // Carregamento do mapa + pré-cálculo de posições (evitar mutação em render)
  useEffect(() => {
    const loadMapData = async () => {
      try {
        console.log('Carregando mapa...');
        const response = await fetch('/mapa.map');
        const mapData = await response.text();
        const { parsedTiles, startPos, tiabelPos } = parseMapData(mapData);
        
        console.log('Mapa carregado com sucesso:', parsedTiles.length, 'tiles');
        console.log('Posição inicial encontrada:', startPos);
        
        // Calcular as dimensões do mapa
        const bounds = calculateMapBounds(parsedTiles);
        console.log('Dimensões do mapa:', bounds);
        
        // Pré-calcular mapa de posições SEM mutação na renderização
        const precomputedPositions = new Map<string, ScreenPosition>();
        for (const tile of parsedTiles) {
          const key = `${tile.x},${tile.y}`;
          const pos = getIsoPosition(tile.x, tile.y);
          precomputedPositions.set(key, { isoX: pos.isoX, isoY: pos.isoY });
        }

        console.log('Mapa de posições criado com', precomputedPositions.size, 'posições');
        setTilePositions(precomputedPositions);
        setTiles(parsedTiles);
        onMapLoaded(parsedTiles, startPos, tiabelPos);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar o mapa:', error);
        setLoading(false);
      }
    };

    loadMapData();
  }, [onMapLoaded, getIsoPosition]);

  const parseMapData = (data: string): { parsedTiles: Tile[], startPos: Position, tiabelPos: Position } => {
    // Seção de tiles (mantém espaços por coluna)
    const tilesSection = (data.split('# Tiles:')[1] ?? data).replace(/\r/g, '');
    const rawLines = tilesSection.split('\n').filter(l => l.length > 0);

    // Descobrir quantidade de colunas esperada pela linha mais longa
    const expectedCols = rawLines.reduce((max, l) => Math.max(max, l.length), 0);

    const parsedTiles: Tile[] = [];

    let startPos: Position = { x: 0, y: 0 };
    let tiabelPos: Position = { x: 0, y: 0 };
    let foundStart = false;

    rawLines.forEach((line, y) => {
      // Não usar trim(); preservar espaços finais
      const row = expectedCols > 0 ? line.padEnd(expectedCols, ' ') : line;
      for (let x = 0; x < row.length; x++) {
        const char = row[x];
        let type: TileType = 'fundo';
        let walkable = false;

        switch (char) {
          case 'X':
            type = 'fundo';
            walkable = true;
            break;
          case 'P':
            type = 'caminho';
            walkable = true;
            break;
          case 'I': // Adicionando 'I' como marcador de início também
            type = 'inicio';
            walkable = true;
            startPos = { x, y };
            tiabelPos = { x: x - 1, y: y - 1 }; // tiabel em (x_inicial-1, y_inicial-1)
            foundStart = true;
            console.log(`Posição inicial encontrada em (${x}, ${y}) com caractere ${char}`);
            break;
          case 'F': // Adicionando 'F' como marcador de fim também
            type = 'fim';
            walkable = true;
            break;
          case '.':
          case 'E':
          case ' ':
          default:
            type = 'fundo';
            walkable = false;
            break;
        }

        parsedTiles.push({ type, x, y, walkable });
      }
    });

    if (!foundStart) {
      console.warn('Nenhuma posição inicial encontrada no mapa. Usando padrão (0,0)');
      tiabelPos = { x: -1, y: -1 }; // Posição padrão para tiabel
    }

    return { parsedTiles, startPos, tiabelPos };
  };


  // Wrap the definition of 'handleTileClick' in its own useCallback() Hook
  // === HANDLERS DE EVENTO ===
  
  const handleTileClick = useCallback((tile: Tile) => {
    console.log('Tile clicado:', tile);
    onTileClick({ x: tile.x, y: tile.y });
  }, [onTileClick]);

  // === RENDERIZAÇÃO ===
  
  const renderedTiles = React.useMemo(() => {
    if (loading) {
      return null;
    }

    const items: React.ReactNode[] = [];

    const TILE_SPRITES: Record<TileType, string> = {
      fundo: tileFundoSrc,
      caminho: tileCaminhoSrc,
      inicio: tileInicioSrc,
      fim: tileFimSrc
    };
 

    // Ordenar por isoY (e isoX como desempate) para dispensar z-index
    const getPos = (t: Tile): ScreenPosition => {
      const p = tilePositions.get(`${t.x},${t.y}`);
      return p ?? getIsoPosition(t.x, t.y);
    };

    const orderedTiles = [...tiles].sort((a, b) => {
      const pa = getPos(a);
      const pb = getPos(b);
      return (pa.isoY - pb.isoY) || (pa.isoX - pb.isoX);
    });

    orderedTiles.forEach((tile) => {
      const key = `${tile.x}:${tile.y}`;
      const basePosition = getPos(tile);

      // Ignora a renderização dos tiles do tipo 'fundo'
      if( tile.type !== 'fundo') {
        items.push(
          <div
            key={key}
            className={`tile ${tile.type}`}
            style={{
              position: 'absolute' as const,
              width: `${TILE_WIDTH}px`,
              height: `${TILE_HEIGHT}px`,
              transform: `translate3d(${basePosition.isoX}px, ${basePosition.isoY}px, 0)`,
              backgroundImage: `url(${TILE_SPRITES[tile.type]})`
            }}
            onClick={() => handleTileClick(tile)}
            data-x={tile.x}
            data-y={tile.y}
            data-type={tile.type}
          />
        );  
      }

    });

    return items;
  }, [loading, tiles, tilePositions, getIsoPosition, handleTileClick]);

  return (
      <div className="isometric-container" ref={internalContainerRef}>
      {/* Layer de background (sincronizado com o board) */}
      <div
        className="iso-stage"
        ref={stageRef}
        style={{ width: `${stageDimensions.width}px`, height: `${stageDimensions.height}px` }}
      >
        <div 
          ref={backgroundRef}
          className="isometric-background"
        />
        
        {/* Board principal com tiles */}
        <div 
          ref={boardRef}
          className="isometric-board"
        >
          {loading ? (
            <div className="loading">Carregando mapa...</div>
          ) : (
            <>
              {renderedTiles}
              {children}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

IsometricBoard.displayName = 'IsometricBoard';

export default IsometricBoard; 
