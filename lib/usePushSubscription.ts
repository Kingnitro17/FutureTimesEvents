// lib/usePushSubscription.ts
// Web Push registration helper.
// Call subscribeToPush(userId) after the user logs in (e.g. in settings page).
// The VAPID public key is read from the env at runtime.

export async function subscribeToPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[push] Push not supported in this browser.');
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.');
        return;
      }

      sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
      });
    }

    const json = sub.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    await fetch('/api/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, subscription: json }),
    });

    console.log('[push] Subscribed successfully.');
  } catch (err) {
    console.error('[push] Subscription failed:', err);
  }
}

/** Convert VAPID base64 public key to Uint8Array (required by pushManager.subscribe) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
