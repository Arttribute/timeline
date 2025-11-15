import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GameModel from '@/models/Game';
import { getAgentPerception } from '@/lib/gameLogic';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { success: false, message: 'agentId required' },
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

    const perception = getAgentPerception(game.toObject(), agentId);

    return NextResponse.json({
      success: true,
      perception,
    });
  } catch (error) {
    console.error('Error getting agent perception:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
