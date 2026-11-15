let sentinel: WakeLockSentinel | null = null;
let keepAwakeEnabled = false;
let listenersBound = false;
let acquiring = false;

export async function ensureScreenWakeLock(): Promise<boolean> {
  if (!keepAwakeEnabled || document.visibilityState !== 'visible') {
    return false;
  }
  if (sentinel && !sentinel.released) {
    return true;
  }
  if (!('wakeLock' in navigator) || typeof navigator.wakeLock?.request !== 'function') {
    return false;
  }
  if (acquiring) return false;

  acquiring = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    sentinel = lock;
    lock.addEventListener('release', () => {
      if (sentinel === lock) {
        sentinel = null;
      }
    });
    return true;
  } catch {
    // Browsers may reject without user gesture or in low-battery mode; will retry on interaction/visibility
    return false;
  } finally {
    acquiring = false;
  }
}

export function enableScreenWakeLock(): void {
  keepAwakeEnabled = true;

  if (!listenersBound) {
    listenersBound = true;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && keepAwakeEnabled) {
        void ensureScreenWakeLock();
      }
    });

    window.addEventListener('focus', () => {
      if (keepAwakeEnabled) {
        void ensureScreenWakeLock();
      }
    });

    const retryOnGesture = () => {
      if (keepAwakeEnabled && (!sentinel || sentinel.released)) {
        void ensureScreenWakeLock();
      }
    };
    window.addEventListener('pointerdown', retryOnGesture, { passive: true });
    window.addEventListener('keydown', retryOnGesture, { passive: true });
  }

  void ensureScreenWakeLock();
}
