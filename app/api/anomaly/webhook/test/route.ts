import { NextResponse } from 'next/server';

const WEBHOOK_URL = process.env.ADMIN_DASHBOARD_WEBHOOK_URL;

export async function POST() {
  if (!WEBHOOK_URL) {
    return NextResponse.json({ success: false, message: 'Webhook URL not configured' }, { status: 400 });
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'QieRemit Admin Test',
        timestamp: new Date().toISOString(),
        message: 'This is a webhook test from the QieRemit admin dashboard.',
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: 'Webhook responded with an error', status: response.status },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook test failed', error);
    return NextResponse.json({ success: false, message: error.message ?? 'Unknown error' }, { status: 502 });
  }
}
