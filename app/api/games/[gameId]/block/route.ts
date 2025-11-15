import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { blockAction } from '@/lib/gameLogic';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    await dbConnect();

    const body = await req.json();
    const { blockerId, blockCard } = body;

    if (!blockerId || !blockCard) {
      return NextResponse.json(
        { success: false, message: 'blockerId and blockCard required' },
        { status: 400 }
      );
    }

    const { gameId } = await params;
    const result = await blockAction(gameId, blockerId, blockCard);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error blocking action:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
