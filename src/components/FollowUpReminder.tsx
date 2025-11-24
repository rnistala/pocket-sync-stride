import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { useLeadContext } from "@/contexts/LeadContext";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export const FollowUpReminder = () => {
  const { contacts } = useLeadContext();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Group contacts by follow-up date
  const followUpsByDate = useMemo(() => {
    const dateMap = new Map<string, typeof contacts>();
    contacts.forEach((contact) => {
      if (contact.followup_on) {
        const date = new Date(contact.followup_on);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toDateString();
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, []);
        }
        dateMap.get(dateKey)!.push(contact);
      }
    });
    return dateMap;
  }, [contacts]);

  // Get dates with follow-ups for highlighting
  const datesWithFollowUps = useMemo(() => {
    return Array.from(followUpsByDate.keys()).map((d) => new Date(d));
  }, [followUpsByDate]);

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

  // Get contacts for selected date
  const contactsForSelectedDate = useMemo(() => {
    const dateKey = selectedDate.toDateString();
    return followUpsByDate.get(dateKey) || [];
  }, [selectedDate, followUpsByDate]);

  const handleContactClick = (contactId: number | string) => {
    navigate(`/contact/${contactId}/details`);
  };

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
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
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Follow-up calendar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-auto p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Follow-up Schedule</h3>
          </div>
          
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => setSelectedDate(date || new Date())}
            modifiers={{ hasFollowUp: datesWithFollowUps }}
            modifiersClassNames={{
              hasFollowUp: "text-destructive font-semibold",
            }}
            className="pointer-events-auto"
          />

          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2">
              {format(selectedDate, "MMMM d, yyyy")}
            </div>
            {contactsForSelectedDate.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follow-ups scheduled</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contactsForSelectedDate.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleContactClick(contact.id)}
                    className="p-2 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="font-medium text-sm">{contact.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {contact.company} • {contact.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
