import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_INGEST_TOKEN = 'n8n_ingest_7e2f4a913c8d4fb1b1d51b64b83a92c1';
const INGEST_TOKEN = process.env.N8N_INGEST_TOKEN ?? DEFAULT_INGEST_TOKEN;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${INGEST_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // eslint-disable-next-line no-console
  console.log('Received n8n ingest payload', payload);

  return NextResponse.json({ received: true });
}

export function GET() {
  return NextResponse.json({ ok: true });
}
