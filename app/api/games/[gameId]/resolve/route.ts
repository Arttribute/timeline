import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { resolveAction } from '@/lib/gameLogic';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    await dbConnect();

    const { gameId } = await params;
    const result = await resolveAction(gameId);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error resolving action:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
