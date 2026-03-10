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

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Ensure phone column exists
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`;

  const [user] = await sql`
    SELECT id, name, email, phone FROM users WHERE id = ${userId}
  `;

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { name, email, phone } = await req.json();

  if (!name || !email) {
    return NextResponse.json({ error: 'Nome e e-mail são obrigatórios' }, { status: 400 });
  }

  // Check if email is taken by another user
  const existing = await sql`SELECT id FROM users WHERE email = ${email} AND id != ${userId}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: 'E-mail já está em uso por outra conta' }, { status: 400 });
  }

  await sql`
    UPDATE users
    SET name = ${name}, email = ${email}, phone = ${phone ?? null}
    WHERE id = ${userId}
  `;

  return NextResponse.json({ success: true });
}
