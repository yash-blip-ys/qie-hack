import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

// Save KYC Status
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
  } catch (error: any) {
    console.error("KYC POST Error:", error);
    const errorMessage = error.message || 'Database Error';
    return NextResponse.json({ 
      error: errorMessage,
      details: errorMessage.includes('MONGODB_URI') 
        ? 'Please set MONGODB_URI in your .env.local file' 
        : 'Check your MongoDB connection string'
    }, { status: 500 });
  }
}

// Check KYC Status
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 });

    const user = await User.findOne({ walletAddress: address.toLowerCase() });
    return NextResponse.json({ isVerified: user ? user.isKycVerified : false });
  } catch (error: any) {
    console.error("KYC GET Error:", error);
    const errorMessage = error.message || 'Database Error';
    return NextResponse.json({ 
      error: errorMessage,
      isVerified: false
    }, { status: 500 });
  }
}
