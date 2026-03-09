import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { notifications } from '@/lib/db/schema';
import { getEnv, requireEnv } from '@/lib/env';

function buildNotificationHtml(notification: typeof notifications.$inferSelect) {
  const payload = notification.payload as Record<string, unknown>;
  return `
    <div>
      <p><strong>${notification.subject}</strong></p>
      <p>Rating: ${payload.rating ?? 'n/a'}</p>
      <p>Urgency: ${payload.urgency ?? 'n/a'}</p>
      <p>${payload.reviewText ?? ''}</p>
      <p><a href="${requireEnv('BASE_URL')}/dashboard/inbox">Open inbox</a></p>
    </div>
  `;
}

export async function sendNotification(notificationId: number) {
  const notification = await db.query.notifications.findFirst({
    where: eq(notifications.id, notificationId)
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  const resendApiKey = getEnv('RESEND_API_KEY');
  const resendFromEmail = getEnv('RESEND_FROM_EMAIL');

  if (!resendApiKey || !resendFromEmail) {
    const [updated] = await db
      .update(notifications)
      .set({
        status: 'failed',
        error: 'Missing Resend configuration',
        updatedAt: new Date()
      })
      .where(eq(notifications.id, notificationId))
      .returning();

    return updated;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [notification.recipient],
      subject: notification.subject,
      html: buildNotificationHtml(notification)
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend request failed: ${text}`);
  }

  const payload = (await response.json()) as { id?: string };

  const [updated] = await db
    .update(notifications)
    .set({
      status: 'sent',
      providerMessageId: payload.id ?? null,
      sentAt: new Date(),
      error: null,
      updatedAt: new Date()
    })
    .where(eq(notifications.id, notificationId))
    .returning();

  return updated;
}
