import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await connectDB();
    const result = await User.updateMany(
      { isKycVerified: false },
      { $set: { isKycVerified: true, kycTimestamp: new Date() } }
    );
    return NextResponse.json({ success: true, matched: result.matchedCount, modified: result.modifiedCount });
  } catch {
    return NextResponse.json({ error: 'Failed to approve all KYC' }, { status: 500 });
  }
}
