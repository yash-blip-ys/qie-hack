import { NextRequest, NextResponse } from 'next/server';

const ANOMALY_SERVICE_URL = process.env.ANOMALY_SERVICE_URL || 'http://localhost:4000';
const SERVICE_PATH = '/api/event';

async function forwardToService(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const headers = new Headers(req.headers);
  headers.set('content-type', 'application/json');

  return fetch(`${ANOMALY_SERVICE_URL}${SERVICE_PATH}`, {
    method: req.method,
    headers,
    body: JSON.stringify(body),
  });
}

export async function POST(req: NextRequest) {
  try {
    const response = await forwardToService(req);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ verdict: 'CLEAR', score: 0, reasons: [] });
    }
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('Anomaly event proxy error', error);
    return NextResponse.json({ verdict: 'CLEAR', score: 0, reasons: [] });
  }
}
