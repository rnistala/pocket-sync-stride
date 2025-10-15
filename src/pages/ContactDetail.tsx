import { useParams, useNavigate } from "react-router-dom";
import { useLeadStorage } from "@/hooks/useLeadStorage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contacts } = useLeadStorage();
  
  const contact = contacts.find((c) => c.id === id);

  if (!contact) {
    return <div className="p-4">Contact not found</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-4">{contact.name}</h1>
          
          <div className="space-y-3">
            <div>
              <span className="text-muted-foreground">Company: </span>
              <span>{contact.company}</span>
            </div>
            <div>
              <span className="text-muted-foreground">City: </span>
              <span>{contact.city}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status: </span>
              <span>{contact.status}</span>
            </div>
            
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                  {contact.phone}
                </a>
              </div>
            )}
            
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ContactDetail;
