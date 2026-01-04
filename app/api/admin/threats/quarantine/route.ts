import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { wallet, fingerprint } = await req.json();
    if (!wallet || !fingerprint) return NextResponse.json({ error: 'Wallet and fingerprint required' }, { status: 400 });
    const user = await User.findOneAndUpdate(
      { walletAddress: wallet.toLowerCase() },
      { $addToSet: { quarantinedFingerprints: fingerprint } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ error: 'Failed to quarantine fingerprint' }, { status: 500 });
  }
}
