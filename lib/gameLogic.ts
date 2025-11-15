import { nanoid } from 'nanoid';
import GameModel, { IGameStateDoc } from '@/models/Game';
import {
  GameState,
  Player,
  Card,
  ActionType,
  CardType,
  PendingAction,
  Reaction,
  PublicGameState,
  PrivatePlayerState,
  AgentPerception,
} from '@/lib/types';

// Game configuration constants
export const GAME_CONFIG = {
  STARTING_COINS: 2,
  STARTING_CARDS: 2,
  COUP_COST: 7,
  ASSASSINATE_COST: 3,
  REACTION_WINDOW: 30000, // 30 seconds
  MAX_PLAYERS: 6,
  MIN_PLAYERS: 2,
};

// Card abilities mapping
export const CARD_ABILITIES: Record<CardType, { action: ActionType; blocks: ActionType[] }> = {
  duke: { action: 'tax', blocks: ['foreign_aid'] },
  assassin: { action: 'assassinate', blocks: [] },
  captain: { action: 'steal', blocks: ['steal'] },
  ambassador: { action: 'exchange', blocks: ['steal'] },
  contessa: { action: 'income' as ActionType, blocks: ['assassinate'] }, // Contessa has no action, only blocks
};

// Action requirements
export const ACTION_REQUIREMENTS: Record<
  ActionType,
  {
    requiresCard?: CardType;
    requiresTarget: boolean;
    cost: number;
    canBeBlocked: boolean;
    blockedBy: CardType[];
  }
> = {
  income: { requiresTarget: false, cost: 0, canBeBlocked: false, blockedBy: [] },
  foreign_aid: { requiresTarget: false, cost: 0, canBeBlocked: true, blockedBy: ['duke'] },
  coup: { requiresTarget: true, cost: 7, canBeBlocked: false, blockedBy: [] },
  tax: { requiresCard: 'duke', requiresTarget: false, cost: 0, canBeBlocked: false, blockedBy: [] },
  assassinate: {
    requiresCard: 'assassin',
    requiresTarget: true,
    cost: 3,
    canBeBlocked: true,
    blockedBy: ['contessa'],
  },
  steal: {
    requiresCard: 'captain',
    requiresTarget: true,
    cost: 0,
    canBeBlocked: true,
    blockedBy: ['captain', 'ambassador'],
  },
  exchange: { requiresCard: 'ambassador', requiresTarget: false, cost: 0, canBeBlocked: false, blockedBy: [] },
};

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export function shuffleDeck<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Create initial deck with themed cards
 */
export function createDeck(themedCards: Card[]): Card[] {
  // Standard Coup has 3 of each card type (5 types × 3 = 15 cards)
  const deck: Card[] = [];

  themedCards.forEach((card) => {
    for (let i = 0; i < 3; i++) {
      deck.push({
        ...card,
        id: `${card.type}_${nanoid(6)}`,
      });
    }
  });

  return shuffleDeck(deck);
}

/**
 * Deal cards to players
 */
export function dealCards(game: GameState): void {
  game.players.forEach((player) => {
    for (let i = 0; i < GAME_CONFIG.STARTING_CARDS; i++) {
      const card = game.deck.pop();
      if (card) {
        player.cards.push(card);
        player.influenceCount++;
      }
    }
    player.coins = GAME_CONFIG.STARTING_COINS;
  });
}

/**
 * Get available actions for a player
 */
export function getAvailableActions(player: Player, game: GameState): ActionType[] {
  const actions: ActionType[] = ['income', 'foreign_aid'];

  // Coup is available if player has 7+ coins
  if (player.coins >= GAME_CONFIG.COUP_COST) {
    actions.push('coup');
  }

  // MUST coup if 10+ coins
  if (player.coins >= 10) {
    return ['coup'];
  }

  // Assassinate if player has 3+ coins
  if (player.coins >= GAME_CONFIG.ASSASSINATE_COST) {
    actions.push('assassinate');
  }

  // Add all card-based actions (player can bluff)
  actions.push('tax', 'steal', 'exchange');

  return actions;
}

/**
 * Validate if an action can be performed
 */
export function validateAction(
  game: GameState,
  playerId: string,
  action: ActionType,
  targetId?: string
): { valid: boolean; error?: string } {
  // Check game phase
  if (game.phase !== 'action') {
    return { valid: false, error: 'Not in action phase' };
  }

  // Check if it's player's turn
  const currentPlayer = game.players[game.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { valid: false, error: 'Not your turn' };
  }

  // Check if player is eliminated
  if (currentPlayer.eliminated) {
    return { valid: false, error: 'You are eliminated' };
  }

  // Check action requirements
  const requirements = ACTION_REQUIREMENTS[action];

  // Check coins
  if (currentPlayer.coins < requirements.cost) {
    return { valid: false, error: `Not enough coins (need ${requirements.cost})` };
  }

  // Check if target is required
  if (requirements.requiresTarget && !targetId) {
    return { valid: false, error: 'Target required for this action' };
  }

  // Validate target
  if (targetId) {
    const target = game.players.find((p) => p.id === targetId);
    if (!target) {
      return { valid: false, error: 'Invalid target' };
    }
    if (target.eliminated) {
      return { valid: false, error: 'Target is eliminated' };
    }
    if (target.id === playerId) {
      return { valid: false, error: 'Cannot target yourself' };
    }
  }

  // Forced coup at 10 coins
  if (currentPlayer.coins >= 10 && action !== 'coup') {
    return { valid: false, error: 'Must coup with 10+ coins' };
  }

  return { valid: true };
}

/**
 * Execute an action
 */
export async function executeAction(
  gameId: string,
  playerId: string,
  action: ActionType,
  targetId?: string
): Promise<{ success: boolean; message: string; game?: GameState }> {
  const game = await GameModel.findOne({ gameId });
  if (!game) {
    return { success: false, message: 'Game not found' };
  }

  // Validate action
  const validation = validateAction(game, playerId, action, targetId);
  if (!validation.valid) {
    return { success: false, message: validation.error || 'Invalid action' };
  }

  const player = game.players.find((p) => p.id === playerId)!;
  const requirements = ACTION_REQUIREMENTS[action];

  // Create pending action
  const pendingAction: PendingAction = {
    id: nanoid(),
    type: action,
    actor: playerId,
    target: targetId,
    claimedCard: requirements.requiresCard,
    timestamp: Date.now(),
  };

  // Immediate actions (no challenge/block possible)
  if (action === 'income') {
    player.coins += 1;
    game.actionHistory.push({
      turn: game.turnNumber,
      action: pendingAction,
      reactions: [],
      result: `${player.name} took income (+1 coin)`,
      timestamp: Date.now(),
    });
    nextTurn(game);
    await saveGame(game);
    return { success: true, message: 'Took income (+1 coin)', game };
  }

  if (action === 'coup') {
    player.coins -= GAME_CONFIG.COUP_COST;
    const target = game.players.find((p) => p.id === targetId)!;

    game.pendingAction = pendingAction;
    game.phase = 'resolution';

    // Target must lose influence immediately (no challenge/block)
    // We'll handle card loss in resolution
    await saveGame(game);
    return { success: true, message: `Coup initiated against ${target.name}`, game };
  }

  // Actions that can be challenged/blocked
  game.pendingAction = pendingAction;
  game.phase = 'reaction';
  game.reactions = [];
  game.reactionWindowEnd = Date.now() + GAME_CONFIG.REACTION_WINDOW;

  // Record claim if action requires a card
  if (requirements.requiresCard) {
    game.claims.push({
      player: playerId,
      claimedCard: requirements.requiresCard,
      action,
      challenged: false,
      timestamp: Date.now(),
    });
  }

  await saveGame(game);

  return {
    success: true,
    message: `${action} initiated. Reaction window open.`,
    game,
  };
}

/**
 * Challenge an action
 */
export async function challengeAction(
  gameId: string,
  challengerId: string
): Promise<{ success: boolean; message: string; game?: GameState }> {
  const game = await GameModel.findOne({ gameId });
  if (!game) {
    return { success: false, message: 'Game not found' };
  }

  if (game.phase !== 'reaction') {
    return { success: false, message: 'Not in reaction phase' };
  }

  if (!game.pendingAction) {
    return { success: false, message: 'No pending action' };
  }

  const challenger = game.players.find((p) => p.id === challengerId);
  if (!challenger || challenger.eliminated) {
    return { success: false, message: 'Invalid challenger' };
  }

  // Check if challenger already reacted
  if (game.reactions.some((r) => r.player === challengerId)) {
    return { success: false, message: 'You already reacted' };
  }

  // Add challenge reaction
  const reaction: Reaction = {
    id: nanoid(),
    player: challengerId,
    type: 'challenge',
    timestamp: Date.now(),
  };
  game.reactions.push(reaction);

  // Move to resolution phase
  game.phase = 'resolution';

  await saveGame(game);

  return { success: true, message: 'Challenge made', game };
}

/**
 * Block an action
 */
export async function blockAction(
  gameId: string,
  blockerId: string,
  blockCard: CardType
): Promise<{ success: boolean; message: string; game?: GameState }> {
  const game = await GameModel.findOne({ gameId });
  if (!game) {
    return { success: false, message: 'Game not found' };
  }

  if (game.phase !== 'reaction') {
    return { success: false, message: 'Not in reaction phase' };
  }

  if (!game.pendingAction) {
    return { success: false, message: 'No pending action' };
  }

  const blocker = game.players.find((p) => p.id === blockerId);
  if (!blocker || blocker.eliminated) {
    return { success: false, message: 'Invalid blocker' };
  }

  // Check if action can be blocked
  const requirements = ACTION_REQUIREMENTS[game.pendingAction.type];
  if (!requirements.canBeBlocked) {
    return { success: false, message: 'This action cannot be blocked' };
  }

  // Check if block card is valid
  if (!requirements.blockedBy.includes(blockCard)) {
    return { success: false, message: 'Invalid block card for this action' };
  }

  // Check if blocker already reacted
  if (game.reactions.some((r) => r.player === blockerId)) {
    return { success: false, message: 'You already reacted' };
  }

  // Add block reaction
  const reaction: Reaction = {
    id: nanoid(),
    player: blockerId,
    type: 'block',
    claimedCard: blockCard,
    timestamp: Date.now(),
  };
  game.reactions.push(reaction);

  // Record claim
  game.claims.push({
    player: blockerId,
    claimedCard: blockCard,
    action: game.pendingAction.type,
    challenged: false,
    timestamp: Date.now(),
  });

  // Block opens new reaction window (others can challenge the block)
  game.reactionWindowEnd = Date.now() + GAME_CONFIG.REACTION_WINDOW;

  await saveGame(game);

  return { success: true, message: `Blocked with ${blockCard}`, game };
}

/**
 * Resolve pending action and reactions
 */
export async function resolveAction(gameId: string): Promise<{ success: boolean; message: string; game?: GameState }> {
  const game = await GameModel.findOne({ gameId });
  if (!game) {
    return { success: false, message: 'Game not found' };
  }

  if (game.phase !== 'resolution' && game.phase !== 'reaction') {
    return { success: false, message: 'Not in resolution phase' };
  }

  if (!game.pendingAction) {
    return { success: false, message: 'No pending action' };
  }

  // Check if reaction window has expired
  if (game.phase === 'reaction' && game.reactionWindowEnd && Date.now() < game.reactionWindowEnd) {
    return { success: false, message: 'Reaction window still open' };
  }

  const actor = game.players.find((p) => p.id === game.pendingAction!.actor)!;
  const target = game.pendingAction.target
    ? game.players.find((p) => p.id === game.pendingAction!.target)
    : undefined;

  let result = '';

  // Check for challenges
  const challenges = game.reactions.filter((r) => r.type === 'challenge');
  const blocks = game.reactions.filter((r) => r.type === 'block');

  if (challenges.length > 0) {
    // Handle challenge (take first challenge)
    const challenge = challenges[0];
    const challenger = game.players.find((p) => p.id === challenge.player)!;

    const claimedCard = game.pendingAction.claimedCard;
    if (!claimedCard) {
      // No card claimed, challenge fails
      result = `${challenger.name} incorrectly challenged. Challenge failed.`;
      await loseInfluence(game, challenger.id);

      // Update claim
      const claim = game.claims.find(
        (c) => c.player === actor.id && c.action === game.pendingAction!.type && !c.challenged
      );
      if (claim) {
        claim.challenged = true;
        claim.challengeResult = 'failed';
      }
    } else {
      // Check if actor has the claimed card
      const hasCard = actor.cards.some((c) => c.type === claimedCard);

      if (hasCard) {
        // Challenge failed - actor had the card
        result = `${actor.name} revealed ${claimedCard}. Challenge failed. ${challenger.name} loses influence.`;
        await loseInfluence(game, challenger.id);

        // Actor reshuffles card and draws new one
        const cardIndex = actor.cards.findIndex((c) => c.type === claimedCard);
        const revealedCard = actor.cards[cardIndex];
        actor.cards.splice(cardIndex, 1);
        game.deck.push(revealedCard);
        game.deck = shuffleDeck(game.deck);

        const newCard = game.deck.pop();
        if (newCard) {
          actor.cards.push(newCard);
        }

        // Update claim
        const claim = game.claims.find(
          (c) => c.player === actor.id && c.action === game.pendingAction!.type && !c.challenged
        );
        if (claim) {
          claim.challenged = true;
          claim.challengeResult = 'failed';
        }

        // Action proceeds
        await applyActionEffect(game, game.pendingAction);
      } else {
        // Challenge succeeded - actor didn't have the card
        result = `${actor.name} caught bluffing! ${actor.name} loses influence.`;
        await loseInfluence(game, actor.id);

        // Update claim
        const claim = game.claims.find(
          (c) => c.player === actor.id && c.action === game.pendingAction!.type && !c.challenged
        );
        if (claim) {
          claim.challenged = true;
          claim.challengeResult = 'success';
        }

        // Action fails
        // Return coins if paid
        if (game.pendingAction.type === 'assassinate') {
          actor.coins += GAME_CONFIG.ASSASSINATE_COST;
        }
      }
    }
  } else if (blocks.length > 0) {
    // Handle block (take first block)
    const block = blocks[0];
    result = `Action blocked by ${game.players.find((p) => p.id === block.player)!.name} using ${block.claimedCard}`;

    // Return coins if paid
    if (game.pendingAction.type === 'assassinate') {
      actor.coins += GAME_CONFIG.ASSASSINATE_COST;
    }
  } else {
    // No reactions - action succeeds
    await applyActionEffect(game, game.pendingAction);
    result = `${actor.name}'s ${game.pendingAction.type} succeeded`;
  }

  // Record in history
  game.actionHistory.push({
    turn: game.turnNumber,
    action: game.pendingAction,
    reactions: game.reactions,
    result,
    timestamp: Date.now(),
  });

  // Clear pending action
  game.pendingAction = undefined;
  game.reactions = [];
  game.reactionWindowEnd = undefined;

  // Check for winner
  const activePlayers = game.players.filter((p) => !p.eliminated);
  if (activePlayers.length === 1) {
    game.status = 'finished';
    game.phase = 'finished';
    game.winner = activePlayers[0].id;
    result += ` | Game Over! ${activePlayers[0].name} wins!`;
  } else {
    nextTurn(game);
  }

  await saveGame(game);

  return { success: true, message: result, game };
}

/**
 * Apply action effects (coins, cards, etc.)
 */
async function applyActionEffect(game: GameState, action: PendingAction): Promise<void> {
  const actor = game.players.find((p) => p.id === action.actor)!;
  const target = action.target ? game.players.find((p) => p.id === action.target) : undefined;

  switch (action.type) {
    case 'foreign_aid':
      actor.coins += 2;
      break;

    case 'tax':
      actor.coins += 3;
      break;

    case 'assassinate':
      actor.coins -= GAME_CONFIG.ASSASSINATE_COST;
      if (target) {
        await loseInfluence(game, target.id);
      }
      break;

    case 'steal':
      if (target) {
        const stolen = Math.min(2, target.coins);
        target.coins -= stolen;
        actor.coins += stolen;
      }
      break;

    case 'exchange':
      // Draw 2 cards from deck
      const drawnCards: Card[] = [];
      for (let i = 0; i < 2; i++) {
        const card = game.deck.pop();
        if (card) drawnCards.push(card);
      }

      // Actor chooses which cards to keep (for now, keep original cards)
      // In full implementation, this would require player choice
      // Return drawn cards to deck
      game.deck.push(...drawnCards);
      game.deck = shuffleDeck(game.deck);
      break;

    case 'coup':
      actor.coins -= GAME_CONFIG.COUP_COST;
      if (target) {
        await loseInfluence(game, target.id);
      }
      break;
  }
}

/**
 * Player loses influence (loses a card)
 */
async function loseInfluence(game: GameState, playerId: string): Promise<void> {
  const player = game.players.find((p) => p.id === playerId);
  if (!player || player.cards.length === 0) return;

  // For simplicity, lose first card (in full game, player chooses)
  const lostCard = player.cards.shift()!;
  game.discardPile.push(lostCard);
  player.influenceCount--;

  if (player.influenceCount === 0) {
    player.eliminated = true;
  }
}

/**
 * Move to next player's turn
 */
function nextTurn(game: GameState): void {
  game.phase = 'action';
  game.turnNumber++;

  // Find next non-eliminated player
  let attempts = 0;
  do {
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    attempts++;
  } while (game.players[game.currentPlayerIndex].eliminated && attempts < game.players.length);
}

/**
 * Save game state with version increment
 */
async function saveGame(game: IGameStateDoc): Promise<void> {
  game.version++;
  game.lastUpdate = Date.now();
  game.markModified('players');
  game.markModified('deck');
  game.markModified('discardPile');
  game.markModified('claims');
  game.markModified('actionHistory');
  await game.save();
}

/**
 * Get public game state (hide private information)
 */
export function getPublicState(game: GameState): PublicGameState {
  return {
    gameId: game.gameId,
    status: game.status,
    phase: game.phase,
    currentPlayer: game.players[game.currentPlayerIndex].id,
    turnNumber: game.turnNumber,
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      coins: p.coins,
      cardCount: p.cards.length,
      influenceCount: p.influenceCount,
      eliminated: p.eliminated,
    })),
    discardPile: game.discardPile,
    actionHistory: game.actionHistory,
    pendingAction: game.pendingAction,
    reactionWindowEnd: game.reactionWindowEnd,
    period: game.period,
    character: game.character,
  };
}

/**
 * Get private state for a specific player
 */
export function getPrivateState(game: GameState, playerId: string): PrivatePlayerState {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error('Player not found');
  }

  const isCurrentPlayer = game.players[game.currentPlayerIndex].id === playerId;
  const availableActions = isCurrentPlayer ? getAvailableActions(player, game) : [];

  // Check if player can react to pending action
  let canChallenge = false;
  let canBlock = false;
  let blockCards: CardType[] = [];

  if (game.phase === 'reaction' && game.pendingAction && game.pendingAction.actor !== playerId) {
    canChallenge = true;

    const requirements = ACTION_REQUIREMENTS[game.pendingAction.type];
    if (requirements.canBeBlocked) {
      canBlock = true;
      blockCards = requirements.blockedBy;
    }
  }

  return {
    playerId,
    hand: player.cards,
    availableActions,
    canChallenge,
    canBlock,
    blockCards,
  };
}

/**
 * Get perception for AI agents (enriched with insights)
 */
export function getAgentPerception(game: GameState, agentId: string): AgentPerception {
  const agent = game.players.find((p) => p.id === agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }

  const isYourTurn = game.players[game.currentPlayerIndex].id === agentId;
  const privateState = getPrivateState(game, agentId);

  // Generate strategic insights
  const claimsMade = game.claims.map((claim) => ({
    player: claim.player,
    card: claim.claimedCard,
    action: claim.action,
    verified: claim.challenged && claim.challengeResult === 'failed',
  }));

  const suspiciousBehaviors: Array<{ player: string; reason: string }> = [];

  // Detect suspicious patterns
  game.players.forEach((player) => {
    if (player.id === agentId) return;

    const playerClaims = game.claims.filter((c) => c.player === player.id);
    const uniqueClaims = new Set(playerClaims.map((c) => c.claimedCard));

    if (uniqueClaims.size > 2) {
      suspiciousBehaviors.push({
        player: player.id,
        reason: `Claimed ${uniqueClaims.size} different cards - likely bluffing`,
      });
    }

    const failedChallenges = playerClaims.filter((c) => c.challenged && c.challengeResult === 'success');
    if (failedChallenges.length > 0) {
      suspiciousBehaviors.push({
        player: player.id,
        reason: `Caught bluffing ${failedChallenges.length} time(s)`,
      });
    }
  });

  const recommendations: string[] = [];

  if (isYourTurn) {
    if (agent.coins >= 10) {
      recommendations.push('You must coup (10+ coins)');
    } else if (agent.coins >= 7) {
      recommendations.push('Consider coup to eliminate a strong opponent');
    } else if (agent.coins >= 3) {
      recommendations.push('Assassinate is available');
    }

    // Suggest tax if player has duke
    if (agent.cards.some((c) => c.type === 'duke')) {
      recommendations.push('You have Duke - tax for 3 coins is safe');
    }
  }

  if (game.pendingAction && game.pendingAction.actor !== agentId) {
    const actorClaims = game.claims.filter((c) => c.player === game.pendingAction!.actor);
    const verifiedClaims = actorClaims.filter((c) => c.challenged && c.challengeResult === 'failed');

    if (verifiedClaims.length === 0 && actorClaims.length > 2) {
      recommendations.push('Actor has made multiple unverified claims - consider challenging');
    }
  }

  return {
    gameId: game.gameId,
    yourId: agentId,
    yourName: agent.name,
    yourHand: agent.cards,
    yourCoins: agent.coins,
    yourInfluence: agent.influenceCount,
    currentPlayer: game.players[game.currentPlayerIndex].id,
    isYourTurn,
    phase: game.phase,
    turnNumber: game.turnNumber,
    opponents: game.players
      .filter((p) => p.id !== agentId)
      .map((p) => ({
        id: p.id,
        name: p.name,
        coins: p.coins,
        cardCount: p.cards.length,
        influence: p.influenceCount,
        eliminated: p.eliminated,
      })),
    pendingAction: game.pendingAction
      ? {
          type: game.pendingAction.type,
          actor: game.pendingAction.actor,
          target: game.pendingAction.target,
          claimedCard: game.pendingAction.claimedCard,
          actionName: game.pendingAction.type,
        }
      : undefined,
    availableActions: privateState.availableActions,
    canReact: privateState.canChallenge || privateState.canBlock,
    reactionOptions: {
      canChallenge: privateState.canChallenge,
      canBlock: privateState.canBlock,
      blockCards: privateState.blockCards,
    },
    insights: {
      claimsMade,
      suspiciousBehaviors,
      recommendations,
    },
    reactionDeadline: game.reactionWindowEnd,
  };
}
