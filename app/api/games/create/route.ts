import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import dbConnect from '@/lib/db';
import GameModel from '@/models/Game';
import { generateDeck, getFallbackDeck } from '@/lib/deckGenerator';
import { createDeck, dealCards, GAME_CONFIG } from '@/lib/gameLogic';
import { createGameSpace, createGameAgents } from '@/lib/agentCommons';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const {
      period,
      character,
      playerName,
      playerId,
      useAgentCommons = false,
      playWithAgents = false,
      agentCount = 3,
    } = body;

    if (!period || !character || !playerName || !playerId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate or retrieve themed deck
    console.log('Generating deck...');
    const deckResult = await generateDeck(period, character);

    let deckTheme;
    if (deckResult.success && deckResult.deck) {
      deckTheme = deckResult.deck;
    } else {
      console.warn('Deck generation failed, using fallback deck');
      deckTheme = getFallbackDeck();
    }

    // Create game ID
    const gameId = nanoid(10);

    // Create card deck from themed cards
    const deck = createDeck(deckTheme.cards);

    // Create game state
    const gameState = await GameModel.create({
      gameId,
      period,
      character,
      actionNames: deckTheme.actionNames,
      backgroundUrl: deckTheme.backgroundUrl,
      characterImageUrl: deckTheme.characterImageUrl,
      status: 'waiting',
      phase: 'lobby',
      players: [
        {
          id: playerId,
          name: playerName,
          type: 'human',
          coins: GAME_CONFIG.STARTING_COINS,
          cards: [],
          influenceCount: 0,
          eliminated: false,
        },
      ],
      currentPlayerIndex: 0,
      deck,
      discardPile: [],
      actionHistory: [],
      claims: [],
      reactions: [],
      version: 0,
      turnNumber: 1,
      lastUpdate: Date.now(),
    });

    // Create Agent Commons Space and AI agents if requested
    let spaceId: string | undefined;
    let aiAgents: any[] = [];

    console.log('=== GAME CREATION DEBUG ===');
    console.log('useAgentCommons:', useAgentCommons);
    console.log('playWithAgents:', playWithAgents);
    console.log('agentCount:', agentCount);

    if (useAgentCommons || playWithAgents) {
      console.log('Creating Agent Commons space...');
      const spaceResult = await createGameSpace(gameId, period, GAME_CONFIG.MAX_PLAYERS);
      console.log('Space creation result:', spaceResult);

      if (spaceResult.success && spaceResult.spaceId) {
        spaceId = spaceResult.spaceId;
        gameState.spaceId = spaceId;
        console.log('Space created successfully:', spaceId);

        // Create AI agents if requested
        if (playWithAgents) {
          console.log(`Creating ${agentCount} AI agents...`);
          const agentsResult = await createGameAgents(
            gameId,
            spaceId,
            period,
            agentCount,
            playerId // Use player's ID as owner for now
          );

          console.log('Agent creation result:', agentsResult);

          if (agentsResult.success && agentsResult.agents) {
            aiAgents = agentsResult.agents;
            gameState.aiAgents = aiAgents;

            // Add AI agents as players
            for (const agent of aiAgents) {
              gameState.players.push({
                id: agent.playerId,
                name: agent.name,
                type: 'agent',
                coins: GAME_CONFIG.STARTING_COINS,
                cards: [],
                influenceCount: 0,
                eliminated: false,
              });
            }

            console.log(`Created ${aiAgents.length} AI agents and started game`);
          } else {
            console.error('Failed to create AI agents:', agentsResult.error);
          }

          // Auto-start game regardless of whether agents were created
          // This ensures human player can at least see the game
          gameState.status = 'playing';
          gameState.phase = 'action';

          console.log('Dealing cards to players...');
          console.log('Deck size before dealing:', gameState.deck.length);
          console.log('Number of players:', gameState.players.length);
          dealCards(gameState);
          console.log('Deck size after dealing:', gameState.deck.length);

          // Log player states after dealing
          gameState.players.forEach((p) => {
            console.log(
              `Player ${p.name}: ${p.cards.length} cards, ${p.coins} coins, influence: ${p.influenceCount}`
            );
          });
        }

        // Mark all modified fields before saving
        gameState.markModified('players');
        gameState.markModified('aiAgents');
        gameState.markModified('deck'); // Important: deck is modified during dealCards
        gameState.markModified('status');
        gameState.markModified('phase');
        await gameState.save();
      } else {
        console.error('Space creation failed, not creating agents');
      }
    }

    return NextResponse.json({
      success: true,
      gameId,
      spaceId,
      deck: deckTheme,
      aiAgents: aiAgents.map((a) => ({ name: a.name, persona: a.persona })),
      message: playWithAgents
        ? `Game created with ${aiAgents.length} AI agents and started!`
        : 'Game created successfully',
    });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
