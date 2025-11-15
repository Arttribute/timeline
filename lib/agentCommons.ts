/**
 * Agent Commons Spaces Integration
 * Handles Space creation, member management, tool exposure, and messaging
 */

import { AIAgent } from './types';
import OpenAI from 'openai';
import { nanoid } from 'nanoid';

const AGENT_COMMONS_API_URL =
  process.env.AGENT_COMMONS_API_URL ||
  'https://arttribute-commons-api-dev-848878149972.europe-west1.run.app';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface SpaceToolSpec {
  name: string;
  description: string;
  parameters: any; // JSON Schema
  apiSpec: {
    method: string;
    baseUrl: string;
    path: string;
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    bodyTemplate?: any;
  };
}

/**
 * Create a game space in Agent Commons
 */
export async function createGameSpace(
  gameId: string,
  period: string,
  maxPlayers: number = 6
): Promise<{ success: boolean; spaceId?: string; error?: string }> {
  try {
    const response = await fetch(`${AGENT_COMMONS_API_URL}/v1/spaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-creator-id': 'timeline_system',
        'x-creator-type': 'agent',
      },
      body: JSON.stringify({
        name: `Timeline: ${period}`,
        description: `Coup-style social deduction game set in ${period}`,
        isPublic: false,
        maxMembers: maxPlayers + 1, // Players + Game Master agent
        settings: {
          allowAgents: true,
          allowHumans: true,
          requireApproval: false,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create space: ${error}`);
    }

    const data = await response.json();

    // Add Game Master agent
    await addGameMasterAgent(data.spaceId, gameId);

    // Set up game tools
    await setGameTools(data.spaceId, gameId);

    return { success: true, spaceId: data.spaceId };
  } catch (error) {
    console.error('Error creating game space:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Add Game Master agent to space
 */
async function addGameMasterAgent(spaceId: string, gameId: string): Promise<void> {
  // Add member
  await fetch(`${AGENT_COMMONS_API_URL}/v1/spaces/${spaceId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberId: 'timeline_game_master',
      memberType: 'agent',
      role: 'moderator',
      permissions: {
        canWrite: true,
        canModerate: true,
      },
    }),
  });

  // Subscribe agent to receive triggers
  await fetch(
    `${AGENT_COMMONS_API_URL}/v1/spaces/${spaceId}/subscribe?subscriberId=timeline_game_master&subscriberType=agent`,
    { method: 'GET' }
  );
}

/**
 * Set game-specific tools for the Space
 */
async function setGameTools(spaceId: string, gameId: string): Promise<void> {
  const tools: SpaceToolSpec[] = [
    {
      name: 'validateAction',
      description: 'Validate if a player action is legal',
      parameters: {
        type: 'object',
        properties: {
          playerId: { type: 'string', description: 'ID of the player' },
          action: {
            type: 'string',
            enum: ['income', 'foreign_aid', 'coup', 'tax', 'assassinate', 'steal', 'exchange'],
            description: 'Action to perform',
          },
          target: { type: 'string', description: 'Target player ID (optional)' },
        },
        required: ['playerId', 'action'],
      },
      apiSpec: {
        method: 'POST',
        baseUrl: APP_URL,
        path: `/api/games/${gameId}/validate-action`,
        headers: { 'Content-Type': 'application/json' },
      },
    },
    {
      name: 'executeAction',
      description: 'Execute a validated action',
      parameters: {
        type: 'object',
        properties: {
          playerId: { type: 'string', description: 'ID of the player' },
          action: {
            type: 'string',
            enum: ['income', 'foreign_aid', 'coup', 'tax', 'assassinate', 'steal', 'exchange'],
          },
          target: { type: 'string' },
        },
        required: ['playerId', 'action'],
      },
      apiSpec: {
        method: 'POST',
        baseUrl: APP_URL,
        path: `/api/games/${gameId}/action`,
        headers: { 'Content-Type': 'application/json' },
      },
    },
    {
      name: 'challengeAction',
      description: 'Challenge the pending action',
      parameters: {
        type: 'object',
        properties: {
          challengerId: { type: 'string', description: 'ID of challenging player' },
        },
        required: ['challengerId'],
      },
      apiSpec: {
        method: 'POST',
        baseUrl: APP_URL,
        path: `/api/games/${gameId}/challenge`,
        headers: { 'Content-Type': 'application/json' },
      },
    },
    {
      name: 'blockAction',
      description: 'Block the pending action with a card',
      parameters: {
        type: 'object',
        properties: {
          blockerId: { type: 'string', description: 'ID of blocking player' },
          blockCard: {
            type: 'string',
            enum: ['duke', 'captain', 'ambassador', 'contessa'],
            description: 'Card used to block',
          },
        },
        required: ['blockerId', 'blockCard'],
      },
      apiSpec: {
        method: 'POST',
        baseUrl: APP_URL,
        path: `/api/games/${gameId}/block`,
        headers: { 'Content-Type': 'application/json' },
      },
    },
    {
      name: 'getGameState',
      description: 'Get current public game state',
      parameters: {
        type: 'object',
        properties: {},
      },
      apiSpec: {
        method: 'GET',
        baseUrl: APP_URL,
        path: `/api/games/${gameId}/state`,
      },
    },
    {
      name: 'getPlayerHand',
      description: 'Get a specific player private hand (Game Master only)',
      parameters: {
        type: 'object',
        properties: {
          playerId: { type: 'string', description: 'ID of the player' },
        },
        required: ['playerId'],
      },
      apiSpec: {
        method: 'GET',
        baseUrl: APP_URL,
        path: `/api/games/${gameId}/player-hand?playerId={playerId}`,
      },
    },
    {
      name: 'getAgentPerception',
      description: 'Get strategic perception for an AI agent',
      parameters: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'ID of the agent' },
        },
        required: ['agentId'],
      },
      apiSpec: {
        method: 'GET',
        baseUrl: APP_URL,
        path: `/api/games/${gameId}/agent-perception?agentId={agentId}`,
      },
    },
  ];

  // Note: This is a placeholder - actual Agent Commons API doesn't have
  // a setToolsForSpace endpoint exposed via REST
  // In production, tools would be fetched from {APP_URL}/common-agent-tools/
  // and the Game Master agent would be configured to use them

  // For now, we'll implement this via the game master agent's system prompt
  console.log('Game tools configured for space:', spaceId, tools);
}

/**
 * Add a player to the game space
 */
export async function addPlayerToSpace(
  spaceId: string,
  playerId: string,
  playerName: string,
  playerType: 'human' | 'agent'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${AGENT_COMMONS_API_URL}/v1/spaces/${spaceId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: playerId,
        memberType: playerType,
        role: 'member',
        permissions: { canWrite: true },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to add player to space');
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a message in the space
 */
export async function sendSpaceMessage(
  spaceId: string,
  senderId: string,
  senderType: 'human' | 'agent' | 'system',
  content: string,
  options: {
    targetType?: 'broadcast' | 'direct' | 'group';
    targetIds?: string[];
    metadata?: any;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${AGENT_COMMONS_API_URL}/v1/spaces/${spaceId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sender-id': senderId,
        'x-sender-type': senderType,
      },
      body: JSON.stringify({
        content,
        targetType: options.targetType || 'broadcast',
        targetIds: options.targetIds || [],
        messageType: 'text',
        metadata: options.metadata,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Broadcast public game state update
 */
export async function broadcastGameState(
  spaceId: string,
  gameState: any
): Promise<{ success: boolean; error?: string }> {
  return sendSpaceMessage(spaceId, 'timeline_game_master', 'agent', 'Game state updated', {
    targetType: 'broadcast',
    metadata: {
      type: 'game_state_update',
      gameState,
    },
  });
}

/**
 * Send private hand update to a player
 */
export async function sendPrivateHandUpdate(
  spaceId: string,
  playerId: string,
  hand: any,
  availableActions: any
): Promise<{ success: boolean; error?: string }> {
  return sendSpaceMessage(spaceId, 'timeline_game_master', 'agent', 'Your hand updated', {
    targetType: 'direct',
    targetIds: [playerId],
    metadata: {
      type: 'private_hand_update',
      hand,
      availableActions,
    },
  });
}

/**
 * Send reaction window notification
 */
export async function sendReactionWindowNotification(
  spaceId: string,
  playerId: string,
  pendingAction: any,
  reactionOptions: any
): Promise<{ success: boolean; error?: string }> {
  return sendSpaceMessage(
    spaceId,
    'timeline_game_master',
    'agent',
    `Reaction window open: ${pendingAction.actor} used ${pendingAction.type}`,
    {
      targetType: 'direct',
      targetIds: [playerId],
      metadata: {
        type: 'reaction_window',
        pendingAction,
        reactionOptions,
      },
    }
  );
}

/**
 * Get space details
 */
export async function getSpace(spaceId: string): Promise<any> {
  try {
    const response = await fetch(`${AGENT_COMMONS_API_URL}/v1/spaces/${spaceId}`);
    if (!response.ok) {
      throw new Error('Failed to get space');
    }
    return response.json();
  } catch (error) {
    console.error('Error getting space:', error);
    return null;
  }
}

/**
 * Generate AI agent personas based on historical period
 */
export async function generateAgentPersonas(
  period: string,
  count: number = 3
): Promise<Array<{ name: string; persona: string }>> {
  if (!openai) {
    // Fallback personas if OpenAI not available
    return [
      { name: 'Marcus', persona: `A cunning strategist from ${period}` },
      { name: 'Julia', persona: `A ruthless politician from ${period}` },
      { name: 'Gaius', persona: `A shrewd merchant from ${period}` },
    ].slice(0, count);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a creative writer generating historically accurate character personas.',
        },
        {
          role: 'user',
          content: `Generate ${count} unique character personas for a social deduction game set in ${period}.

Each character should have:
1. A historically appropriate name
2. A detailed persona (2-3 sentences) describing their background, personality, motivations, and playing style

Return ONLY a JSON array with this structure:
[
  {
    "name": "Character Name",
    "persona": "Detailed persona description focusing on their strategic approach, deception style, and motivations"
  }
]

Make each character distinct with different strategic approaches (e.g., one aggressive, one defensive, one unpredictable).`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.9,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated');
    }

    const data = JSON.parse(content);
    const personas = data.personas || data.characters || Object.values(data)[0];

    return personas.slice(0, count);
  } catch (error) {
    console.error('Error generating personas:', error);
    // Fallback
    return [
      { name: 'Marcus', persona: `A cunning strategist from ${period}` },
      { name: 'Julia', persona: `A ruthless politician from ${period}` },
      { name: 'Gaius', persona: `A shrewd merchant from ${period}` },
    ].slice(0, count);
  }
}

/**
 * Create a single AI agent in Agent Commons
 */
export async function createAIAgent(
  name: string,
  persona: string,
  gameId: string,
  period: string,
  ownerWallet: string = 'timeline_system'
): Promise<{ success: boolean; agentId?: string; error?: string }> {
  try {
    const instructions = `You are ${name}, playing Timeline - a Coup-style social deduction game set in ${period}.

PERSONA:
${persona}

GAME RULES:
- This is a bluffing game where you can claim cards you don't have
- Your goal is to be the last player standing
- Use the game tools to execute actions, challenge opponents, and block actions
- Always check your hand and perception before taking action
- Be strategic about when to bluff, challenge, and block

TOOLS AVAILABLE:
- getAgentPerception: Get your current game state and strategic insights
- executeAction: Perform game actions (income, tax, steal, assassinate, coup, etc.)
- challengeAction: Challenge an opponent's claim
- blockAction: Block an opponent's action with a claimed card

IMPORTANT:
- Always call getAgentPerception first to understand the current state
- Follow your persona's strategic style
- Make decisions based on game state, not just random choices
- Remember claims made by others to catch bluffs`;

    const response = await fetch(`${AGENT_COMMONS_API_URL}/v1/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona,
        instructions,
        owner: ownerWallet,
        temperature: 0.8,
        maxTokens: 2000,
        topP: 0.95,
        presencePenalty: 0.1,
        frequencyPenalty: 0.1,
        autonomyEnabled: true,
        commonsOwned: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create agent: ${error}`);
    }

    const data = await response.json();
    const agentId = data.data?.agentId || data.agentId;

    if (!agentId) {
      throw new Error('No agentId returned from API');
    }

    return { success: true, agentId };
  } catch (error) {
    console.error('Error creating AI agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create multiple AI agents for the game
 */
export async function createGameAgents(
  gameId: string,
  spaceId: string,
  period: string,
  count: number = 3,
  ownerWallet: string = 'timeline_system'
): Promise<{ success: boolean; agents?: AIAgent[]; error?: string }> {
  try {
    // Generate personas
    const personas = await generateAgentPersonas(period, count);

    const agents: AIAgent[] = [];

    // Create each agent
    for (const { name, persona } of personas) {
      const playerId = `agent_${nanoid(8)}`;

      // Create agent in Agent Commons
      const result = await createAIAgent(name, persona, gameId, period, ownerWallet);

      if (!result.success || !result.agentId) {
        console.error(`Failed to create agent ${name}:`, result.error);
        continue;
      }

      // Add agent to space as a member
      await addPlayerToSpace(spaceId, playerId, name, 'agent');

      agents.push({
        agentId: result.agentId,
        playerId,
        name,
        persona,
      });
    }

    if (agents.length === 0) {
      throw new Error('Failed to create any agents');
    }

    return { success: true, agents };
  } catch (error) {
    console.error('Error creating game agents:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
