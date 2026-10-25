import { and, eq } from "drizzle-orm";
import { pushConfig, pushSubscriptions } from "../drizzle/schema";
import { getDb } from "./db";
import { generateVapidKeys, type VapidKeys } from "./pushCrypto";

/**
 * Persistence for Web Push: the server-wide VAPID keypair (created lazily on
 * first use and then reused forever — rotating it would invalidate every
 * existing browser subscription) and one row per subscribed device.
 */

export async function getOrCreateVapidKeys(): Promise<VapidKeys> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [existing] = await db.select().from(pushConfig).limit(1);
  if (existing) {
    return { publicKey: existing.vapidPublicKey, privateKeyJwk: JSON.parse(existing.vapidPrivateKeyJwk) as JsonWebKey };
  }
  const keys = generateVapidKeys();
  await db.insert(pushConfig).values({ vapidPublicKey: keys.publicKey, vapidPrivateKeyJwk: JSON.stringify(keys.privateKeyJwk) });
  // Re-read to survive a race with a concurrent first request.
  const [stored] = await db.select().from(pushConfig).limit(1);
  if (stored) {
    return { publicKey: stored.vapidPublicKey, privateKeyJwk: JSON.parse(stored.vapidPrivateKeyJwk) as JsonWebKey };
  }
  return keys;
}

export async function upsertPushSubscription(userId: number, endpoint: string, p256dh: string, auth: string, userAgent?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(pushSubscriptions)
    .values({ userId, endpoint, p256dh, auth, userAgent: userAgent ?? null })
    .onDuplicateKeyUpdate({ set: { userId, p256dh, auth, userAgent: userAgent ?? null } });
  return { subscribed: true };
}

export async function listPushSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function deletePushSubscriptionByEndpoint(userId: number, endpoint: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
  return { unsubscribed: true };
}

export async function deletePushSubscriptionById(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
}
