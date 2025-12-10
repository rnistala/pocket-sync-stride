import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface AddTaskFormProps {
  onAdd: (title: string) => void;
}

export const AddTaskForm = ({ onAdd }: AddTaskFormProps) => {
  const [title, setTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdding || !title.trim()) return;
    
    setIsAdding(true);
    try {
      onAdd(title.trim());
      setTitle("");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a new task..."
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled={isAdding || !title.trim()}>
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
};
