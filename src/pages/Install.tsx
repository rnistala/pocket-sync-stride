import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Check, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            {isInstalled ? (
              <Check className="h-8 w-8 text-primary" />
            ) : (
              <Smartphone className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isInstalled ? 'Already Installed!' : 'Install Pocket Sync Stride'}
          </CardTitle>
          <CardDescription>
            {isInstalled 
              ? 'You can now use this app from your home screen'
              : 'Add to your home screen for quick access and offline functionality'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isInstalled && (
            <>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  Works completely offline
                </p>
                <p className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  Fast and responsive
                </p>
                <p className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  No app store required
                </p>
              </div>

              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="mr-2 h-4 w-4" />
                  Install Now
                </Button>
              ) : (
                <div className="text-sm text-center text-muted-foreground space-y-2">
                  <p className="font-medium">How to install:</p>
                  <p className="text-xs">
                    <strong>iOS:</strong> Tap the Share button <span className="inline-block">⎋</span> then "Add to Home Screen"
                  </p>
                  <p className="text-xs">
                    <strong>Android:</strong> Tap the menu <span className="inline-block">⋮</span> then "Install app" or "Add to Home screen"
                  </p>
                </div>
              )}
            </>
          )}

          <Button 
            onClick={() => navigate('/')} 
            variant={isInstalled ? "default" : "outline"}
            className="w-full"
          >
            {isInstalled ? 'Open App' : 'Continue in Browser'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
