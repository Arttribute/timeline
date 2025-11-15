import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GameModel from '@/models/Game';
import { GAME_CONFIG, dealCards } from '@/lib/gameLogic';
import { addPlayerToSpace } from '@/lib/agentCommons';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    await dbConnect();

    const body = await req.json();
    const { playerName, playerId, playerType = 'human' } = body;

    if (!playerName || !playerId) {
      return NextResponse.json(
        { success: false, message: 'playerName and playerId required' },
        { status: 400 }
      );
    }

    const game = await GameModel.findOne({ gameId: params.gameId });
    if (!game) {
      return NextResponse.json(
        { success: false, message: 'Game not found' },
        { status: 404 }
      );
    }

    if (game.status !== 'waiting') {
      return NextResponse.json(
        { success: false, message: 'Game already started' },
        { status: 400 }
      );
    }

    if (game.players.length >= GAME_CONFIG.MAX_PLAYERS) {
      return NextResponse.json(
        { success: false, message: 'Game is full' },
        { status: 400 }
      );
    }

    if (game.players.some((p) => p.id === playerId)) {
      return NextResponse.json(
        { success: false, message: 'Player already in game' },
        { status: 400 }
      );
    }

    // Add player
    game.players.push({
      id: playerId,
      name: playerName,
      type: playerType as 'human' | 'agent',
      coins: GAME_CONFIG.STARTING_COINS,
      cards: [],
      influenceCount: 0,
      eliminated: false,
    });

    // Add to Agent Commons Space if exists
    if (game.spaceId) {
      await addPlayerToSpace(game.spaceId, playerId, playerName, playerType as 'human' | 'agent');
    }

    // Start game if minimum players reached
    if (game.players.length >= GAME_CONFIG.MIN_PLAYERS) {
      game.status = 'playing';
      game.phase = 'action';
      dealCards(game);
    }

    game.markModified('players');
    await game.save();

    return NextResponse.json({
      success: true,
      message: 'Joined game successfully',
      game: {
        gameId: game.gameId,
        playerCount: game.players.length,
        status: game.status,
      },
    });
  } catch (error) {
    console.error('Error joining game:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
