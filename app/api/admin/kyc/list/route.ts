import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Number(limitParam || 50), 200);
    const users = await User.find({ isKycVerified: false })
      .sort({ kycTimestamp: 1 })
      .limit(limit)
      .select({ walletAddress: 1, isKycVerified: 1, kycTimestamp: 1, _id: 0 })
      .lean();
    return NextResponse.json({ data: users });
  } catch {
    return NextResponse.json({ error: 'Failed to load pending KYC users' }, { status: 500 });
  }
}
