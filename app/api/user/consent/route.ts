import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

// POST: Save user consent
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { walletAddress, hasConsentedToPrivacyPolicy, consentVersion } = await req.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const user = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      {
        hasConsentedToPrivacyPolicy: hasConsentedToPrivacyPolicy || true,
        consentTimestamp: new Date(),
        consentVersion: consentVersion || 'v1.0',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('Consent Save Error:', error);
    return NextResponse.json(
      { error: 'Failed to save consent', details: error.message },
      { status: 500 }
    );
  }
}

