import { Contact } from "@/hooks/useLeadStorage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useMemo, memo } from "react";
import { useLeadContext } from "@/contexts/LeadContext";
import { Star, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { format, addYears } from "date-fns";

interface ContactListProps {
  contacts: Contact[];
}

const ITEMS_PER_PAGE = 50;

// Memoized contact card component to prevent unnecessary re-renders
const ContactCard = memo(({ contact, onClick, onToggleStar, onPushDown }: { contact: Contact; onClick: () => void; onToggleStar: (e: React.MouseEvent) => void; onPushDown: (e: React.MouseEvent) => void }) => {
  const formattedDate = useMemo(() => {
    if (!contact.followup_on) return 'No date set';
    const date = new Date(contact.followup_on);
    return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
  }, [contact.followup_on]);

  const scoreBadgeVariant = useMemo(() => {
    const score = contact.score ?? 0;
    if (score <= 5) return "secondary";
    if (score <= 10) return "warning";
    return "info";
  }, [contact.score]);

  return (
    <Card
      className="p-3 cursor-pointer hover:bg-secondary/80 transition-colors active:scale-[0.99] border-border/50"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm md:text-base truncate">{contact.name}</h3>
            <Badge variant="default" className="text-xs px-2 py-0.5 shrink-0 font-medium bg-accent/20 text-accent-foreground border border-accent/30">{contact.status}</Badge>
            <Badge variant={scoreBadgeVariant} className="text-xs px-2 py-0.5 shrink-0 font-medium">
              Score: {contact.score ?? 0}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{contact.company} • {contact.city}</p>
          <p className="text-xs text-muted-foreground">
            <span className="opacity-70">Follow-up:</span> {formattedDate}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 -mt-1"
            onClick={onToggleStar}
          >
            <Star 
              className={`h-4 w-4 ${contact.starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 -mt-1"
            onClick={onPushDown}
          >
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </Card>
  );
});

ContactCard.displayName = "ContactCard";

export const ContactList = memo(({ contacts }: ContactListProps) => {
  const navigate = useNavigate();
  const { scrollPosition, displayCount, setScrollPosition, setDisplayCount, toggleStarred, updateContactFollowUp, syncData } = useLeadContext();
  const observerTarget = useRef<HTMLDivElement>(null);
  const hasRestoredScroll = useRef(false);

  // Restore scroll position on mount
  useEffect(() => {
    if (scrollPosition > 0 && !hasRestoredScroll.current) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition);
        hasRestoredScroll.current = true;
      });
    }
  }, [scrollPosition]);

  // Reset when contacts change (e.g., after search/sync)
  useEffect(() => {
    if (contacts.length === 0) {
      setDisplayCount(ITEMS_PER_PAGE);
      setScrollPosition(0);
    }
  }, [contacts, setDisplayCount, setScrollPosition]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < contacts.length) {
          setDisplayCount(Math.min(displayCount + ITEMS_PER_PAGE, contacts.length));
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [displayCount, contacts.length, setDisplayCount]);

  const displayedContacts = useMemo(() => 
    contacts.slice(0, displayCount), 
    [contacts, displayCount]
  );

  const handleContactTap = (contactId: string) => {
    setScrollPosition(window.scrollY);
    navigate(`/contact/${contactId}/details`);
  };

  const handleToggleStar = (e: React.MouseEvent, contactId: string) => {
    e.stopPropagation();
    toggleStarred(contactId);
  };

  const handlePushDown = async (e: React.MouseEvent, contactId: string) => {
    e.stopPropagation();
    
    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("User ID not found");
      return;
    }

    try {
      const futureDate = addYears(new Date(), 100);
      
      // Update local state immediately for instant UI feedback
      await updateContactFollowUp(contactId, futureDate.toISOString());
      
      const payload = {
        meta: {
          btable: "contact",
          htable: "",
          parentkey: "",
          preapi: "",
          draftid: "",
        },
        data: [
          {
            body: [
              {
                id: contactId,
                followup_on: format(futureDate, "yyyy-MM-dd"),
              },
            ],
            dirty: "true",
          },
        ],
      };

      const response = await fetch(`https://demo.opterix.in/api/public/tdata/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Contact pushed down");
      } else {
        toast.error("Failed to update contact");
      }
    } catch (error) {
      console.error("Error pushing contact down:", error);
      toast.error("Failed to update contact");
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No contacts found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayedContacts.map((contact) => (
        <ContactCard
          key={contact.id}
          contact={contact}
          onClick={() => handleContactTap(contact.id)}
          onToggleStar={(e) => handleToggleStar(e, contact.id)}
          onPushDown={(e) => handlePushDown(e, contact.id)}
        />
      ))}
      
      {displayCount < contacts.length && (
        <div ref={observerTarget} className="py-3 text-center">
          <p className="text-xs text-muted-foreground">
            {displayCount} of {contacts.length}
          </p>
        </div>
      )}
    </div>
  );
});

ContactList.displayName = "ContactList";
