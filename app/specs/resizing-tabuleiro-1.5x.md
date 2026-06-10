# Especificação: Resizing do Tabuleiro - Visualização Fixa 1.5x

**Data:** 28/01/2026  
**Status:** Implementado  
**Versão:** 1.0

---

## 1. Resumo Executivo

Esta especificação documenta a modificação do jogo 2D isométrico para usar visualização fixa em 1.5x, removendo o mecanismo de zoom dinâmico que era acionado durante o lançamento do dado e caminhada do personagem.

### Objetivo Principal
Simplificar a exibição do tabuleiro com zoom fixo de 1.5x, mantendo todas as funcionalidades existentes não relacionadas ao mecanismo de zoom.

---

## 2. Arquitetura Anterior (Sistema de Zoom Dinâmico)

### 2.1 Fluxo de Estados (FSM)

```
AguardandoSelecao → AguardandoNoticia1 → AvaliacaoNoticia → LancamentoDado
→ AnimacaoDado → AguardandoZoomIn → AnimacaoZoomIn → AguardandoCaminhada
→ AnimacaoCaminhada → AguardandoZoomOut → AnimacaoZoomOut → AguardandoNoticia1
```

### 2.2 Hooks de Zoom

- **useDynamicZoom.ts**: Gerenciava estados `normal` (1x) e `dice` (3x) com transições animadas de 2400ms
- **useResponsiveIsometric.ts**: Aplicava `dynamicZoomFactor` multiplicando a escala base
- **useCameraControl.ts**: Controlava deslocamento e centralização da câmera durante zoom

### 2.3 Constantes do Mundo Virtual

```typescript
const TILE_WIDTH = 128;
const TILE_HEIGHT = 84;
const ISO_TILE_CALC_WIDTH = 64;
const ISO_TILE_CALC_HEIGHT = 32;
const WORLD_WIDTH = 3072;   // 48 tiles × 64px
const WORLD_HEIGHT = 1536;  // 48 tiles × 32px
const SHIFT_X = 1575 + TILE_WIDTH * (-0.8);  // ~1472.6
const SHIFT_Y = -75 + TILE_HEIGHT * (0.82);  // ~-6.12
```

---

## 3. Arquitetura Nova (Zoom Fixo 1.5x)

### 3.1 Fluxo de Estados Simplificado (FSM)

```
AguardandoSelecao → AguardandoNoticia1 → AvaliacaoNoticia → LancamentoDado
→ AnimacaoDado → AguardandoCaminhada → AnimacaoCaminhada → AguardandoNoticia1
```

**Estados removidos:**
- `AguardandoZoomIn`
- `AnimacaoZoomIn`
- `AguardandoZoomOut`
- `AnimacaoZoomOut`

### 3.2 Hook Simplificado (useDynamicZoom.ts)

```typescript
const FIXED_ZOOM_FACTOR = 1.5;

export const useDynamicZoom = (_props: UseDynamicZoomProps = {}): ZoomControls => {
  return {
    currentZoomState: 'normal',
    currentZoomFactor: FIXED_ZOOM_FACTOR,
    setZoomToNormal: async () => Promise.resolve(),
    setZoomToDice: async () => Promise.resolve(),
    isTransitioning: false
  };
};
```

### 3.3 Hook Responsivo (useResponsiveIsometric.ts)

```typescript
const FIXED_ZOOM_FACTOR = 1.5;

// Dentro de fitStageToContainer:
let scale = Math.min(scaleX, isPortrait ? scaleY * 0.85 : scaleY);
scale *= FIXED_ZOOM_FACTOR; // Fator fixo aplicado
```

---

## 4. Arquivos Modificados

### 4.1 src/hooks/useDynamicZoom.ts
- Removidas transições animadas
- Retorna fator fixo de 1.5x
- Funções `setZoomToNormal` e `setZoomToDice` são no-ops

### 4.2 src/hooks/useResponsiveIsometric.ts
- Usa fator fixo `FIXED_ZOOM_FACTOR = 1.5` em vez de `dynamicZoomFactor`
- Parâmetro `dynamicZoomFactor` mantido para compatibilidade mas ignorado

### 4.3 src/App.tsx
- Tipos `GameStateName` e `GameEvent` simplificados (estados/eventos de zoom removidos)
- `GAME_STATE_LABELS` atualizado
- `gameStateReducer` simplificado:
  - `AnimacaoDado` → `AguardandoCaminhada` (direto)
  - `AnimacaoCaminhada` → `AguardandoNoticia1` (direto)
- Funções `startZoomIn` e `startZoomOut` removidas
- Handlers de estado de zoom removidos de `enterStateHandlers`
- Imagem de fundo atualizada para `cenario_jogo_fundo_1.9.png`

### 4.4 src/components/IsometricBoard.tsx
- Prop `dynamicZoomFactor` mantida para compatibilidade mas efeito é fixo

---

## 5. Impacto Visual

### 5.1 Escala de Elementos

| Elemento | Escala Anterior | Escala Nova |
|----------|-----------------|-------------|
| Base (normal) | 1x | 1.5x fixo |
| Durante dado | 3x | 1.5x fixo |
| Tile efetivo | 128x84 → 384x252 | 192x126 |
| Mundo efetivo | 3072x1536 → 9216x4608 | 4608x2304 |

### 5.2 Elementos Afetados Automaticamente

Os seguintes elementos são escalados automaticamente pelo CSS transform no `.iso-stage`:
- Tiles do tabuleiro
- Players/sprites
- Fonte animada
- Piso Holograma
- Ranking
- Skate
- Lake animation

### 5.3 Sincronismo Preservado

- **Coordenadas isométricas**: Fórmula `getIsoPosition` inalterada
- **SHIFT_X e SHIFT_Y**: Valores preservados (imagem de fundo com mesmas dimensões)
- **Offsets do Player**: Funcionam em coordenadas pré-escala, sem necessidade de ajuste

---

## 6. Funcionalidades Preservadas

- Animação de caminhada do jogador
- Sistema de sprites (direções e frames)
- Detecção de tiles e validação de movimento
- Sistema de notícias e avaliação
- Transporte especial (skate)
- Narração e síntese de voz
- Controles mobile
- Sistema multiplayer
- Responsividade a resize/orientação

---

## 7. Dimensões da Imagem de Fundo

| Imagem | Dimensões | Status |
|--------|-----------|--------|
| cenario_jogo_fundo_1.8.png | 1024 × 644 px | Anterior |
| cenario_jogo_fundo_1.9.png | 1024 × 644 px | Nova (ativa) |

---

## 8. Testes Recomendados

### 8.1 Testes Funcionais
- [ ] Iniciar jogo e verificar visualização do tabuleiro
- [ ] Verificar posicionamento do player no tile inicial
- [ ] Lançar dado e verificar que não há zoom
- [ ] Verificar animação de caminhada
- [ ] Verificar sincronismo do player com tiles
- [ ] Verificar elementos decorativos (fonte, ranking, skate)
- [ ] Testar transporte do skate
- [ ] Verificar responsividade em diferentes tamanhos de tela

### 8.2 Testes de Regressão
- [ ] Sistema de notícias funciona corretamente
- [ ] Avaliação de notícias (Fake/Real) funciona
- [ ] Dado mostra valor correto
- [ ] Movimentos do player correspondem ao valor do dado
- [ ] Narração funciona

---

## 9. Prompt para Implementação da Primeira Etapa

```
Implemente a modificação do sistema de zoom para fator fixo 1.5x.

Arquivos a modificar:
1. src/hooks/useDynamicZoom.ts
   - Simplificar para retornar fator fixo FIXED_ZOOM_FACTOR = 1.5
   - Manter interface ZoomControls para compatibilidade
   - setZoomToNormal e setZoomToDice são no-ops

2. src/hooks/useResponsiveIsometric.ts
   - Definir const FIXED_ZOOM_FACTOR = 1.5
   - Na função fitStageToContainer, usar FIXED_ZOOM_FACTOR em vez de dynamicZoomFactor
   - Manter parâmetro dynamicZoomFactor na interface para compatibilidade

Critérios de aceitação:
- O tabuleiro é exibido com zoom fixo de 1.5x
- Não há transições de zoom durante o jogo
- Todas as funcionalidades existentes continuam funcionando
- Não há erros de TypeScript ou linter
```

---

## 10. Histórico de Alterações

| Data | Versão | Descrição |
|------|--------|-----------|
| 28/01/2026 | 1.0 | Implementação inicial do zoom fixo 1.5x |

---

## 11. Referências

- Arquivo de plano: `.cursor/plans/resizing_tabuleiro_1.5x_*.plan.md`
- IsometricBoard.tsx: Constantes do mundo virtual
- useCameraControl.ts: Sistema de câmera (preservado)
