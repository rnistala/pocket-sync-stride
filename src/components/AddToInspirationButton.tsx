import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLeadContext } from "@/contexts/LeadContext";
import { toast } from "sonner";

interface AddToInspirationButtonProps {
  content: string;
  sourceType: "ticket_remark" | "followup_note" | "direct_entry";
  sourceId?: string;
  sourceContext?: string;
  size?: "sm" | "default";
}

export const AddToInspirationButton = ({
  content,
  sourceType,
  sourceId,
  sourceContext,
  size = "sm",
}: AddToInspirationButtonProps) => {
  const { addInspiration } = useLeadContext();
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!content?.trim()) {
      toast.error("No content to save");
      return;
    }

    setIsSaving(true);
    try {
      await addInspiration({
        notes: content.trim(),
        source_type: sourceType,
        source_id: sourceId,
        source_context: sourceContext,
        created: new Date().toISOString(),
      });
      toast.success("Added to inspirations");
    } catch (error) {
      console.error("Failed to add inspiration:", error);
      toast.error("Failed to add inspiration");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={size === "sm" ? "h-6 w-6" : "h-8 w-8"}
            onClick={handleAdd}
            disabled={isSaving || !content?.trim()}
          >
            <Lightbulb className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Save to Inspirations</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
