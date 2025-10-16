import { RefreshCw } from "lucide-react";

interface SyncButtonProps {
  lastSync: Date | null;
  isOnline: boolean;
}

export const SyncButton = ({ lastSync, isOnline }: SyncButtonProps) => {
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
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <RefreshCw className="h-3 w-3" />
      {getLastSyncText()}
    </div>
  );
};
