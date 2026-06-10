/**
 * Sistema de Sprites CORRIGIDO - Versão Robusta
 * 
 * Esta versão implementa múltiplas estratégias para garantir que os sprites sejam renderizados:
 * 1. CSS dinâmico via style tag
 * 2. CSS inline como fallback
 * 3. Verificação contínua e re-aplicação
 * 4. Configuração centralizada de sprites
 */

import { getCharacterSpriteConfig } from './spriteSystem';

// Tipos para mapeamento de sprites
type AnimationType = 'walk' | 'idle';

interface DirectionFrameMapping {
  [direction: string]: {
    [frame: number]: string;
  };
}

interface CharacterAnimationMapping {
  walk: DirectionFrameMapping;
  idle: DirectionFrameMapping;
}

export interface SpriteMapping {
  [character: string]: CharacterAnimationMapping;
}

// Função para gerar mapeamento automaticamente baseado na configuração
function generateSpriteMappingForCharacter(characterName: string) {
  const config = getCharacterSpriteConfig(characterName);
  const mapping: CharacterAnimationMapping = { walk: {}, idle: {} };
  
  if (['maria', 'caio', 'tiabel', 'tiabel_victory', 'tiabel36', 'thiago', 'joao', 'julia', 'larissa'].includes(characterName)) {

    let directions = { down: 'BE', left: 'CE', right: 'BD', up: 'CD' };
    
    if (characterName === 'tiabel36') {
      directions = { down: 'BE', left: '', right: '', up: '' };
    }

    const animationTypes: AnimationType[] = ['walk', 'idle'];

    Object.entries(directions).forEach(([direction, code]) => {
      const resolvedCode = code || directions.down;

      animationTypes.forEach((animationType) => {
        const animationPrefix = characterName !== 'tiabel36' ? `${animationType}/` : '';
        mapping[animationType][direction] = {};

        for (let i = 0; i < config.maxFrames; i++) {
          // Para thiago/joao/julia usar mapeamento específico solicitado
          const usesShortMapping = ['thiago', 'joao', 'julia'].includes(characterName);
          let frameNumber: string;
          if (usesShortMapping) {
            const shortMap = ['0001','0004','0006','0009','0011','0014','0016','0019','0021','0024'];          shortMap.push('0001','0004','0006','0009','0011','0014','0016','0019','0021','0024');
            const idx = i % shortMap.length;
            frameNumber = shortMap[idx];
          } else {
            // Para tiabel36 usar mapeamento completo
            frameNumber = (characterName==='tiabel36' ? i : i*3+1).toString().padStart(4, '0');
          }

          if (direction && resolvedCode) {
            mapping[animationType][direction][i] = `/assets/sprites/${characterName}/${animationPrefix}${characterName}_${resolvedCode}_128/frame_${frameNumber}.png`;
            console.log(`🔍 Mapeamento gerado (fixed): ${characterName} ${animationType} ${direction} ${frameNumber} ${mapping[animationType][direction][i]}`);
          }
        }
      });
    });
  }

  // console.log('🔍 Mapeamento gerado:', mapping);
  
  return mapping;
}

export function getSpriteUrlsForCharacterFixed(characterName: string): string[] {
  const mapping = generateSpriteMappingForCharacter(characterName);
  const urls: string[] = [];

  Object.values(mapping).forEach((directions: any) => {
    Object.values(directions).forEach((frames: any) => {
      Object.values(frames).forEach((url) => {
        if (typeof url === 'string') {
          urls.push(url);
        }
      });
    });
  });

  return urls;
}

// Mapeamento direto e confiável dos sprites - GERADO AUTOMATICAMENTE
export const SPRITE_MAPPINGS: SpriteMapping = {
  // Este objeto é populado dinamicamente pela aplicação.
};
const generateMappingOnce: Record<string, boolean> = {};
const pendingStyleRebuild = { current: false };

export function registerCharacterSprites(characterName: string): void {
  console.log(`🎨 [SpriteSystem] Iniciando registro de sprites para: ${characterName}`);
  
  if (generateMappingOnce[characterName]) {
    console.log(`⏭️ [SpriteSystem] Sprites de ${characterName} já registrados, pulando...`);
    return;
  }

  const mapping = generateSpriteMappingForCharacter(characterName);

  const hasFrames = (Object.values(mapping) as DirectionFrameMapping[]).some((directions) =>
    Object.values(directions).some((frames) => Object.keys(frames as Record<number, string>).length > 0)
  );

  if (!hasFrames) {
    console.warn(`⚠️ [SpriteSystem] Nenhum mapeamento gerado para ${characterName}`);
    return;
  }

  console.log(`📋 [SpriteSystem] Mapeamento gerado para ${characterName}:`, {
    animations: Object.keys(mapping),
    totalFrames: Object.values(mapping).reduce(
      (acc: number, directions: any) =>
        acc +
        Object.values(directions).reduce(
          (dirAcc: number, frames: any) => dirAcc + Object.keys(frames).length,
          0
        ),
      0
    )
  });

  SPRITE_MAPPINGS[characterName] = mapping;
  generateMappingOnce[characterName] = true;

  console.log(`✅ [SpriteSystem] Sprites de ${characterName} registrados com sucesso!`);

  if (!pendingStyleRebuild.current) {
    pendingStyleRebuild.current = true;
    console.log(`🔄 [SpriteSystem] Agendando reconstrução de CSS...`);
    requestAnimationFrame(() => {
      pendingStyleRebuild.current = false;
      console.log(`🎨 [SpriteSystem] Reconstruindo CSS com sprites de:`, Object.keys(SPRITE_MAPPINGS));
      initRobustSpriteSystem();
    });
  }
}

// console.log('🔍 Mapeamento de Sprite gerado: ', JSON.stringify(SPRITE_MAPPINGS));
// console.log('🔍 Mapeamento de Sprite do Caio: ', generateSpriteMappingForCharacter('caio'));

/**
 * Gera CSS completo e robusto para todos os sprites
 */
function generateRobustCSS(): string {
  let css = '/* === SISTEMA ORTOGONAL DE SPRITES - VERSÃO ROBUSTA === */\n\n';
  
  // Gerar CSS para cada personagem usando configuração centralizada
  Object.entries(SPRITE_MAPPINGS).forEach(([character, animations]) => {
    css += `/* Sprites para personagem: ${character} */\n`;

    (['walk', 'idle'] as const).forEach((animationType) => {
      const stateClass = animationType === 'walk' ? 'walking' : 'idle';
      const directions = animations[animationType];

      Object.entries(directions).forEach(([direction, frames]) => {
        Object.entries(frames).forEach(([frame, url]) => {
          css += `.character-${character}.${stateClass}.player-${direction}-${frame} .player-sprite {\n`;
          css += `  background-image: url('${url}') !important;\n`;
          css += `  background-size: contain !important;\n`;
          css += `  background-position: center !important;\n`;
          css += `  background-repeat: no-repeat !important;\n`;

          css += `}\n\n`;
        });
      });
    });
  });
  
  return css;
}

/**
 * Injeta CSS robusto no DOM
 */
export function initRobustSpriteSystem(): void {
  console.log('🔧 [SpriteSystem] Inicializando sistema robusto de sprites...');
  console.log('📋 [SpriteSystem] Personagens registrados:', Object.keys(SPRITE_MAPPINGS));
  
  // Remover CSS anterior
  const existingStyle = document.getElementById('robust-sprite-css');
  if (existingStyle) {
    console.log('🗑️ [SpriteSystem] Removendo CSS anterior');
    existingStyle.remove();
  }
  
  const css = generateRobustCSS();
  const styleElement = document.createElement('style');
  styleElement.id = 'robust-sprite-css';
  styleElement.textContent = css;
  document.head.appendChild(styleElement);
  
  console.log(`✅ [SpriteSystem] CSS injetado com ${css.length} caracteres`);
  console.log(`📊 [SpriteSystem] Total de personagens no CSS:`, Object.keys(SPRITE_MAPPINGS).length);
  
  // Log detalhado das primeiras linhas do CSS para debug
  const cssLines = css.split('\n').slice(0, 20).join('\n');
  console.log(`📝 [SpriteSystem] Primeiras linhas do CSS:\n${cssLines}...`);
}

/**
 * Aplica sprite diretamente usando configuração centralizada
 */
export function applySpriteDirectly(
  element: HTMLElement,
  character: string,
  direction: string,
  frame: number,
  animationType: AnimationType = 'walk'
): boolean {
  try {
    const url =
      SPRITE_MAPPINGS[character]?.[animationType]?.[direction]?.[frame] ||
      SPRITE_MAPPINGS[character]?.walk?.[direction]?.[frame];
    
    if (url) {
      // Usar configuração centralizada para aplicar estilo
      const config = getCharacterSpriteConfig(character);
      element.style.backgroundImage = `url('${url}')`;
      element.style.backgroundRepeat = 'no-repeat';
      element.style.backgroundSize = config.backgroundSize; // Usar configuração centralizada
      element.style.backgroundPosition = 'center';
      
      // console.log(`🎨 Sprite aplicado diretamente: ${character} ${direction} ${frame} → ${url}`);
      // console.log(`📊 Config aplicada: ${config.backgroundSize}`);
      return true;
    } else {
      console.error(`❌ Sprite não encontrado: ${character} ${direction} ${frame} ${url}`);
      console.error(`❌ Mapeamento de Sprite: ${JSON.stringify(SPRITE_MAPPINGS)}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao aplicar sprite:', error);
    return false;
  }
}

/**
 * Obtém URL do sprite
 */
export function getSpriteUrl(character: string, direction: string, frame: number): string | null {
  return (
    SPRITE_MAPPINGS[character]?.walk?.[direction]?.[frame] ||
    SPRITE_MAPPINGS[character]?.idle?.[direction]?.[frame] ||
    null
  );
}

/**
 * Verifica se sprite está sendo renderizado
 */
export function verifySpriteRendering(element: HTMLElement): {
  hasBackground: boolean;
  backgroundImage: string;
  url: string | null;
} {
  const computedStyle = window.getComputedStyle(element);
  const backgroundImageRaw = computedStyle.backgroundImage;
  
  const hasBackground = backgroundImageRaw !== 'none' && backgroundImageRaw !== '';
  
  // Extrair URL do background-image
  let url: string | null = null;
  if (hasBackground) {
    const match = backgroundImageRaw.match(/url\(["']?([^"')]+)["']?\)/);
    url = match ? match[1] : null;
  }
  
  return {
    hasBackground,
    backgroundImage: backgroundImageRaw,
    url
  };
}

/**
 * Sistema de monitoramento contínuo
 */
export function startSpriteMonitoring(): void {
  console.log('🔍 Iniciando monitoramento de sprites...');
  
  setInterval(() => {
    const playerElements = document.querySelectorAll('.player .player-sprite');
    let visibleCount = 0;
    let invisibleCount = 0;
    
    playerElements.forEach((element) => {
      const verification = verifySpriteRendering(element as HTMLElement);
      if (verification.hasBackground) {
        visibleCount++;
      } else {
        invisibleCount++;
        console.warn('⚠️ Sprite invisível detectado:', element);
      }
    });
    
    if (invisibleCount > 0) {
      console.log(`⚠️ Sprites invisíveis detectados: ${invisibleCount}/${playerElements.length}`);
      console.log(`✅ Sprites visíveis: ${visibleCount}/${playerElements.length}`);
    }
  }, 2000); // Verificar a cada 2 segundos
}
