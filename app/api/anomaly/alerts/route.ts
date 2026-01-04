import { NextRequest, NextResponse } from 'next/server';

const ANOMALY_SERVICE_URL = process.env.ANOMALY_SERVICE_URL || 'http://localhost:4000';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get('limit') || '10', 10)));
    const response = await fetch(`${ANOMALY_SERVICE_URL}/api/events/recent?limit=${limit}`);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json({ data: [], summary: { ANOMALY: 0, SUSPICIOUS: 0, CLEAR: 0 } });
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ data: [], summary: { ANOMALY: 0, SUSPICIOUS: 0, CLEAR: 0 } });
  }
}
