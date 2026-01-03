import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const count = await User.countDocuments({ isKycVerified: false });
    return NextResponse.json({ count });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to load KYC pending count' }, { status: 500 });
  }
}

