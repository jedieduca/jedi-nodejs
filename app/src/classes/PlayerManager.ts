import { v4 as uuidv4 } from 'uuid';
import { Position, MovementValidator, Player as PlayerClass, Direction, WALKING_PACE_DURATION } from './Player';

export interface GamePlayer {
  id: string;
  character: string; // Identificador do personagem
  playerInstance: PlayerClass;
  position: Position;
  movesLeft: number;
  isActive: boolean;
}

/**
 * Classe para gerenciar múltiplos jogadores no modo multiplayer
 */
export class PlayerManager {
  private players: GamePlayer[] = [];
  private activePlayerIndex: number = 0;
  private movementValidator: MovementValidator;
  private onPlayerPositionChange: (playerId: string, position: Position, isMoving: boolean) => void;
  private walkingPaceDuration: number = WALKING_PACE_DURATION;
  private movementSpeedMultiplier: number = 1;

  /**
   * Cria uma nova instância do gerenciador de jogadores
   * @param movementValidator Validador de movimentos compartilhado
   * @param onPlayerPositionChange Callback para notificar mudanças de posição
   */
  constructor(
    movementValidator: MovementValidator,
    onPlayerPositionChange: (playerId: string, position: Position, isMoving: boolean) => void
  ) {
    this.movementValidator = movementValidator;
    this.onPlayerPositionChange = onPlayerPositionChange;
  }

  /**
   * Adiciona um novo jogador ao jogo
   * @param character Personagem escolhido
   * @param initialPosition Posição inicial no mapa
   * @returns O jogador criado
   */
  addPlayer(character: string, initialPosition: Position): GamePlayer {
    const id = uuidv4();
    
    // Wrapper para o callback de mudança de posição
    const positionChangeCallback = (position: Position, isMoving: boolean) => {
      this.onPlayerPositionChange(id, position, isMoving);
    };
    
    // Criar instância do jogador
    const playerInstance = new PlayerClass(
      initialPosition,
      this.movementValidator,
      positionChangeCallback
    );
    playerInstance.setWalkingPaceDuration(this.walkingPaceDuration);
    playerInstance.setMovementSpeedMultiplier(this.movementSpeedMultiplier);
    
    // Criar objeto do jogador
    const player: GamePlayer = {
      id,
      character,
      playerInstance,
      position: initialPosition,
      movesLeft: 0,
      isActive: this.players.length === 0 // Primeiro jogador inicia ativo
    };
    
    this.players.push(player);
    return player;
  }

  /**
   * Ajusta a duração do passo de todos os jogadores.
   */
  setWalkingPaceDuration(duration: number): void {
    this.walkingPaceDuration = duration;
    this.players.forEach((player) => player.playerInstance.setWalkingPaceDuration(duration));
  }

  /**
   * Ajusta o multiplicador de velocidade do deslocamento de todos os jogadores.
   */
  setMovementSpeedMultiplier(multiplier: number): void {
    this.movementSpeedMultiplier = multiplier;
    this.players.forEach((player) => player.playerInstance.setMovementSpeedMultiplier(multiplier));
  }

  /**
   * Remove um jogador do jogo
   * @param id ID do jogador
   */
  removePlayer(id: string): void {
    const index = this.players.findIndex(p => p.id === id);
    if (index !== -1) {
      this.players.splice(index, 1);
      
      // Se o jogador ativo foi removido, atualizar o índice
      if (index === this.activePlayerIndex) {
        this.activePlayerIndex = this.activePlayerIndex % this.players.length;
        if (this.players.length > 0) {
          this.setActivePlayer(this.players[this.activePlayerIndex].id);
        }
      } else if (index < this.activePlayerIndex) {
        this.activePlayerIndex--;
      }
    }
  }

  /**
   * Obtém o jogador ativo atual
   * @returns O jogador ativo
   */
  getActivePlayer(): GamePlayer | null {
    return this.players.length > 0 ? this.players[this.activePlayerIndex] : null;
  }

  /**
   * Passa a vez para o próximo jogador
   */
  nextTurn(): void {
    if (this.players.length === 0) return;
    
    // Desativar o jogador atual
    this.players[this.activePlayerIndex].isActive = false;
    
    // Avançar para o próximo jogador
    this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
    
    // Ativar o próximo jogador
    this.players[this.activePlayerIndex].isActive = true;
  }

  /**
   * Define um jogador específico como ativo
   * @param playerId ID do jogador
   */
  setActivePlayer(playerId: string): void {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      // Desativar todos os jogadores
      this.players.forEach(p => p.isActive = false);
      
      // Ativar o jogador selecionado
      this.players[index].isActive = true;
      this.activePlayerIndex = index;
    }
  }

  /**
   * Obtém um jogador pelo ID
   * @param id ID do jogador
   * @returns O jogador com o ID especificado ou undefined se não existir
   */
  getPlayerById(id: string): GamePlayer | undefined {
    return this.players.find(p => p.id === id);
  }

  /**
   * Obtém todos os jogadores
   * @returns Array de jogadores
   */
  getAllPlayers(): GamePlayer[] {
    return [...this.players];
  }

  /**
   * Verifica se há algum jogador na posição especificada
   * @param position Posição a verificar
   * @returns Array com os jogadores na posição
   */
  getPlayersAtPosition(position: Position): GamePlayer[] {
    return this.players.filter(
      p => p.position.x === position.x && p.position.y === position.y
    );
  }

  /**
   * Calcula o deslocamento necessário para um jogador em uma posição com múltiplos jogadores
   * @param playerId ID do jogador
   * @param position Posição a verificar
   * @returns Deslocamento em pixels {x, y}
   */
  getPlayerOffset(playerId: string, position: Position): {x: number, y: number} {
    const playersAtPosition = this.getPlayersAtPosition(position);
    
    // Se apenas este jogador está na posição, não precisa de offset
    if (playersAtPosition.length <= 1) {
      return { x: 0, y: 0 };
    }
    
    // Encontrar o índice deste jogador na lista de jogadores nesta posição
    const playerIndex = playersAtPosition.findIndex(p => p.id === playerId);
    
    // Se não encontrou ou é o primeiro, não precisa de offset
    if (playerIndex === -1 || playerIndex === 0) {
      return { x: 0, y: 0 };
    }
    
    // Calcular deslocamento baseado no índice (5px para cada jogador)
    return {
      x: playerIndex * 5,
      y: playerIndex * 5
    };
  }

  /**
   * Define o número de movimentos disponíveis para o jogador ativo
   * @param moves Número de movimentos
   */
  setActivePlayerMoves(moves: number): void {
    const activePlayer = this.getActivePlayer();
    if (activePlayer) {
      activePlayer.playerInstance.setMovesLeft(moves);
      activePlayer.movesLeft = moves;
    }
  }

  /**
   * Move o jogador ativo para uma posição específica
   * @param targetPosition Posição alvo
   * @returns Promise que resolve quando o movimento é concluído
   */
  async moveActivePlayerTo(targetPosition: Position): Promise<boolean> {
    const activePlayer = this.getActivePlayer();
    if (activePlayer) {
      const result = await activePlayer.playerInstance.moveTo(targetPosition);
      // Atualizar a posição e movimentos restantes após o movimento
      activePlayer.position = activePlayer.playerInstance.position;
      activePlayer.movesLeft = activePlayer.playerInstance.movesLeft;
      return result;
    }
    return false;
  }

  /**
   * Faz o jogador ativo andar o número de passos indicado pelo dado
   * @param steps Número de passos
   */
  async moveActivePlayerSteps(steps: number): Promise<void> {
    const activePlayer = this.getActivePlayer();
    if (activePlayer) {
      await activePlayer.playerInstance.goto(steps);
      // Atualizar a posição e movimentos restantes após o movimento
      activePlayer.position = activePlayer.playerInstance.position;
      activePlayer.movesLeft = activePlayer.playerInstance.movesLeft;
    }
  }

  /**
   * Teleporta todos os jogadores para a posição inicial
   * @param initialPosition Posição inicial
   */
  teleportAllToStart(initialPosition: Position): void {
    this.players.forEach(player => {
      player.playerInstance.teleportTo(initialPosition);
      player.position = initialPosition;
    });
  }

  /**
   * Teleporta o jogador ativo diretamente para uma posição sem animação.
   * @param position Nova posição alvo.
   * @param simulatedFromPosition Posição simulada de onde o jogador "veio" (para evitar voltar nessa direção)
   */
  teleportActivePlayer(position: Position, simulatedFromPosition?: Position): void {
    const activePlayer = this.getActivePlayer();
    if (activePlayer) {
      activePlayer.playerInstance.teleportTo(position, simulatedFromPosition);
      activePlayer.position = { ...position };
      activePlayer.movesLeft = activePlayer.playerInstance.movesLeft;
    }
  }

  /**
   * Define a última posição do jogador ativo manualmente.
   * Usado para controlar a direção do próximo movimento após teletransporte.
   * @param position Posição a ser definida como última posição (ou null para resetar)
   */
  setActivePlayerLastPosition(position: Position | null): void {
    const activePlayer = this.getActivePlayer();
    if (activePlayer) {
      activePlayer.playerInstance.setLastPosition(position);
    }
  }

  /**
   * Define a direção do jogador ativo (usado em casos especiais como transporte).
   * @param direction Nova direção.
   */
  setActivePlayerDirection(direction: Direction): void {
    const activePlayer = this.getActivePlayer();
    if (activePlayer) {
      activePlayer.playerInstance.setDirection(direction);
    }
  }
} 