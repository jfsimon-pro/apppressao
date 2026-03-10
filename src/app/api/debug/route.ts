import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tz = process.env.APP_TIMEZONE ?? 'America/Sao_Paulo';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const serverTime = `${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}`;

  const subscriptions = await sql`SELECT user_id, LEFT(endpoint, 40) as endpoint_preview, created_at FROM push_subscriptions ORDER BY created_at DESC LIMIT 10`;
  const reminders = await sql`SELECT id, user_id, type, label, active, time, interval_hours FROM reminders WHERE active = true ORDER BY id ASC LIMIT 20`;

  return NextResponse.json({
    serverTime,
    timezone: tz,
    vapidConfigured: !!process.env.VAPID_PUBLIC_KEY,
    subscriptions: subscriptions.length,
    subscriptionDetails: subscriptions,
    activeReminders: reminders,
  });
}
