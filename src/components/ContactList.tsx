import { Contact } from "@/hooks/useLeadStorage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface ContactListProps {
  contacts: Contact[];
}

export const ContactList = ({ contacts }: ContactListProps) => {
  const navigate = useNavigate();
  let tapCount = 0;
  let tapTimer: NodeJS.Timeout;

  const handleContactTap = (contactId: string) => {
    tapCount++;
    
    clearTimeout(tapTimer);
    
    if (tapCount === 1) {
      tapTimer = setTimeout(() => {
        // Single tap - show quick details
        navigate(`/contact/${contactId}`);
        tapCount = 0;
      }, 300);
    } else if (tapCount === 2) {
      // Double tap - show full details with interactions
      navigate(`/contact/${contactId}/details`);
      tapCount = 0;
    }
  };

  return (
    <div className="space-y-4">
      {contacts.map((contact) => (
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
    </div>
  );
};
