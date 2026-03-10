import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

async function getUserId(req: NextRequest): Promise<number | null> {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint   TEXT NOT NULL UNIQUE,
      p256dh     TEXT NOT NULL,
      auth       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

// GET: return VAPID public key for the client to use
export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
}

// POST: save a push subscription
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { endpoint, keys } = await req.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Dados de subscription inválidos' }, { status: 400 });
  }

  await ensureTable();

  // Upsert: same endpoint may re-subscribe after browser update
  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${userId}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
    ON CONFLICT (endpoint) DO UPDATE
      SET user_id = ${userId}, p256dh = ${keys.p256dh}, auth = ${keys.auth}
  `;

  return NextResponse.json({ success: true });
}

// DELETE: remove a subscription (user disabled notifications)
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { endpoint } = await req.json();
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint} AND user_id = ${userId}`;

  return NextResponse.json({ success: true });
}
