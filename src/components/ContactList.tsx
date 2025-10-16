import { Contact } from "@/hooks/useLeadStorage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useMemo, memo } from "react";
import { useLeadContext } from "@/contexts/LeadContext";
import { Star } from "lucide-react";

interface ContactListProps {
  contacts: Contact[];
}

const ITEMS_PER_PAGE = 50;

// Memoized contact card component to prevent unnecessary re-renders
const ContactCard = memo(({ contact, onClick, onToggleStar }: { contact: Contact; onClick: () => void; onToggleStar: (e: React.MouseEvent) => void }) => {
  const formattedDate = useMemo(() => 
    new Date(contact.nextFollowUp).toLocaleDateString(), 
    [contact.nextFollowUp]
  );

  return (
    <Card
      className="p-3 cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm md:text-base truncate">{contact.name}</h3>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0">{contact.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{contact.company} • {contact.city}</p>
          <p className="text-xs text-muted-foreground">
            <span className="opacity-70">Follow-up:</span> {formattedDate}
          </p>
        </div>
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
      </div>
    </Card>
  );
});

ContactCard.displayName = "ContactCard";

export const ContactList = memo(({ contacts }: ContactListProps) => {
  const navigate = useNavigate();
  const { scrollPosition, displayCount, setScrollPosition, setDisplayCount, toggleStarred } = useLeadContext();
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
