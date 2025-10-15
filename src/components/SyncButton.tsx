import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface SyncButtonProps {
  onSync: () => Promise<void>;
  lastSync: Date | null;
  isOnline: boolean;
}

export const SyncButton = ({ onSync, lastSync, isOnline }: SyncButtonProps) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!isOnline) {
      toast.error("Cannot sync while offline");
      return;
    }

    setIsSyncing(true);
    try {
      await onSync();
      toast.success("Synced successfully!");
    } catch (error) {
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const getLastSyncText = () => {
    if (!lastSync) return "Never synced";
    const diff = Date.now() - lastSync.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">{getLastSyncText()}</span>
      <Button
        onClick={handleSync}
        disabled={!isOnline || isSyncing}
        size="sm"
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        {isSyncing ? "Syncing..." : "Sync"}
      </Button>
    </div>
  );
};
