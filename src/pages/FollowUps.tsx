import { Calendar as CalendarIcon, List, HelpCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLeadContext } from "@/contexts/LeadContext";
import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import { NetworkStatus } from "@/components/NetworkStatus";
import { UserProfile } from "@/components/UserProfile";
import opterixLogoDark from "@/assets/opterix-logo-dark.png";
import opterixLogoLight from "@/assets/opterix-logo-light.png";

const FollowUps = () => {
  const { contacts, toggleStarred } = useLeadContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { resolvedTheme } = useTheme();

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

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userData");
    navigate("/login");
  };

  const handleToggleStar = async (e: React.MouseEvent, contactId: string) => {
    e.stopPropagation();
    await toggleStarred(contactId);
  };

  const getScoreBadgeVariant = (score?: number) => {
    if (score === undefined || score === null) return "secondary";
    if (score >= 8) return "default";
    if (score >= 5) return "secondary";
    return "outline";
  };

  return (
    <div className="min-h-screen bg-textured">
      {/* Header - matching Index page */}
      <header className="sticky top-0 z-10 bg-textured backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-3xl mx-auto px-3 py-2 md:px-8 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src={opterixLogoDark} 
                alt="Opterix 360" 
                className="h-8 md:h-10 dark:hidden"
              />
              <img 
                src={opterixLogoLight} 
                alt="Opterix 360" 
                className="h-8 md:h-10 hidden dark:block"
              />
            </div>
            <div className="flex items-center gap-1">
              <NetworkStatus />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="h-8 w-8"
                title="Contact List"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open("https://demo.opterix.in/kb", "_blank")}
                className="h-8 w-8"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <UserProfile onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-3 py-4 md:px-8 md:py-6">
        <div className="space-y-4">
          {/* Calendar */}
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
            className="w-full rounded-lg border bg-card p-4 shadow-sm"
          />

          {/* Contacts for Selected Date */}
          <div className="space-y-3">
            <h2 className="text-base font-medium text-foreground">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </h2>

            {contactsForSelectedDate.length === 0 ? (
              <Card className="p-8 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground font-medium">All clear for this date!</p>
                <p className="text-sm text-muted-foreground/70 mt-1">No follow-ups scheduled</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {contactsForSelectedDate.map((contact) => (
                  <Card
                    key={contact.id}
                    onClick={() => handleContactClick(contact.id)}
                    className="p-3 hover:bg-accent/50 cursor-pointer transition-all border-l-4 border-l-primary/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Name + Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground truncate">
                            {contact.name}
                          </span>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {contact.status}
                          </Badge>
                          {contact.score !== undefined && contact.score !== null && (
                            <Badge 
                              variant={getScoreBadgeVariant(contact.score)} 
                              className="text-xs shrink-0"
                            >
                              {contact.score}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Company + City */}
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {contact.company}
                          {contact.city && ` • ${contact.city}`}
                        </div>
                        
                        {/* Last notes */}
                        {contact.lastNotes && (
                          <p className="text-xs text-muted-foreground/80 italic mt-1 line-clamp-1">
                            "{contact.lastNotes}"
                          </p>
                        )}
                        
                        {/* Follow-up date */}
                        {contact.followup_on && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Follow-up: {format(new Date(contact.followup_on), "MM/dd/yyyy")}
                          </div>
                        )}
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => handleToggleStar(e, contact.id)}
                        >
                          <Star
                            className={`h-4 w-4 ${contact.starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
                          />
                        </Button>
                      </div>
                    </div>
                  </Card>
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
