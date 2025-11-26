import { NextRequest, NextResponse } from 'next/server';
import { syncTreasuryEvents } from '@/lib/syncTransfers';
import connectDB from '@/lib/db';
import TransferEvent from '@/models/TransferEvent';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address')?.toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const filter = address
      ? {
          $or: [{ sender: address }, { recipient: address }],
        }
      : {};

    const [items, total] = await Promise.all([
      TransferEvent.find(filter)
        .sort({ blockNumber: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TransferEvent.countDocuments(filter),
    ]);

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Transfers GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load transfers', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fromBlock, toBlock } = body;
    const result = await syncTreasuryEvents({ fromBlock, toBlock });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Transfers sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync transfers', details: error.message },
      { status: 500 }
    );
  }
}

