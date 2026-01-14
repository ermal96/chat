import { useState, useEffect, useCallback } from 'react';

interface PushState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
}

export function usePushNotifications(
  sendSubscription: (subscription: PushSubscriptionJSON) => void
) {
  const [state, setState] = useState<PushState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'unsupported'
  });
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Register service worker on mount
  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

    if (!isSupported) {
      setState(prev => ({ ...prev, isSupported: false, permission: 'unsupported' }));
      return;
    }

    setState(prev => ({
      ...prev,
      isSupported: true,
      permission: Notification.permission
    }));

    // Register service worker
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered');
        setRegistration(reg);

        // Check existing subscription
        return reg.pushManager.getSubscription();
      })
      .then((subscription) => {
        if (subscription) {
          setState(prev => ({ ...prev, isSubscribed: true }));
          // Send existing subscription to server
          sendSubscription(subscription.toJSON());
        }
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  }, [sendSubscription]);

  const subscribe = useCallback(async () => {
    if (!registration) {
      console.error('No service worker registration');
      return;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return;
      }

      // Get VAPID public key from server
      const response = await fetch('/api/push/vapid-key');
      const { publicKey } = await response.json();

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      sendSubscription(subscription.toJSON());
      setState(prev => ({ ...prev, isSubscribed: true }));

      console.log('Push notification subscription successful');
    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err);
    }
  }, [registration, sendSubscription]);

  const unsubscribe = useCallback(async () => {
    if (!registration) return;

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        setState(prev => ({ ...prev, isSubscribed: false }));
        console.log('Unsubscribed from push notifications');
      }
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    }
  }, [registration]);

  return {
    ...state,
    subscribe,
    unsubscribe
  };
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
