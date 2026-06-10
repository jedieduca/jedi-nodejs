# Especificação para Implementação do Modo Multiplayer no Jogo de Fake News

## Visão Geral
Esta especificação apresenta uma abordagem ortogonal e não invasiva para implementar o modo multiplayer com até 4 jogadores na mesma instância do jogo de Fake News, mantendo todas as funcionalidades existentes. Os jogadores utilizarão personagens diferentes e terão turnos alternados para avaliar notícias, jogar o dado e mover-se pelo tabuleiro.

## Objetivos
1. Permitir até 4 jogadores simultâneos
2. Alternar automaticamente a vez entre os jogadores após cada ação
3. Manter todas as funcionalidades existentes do jogo
4. Associar cada jogador a um personagem (sprite) diferente escolhido entre 6 opções
5. Exibir os personagens para seleção no início do jogo
6. Controlar a posição de cada jogador no mapa e renderizar os sprites com um pequeno deslocamento quando dois ou mais jogadores estão na mesma casa

## Princípios de Design
- Manter a estrutura básica do jogo intacta
- Minimizar alterações nos componentes existentes
- Usar composição em vez de modificação quando possível
- Seguir os princípios SOLID para criar componentes reutilizáveis
- Manter separação de responsabilidades

## Arquitetura da Solução

### 1. Gerenciador de Jogadores (PlayerManager)
Criar uma nova classe `PlayerManager` para gerenciar múltiplos jogadores:
- Manter um array de instâncias de jogadores
- Controlar qual jogador está ativo (turno atual)
- Alternar entre jogadores automaticamente
- Fornecer métodos para adicionar/remover jogadores

### 2. Seleção de Personagens
Criar um novo componente `CharacterSelection` para a seleção inicial de personagens:
- Exibir 6 personagens diferentes para seleção
- Permitir arrastar e soltar no tabuleiro para posicionar
- Associar cada personagem escolhido a um jogador
- Iniciar o jogo quando todos os jogadores estiverem prontos

### 3. Adaptação do Componente Player
Adaptar o componente `Player` e a classe `Player` para:
- Associar a um personagem específico (conjunto de sprites)
- Incluir um identificador único para cada jogador
- Adicionar controle de deslocamento visual quando múltiplos jogadores estão na mesma casa

### 4. Controle de Turnos
Criar um novo componente `TurnManager` para:
- Exibir qual jogador está ativo no momento
- Controlar a transição de turnos
- Bloquear ações de jogadores fora de seu turno

### 5. Adaptação do Componente App
Modificar o componente principal `App` para:
- Integrar o gerenciador de jogadores
- Inicializar o jogo com a seleção de personagens
- Adaptar o fluxo do jogo para o modo multiplayer

## Componentes Específicos a Serem Implementados

### 1. Interface de Gerenciamento de Jogadores
```typescript
interface Player {
  id: string;
  character: string; // Identificador do personagem
  position: Position;
  movesLeft: number;
  isActive: boolean;
  // outros atributos...
}

class PlayerManager {
  private players: Player[];
  private activePlayerIndex: number;
  
  constructor() {
    this.players = [];
    this.activePlayerIndex = 0;
  }
  
  addPlayer(character: string): Player;
  removePlayer(id: string): void;
  getActivePlayer(): Player;
  nextTurn(): void;
  getPlayerById(id: string): Player | undefined;
  getAllPlayers(): Player[];
  // outros métodos...
}
```

### 2. Componente de Seleção de Personagens
```typescript
interface CharacterSelectionProps {
  availableCharacters: string[];
  maxPlayers: number;
  onPlayersSelected: (selectedCharacters: string[]) => void;
}

const CharacterSelection: React.FC<CharacterSelectionProps> = () => {
  // Implementação...
}
```

### 3. Adaptação do Renderizador de Player
```typescript
interface MultiPlayerComponentProps {
  players: Player[];
  activePlayerId: string;
  // outros props...
}

const MultiPlayerComponent: React.FC<MultiPlayerComponentProps> = () => {
  // Implementação...
}
```

### 4. Indicador de Turno
```typescript
interface TurnIndicatorProps {
  activePlayer: Player;
  players: Player[];
}

const TurnIndicator: React.FC<TurnIndicatorProps> = () => {
  // Implementação...
}
```

## Estratégia de Implementação

### Parte 1: Preparação da Base
1. Criar a classe `PlayerManager` para gerenciar múltiplos jogadores
2. Adaptar a interface de `Player` para suportar diferentes personagens
3. Criar o componente `CharacterSelection` para seleção de personagens

### Parte 2: Mecânica de Turnos
1. Implementar a lógica de alternar turnos após cada ação (avaliação de notícia/movimento)
2. Adaptar o componente de dado para responder ao jogador ativo
3. Criar o componente `TurnIndicator` para mostrar o jogador atual

### Parte 3: Renderização e UI
1. Adaptar o renderizador de jogadores para suportar múltiplos jogadores
2. Implementar o deslocamento visual quando jogadores estão na mesma casa
3. Adicionar indicadores visuais para o jogador ativo

### Parte 4: Fluxo do Jogo
1. Adaptar a mecânica de avaliação de notícias para o jogador ativo
2. Ajustar o fluxo do jogo para transicionar corretamente entre os jogadores
3. Testar e ajustar a sincronização entre os componentes

## Considerações Técnicas
1. Usar React Context para compartilhar o estado do gerenciador de jogadores
2. Implementar drag-and-drop para a seleção de personagens
3. Usar CSS para diferenciar visualmente o jogador ativo
4. Garantir que a lógica de colisão e deslocamento funcione corretamente

## Fluxo do Usuário
1. Ao iniciar o jogo, exibir a tela de seleção de personagens
2. Permitir que 1-4 jogadores selecionem seus personagens
3. Após a seleção, iniciar o jogo com o primeiro jogador
4. Após cada ação completa (avaliação + movimento), passar a vez para o próximo jogador
5. Continuar até o fim do jogo (jogador alcança o final do tabuleiro ou outro critério)

Esta especificação fornece uma abordagem estruturada e ortogonal para implementar o modo multiplayer sem interferir nas funcionalidades existentes do jogo. 