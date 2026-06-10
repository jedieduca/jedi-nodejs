export type TileType = 'fundo' | 'caminho' | 'inicio' | 'fim';

interface PlayerObject {
  position: { x: number, y: number };
}

export class Tile {
  public x: number;
  public y: number;
  public type: TileType;
  public walkable: boolean;
  public isStart: boolean;

  constructor(x: number, y: number, char: string) {
    this.x = x;
    this.y = y;
    
    // Define o tipo do tile baseado no caractere do mapa
    switch (char) {
      case 'E':
      case ' ':
      case '.':
        this.type = 'fundo';
        this.walkable = false;
        this.isStart = false;
        break;
      case 'X':
        this.type = 'caminho';
        this.walkable = true;
        this.isStart = false;
        break;
      case 'I':
        this.type = 'inicio';
        this.walkable = true;
        this.isStart = true;
        break;
      case 'F':
        this.type = 'fim';
        this.walkable = true;
        this.isStart = false;
        break;
      default:
        this.type = 'fundo';
        this.walkable = false;
        this.isStart = false;
    }
  }

  // Método para obter a classe CSS correspondente ao tipo do tile
  getClassName(): string {
    return this.type;
  }

  // Método para verificar se o tile é caminhável
  isWalkable(): boolean {
    return this.walkable;
  }

  // Método para executar ação quando o player entra neste tile
  onPlayerEnter(player: PlayerObject): void {
    console.log(`Player entrou no tile (${this.x}, ${this.y}) do tipo ${this.type}`);
    
    // Implementar lógicas específicas para diferentes tipos de tiles
    if (this.type === 'fim') {
      console.log('Jogador chegou ao fim do mapa!');
      // Aqui poderia disparar um evento de vitória
    }
  }
} 