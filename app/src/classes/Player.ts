import { logPerfEvent, startPerfTimer } from '../utils/perfDiagnostics';

export const WALKING_PACE_DURATION = 400; // 1.2 segundos para o movimento completo

/**
 * Representa a posição no mapa
 */
export interface Position {
  x: number;
  y: number;
  _screenPosition?: ScreenPosition; // Adicionado para suportar posições interpoladas durante animação
}

/**
 * Representa a posição na tela (pixels)
 */
export interface ScreenPosition {
  isoX: number;
  isoY: number;
}

/**
 * Representa uma direção de movimento
 */
export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  UP_LEFT = 'up-left',
  UP_RIGHT = 'up-right',
  DOWN_LEFT = 'down-left',
  DOWN_RIGHT = 'down-right'
}

/**
 * Interface para validação de movimento
 */
export interface MovementValidator {
  isValidMove: (from: Position, to: Position) => boolean;
  getTileScreenPosition: (position: Position) => ScreenPosition | null;
}

/**
 * Classe que representa o jogador e gerencia seu movimento
 */
export class Player {
  private _position: Position;
  private _previousPosition: Position | null = null;
  private _lastPosition: Position | null = null;
  private _direction: Direction = Direction.DOWN;
  private _isMoving: boolean = false;
  private _movesLeft: number = 0;
  private _spriteFrame: number = 0;
  private _lastProgressChange: number = 0;
  private _movementValidator: MovementValidator;
  private _onPositionChange: (position: Position, isMoving: boolean) => void;
  private _walkingPaceDuration: number = WALKING_PACE_DURATION;
  private _movementSpeedMultiplier: number = 1;

  /**
   * Cria uma nova instância do jogador
   * @param initialPosition Posição inicial no mapa
   * @param movementValidator Validador de movimentos
   * @param onPositionChange Callback quando a posição é alterada
   */
  constructor(
    initialPosition: Position,
    movementValidator: MovementValidator,
    onPositionChange: (position: Position, isMoving: boolean) => void
  ) {
    this._position = { ...initialPosition };
    this._movementValidator = movementValidator;
    this._onPositionChange = onPositionChange;
  }

  /**
   * Define a duração do passo (em ms) para a animação de caminhada.
   */
  setWalkingPaceDuration(duration: number): void {
    const clampedDuration = Math.max(100, duration); // Mínimo 100ms para evitar animações quebradas
    this._walkingPaceDuration = clampedDuration;
  }

  /**
   * Define o multiplicador de velocidade do deslocamento (posição no tabuleiro).
   */
  setMovementSpeedMultiplier(multiplier: number): void {
    const clampedMultiplier = Math.max(0.1, multiplier);
    this._movementSpeedMultiplier = clampedMultiplier;
  }

  /**
   * Obtém a posição atual do jogador
   */
  get position(): Position {
    return { ...this._position };
  }

  /**
   * Obtém a posição anterior do jogador (para animação)
   */
  get previousPosition(): Position | null {
    return this._previousPosition ? { ...this._previousPosition } : null;
  }

  /**
   * Obtém a última posição do jogador (para validação)
   */
  get lastPosition(): Position | null {
    return this._lastPosition ? { ...this._lastPosition } : null;
  }

  /**
   * Obtém a direção atual do jogador
   */
  get direction(): Direction {
    return this._direction;
  }

  /**
   * Define a direção do jogador manualmente (usado em casos especiais como transporte)
   */
  setDirection(direction: Direction): void {
    console.log(`[Player.setDirection] Mudando direção de ${this._direction} para ${direction} na posição (${this._position.x}, ${this._position.y})`);
    this._direction = direction;
  }

  /**
   * Obtém o estado de movimento do jogador
   */
  get isMoving(): boolean {
    return this._isMoving;
  }

  /**
   * Obtém o número de movimentos restantes
   */
  get movesLeft(): number {
    return this._movesLeft;
  }

  /**
   * Obtém o frame atual do sprite
   */
  get spriteFrame(): number {
    return this._spriteFrame;
  }

  /**
   * Função para notificar o componente visual sobre mudanças no jogador
   * @param position Posição a ser reportada
   * @param isMoving Estado de movimento
   */
  private _notifyPositionChange(position: Position, isMoving: boolean): void {
    // Criamos uma cópia da posição para evitar vazamento de implementação
    const positionToReport = { ...position };
    
    // Garantir que a direção e o frame do sprite estejam atualizados antes de notificar
    this._onPositionChange(positionToReport, isMoving);
  }

  /**
   * Incrementa o frame do sprite para animação
   */
  incrementSpriteFrame(): void {
    this._spriteFrame = (this._spriteFrame + 1) % 10; // *** TESTE *** // 6 frames de animação
    // Notificar o componente visual da mudança de frame
    this._position.x+=0;
    this._position.y+=0;
    this._notifyPositionChange(this._position, this._isMoving);
  }

  /**
   * Reseta o frame do sprite para o início da animação
   */
  resetSpriteFrame(): void {
    this._spriteFrame = 0;
    // Notificar o componente visual da mudança de frame
    this._notifyPositionChange(this._position, this._isMoving);
  }

  /**
   * Determina a direção baseada nas posições atual e alvo
   * @param targetPosition Posição de destino
   */
  private determineDirection(targetPosition: Position): Direction {
    const dx = targetPosition.x - this._position.x;
    const dy = targetPosition.y - this._position.y;

    console.log(`=========> [determineDirection] Posição atual: (${this._position.x}, ${this._position.y})`);
    console.log(`=========> [determineDirection] Posição alvo: (${targetPosition.x}, ${targetPosition.y})`);
    console.log(`=========> [determineDirection] Delta: dx=${dx}, dy=${dy}`);
    console.log(`=========> [determineDirection] Direção anterior: ${this._direction}`);

    if (dx > 0 && dy === 0) return Direction.RIGHT;
    if (dx < 0 && dy === 0) return Direction.LEFT;
    if (dx === 0 && dy > 0) return Direction.DOWN;
    if (dx === 0 && dy < 0) return Direction.UP;
    /* Não tenho sprites para estas direções */
    // if (dx > 0 && dy > 0) return Direction.DOWN_RIGHT;
    // if (dx < 0 && dy < 0) return Direction.UP_LEFT;
    // if (dx > 0 && dy < 0) return Direction.UP_RIGHT;
    // if (dx < 0 && dy > 0) return Direction.DOWN_LEFT;
    /* Então substituo por estas abaixo */
    if (dx > 0 && dy > 0) return Direction.DOWN;
    if (dx < 0 && dy < 0) return Direction.UP;
    if (dx > 0 && dy < 0) return Direction.RIGHT;
    if (dx < 0 && dy > 0) return Direction.LEFT;

    return Direction.DOWN; // Direção padrão se não houver movimento
  }

  /**
   * Define o número de movimentos disponíveis
   * @param moves Número de movimentos
   */
  setMovesLeft(moves: number): void {
    this._movesLeft = moves;
  }

  /**
   * Verifica se um movimento é válido
   * @param targetPosition Posição de destino
   */
  private isValidMove(targetPosition: Position, allowBacktrack: boolean = false): boolean {
    // Movimento não pode ser para a última posição
    if (!allowBacktrack &&
        this._lastPosition && 
        targetPosition.x === this._lastPosition.x && 
        targetPosition.y === this._lastPosition.y) {
      console.log('Movimento inválido: não pode voltar para a última posição');
      return false;
    }

    // Verificar se tem movimentos disponíveis
    if (this._movesLeft <= 0) {
      console.log('Movimento inválido: sem movimentos restantes');
      return false;
    }

    // Delegar para o validador externo
    return this._movementValidator.isValidMove(this._position, targetPosition);
  }

  /**
   * Encontra o primeiro tile vizinho válido para movimento
   */
  private findValidNeighborTile(): Position | null {
    const neighbors = [
      { x: this._position.x, y: this._position.y - 1 },
      { x: this._position.x, y: this._position.y + 1 },
      { x: this._position.x + 1, y: this._position.y },
      { x: this._position.x - 1, y: this._position.y },
      // Diagonais
      { x: this._position.x + 1, y: this._position.y + 1 },
      { x: this._position.x + 1, y: this._position.y - 1 },
      { x: this._position.x - 1, y: this._position.y + 1 },
      { x: this._position.x - 1, y: this._position.y - 1 }
    ];

    for (const neighbor of neighbors) {
      if (this.isValidMove(neighbor)) {
        return neighbor;
      }
    }

    return null;
  }

  /**
   * Move o jogador para uma posição específica
   * @param targetPosition Posição alvo
   * @returns Promise que resolve para true se o movimento for bem sucedido
   */
  async moveTo(targetPosition: Position, options?: { allowBacktrack?: boolean }): Promise<boolean> {
    const perfTimer = startPerfTimer('player:moveTo', {
      fromX: this._position.x,
      fromY: this._position.y,
      toX: targetPosition.x,
      toY: targetPosition.y,
      isMoving: this._isMoving
    });

    // Verifica se o jogador já está em movimento
    if (this._isMoving) {
      console.log('Jogador já está em movimento');
      logPerfEvent('player:moveTo:ignored', {
        reason: 'already_moving',
        currentX: this._position.x,
        currentY: this._position.y,
        targetX: targetPosition.x,
        targetY: targetPosition.y
      });
      perfTimer.end({ result: 'already_moving' });
      return false;
    }

    // Verifica se o movimento é válido
    if (!this.isValidMove(targetPosition, options?.allowBacktrack ?? false)) {
      console.log('Movimento inválido para', targetPosition);
      perfTimer.end({ result: 'invalid_move' });
      return false;
    }

    // Salva a posição anterior
    this._previousPosition = { ...this._position };
    
    // Determina a direção com base na posição alvo
    this._direction = this.determineDirection(targetPosition);
    
    // Marca o jogador como em movimento
    this._isMoving = true;
    
    // Atualiza a última posição
    this._lastPosition = { ...this._position };
    
    // Preparação para animação
    const startTime = performance.now();
    const duration = this._walkingPaceDuration; // Ritmo dos ciclos de sprite
    const moveDuration = Math.max(1, duration / this._movementSpeedMultiplier); // Deslocamento independente do ritmo dos sprites
    const startPosition = { ...this._position };
    
    // Número de frames de sprite para mostrar durante a animação
    const totalFrames = 10;
    
    // Obter posições de tela inicial e final para interpolação
    const startScreenPos = this._movementValidator.getTileScreenPosition(startPosition);
    const targetScreenPos = this._movementValidator.getTileScreenPosition(targetPosition);
    
    if (!startScreenPos || !targetScreenPos) {
      console.error('❌ Não foi possível obter posições na tela para animação');
      this._isMoving = false;
      return false;
    }
    
    console.log(`🔍 🎬 👟 Iniciando movimento de (${startPosition.x},${startPosition.y}) para (${targetPosition.x},${targetPosition.y})`);
    //console.log(`🔍 🎬 👟 Posição na tela: de (${startScreenPos.isoX},${startScreenPos.isoY}) para (${targetScreenPos.isoX},${targetScreenPos.isoY})`);

    // === ALGORITMO DE MOVIMENTO SUAVE APRIMORADO ===
    
    // Função para animar o movimento com curva de easing
    return new Promise((resolve) => {
      const animate = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        const moveProgress = Math.min(elapsedTime / moveDuration, 1);
        const frameDuration = duration / totalFrames;
        const frameProgress = duration === 0 ? 1 : (elapsedTime / duration);
        const frameIndex = Math.floor((elapsedTime / frameDuration)) % totalFrames;
        
        // Aplicar curva de easing para movimento mais natural (ease-out)
        // Fórmula: 1 - (1 - x)^3 (cubic ease-out)
        // const easedProgress = 1 - Math.pow(1 - moveProgress, 3);
        const easedProgress = moveProgress;
        
        // === ANIMAÇÃO DE SPRITES SINCRONIZADA ===
        // Atualizar frame do sprite de forma mais suave e consistente
        // Usar o progresso linear para frames para manter ritmo constante
        // const frameProgress = progress; // Usar progresso linear para frames
        // this._spriteFrame = Math.floor(frameProgress * totalFrames) % totalFrames;

        if (frameProgress - this._lastProgressChange >= 0.00) {
          this._lastProgressChange = frameProgress;
          //this._spriteFrame =  (this._spriteFrame + 1) % totalFrames;
        }
        this._spriteFrame = frameIndex;
        this._spriteFrame = this._spriteFrame >= 0 ? this._spriteFrame : 0;
        
        // === CORREÇÃO: GARANTIR DIREÇÃO CONSISTENTE DURANTE MOVIMENTO ===
        // Manter a direção inicial durante todo o movimento para evitar problemas de renderização
        // A direção foi definida corretamente no início do movimento e deve permanecer estável
        
        // === INTERPOLAÇÃO SUAVE DE POSIÇÃO ===
        // Usar progresso com easing para movimento mais natural
        const interpolatedScreenPos = {
          isoX: startScreenPos.isoX + (targetScreenPos.isoX - startScreenPos.isoX) * easedProgress,
          isoY: startScreenPos.isoY + (targetScreenPos.isoY - startScreenPos.isoY) * easedProgress,
        };
        
        const interpolatedPosition = {
          ...this._position,
          _screenPosition: interpolatedScreenPos,
          _progress: moveProgress
        };

        // console.log(`🔍 🎬 Frame: ${this._spriteFrame}, 
        //   CalculatedFrame: ${Math.floor(progress * 10) % totalFrames},
        //   progress: ${progress.toFixed(2)},\n X: ${interpolatedScreenPos.isoX.toFixed(0)}, Y: ${interpolatedScreenPos.isoY.toFixed(0)}`);
        
        // Notificar componente com a posição intermediária
        this._notifyPositionChange(interpolatedPosition, true);
        
        if (moveProgress < 1) {
          // Continua a animação
          requestAnimationFrame(animate);
        } else {
          // === FINALIZAÇÃO DO MOVIMENTO ===
          
          // Atualizar posição lógica para o tile de destino
          this._position = { ...targetPosition };
          this._isMoving = false;
          
          // Reduzir movimentos restantes (1 passo por movimento)
          this._movesLeft -= 1;
          
          // Notificar que o movimento terminou com a posição final
          this._notifyPositionChange(this._position, false);
          
          // Resetar frame do sprite ao final
          //this._spriteFrame = 0;
          
        console.log(`🔍 🎬 👟 Movimento suave completo para tile (${targetPosition.x},${targetPosition.y}). Movimentos restantes: ${this._movesLeft}`);
        perfTimer.end({ result: 'success', movesLeft: this._movesLeft });
          resolve(true);
        }
      };
      
      // Iniciar a animação
    requestAnimationFrame(animate);
  });
  }

  /**
   * Realiza um passo em direção a um tile vizinho válido
   * @returns Promessa que é resolvida quando o passo é concluído
   */
  async walk(): Promise<boolean> {
    const validNeighbor = this.findValidNeighborTile();
    if (!validNeighbor) {
      console.log('Nenhum tile vizinho válido encontrado');
      return false;
    }

    return this.moveTo(validNeighbor);
  }

  /**
   * Realiza um passo para trás usando lastPosition como destino.
   * Ignora a restrição de não voltar para lastPosition durante o Julgamento.
   */
  async walkBackward(): Promise<boolean> {
    if (!this._lastPosition) {
      console.log('Não há lastPosition para caminhada reversa');
      return false;
    }

    return this.moveTo(this._lastPosition, { allowBacktrack: true });
  }

  /**
   * Realiza n passos
   * @param steps Número de passos a dar
   * @returns Promessa que é resolvida quando todos os passos são concluídos
   */
  async goto(steps: number): Promise<void> {
    const perfTimer = startPerfTimer('player:goto', { steps, initialMoves: this._movesLeft });
    let executedSteps = 0;
    for (let i = 0; i < steps; i++) {
      if (this._movesLeft <= 0) {
        console.log('Sem movimentos restantes');
        perfTimer.end({ result: 'no_moves', executedSteps });
        break;
      }
      
      const success = await this.walk();
      if (!success) {
        console.log(`Não foi possível completar o passo ${i+1} de ${steps}`);
        perfTimer.end({ result: 'blocked', executedSteps });
        break;
      }
      executedSteps++;
    }
    perfTimer.end({ result: 'completed', executedSteps, movesLeft: this._movesLeft });
  }

  /**
   * Realiza n passos para trás (usado por comportamentos especiais como Julgamento).
   *
   * Apenas o primeiro passo usa walkBackward() (allowBacktrack) para ir
   * explicitamente a _lastPosition. Após esse passo, _lastPosition aponta
   * para o tile que acabamos de deixar (sentido "frente"), então walk()
   * naturalmente escolhe o único outro vizinho válido — o próximo tile
   * no sentido reverso — sem oscilar.
   *
   * @param steps Número de passos a dar no sentido reverso
   */
  async gotoBackward(steps: number): Promise<void> {
    const perfTimer = startPerfTimer('player:gotoBackward', { steps, initialMoves: this._movesLeft });
    let executedSteps = 0;
    for (let i = 0; i < steps; i++) {
      if (this._movesLeft <= 0) {
        console.log('Sem movimentos restantes (reverso)');
        perfTimer.end({ result: 'no_moves', executedSteps });
        break;
      }

      // Primeiro passo: forçar ida a _lastPosition (backtrack explícito).
      // Passos seguintes: walk() normal — _lastPosition já aponta para
      // o tile à frente, então findValidNeighborTile o exclui e seleciona
      // o vizinho no sentido reverso.
      const success = i === 0
        ? await this.walkBackward()
        : await this.walk();

      if (!success) {
        console.log(`Não foi possível completar o passo reverso ${i + 1} de ${steps}`);
        perfTimer.end({ result: 'blocked', executedSteps });
        break;
      }
      executedSteps++;
    }
    perfTimer.end({ result: 'completed', executedSteps, movesLeft: this._movesLeft });
  }

  /**
   * Teleporta o jogador para uma nova posição sem animação
   * @param position Nova posição
   * @param simulatedFromPosition Posição simulada de onde o jogador "veio" (para evitar voltar nessa direção)
   */
  teleportTo(position: Position, simulatedFromPosition?: Position): void {
    console.log(`[Player.teleportTo] De (${this._position.x}, ${this._position.y}) para (${position.x}, ${position.y})`);
    this._previousPosition = { ...this._position };
    this._position = { ...position };
    
    // Se uma posição simulada de origem foi fornecida, usar como lastPosition
    // Isso evita que o jogador "volte" para essa direção no próximo movimento
    if (simulatedFromPosition) {
      this._lastPosition = { ...simulatedFromPosition };
      console.log(`[Player.teleportTo] lastPosition definida como simulada: (${simulatedFromPosition.x}, ${simulatedFromPosition.y})`);
    } else {
      this._lastPosition = null; // Reseta a última posição
    }
    
    console.log(`[Player.teleportTo] Posição atualizada: (${this._position.x}, ${this._position.y}), Direção: ${this._direction}`);
    this._onPositionChange(this._position, false);
  }

  /**
   * Define a última posição manualmente (usado para controlar a direção do próximo movimento)
   * @param position Posição a ser definida como última posição
   */
  setLastPosition(position: Position | null): void {
    if (position) {
      this._lastPosition = { ...position };
      console.log(`[Player.setLastPosition] lastPosition definida como: (${position.x}, ${position.y})`);
    } else {
      this._lastPosition = null;
      console.log(`[Player.setLastPosition] lastPosition resetada para null`);
    }
  }
} 