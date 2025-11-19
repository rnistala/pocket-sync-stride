import { useRegisterSW } from 'virtual:pwa-register/react';

export const usePWAUpdate = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
      // Check for updates every hour
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const checkForUpdates = async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (!registration) {
        return false;
      }

      // Trigger update check
      await registration.update();

      // Wait for the update to be detected
      return new Promise((resolve) => {
        // If there's already a waiting worker, an update is available
        if (registration.waiting) {
          resolve(true);
          return;
        }

        // Listen for new service worker installing
        const checkUpdate = () => {
          if (registration.waiting || registration.installing) {
            resolve(true);
            registration.removeEventListener('updatefound', checkUpdate);
          }
        };

        registration.addEventListener('updatefound', checkUpdate);

        // Timeout after 5 seconds - no update found
        setTimeout(() => {
          registration.removeEventListener('updatefound', checkUpdate);
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  };

  const installUpdate = () => {
    updateServiceWorker(true);
  };

  const dismissUpdate = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return {
    needRefresh,
    offlineReady,
    checkForUpdates,
    installUpdate,
    dismissUpdate,
  };
};
