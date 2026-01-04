import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { wallet } = await req.json();
    if (!wallet) return NextResponse.json({ error: 'Wallet missing' }, { status: 400 });
    const user = await User.findOneAndUpdate(
      { walletAddress: wallet.toLowerCase() },
      { isFrozen: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ error: 'Failed to freeze user' }, { status: 500 });
  }
}
