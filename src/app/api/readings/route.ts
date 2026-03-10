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
    CREATE TABLE IF NOT EXISTS blood_pressure_readings (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      systolic     INTEGER NOT NULL,
      diastolic    INTEGER NOT NULL,
      period       TEXT NOT NULL,
      observation  TEXT,
      measured_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE blood_pressure_readings ADD COLUMN IF NOT EXISTS observation TEXT`;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  await ensureTable();

  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = Math.min(Number(limitParam) || 10, 500);

  const readings = await sql`
    SELECT id, systolic, diastolic, period, observation, measured_at
    FROM blood_pressure_readings
    WHERE user_id = ${userId}
    ORDER BY measured_at DESC
    LIMIT ${limit}
  `;

  return NextResponse.json({ readings });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { systolic, diastolic, period, observation, measured_at } = await req.json();

  if (!systolic || !diastolic || !period) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
  }

  await ensureTable();

  const [reading] = await sql`
    INSERT INTO blood_pressure_readings (user_id, systolic, diastolic, period, observation, measured_at)
    VALUES (
      ${userId},
      ${systolic},
      ${diastolic},
      ${period},
      ${observation ?? null},
      ${measured_at ?? new Date().toISOString()}
    )
    RETURNING id, systolic, diastolic, period, observation, measured_at
  `;

  return NextResponse.json({ reading });
}
