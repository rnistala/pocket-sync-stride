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
      className="p-4 cursor-pointer hover:bg-accent transition-colors"
      onClick={onClick}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{contact.name}</h3>
            <p className="text-sm text-muted-foreground">{contact.company}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onToggleStar}
            >
              <Star 
                className={`h-4 w-4 ${contact.starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
              />
            </Button>
            <Badge variant="secondary" className="shrink-0">{contact.status}</Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">City: </span>
            <span>{contact.city}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Next Follow-up: </span>
            <span>{formattedDate}</span>
          </div>
        </div>

        {contact.lastNotes && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            Last: {contact.lastNotes}
          </p>
        )}
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
      <div className="text-center py-12 text-muted-foreground">
        No contacts found. Sync to load contacts.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayedContacts.map((contact) => (
        <ContactCard
          key={contact.id}
          contact={contact}
          onClick={() => handleContactTap(contact.id)}
          onToggleStar={(e) => handleToggleStar(e, contact.id)}
        />
      ))}
      
      {displayCount < contacts.length && (
        <div ref={observerTarget} className="py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Loading more... ({displayCount} of {contacts.length})
          </p>
        </div>
      )}
    </div>
  );
});

ContactList.displayName = "ContactList";
