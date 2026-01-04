import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TransferEvent from '@/models/TransferEvent';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { txHash } = await req.json().catch(() => ({}));
    if (!txHash) {
      return NextResponse.json({ error: 'txHash required' }, { status: 400 });
    }

    const updated = await TransferEvent.findOneAndUpdate(
      { txHash },
      { $set: { status: 'completed', 'metadata.fulfilledAt': Date.now() } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Fulfillment failed' }, { status: 500 });
  }
}
