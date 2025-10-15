import { NetworkStatus } from "@/components/NetworkStatus";
import { SyncButton } from "@/components/SyncButton";
import { TaskList } from "@/components/TaskList";
import { AddTaskForm } from "@/components/AddTaskForm";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useState, useEffect } from "react";

const Index = () => {
  const { tasks, addTask, toggleTask, deleteTask, syncTasks, lastSync } =
    useOfflineStorage();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Offline Tasks
              </h1>
              <p className="text-muted-foreground mt-2">
                Works completely offline, syncs when connected
              </p>
            </div>
            <NetworkStatus />
          </div>
          
          <div className="flex items-center justify-between py-4 border-t border-b border-border">
            <div className="text-sm">
              <span className="text-muted-foreground">Total tasks:</span>
              <span className="ml-2 font-semibold text-foreground">
                {tasks.length}
              </span>
            </div>
            <SyncButton
              onSync={syncTasks}
              lastSync={lastSync}
              isOnline={isOnline}
            />
          </div>
        </header>

        <AddTaskForm onAdd={addTask} />

        <TaskList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />
      </div>
    </div>
  );
};

export default Index;
