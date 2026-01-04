import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { walletAddress } = await req.json();
    if (!walletAddress) return NextResponse.json({ error: 'Wallet address missing' }, { status: 400 });
    const user = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { isKycVerified: true, kycTimestamp: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ error: 'Failed to approve KYC' }, { status: 500 });
  }
}
