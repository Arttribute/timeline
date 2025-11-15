import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GameModel from '@/models/Game';
import { getPublicState } from '@/lib/gameLogic';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    await dbConnect();

    const { gameId } = await params;
    const game = await GameModel.findOne({ gameId });
    if (!game) {
      return NextResponse.json(
        { success: false, message: 'Game not found' },
        { status: 404 }
      );
    }

    const publicState = getPublicState(game.toObject());

    return NextResponse.json({
      success: true,
      state: publicState,
    });
  } catch (error) {
    console.error('Error getting game state:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
