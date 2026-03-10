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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const { active, time, interval_hours, label } = await req.json();

  await sql`
    UPDATE reminders
    SET
      active         = COALESCE(${active ?? null}, active),
      time           = COALESCE(${time ?? null}, time),
      interval_hours = COALESCE(${interval_hours ?? null}, interval_hours),
      label          = COALESCE(${label ?? null}, label)
    WHERE id = ${Number(id)} AND user_id = ${userId}
  `;

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;

  await sql`DELETE FROM reminders WHERE id = ${Number(id)} AND user_id = ${userId}`;

  return NextResponse.json({ success: true });
}
