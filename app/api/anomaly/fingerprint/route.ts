import { NextRequest, NextResponse } from 'next/server';

const ANOMALY_SERVICE_URL = process.env.ANOMALY_SERVICE_URL || 'http://localhost:4000';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fingerprint = searchParams.get('fingerprint');

  if (!fingerprint) {
    return NextResponse.json({ error: 'Fingerprint missing' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${ANOMALY_SERVICE_URL}/api/fingerprint/count/${encodeURIComponent(fingerprint)}`
    );
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch fingerprint count', details: payload }, { status: response.status });
    }

    return NextResponse.json({ count: payload.associatedWallets ?? payload.count ?? 0 });
  } catch (error: any) {
    console.error('Fingerprint proxy error', error);
    return NextResponse.json({ error: 'Proxy failure', details: error.message }, { status: 502 });
  }
}
