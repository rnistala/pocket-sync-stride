import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useLeadContext } from "@/contexts/LeadContext";
import { Button } from "./ui/button";

interface SyncButtonProps {
  lastSync: Date | null;
  isOnline: boolean;
}

export const SyncButton = ({ lastSync, isOnline }: SyncButtonProps) => {
  const { syncData } = useLeadContext();
  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncData();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{getLastSyncText()}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSync}
        disabled={!isOnline || isSyncing}
        className="h-6 px-2 text-xs"
      >
        <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
};
