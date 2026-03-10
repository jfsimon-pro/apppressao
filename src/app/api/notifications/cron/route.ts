import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendPushNotification } from '@/lib/push';
import type webpush from 'web-push';

// This endpoint is called by a cron job every minute.
// It checks all active reminders and sends push notifications when the time matches.

function currentHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function notificationFor(type: string, label: string): { title: string; body: string } {
  if (type === 'water') {
    return { title: '💧 Hora de Beber Água!', body: 'Mantenha-se hidratado para uma pressão saudável.' };
  }
  if (type.includes('bp')) {
    return { title: '❤️ Hora de Medir a Pressão', body: `Lembrete: ${label}. Registre agora no app.` };
  }
  if (type === 'medication') {
    return { title: '💊 Hora do Medicamento', body: `${label} — não esqueça sua dose de hoje.` };
  }
  return { title: `🔔 ${label}`, body: 'Lembrete do myBPBuddy.' };
}

export async function GET(req: NextRequest) {
  // Simple security: check a secret header or query param in production
  const cronSecret = req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = currentHHMM();
  const currentHour = new Date().getHours();

  // Find all active reminders that match the current time
  // For time-based: match HH:MM exactly
  // For interval_hours: check if current hour is divisible by interval
  const dueReminders = await sql`
    SELECT r.id, r.user_id, r.type, r.label, r.time, r.interval_hours
    FROM reminders r
    WHERE r.active = true
      AND (
        (r.time IS NOT NULL AND r.time = ${now})
        OR
        (r.interval_hours IS NOT NULL AND (${currentHour}::int % r.interval_hours) = 0)
      )
  `;

  if (dueReminders.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No reminders due' });
  }

  // Get subscriptions for all affected users
  const userIds = [...new Set(dueReminders.map((r) => r.user_id as number))];

  const subscriptions = await sql`
    SELECT user_id, endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE user_id = ANY(${userIds})
  `;

  const subsByUser = new Map<number, typeof subscriptions>();
  for (const sub of subscriptions) {
    const uid = sub.user_id as number;
    if (!subsByUser.has(uid)) subsByUser.set(uid, []);
    subsByUser.get(uid)!.push(sub);
  }

  let sent = 0;
  const failed: string[] = [];

  for (const reminder of dueReminders) {
    const userSubs = subsByUser.get(reminder.user_id as number) ?? [];
    const { title, body } = notificationFor(reminder.type as string, reminder.label as string);

    for (const sub of userSubs) {
      const pushSub: webpush.PushSubscription = {
        endpoint: sub.endpoint as string,
        keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
      };
      try {
        await sendPushNotification(pushSub, { title, body, url: '/dashboard', icon: '/icons/icon-192x192.png' });
        sent++;
      } catch (err: unknown) {
        // If subscription expired/gone, remove it
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
        }
        failed.push(sub.endpoint as string);
      }
    }
  }

  return NextResponse.json({ sent, failed: failed.length });
}
