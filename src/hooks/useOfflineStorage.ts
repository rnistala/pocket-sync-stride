import { useState, useEffect } from "react";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  syncStatus: "synced" | "pending" | "local";
}

const STORAGE_KEY = "offline-tasks";

export const useOfflineStorage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setTasks(JSON.parse(stored));
    }
    
    const syncTime = localStorage.getItem("last-sync");
    if (syncTime) {
      setLastSync(new Date(syncTime));
    }
  }, []);

  const saveTasks = (newTasks: Task[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks));
    setTasks(newTasks);
  };

  const addTask = (title: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      syncStatus: "local",
    };
    saveTasks([...tasks, newTask]);
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map((task) =>
      task.id === id
        ? { ...task, completed: !task.completed, syncStatus: "pending" as const }
        : task
    );
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    saveTasks(tasks.filter((task) => task.id !== id));
  };

  const syncTasks = async () => {
    // Simulate sync to backend
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const synced = tasks.map((task) => ({
      ...task,
      syncStatus: "synced" as const,
    }));
    
    saveTasks(synced);
    const now = new Date();
    setLastSync(now);
    localStorage.setItem("last-sync", now.toISOString());
  };

  return {
    tasks,
    addTask,
    toggleTask,
    deleteTask,
    syncTasks,
    lastSync,
  };
};
