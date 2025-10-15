import { Contact } from "@/hooks/useLeadStorage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect } from "react";
import { useLeadContext } from "@/contexts/LeadContext";

interface ContactListProps {
  contacts: Contact[];
}

const ITEMS_PER_PAGE = 50;

export const ContactList = ({ contacts }: ContactListProps) => {
  const navigate = useNavigate();
  const { scrollPosition, displayCount, setScrollPosition, setDisplayCount } = useLeadContext();
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
  }, [displayCount, contacts.length]);

  const handleContactTap = (contactId: string) => {
    setScrollPosition(window.scrollY);
    navigate(`/contact/${contactId}/details`);
  };

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No contacts found. Sync to load contacts.
      </div>
    );
  }

  const displayedContacts = contacts.slice(0, displayCount);

  return (
    <div className="space-y-4">
      {displayedContacts.map((contact) => (
        <Card
          key={contact.id}
          className="p-4 cursor-pointer hover:bg-accent transition-colors"
          onClick={() => handleContactTap(contact.id)}
        >
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{contact.name}</h3>
                <p className="text-sm text-muted-foreground">{contact.company}</p>
              </div>
              <Badge variant="secondary">{contact.status}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">City: </span>
                <span>{contact.city}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Next Follow-up: </span>
                <span>{new Date(contact.nextFollowUp).toLocaleDateString()}</span>
              </div>
            </div>

            {contact.lastNotes && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                Last: {contact.lastNotes}
              </p>
            )}
          </div>
        </Card>
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
};
