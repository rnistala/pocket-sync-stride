import { Check, Circle, Cloud, CloudOff, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Task } from "@/hooks/useOfflineStorage";

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TaskList = ({ tasks, onToggle, onDelete }: TaskListProps) => {
  const getSyncIcon = (status: Task["syncStatus"]) => {
    switch (status) {
      case "synced":
        return <Cloud className="h-3 w-3 text-accent" />;
      case "pending":
        return <CloudOff className="h-3 w-3 text-primary" />;
      case "local":
        return <CloudOff className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No tasks yet. Add one to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Card
          key={task.id}
          className="p-4 transition-all duration-300 hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggle(task.id)}
              className="h-6 w-6 p-0 rounded-full"
            >
              {task.completed ? (
                <Check className="h-4 w-4 text-accent" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </Button>
            
            <span
              className={`flex-1 transition-all duration-300 ${
                task.completed
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {task.title}
            </span>

            <div className="flex items-center gap-2">
              {getSyncIcon(task.syncStatus)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(task.id)}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
