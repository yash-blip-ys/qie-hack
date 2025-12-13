import { NextResponse } from 'next/server';

const WEBHOOK_URL = process.env.ADMIN_DASHBOARD_WEBHOOK_URL;

function maskUrl(value: string | undefined | null) {
  if (!value) return null;
  try {
    const pathname = new URL(value).pathname || '';
    const parts = pathname.split('/').filter(Boolean);
    return `••••/${parts.at(-1) ?? ''}`;
  } catch (error) {
    console.warn('Masking webhook url failed', error);
    return '••••';
  }
}

export function GET() {
  return NextResponse.json({
    enabled: Boolean(WEBHOOK_URL),
    webhook: maskUrl(WEBHOOK_URL),
  });
}
