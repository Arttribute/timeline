// Core game types
export type ActionType =
  | 'income'
  | 'foreign_aid'
  | 'coup'
  | 'tax'
  | 'assassinate'
  | 'steal'
  | 'exchange';

export type CardType = 'duke' | 'assassin' | 'captain' | 'ambassador' | 'contessa';

export type ReactionType = 'challenge' | 'block';

export type GamePhase =
  | 'lobby'
  | 'setup'
  | 'action'
  | 'reaction'
  | 'resolution'
  | 'finished';

export interface Card {
  id: string;
  type: CardType;
  name: string;              // Themed name (e.g., "Consul" instead of "Duke")
  description: string;       // Themed description
  ability: string;           // What the card can do
  imageUrl?: string;         // DALL-E generated image
  historicalContext?: string; // Historical background
}

export interface Player {
  id: string;
  name: string;
  type: 'human' | 'agent';
  coins: number;
  cards: Card[];             // Cards in hand (face down to others)
  influenceCount: number;    // How many cards still alive
  eliminated: boolean;
  lastActionTime?: number;
}

export interface PendingAction {
  id: string;
  type: ActionType;
  actor: string;             // Player ID
  target?: string;           // Target player ID (for steal, assassinate, coup)
  claimedCard?: CardType;    // Card claimed to have
  timestamp: number;
}

export interface Reaction {
  id: string;
  player: string;
  type: ReactionType;
  claimedCard?: CardType;    // For blocks
  timestamp: number;
}

export interface AIAgent {
  agentId: string;           // Agent Commons agent ID
  playerId: string;          // Player ID in game
  name: string;              // Agent's character name
  persona: string;           // Historical persona description
}

export interface GameState {
  gameId: string;
  spaceId?: string;          // Agent Commons Space ID
  aiAgents?: AIAgent[];      // AI agents created for this game
  status: 'waiting' | 'playing' | 'finished';
  phase: GamePhase;

  // Historical theme
  period: string;            // e.g., "Ancient Rome, 44 BCE"
  character: string;         // User's character description
  actionNames?: Record<ActionType, string>; // Themed action names
  backgroundUrl?: string;    // AI-generated background scene
  characterImageUrl?: string; // AI-generated character portrait

  // Players
  players: Player[];
  currentPlayerIndex: number;

  // Game state
  deck: Card[];              // Draw pile
  discardPile: Card[];       // Discarded cards

  // Turn management
  pendingAction?: PendingAction;
  reactions: Reaction[];
  reactionWindowEnd?: number;

  // History
  actionHistory: Array<{
    turn: number;
    action: PendingAction;
    reactions: Reaction[];
    result: string;
    timestamp: number;
  }>;

  // Claims tracking (for AI perception)
  claims: Array<{
    player: string;
    claimedCard: CardType;
    action: ActionType;
    challenged: boolean;
    challengeResult?: 'success' | 'failed';
    timestamp: number;
  }>;

  // Metadata
  version: number;
  turnNumber: number;
  winner?: string;
  createdAt: Date;
  lastUpdate: number;
}

export interface DeckTheme {
  period: string;
  character: string;
  cards: Card[];
  actionNames: Record<ActionType, string>;
  backgroundUrl: string;
  characterImageUrl?: string;
  generatedAt: Date;
  usageCount: number;
}

// API Response types
export interface ActionResponse {
  success: boolean;
  message: string;
  gameState?: PublicGameState;
  privateState?: PrivatePlayerState;
  error?: string;
}

export interface PublicGameState {
  gameId: string;
  status: string;
  phase: GamePhase;
  currentPlayer: string;
  turnNumber: number;
  players: Array<{
    id: string;
    name: string;
    type: 'human' | 'agent';
    coins: number;
    cardCount: number;
    influenceCount: number;
    eliminated: boolean;
  }>;
  discardPile: Card[];
  actionHistory: GameState['actionHistory'];
  pendingAction?: PendingAction;
  reactionWindowEnd?: number;
  period: string;
  character: string;
  actionNames?: Record<ActionType, string>;
  backgroundUrl?: string;
  characterImageUrl?: string;
}

export interface PrivatePlayerState {
  playerId: string;
  hand: Card[];
  availableActions: ActionType[];
  canChallenge: boolean;
  canBlock: boolean;
  blockCards: CardType[];
}

// Agent perception (for AI agents)
export interface AgentPerception {
  gameId: string;
  yourId: string;
  yourName: string;

  // Your private state
  yourHand: Card[];
  yourCoins: number;
  yourInfluence: number;

  // Public state
  currentPlayer: string;
  isYourTurn: boolean;
  phase: GamePhase;
  turnNumber: number;

  // Other players
  opponents: Array<{
    id: string;
    name: string;
    coins: number;
    cardCount: number;
    influence: number;
    eliminated: boolean;
  }>;

  // Pending action
  pendingAction?: {
    type: ActionType;
    actor: string;
    target?: string;
    claimedCard?: CardType;
    actionName: string;
  };

  // Your options
  availableActions: ActionType[];
  canReact: boolean;
  reactionOptions: {
    canChallenge: boolean;
    canBlock: boolean;
    blockCards: CardType[];
  };

  // Strategic insights
  insights: {
    claimsMade: Array<{
      player: string;
      card: CardType;
      action: ActionType;
      verified: boolean;
    }>;
    suspiciousBehaviors: Array<{
      player: string;
      reason: string;
    }>;
    recommendations: string[];
  };

  reactionDeadline?: number;
}
