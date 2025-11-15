import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import dbConnect from '@/lib/db';
import GameModel from '@/models/Game';
import { generateDeck, getFallbackDeck } from '@/lib/deckGenerator';
import { createDeck, dealCards, GAME_CONFIG } from '@/lib/gameLogic';
import { createGameSpace } from '@/lib/agentCommons';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { period, character, playerName, playerId, useAgentCommons = false } = body;

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

    // Create Agent Commons Space if requested
    let spaceId: string | undefined;
    if (useAgentCommons) {
      const spaceResult = await createGameSpace(gameId, period, GAME_CONFIG.MAX_PLAYERS);
      if (spaceResult.success) {
        spaceId = spaceResult.spaceId;
        gameState.spaceId = spaceId;
        await gameState.save();
      }
    }

    return NextResponse.json({
      success: true,
      gameId,
      spaceId,
      deck: deckTheme,
      message: 'Game created successfully',
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
