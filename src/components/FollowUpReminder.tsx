import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLeadContext } from "@/contexts/LeadContext";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export const FollowUpReminder = () => {
  const { contacts } = useLeadContext();
  const navigate = useNavigate();

  // Calculate this week's follow-up count
  const thisWeekCount = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start on Sunday
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return contacts.filter((contact) => {
      if (!contact.followup_on) return false;
      const followUpDate = new Date(contact.followup_on);
      return followUpDate >= startOfWeek && followUpDate < endOfWeek;
    }).length;
  }, [contacts]);

  const handleClick = () => {
    navigate("/follow-ups");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 relative"
            onClick={handleClick}
          >
            <CalendarIcon className="h-4 w-4" />
            {thisWeekCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
              >
                {thisWeekCount}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Follow-up calendar</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
