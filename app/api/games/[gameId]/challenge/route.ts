import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { challengeAction } from '@/lib/gameLogic';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    await dbConnect();

    const body = await req.json();
    const { challengerId } = body;

    if (!challengerId) {
      return NextResponse.json(
        { success: false, message: 'challengerId required' },
        { status: 400 }
      );
    }

    const result = await challengeAction(params.gameId, challengerId);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error challenging action:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
