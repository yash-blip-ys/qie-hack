import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

// GET: Data Portability (GDPR Article 20 / DPDP Section 18)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const user = await User.findOne({ walletAddress: address.toLowerCase() });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Export all user data in a structured format
    const userData = {
      walletAddress: user.walletAddress,
      isKycVerified: user.isKycVerified,
      kycTimestamp: user.kycTimestamp,
      hasConsentedToPrivacyPolicy: user.hasConsentedToPrivacyPolicy,
      consentTimestamp: user.consentTimestamp,
      consentVersion: user.consentVersion,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      exportedAt: new Date().toISOString(),
      note: 'This export contains all off-chain data we hold about you. On-chain transaction history is publicly available on the Qie blockchain and cannot be exported through this service.',
    };

    return NextResponse.json(userData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="user-data-${address.slice(0, 10)}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Data Export Error:', error);
    return NextResponse.json(
      { error: 'Failed to export user data', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Right to Erasure (GDPR Article 17 / DPDP Section 8)
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Permanently delete the user document
    await User.deleteOne({ walletAddress: walletAddress.toLowerCase() });

    return NextResponse.json({
      success: true,
      message: 'Off-chain data erased',
      note: 'Your KYC status and wallet address linkage have been permanently deleted from our database. On-chain transaction history on the Qie blockchain is immutable and cannot be deleted.',
    });
  } catch (error: any) {
    console.error('Data Deletion Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user data', details: error.message },
      { status: 500 }
    );
  }
}
