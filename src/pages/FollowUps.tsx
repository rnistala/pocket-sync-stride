import { Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useLeadContext } from "@/contexts/LeadContext";
import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";

const FollowUps = () => {
  const { contacts } = useLeadContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize selected date from URL or default to today
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const dateParam = searchParams.get("date");
    return dateParam ? new Date(dateParam) : new Date();
  });

  // Initialize calendar month from URL or default to selected date's month
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const monthParam = searchParams.get("month");
    return monthParam ? new Date(monthParam) : selectedDate;
  });

  // Update URL when date changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("date", format(selectedDate, "yyyy-MM-dd"));
    params.set("month", format(calendarMonth, "yyyy-MM-dd"));
    setSearchParams(params, { replace: true });
  }, [selectedDate, calendarMonth, setSearchParams]);

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

  // Get contacts for selected date
  const contactsForSelectedDate = useMemo(() => {
    const dateKey = selectedDate.toDateString();
    return followUpsByDate.get(dateKey) || [];
  }, [selectedDate, followUpsByDate]);

  const handleContactClick = (contactId: number | string) => {
    navigate(`/contact/${contactId}/details`);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Follow-up Schedule</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Calendar */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              modifiers={{ hasFollowUp: datesWithFollowUps }}
              modifiersClassNames={{
                hasFollowUp: "text-destructive font-semibold",
              }}
              className="rounded-lg border bg-card p-4"
            />
          </div>

          {/* Contacts for Selected Date */}
          <div className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </h2>

            {contactsForSelectedDate.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No follow-ups scheduled for this date</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contactsForSelectedDate.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleContactClick(contact.id)}
                    className="p-4 rounded-lg border border-border bg-card hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {contact.company} • {contact.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FollowUps;
