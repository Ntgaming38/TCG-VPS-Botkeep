import { ENV } from "./_core/env";
import { createVapidAuthorizationHeader, encryptPushPayload } from "./pushCrypto";
import { deletePushSubscriptionById, getOrCreateVapidKeys, listPushSubscriptions } from "./pushDb";

export interface PushPayload {
  title: string;
  body: string;
  /** App-relative path opened when the notification is tapped. */
  url?: string;
  /** Notifications sharing a tag replace each other instead of stacking. */
  tag?: string;
}

export interface PushDeliverySummary {
  attempted: number;
  sent: number;
  removed: number;
}

type FetchLike = (input: string, init: {
  method: string;
  headers: Record<string, string>;
  body: Buffer;
}) => Promise<{ ok: boolean; status: number }>;

/**
 * Delivers one notification to every device the user subscribed. Delivery is
 * best-effort by design: it never throws, subscriptions the push service
 * reports as gone (404/410) are pruned, and callers fire-and-forget it so a
 * push outage can never break the feature that triggered the notification.
 */
export async function sendPushToUser(userId: number, payload: PushPayload, fetchImpl: FetchLike = fetch as FetchLike): Promise<PushDeliverySummary> {
  const summary: PushDeliverySummary = { attempted: 0, sent: 0, removed: 0 };
  try {
    const subscriptions = await listPushSubscriptions(userId);
    if (subscriptions.length === 0) return summary;
    const keys = await getOrCreateVapidKeys();
    const bodyJson = Buffer.from(JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/",
      tag: payload.tag,
    }), "utf8");
    for (const subscription of subscriptions) {
      summary.attempted += 1;
      try {
        const encrypted = encryptPushPayload(bodyJson, { p256dh: subscription.p256dh, auth: subscription.auth });
        const response = await fetchImpl(subscription.endpoint, {
          method: "POST",
          headers: {
            Authorization: createVapidAuthorizationHeader(subscription.endpoint, ENV.vapidSubject, keys),
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            TTL: "86400",
            Urgency: "normal",
          },
          body: encrypted,
        });
        if (response.ok) {
          summary.sent += 1;
        } else if (response.status === 404 || response.status === 410) {
          await deletePushSubscriptionById(subscription.id);
          summary.removed += 1;
        } else {
          console.warn(`[Push] Delivery to ${new URL(subscription.endpoint).host} failed with status ${response.status}.`);
        }
      } catch (error) {
        console.warn("[Push] Delivery attempt failed:", error instanceof Error ? error.message : String(error));
      }
    }
  } catch (error) {
    console.warn("[Push] Could not load subscriptions:", error instanceof Error ? error.message : String(error));
  }
  return summary;
}

export interface SnkrPriceChange {
  name: string;
  oldPrice: number;
  newPrice: number;
}

function formatYenAmount(value: number): string {
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
}

function formatPriceMove(change: SnkrPriceChange): string {
  const percent = change.oldPrice > 0 ? Math.abs(((change.newPrice - change.oldPrice) / change.oldPrice) * 100) : 0;
  const arrow = change.newPrice >= change.oldPrice ? "▲" : "▼";
  return `${change.name}: ${formatYenAmount(change.oldPrice)} → ${formatYenAmount(change.newPrice)} (${arrow}${percent.toFixed(1)}%)`;
}

/**
 * Builds the single aggregated push for one auto-sync run: one notification
 * per user no matter how many items changed, leading with the biggest move.
 */
export function buildSnkrPriceChangePush(changes: SnkrPriceChange[]): PushPayload | null {
  if (changes.length === 0) return null;
  const sorted = [...changes].sort((a, b) => {
    const moveA = a.oldPrice > 0 ? Math.abs(a.newPrice - a.oldPrice) / a.oldPrice : Number.POSITIVE_INFINITY;
    const moveB = b.oldPrice > 0 ? Math.abs(b.newPrice - b.oldPrice) / b.oldPrice : Number.POSITIVE_INFINITY;
    return moveB - moveA;
  });
  const lead = formatPriceMove(sorted[0]);
  const body = sorted.length === 1 ? lead : `${sorted.length} sản phẩm đổi giá. Biến động lớn nhất: ${lead}`;
  return {
    title: "Biến động giá Shop SNKR",
    body,
    url: "/shop-snkr",
    tag: "snkr-price-change",
  };
}
