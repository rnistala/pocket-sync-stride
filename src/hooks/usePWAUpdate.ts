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
        console.log('No SW registration found');
        return false;
      }

      // Check if there's already a waiting worker
      if (registration.waiting) {
        console.log('Update already waiting');
        return true;
      }

      console.log('Checking for SW update...');

      // Force the browser to bypass cache by unregistering and re-registering
      // This is a workaround for browser caching issues
      const scriptURL = registration.active?.scriptURL;
      
      if (!scriptURL) {
        console.log('No active SW script URL');
        return false;
      }

      // Trigger update check
      await registration.update();

      // Wait for update detection with proper state monitoring
      return new Promise((resolve) => {
        let timeoutId: NodeJS.Timeout;
        let stateChangeHandler: (() => void) | null = null;
        
        // Check immediately after update()
        if (registration.waiting) {
          console.log('Update found immediately');
          resolve(true);
          return;
        }

        const handleUpdateFound = () => {
          console.log('updatefound event fired');
          const installingWorker = registration.installing;
          
          if (!installingWorker) {
            console.log('No installing worker');
            return;
          }

          console.log('Monitoring installing worker state...');

          stateChangeHandler = () => {
            console.log('SW state:', installingWorker.state);
            
            if (installingWorker.state === 'installed') {
              if (registration.waiting) {
                console.log('New SW installed and waiting');
                cleanup();
                resolve(true);
              }
            } else if (installingWorker.state === 'redundant') {
              console.log('SW redundant - no update');
              cleanup();
              resolve(false);
            }
          };

          installingWorker.addEventListener('statechange', stateChangeHandler);
        };

        const cleanup = () => {
          clearTimeout(timeoutId);
          registration.removeEventListener('updatefound', handleUpdateFound);
          if (stateChangeHandler && registration.installing) {
            registration.installing.removeEventListener('statechange', stateChangeHandler);
          }
        };

        registration.addEventListener('updatefound', handleUpdateFound);

        // Increase timeout to 20 seconds for slower networks
        timeoutId = setTimeout(() => {
          console.log('Update check timed out');
          cleanup();
          resolve(false);
        }, 20000);
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
