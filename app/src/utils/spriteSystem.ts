/**
 * Sistema Ortogonal de Sprites
 * 
 * Este módulo implementa uma solução ortogonal para carregar sprites de personagens
 * seguindo o padrão solicitado:
 * 
 * Seletor: .player-<direcao_frame>-<indice_frame>
 * URL: '/assets/sprites/<personagem>/<pasta_da_direcao>/frame_<indice_frame_0000>.png'
 * 
 * Onde:
 * - <personagem>: nome do personagem ('negra', 'maria', 'caio', 'tiabel', 'tiabel_victory', etc.)
 * - <pasta_da_direcao>: pasta correspondente à direção ('down', 'right', 'up', 'left')
 * - <indice_frame_0000>: índice do frame formatado com 4 dígitos (0000, 0001, etc.)
 */

export interface CharacterSpriteConfig {
  /** Nome do personagem (nome da pasta) */
  name: string;
  
  /** Mapeamento de direções para pastas de sprites */
  directionMapping: {
    left: string;
    right: string;
    up: string;
    down: string;
  };
  
  /** Padrão de nomenclatura dos arquivos */
  filePattern: {
    /** Prefixo do arquivo (ex: 'negra_', 'ana', 'Laranjinha_') */
    prefix: string;
    /** Sufixo do arquivo (ex: '.png') */
    suffix: string;
    /** Se usa separador entre prefixo e direção */
    useSeparator: boolean;
    /** Formato do índice do frame (ex: 'XX' para dois dígitos, 'XXXX' para quatro) */
    frameFormat: 'XX' | 'XXXX' | 'X';
  };
  
  /** Mapeamento personalizado de índices de frame */
  frameMapping?: { [frameIndex: number]: string };
}

export interface SpriteSystemConfig {
  /** Lista de configurações de personagens */
  characters: CharacterSpriteConfig[];
  
  /** Número máximo de frames por direção */
  maxFrames: number;
  
  /** Caminho base para os sprites */
  basePath: string;
}

/**
 * Configuração padrão do sistema de sprites baseada na estrutura atual
 */
// === CONFIGURAÇÃO CENTRALIZADA DE SPRITES POR PERSONAGEM ===
// Configure aqui o número de frames e características de cada personagem
export const CHARACTER_SPRITE_CONFIG = {
  // negra: {
  //   maxFrames: 29,
  //   spriteSize: { width: 512, height: 512 },
  //   containerSize: { width: 128, height: 128 }, // 128px
  //   backgroundSize: '100% 100%', // Ocupa todo o container
  //   scale: 1
  // },
  // ana: {
  //   maxFrames: 6,
  //   spriteSize: { width: 256, height: 256 },
  //   containerSize: { width: 128, height: 128 },
  //   backgroundSize: '50% 50%',
  //   scale: 2
  // },
  maria: {
    maxFrames: 10,
    spriteSize: { width: 128, height: 128 },
    containerSize: { width: 128, height: 128 }, // Aumentado para 160px
    backgroundSize: 'contain', // Ocupa todo o container
    scale: 1
  },
  caio: {
    maxFrames: 10,
    spriteSize: { width: 128, height: 128 },
    containerSize: { width: 128, height: 128 }, // Aumentado para 160px
    backgroundSize: 'contain', // Ocupa todo o container
    scale: 1
  },
  tiabel: {
    maxFrames: 10,
    spriteSize: { width: 128, height: 128 },
    containerSize: { width: 166, height: 166 },
    backgroundSize: 'contain', // Ocupa todo o container
    scale: 1.3
  },
  tiabel_victory: {
    maxFrames: 10,
    spriteSize: { width: 128, height: 128 },
    containerSize: { width: 166, height: 166 },
    backgroundSize: 'contain', // Ocupa todo o container
    scale: 1.3
  },
  tiabel36: {
    maxFrames: 36,
    spriteSize: { width: 180, height: 320 },
    containerSize: { width: 180, height: 180 },
    backgroundSize: 'contain', // Ocupa todo o container
    scale: 1.5
  },
  thiago: {
    maxFrames: 10,
    spriteSize: { width: 128, height: 128 },
    containerSize: { width: 128, height: 128 },
    backgroundSize: 'contain',
    scale: 1
  },
  joao: {
    maxFrames: 10,
    spriteSize: { width: 128, height: 128 },
    containerSize: { width: 128, height: 128 },
    backgroundSize: 'contain',
    scale: 1
  },
  julia: {
    maxFrames: 10,
    spriteSize: { width: 128, height: 128 },
    containerSize: { width: 128, height: 128 },
    backgroundSize: 'contain',
    scale: 1
  },
  larissa: {
    maxFrames: 10,
    spriteSize: { width: 128, height: 128 },
    containerSize: { width: 128, height: 128 },
    backgroundSize: 'contain',
    scale: 1
  }
};

// Função para gerar frameMapping automaticamente
function generateFrameMapping(maxFrames: number): { [key: number]: string } {
  const mapping: { [key: number]: string } = {};
  for (let i = 0; i < maxFrames; i++) {
    // maxFrames = 36 tem mapeamento completo
    mapping[i] = (i * (maxFrames === 36 ? 1 : 2) + 1).toString().padStart(4, '0');
  }
  console.log('🔍 Mapeamento gerado (spriteSystem):', mapping);
  return mapping;
}

// Função para obter configuração de sprite de um personagem
export function getCharacterSpriteConfig(characterName: string) {
  return CHARACTER_SPRITE_CONFIG[characterName as keyof typeof CHARACTER_SPRITE_CONFIG] || CHARACTER_SPRITE_CONFIG.caio;
}

// Função para aplicar estilo de sprite baseado na configuração
export function applySpriteStyle(element: HTMLElement, characterName: string) {
  const config = getCharacterSpriteConfig(characterName);
  element.style.backgroundSize = config.backgroundSize;
  element.style.backgroundPosition = 'center';
  element.style.backgroundRepeat = 'no-repeat';
  return config;
}

export const defaultSpriteConfig: SpriteSystemConfig = {
  basePath: '/assets/sprites/',
  maxFrames: CHARACTER_SPRITE_CONFIG.caio.maxFrames, // Usar config do personagem principal
  characters: [
    // {
    //   name: 'negra',
    //   directionMapping: {
    //     left: 'CE',     // Mapeamento atual: left = CE
    //     right: 'BD',    // Mapeamento atual: right = BD
    //     up: 'CD',       // Mapeamento atual: up = CD
    //     down: 'BE'      // Mapeamento atual: down = BE
    //   },
    //   filePattern: {
    //     prefix: 'frame_',
    //     suffix: '.png',
    //     useSeparator: true,
    //     frameFormat: 'XXXX'
    //   },
    //   // Gerar mapeamento automaticamente baseado na configuração
    //   frameMapping: generateFrameMapping(CHARACTER_SPRITE_CONFIG.negra.maxFrames)
    // },
    {
      name: 'maria',
      directionMapping: {
        left: 'CE',     // Mapeamento: left = CE
        right: 'BD',    // Mapeamento: right = BD
        up: 'CD',       // Mapeamento: up = CD
        down: 'BE'      // Mapeamento: down = BE
      },
      filePattern: {
        prefix: 'frame_',
        suffix: '.png',
        useSeparator: true,
        frameFormat: 'XXXX'
      },
      // Gerar mapeamento automaticamente baseado na configuração
      frameMapping: generateFrameMapping(CHARACTER_SPRITE_CONFIG.maria.maxFrames)
    },
    {
      name: 'caio',
      directionMapping: {
        left: 'CE',     // Mapeamento: left = CE
        right: 'BD',    // Mapeamento: right = BD
        up: 'CD',       // Mapeamento: up = CD
        down: 'BE'      // Mapeamento: down = BE
      },
      filePattern: {
        prefix: 'frame_',
        suffix: '.png',
        useSeparator: true,
        frameFormat: 'XXXX'
      },
      // Gerar mapeamento automaticamente baseado na configuração
      frameMapping: generateFrameMapping(CHARACTER_SPRITE_CONFIG.caio.maxFrames)
    },
    {
      name: 'tiabel',
      directionMapping: {
        left: 'CE',     // Mapeamento: left = CE
        right: 'BD',    // Mapeamento: right = BD
        up: 'CD',       // Mapeamento: up = CD
        down: 'BE'      // Mapeamento: down = BE
      },
      filePattern: {
        prefix: 'frame_',
        suffix: '.png',
        useSeparator: true,
        frameFormat: 'XXXX'
      },
      // Gerar mapeamento automaticamente baseado na configuração
      frameMapping: generateFrameMapping(CHARACTER_SPRITE_CONFIG.tiabel.maxFrames)
    },
    {
      name: 'tiabel_victory',
      directionMapping: {
        left: 'CE',     // Mapeamento: left = CE
        right: 'BD',    // Mapeamento: right = BD
        up: 'CD',       // Mapeamento: up = CD
        down: 'BE'      // Mapeamento: down = BE
      },
      filePattern: {
        prefix: 'frame_',
        suffix: '.png',
        useSeparator: true,
        frameFormat: 'XXXX'
      },
      // Gerar mapeamento automaticamente baseado na configuração
      frameMapping: generateFrameMapping(CHARACTER_SPRITE_CONFIG.tiabel_victory.maxFrames)
    },
    {
      name: 'tiabel36',
      directionMapping: {
        left: '',     // Mapeamento: left = CE
        right: '',    // Mapeamento: right = BD
        up: '',       // Mapeamento: up = CD
        down: 'BE'      // Mapeamento: down = BE
      },
      filePattern: {
        prefix: 'frame_',
        suffix: '.png',
        useSeparator: true,
        frameFormat: 'XXXX'
      },
      // Gerar mapeamento automaticamente baseado na configuração
      frameMapping: generateFrameMapping(CHARACTER_SPRITE_CONFIG.tiabel36.maxFrames)
    },
    {
      name: 'thiago',
      directionMapping: {
        left: 'CE',
        right: 'BD',
        up: 'CD',
        down: 'BE'
      },
      filePattern: {
        prefix: 'frame_',
        suffix: '.png',
        useSeparator: true,
        frameFormat: 'XXXX'
      },
      frameMapping: {
        0: '0001',
        1: '0004',
        2: '0006',
        3: '0009',
        4: '0011',
        5: '0014',
        6: '0016',
        7: '0019',
        8: '0021',
        9: '0024'
      }
    },
    {
      name: 'joao',
      directionMapping: {
        left: 'CE',
        right: 'BD',
        up: 'CD',
        down: 'BE'
      },
      filePattern: {
        prefix: 'frame_',
        suffix: '.png',
        useSeparator: true,
        frameFormat: 'XXXX'
      },
      frameMapping: {
        0: '0001',
        1: '0004',
        2: '0006',
        3: '0009',
        4: '0011',
        5: '0014',
        6: '0016',
        7: '0019',
        8: '0021',
        9: '0024'
      }
    },
    {
      name: 'julia',
      directionMapping: {
        left: 'CE',
        right: 'BD',
        up: 'CD',
        down: 'BE'
      },
      filePattern: {
        prefix: 'frame_',
        suffix: '.png',
        useSeparator: true,
        frameFormat: 'XXXX'
      },
      frameMapping: {
        0: '0001',
        1: '0004',
        2: '0006',
        3: '0009',
        4: '0011',
        5: '0014',
        6: '0016',
        7: '0019',
        8: '0021',
        9: '0024'
      }
    },
    {
      name: 'larissa',
      directionMapping: {
        left: 'CE',
        right: 'BD',
        up: 'CD',
        down: 'BE'
      },
      filePattern: {
        prefix: 'frame_',
        suffix: '.png',
        useSeparator: true,
        frameFormat: 'XXXX'
      },
      frameMapping: generateFrameMapping(CHARACTER_SPRITE_CONFIG.maria.maxFrames)
    }
    // {
    //   name: 'ana', 
    //   directionMapping: {
    //     left: 'CE',    // Mapeamento atual: left = CE
    //     right: 'BD',   // Mapeamento atual: right = BD
    //     up: 'CD',      // Mapeamento atual: up = CD
    //     down: 'BE'     // Mapeamento atual: down = BE
    //   },
    //   filePattern: {
    //     prefix: 'ana',
    //     suffix: '.png',
    //     useSeparator: false,
    //     frameFormat: 'X'
    //   },
    //   // Usar configuração centralizada para ana
    //   frameMapping: (() => {
    //     const mapping: { [key: number]: string } = {};
    //     for (let i = 0; i < CHARACTER_SPRITE_CONFIG.ana.maxFrames; i++) {
    //       mapping[i] = i.toString();
    //     }
    //     return mapping;
    //   })()
    // }

  ]
};

/**
 * Formata o índice do frame de acordo com o padrão especificado
 */
function formatFrameIndex(frameIndex: number, format: 'XX' | 'XXXX' | 'X'): string {
  switch (format) {
    case 'XXXX':
      return frameIndex.toString().padStart(4, '0');
    case 'XX':
      return frameIndex.toString().padStart(2, '0');
    case 'X':
    default:
      return frameIndex.toString();
  }
}

/**
 * Constrói a URL do sprite seguindo o padrão especificado
 */
function buildSpriteUrl(
  config: SpriteSystemConfig,
  character: CharacterSpriteConfig,
  direction: 'left' | 'right' | 'up' | 'down',
  frameIndex: number
): string {
  const directionCode = character.directionMapping[direction];
  const frameFormatted = character.frameMapping?.[frameIndex] || 
                        formatFrameIndex(frameIndex, character.filePattern.frameFormat);
  
  // Log detalhado apenas para primeiro sprite (evitar spam)
  // if (character.name === 'negra' && direction === 'left' && frameIndex === 0) {
  //   console.log(`🔍 Exemplo URL construída: ${character.name}, direção: ${direction}, frame: ${frameIndex}`);
  //   console.log(`   Código direção: ${directionCode}, Frame formatado: ${frameFormatted}`);
  // }
  
  // Constrói o nome do arquivo baseado na estrutura atual
  let fileName: string;
  
  if (['maria', 'caio', 'tiabel', 'tiabel_victory', 'tiabel36', 'thiago', 'joao', 'julia', 'larissa'].includes(character.name)) {
    // Padrão: negra_<DIREÇÃO>_<FRAME>.png (ex: negra_NW_03.png)
    fileName = `${character.name}_${directionCode}_128/${character.filePattern.prefix}${frameFormatted}${character.filePattern.suffix}`;
  } else if (character.name === 'ana') {
    // Padrão: ana<DIREÇÃO><FRAME>.png (ex: anaCE0.png)
    fileName = `${character.filePattern.prefix}${directionCode}${frameFormatted}${character.filePattern.suffix}`;
  } else {
    // Padrão futuro solicitado: frame_<indice_frame_0000>.png
//    const frameFormattedPadded = formatFrameIndex(frameIndex, 'XXXX');
//    fileName = `frame_${frameFormattedPadded}${character.filePattern.suffix}`;
    fileName = `${character.name}_${directionCode}_128/${character.filePattern.prefix}${frameFormatted}${character.filePattern.suffix}`;

  }
  
  // URL final: '/assets/sprites/<personagem>/<fileName>'
  const finalUrl = `${config.basePath}${character.name}/${fileName}`;
  
  // Log apenas do primeiro exemplo
  // if (character.name === 'negra' && direction === 'left' && frameIndex === 0) {
  //   console.log(`   URL final exemplo: ${finalUrl}`);
  // }
  
  return finalUrl;
}

export function getSpriteUrlsForCharacter(
  config: SpriteSystemConfig,
  character: CharacterSpriteConfig
): string[] {
  const urls: string[] = [];
  (['left', 'right', 'up', 'down'] as const).forEach(direction => {
    for (let frame = 0; frame < config.maxFrames; frame++) {
      urls.push(buildSpriteUrl(config, character, direction, frame));
    }
  });
  return urls;
}

/**
 * Gera as regras CSS para um conjunto de personagens, direções e frames
 */
export function generateSpriteCSS(config: SpriteSystemConfig = defaultSpriteConfig): string {
  let css = '/* === CSS GERADO DINAMICAMENTE PELO SISTEMA ORTOGONAL DE SPRITES === */\n\n';

  config.characters.forEach(character => {
    css += `/* Sprites para personagem: ${character.name} */\n`;
    
    (['left', 'right', 'up', 'down'] as const).forEach(direction => {
      for (let frame = 0; frame < config.maxFrames; frame++) {
        const spriteUrlRaw = buildSpriteUrl(config, character, direction, frame);



        // URL já correta com basePath absoluto
        const spriteUrl = spriteUrlRaw;
        // console.log('🔍 Sprite URL:', spriteUrl);



        css += `.character-${character.name}.player-${direction}-${frame} .player-sprite {\n`;
        css += `  background-image: url('${spriteUrl}');\n`;
        css += `}\n\n`;
      }
    });
    
    css += '\n';
  });

  // console.log('🔍 CSS gerado:', css);
  
  return css;
}

/**
 * Injeta as regras CSS no documento
 */
export function injectSpriteCSS(config: SpriteSystemConfig = defaultSpriteConfig): void {
  // console.log('🔧 Iniciando injeção do CSS dinâmico...');
  
  // Remove style tag anterior se existir
  const existingStyle = document.getElementById('dynamic-sprite-css');
  if (existingStyle) {
    // console.log('🗑️ Removendo CSS anterior...');
    existingStyle.remove();
  }
  
  // Gera o CSS
  const generatedCSS = generateSpriteCSS(config);
  // console.log('📝 CSS gerado:', generatedCSS.length, 'caracteres');
  // console.log('🎨 Amostra do CSS:', generatedCSS.substring(0, 200) + '...');
  
  // Cria novo style tag com as regras CSS
  const styleElement = document.createElement('style');
  styleElement.id = 'dynamic-sprite-css';
  styleElement.innerHTML = generatedCSS;
  
  // Adiciona ao head do documento
  document.head.appendChild(styleElement);
  
  // console.log('✅ CSS injetado no DOM. Style element ID:', styleElement.id);
  // console.log('📊 Total de regras CSS criadas:', generatedCSS.split('\n').filter(line => line.includes('background-image')).length);
  
  // Verificar se o elemento foi realmente adicionado
  const verifyElement = document.getElementById('dynamic-sprite-css');
  if (verifyElement) {
    // console.log('✅ Verificação: CSS encontrado no DOM');
    // console.log('📄 Conteúdo verificado:', verifyElement.innerHTML.length, 'caracteres');
  } else {
    console.error('❌ ERRO: CSS não foi encontrado no DOM após injeção!');
  }
  
  // console.log('🎨 Sistema ortogonal de sprites inicializado com sucesso!');
}

/**
 * Inicializa o sistema de sprites (chama automaticamente injectSpriteCSS)
 */
export function initializeSpriteSystem(config?: SpriteSystemConfig): void {
  injectSpriteCSS(config);
}

export function getSpriteConfigForCharacters(characterNames: string[]): SpriteSystemConfig {
  const uniqueNames = Array.from(new Set(characterNames));

  const filteredCharacters = defaultSpriteConfig.characters
    .filter(character => uniqueNames.includes(character.name))
    .map(character => ({
      ...character,
      directionMapping: { ...character.directionMapping },
      filePattern: { ...character.filePattern },
      frameMapping: character.frameMapping ? { ...character.frameMapping } : undefined
    }));

  return {
    basePath: defaultSpriteConfig.basePath,
    maxFrames: defaultSpriteConfig.maxFrames,
    characters: filteredCharacters
  };
}

/**
 * Configura um personagem específico com mapeamento personalizado
 * Útil para adaptar aos padrões de nomenclatura existentes
 */
export function configureCharacterLegacy(characterName: string): CharacterSpriteConfig {
  // Configurações baseadas nos padrões existentes observados no código
  switch (characterName) {
    // case 'negra':
    //   return {
    //     name: 'negra',
    //     directionMapping: {
    //       left: 'left',    // NW na nomenclatura atual
    //       right: 'right',  // SE na nomenclatura atual
    //       up: 'up',        // SW na nomenclatura atual
    //       down: 'down'     // NE na nomenclatura atual
    //     },
    //     filePattern: {
    //       prefix: 'frame_',
    //       suffix: '.png',
    //       useSeparator: false,
    //       frameFormat: 'XXXX'
    //     },
    //     // Mapeamento dos índices atuais (03, 10, 17, 24, 31, 38) para o novo formato
    //     frameMapping: {
    //       0: '0000',
    //       1: '0001',
    //       2: '0002',
    //       3: '0003',
    //       4: '0004',
    //       5: '0005'
    //     }
    //   };
      
    case 'tiabel36':
      return {
        name: 'tiabel36',
        directionMapping: {
          left: '',    // CE na nomenclatura atual
          right: '', // BD na nomenclatura atual
          up: '',       // CD na nomenclatura atual
          down: 'down'    // BE na nomenclatura atual
        },
        filePattern: {
          prefix: 'frame_',
          suffix: '.png',
          useSeparator: false,
          frameFormat: 'XXXX'
        },
        frameMapping: {
          0: '0000', 1: '0001', 2: '0002', 3: '0003', 4: '0004', 5: '0005', 6: '0006', 7: '0007', 8: '0008', 9: '0009', 10: '0010', 11: '0011', 12: '0012', 13: '0013', 14: '0014', 15: '0015', 16: '0016', 17: '0017', 18: '0018', 19: '0019', 20: '0020', 21: '0021', 22: '0022', 23: '0023', 24: '0024', 25: '0025', 26: '0026', 27: '0027', 28: '0028', 29: '0029', 30: '0030', 31: '0031', 32: '0032', 33: '0033', 34: '0034', 35: '0035'
        }
      };
      
    default:
      // Configuração padrão para novos personagens
      return {
        name: characterName,
        directionMapping: {
          left: 'left',
          right: 'right',
          up: 'up',
          down: 'down'
        },
        filePattern: {
          prefix: 'frame_',
          suffix: '.png',
          useSeparator: false,
          frameFormat: 'XXXX'
        },
        frameMapping: generateFrameMapping(10)
      };
  }
}
