import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GameModel from '@/models/Game';
import { getPrivateState } from '@/lib/gameLogic';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json(
        { success: false, message: 'playerId required' },
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

    const privateState = getPrivateState(game.toObject(), playerId);

    return NextResponse.json({
      success: true,
      privateState,
    });
  } catch (error) {
    console.error('Error getting player hand:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
