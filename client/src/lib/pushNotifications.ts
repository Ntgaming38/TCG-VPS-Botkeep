/**
 * Browser-side Web Push plumbing: capability checks, permission, and
 * PushManager subscription handling. The server side (VAPID key, storing the
 * subscription, sending) goes through the tRPC `push` router — this module
 * only talks to the browser APIs.
 */

export type PushSupportState = "supported" | "insecure-context" | "no-service-worker" | "no-push-manager" | "no-notification-api";

export function getPushSupportState(): PushSupportState {
  if (typeof window === "undefined") return "no-service-worker";
  if (!window.isSecureContext) return "insecure-context";
  if (!("serviceWorker" in navigator)) return "no-service-worker";
  if (!("PushManager" in window)) return "no-push-manager";
  if (!("Notification" in window)) return "no-notification-api";
  return "supported";
}

export function pushSupportMessage(state: PushSupportState): string {
  switch (state) {
    case "insecure-context":
      return "Thông báo đẩy cần kết nối HTTPS.";
    case "no-service-worker":
      return "Trình duyệt này không hỗ trợ service worker.";
    case "no-push-manager":
      return "Thiết bị này chưa hỗ trợ thông báo đẩy cho web app. Trên iPhone, hãy mở app từ icon ngoài Màn hình chính (iOS 16.4 trở lên).";
    case "no-notification-api":
      return "Trình duyệt này không hỗ trợ thông báo.";
    default:
      return "";
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  if (existing) return existing;
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getRegistration();
  return registration.pushManager.getSubscription();
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscriptionPayload> {
  const registration = await getRegistration();
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    const json = existing.toJSON();
    if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
      return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
    }
    await existing.unsubscribe();
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Không lấy được thông tin đăng ký thông báo từ trình duyệt.");
  }
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

/** Unsubscribes this browser; returns the endpoint that was removed, if any. */
export async function unsubscribeFromPush(): Promise<string | null> {
  const registration = await getRegistration();
  const existing = await registration.pushManager.getSubscription();
  if (!existing) return null;
  const endpoint = existing.endpoint;
  await existing.unsubscribe();
  return endpoint;
}
