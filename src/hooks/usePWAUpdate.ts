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

  const checkForUpdates = async () => {
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        await registration.update();
        return true;
      }
      return false;
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
