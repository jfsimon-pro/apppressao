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
    CREATE TABLE IF NOT EXISTS reminders (
      id             SERIAL PRIMARY KEY,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type           TEXT NOT NULL,
      label          TEXT NOT NULL,
      active         BOOLEAN NOT NULL DEFAULT true,
      time           TEXT,
      interval_hours INTEGER,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

const DEFAULTS = [
  { type: 'bp_morning',  label: 'Medição Manhã',  active: true,  time: '08:00', interval_hours: null },
  { type: 'bp_night',    label: 'Medição Noite',   active: true,  time: '20:00', interval_hours: null },
  { type: 'water',       label: 'Beber Água',       active: true,  time: null,    interval_hours: 2    },
  { type: 'medication',  label: 'Medicamento',      active: false, time: '09:00', interval_hours: null },
];

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  await ensureTable();

  let reminders = await sql`SELECT * FROM reminders WHERE user_id = ${userId} ORDER BY id ASC`;

  if (reminders.length === 0) {
    for (const d of DEFAULTS) {
      await sql`
        INSERT INTO reminders (user_id, type, label, active, time, interval_hours)
        VALUES (${userId}, ${d.type}, ${d.label}, ${d.active}, ${d.time}, ${d.interval_hours})
      `;
    }
    reminders = await sql`SELECT * FROM reminders WHERE user_id = ${userId} ORDER BY id ASC`;
  }

  return NextResponse.json({ reminders });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { type, label, time, interval_hours } = await req.json();
  if (!label) return NextResponse.json({ error: 'Informe um nome para o lembrete' }, { status: 400 });

  const validTypes = ['bp', 'medication', 'water'];
  const resolvedType = validTypes.includes(type) ? type : 'bp';

  await ensureTable();

  const [reminder] = await sql`
    INSERT INTO reminders (user_id, type, label, active, time, interval_hours)
    VALUES (${userId}, ${resolvedType}, ${label}, true, ${time ?? null}, ${interval_hours ?? null})
    RETURNING *
  `;

  return NextResponse.json({ reminder });
}
