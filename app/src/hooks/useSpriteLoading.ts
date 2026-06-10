import { useEffect, useState, useMemo } from 'react';
import { registerCharacterSprites, getSpriteUrlsForCharacterFixed } from '../utils/spriteSystemFixed';
import { startPerfTimer, logPerfEvent } from '../utils/perfDiagnostics';

interface SpriteLoadingState {
  isLoading: boolean;
  progress: number;
  error: string | null;
}

export function useSpriteLoading(characterIds: string[]): SpriteLoadingState {
  const [state, setState] = useState<SpriteLoadingState>({
    isLoading: false,
    progress: 0,
    error: null
  });

  // Criar uma chave estável baseada nos IDs ordenados
  const characterKey = useMemo(() => {
    const normalized = Array.from(new Set((characterIds ?? []).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const key = normalized.join(',');
    console.log('🔑 [SpriteLoading] Chave gerada:', key, '| IDs originais:', characterIds);
    return key;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterIds.join(',')]);

  const normalizedCharacters = useMemo(() => {
    if (!characterKey) {
      return [] as string[];
    }
    const list = characterKey.split(',').filter(Boolean);
    console.log('🎯 [SpriteLoading] IDs normalizados:', list);
    return list;
  }, [characterKey]);

  useEffect(() => {
    console.log('🎨 [SpriteLoading] Disparo do efeito com:', normalizedCharacters);

    if (normalizedCharacters.length === 0) {
      console.log('⚠️ [SpriteLoading] Nenhum personagem para carregar');
      setState({ isLoading: false, progress: 0, error: null });
      return;
    }

    let cancelled = false;

    async function loadSprites() {
      const timer = startPerfTimer('sprites:load', { characters: characterKey });

      console.log('📦 [SpriteLoading] Iniciando estado de loading...');
      setState({ isLoading: true, progress: 0, error: null });

      try {
        const allUrls = normalizedCharacters.flatMap((characterId) =>
          getSpriteUrlsForCharacterFixed(characterId)
        );
        console.log(`🔍 [SpriteLoading] URLs para carregar:`, allUrls);

        console.log(`🖼️ [SpriteLoading] Total de URLs para carregar: ${allUrls.length}`);
        console.log(`📋 [SpriteLoading] Personagens a carregar:`, normalizedCharacters);
        
        // Log das primeiras URLs para debug
        const sampleUrls = allUrls.slice(0, 3);
        // Log das últimas URLs para debug
        const LastSampleUrls = allUrls.slice(-3);
        console.log(`📸 [SpriteLoading] Primeiras URLs:`, sampleUrls);
        console.log(`📸 [SpriteLoading] Últimas URLs:`, LastSampleUrls);

        const total = allUrls.length;
        let loaded = 0;
        let loadedSuccess = 0;
        let loadedError = 0;

        await Promise.all(allUrls.map((url, index) => new Promise<void>((resolve) => {
          if (cancelled) {
            resolve();
            return;
          }

          const img = new Image();
          
          img.onload = () => {
            loaded += 1;
            loadedSuccess += 1;
            const progress = total > 0 ? loaded / total : 1;
            setState(prev => ({ ...prev, progress }));
            
            // Log a cada 10 sprites carregados
            if (loaded % 10 === 0 || loaded === total) {
              console.log(`📊 [SpriteLoading] Progresso: ${loaded}/${total} (${Math.round(progress * 100)}%)`);
            }
            resolve();
          };
          
          img.onerror = (error) => {
            loaded += 1;
            loadedError += 1;
            const progress = total > 0 ? loaded / total : 1;
            setState(prev => ({ ...prev, progress }));
            console.error(`❌ [SpriteLoading] Erro ao carregar sprite ${index + 1}/${total}: ${url}`, error);
            resolve();
          };
          
          img.src = url;
        })));
        
        console.log(`📈 [SpriteLoading] Estatísticas de carregamento:`, {
          total,
          success: loadedSuccess,
          errors: loadedError
        });

        if (!cancelled) {
          console.log('✅ [SpriteLoading] Registrando sprites:', normalizedCharacters);
          
          // Registrar sprites ANTES de marcar como concluído
          normalizedCharacters.forEach(characterId => {
            console.log(`🔄 [SpriteLoading] Registrando sprite: ${characterId}`);
            registerCharacterSprites(characterId);
          });
          
          logPerfEvent('sprites:loaded', { characters: characterKey });
          
          // Aguardar um frame para garantir que o CSS foi injetado
          requestAnimationFrame(() => {
            if (!cancelled) {
              setState({ isLoading: false, progress: 1, error: null });
              console.log('🎉 [SpriteLoading] Carregamento e registro concluídos com sucesso!');
            }
          });
        }

        timer.end({ totalSprites: allUrls.length });
      } catch (error) {
        timer.end({ error: String(error) });
        console.error('❌ [SpriteLoading] Erro ao carregar sprites:', error);
        if (!cancelled) {
          setState({ isLoading: false, progress: 0, error: 'Falha ao carregar sprites' });
        }
      }
    }

    loadSprites();

    return () => {
      console.log('🛑 [SpriteLoading] Cleanup executado');
      cancelled = true;
    };
  }, [characterKey, normalizedCharacters]);

  return state;
}

export default useSpriteLoading;

