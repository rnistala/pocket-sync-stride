import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, X } from 'lucide-react';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

export const PWAUpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { needRefresh, installUpdate, dismissUpdate } = usePWAUpdate();

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const close = () => {
    dismissUpdate();
    setShowPrompt(false);
  };

  const handleUpdate = () => {
    installUpdate();
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert className="bg-background border-2 border-primary shadow-lg">
        <RefreshCw className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          Update Available
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={close}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription className="space-y-3">
          <p className="text-sm">
            A new version of the app is available. Update now to get the latest features and improvements.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleUpdate} size="sm" className="flex-1">
              <RefreshCw className="h-3 w-3 mr-2" />
              Update Now
            </Button>
            <Button onClick={close} variant="outline" size="sm">
              Later
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
