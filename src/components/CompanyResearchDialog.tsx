import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getApiRoot } from "@/lib/config";

interface ResearchData {
  summary: string;
  industry: string;
  products: string;
  owner?: string;
  managementContacts?: string;
  address?: string;
  phone?: string;
  email?: string;
  size?: string;
  recentNews?: string;
}

interface CompanyResearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  city?: string;
  contactId?: string;
  onUpdate?: (data: ResearchData) => void;
}

export const CompanyResearchDialog = ({
  isOpen,
  onOpenChange,
  companyName,
  city,
  contactId,
  onUpdate,
}: CompanyResearchDialogProps) => {
  const [isResearching, setIsResearching] = useState(false);
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleResearch = async () => {
    if (!companyName) {
      toast.error("No company name provided");
      return;
    }

    setIsResearching(true);
    setResearchData(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-company`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            companyName,
            city 
          }),
        }
      );

      if (response.status === 429) {
        toast.error("Rate limit exceeded. Please try again later.");
        return;
      }

      if (response.status === 402) {
        toast.error("AI credits depleted. Please add credits to your workspace.");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to research company");
      }

      const data = await response.json();
      setResearchData(data.research);
    } catch (error) {
      console.error("Error researching company:", error);
      toast.error("Failed to research company");
    } finally {
      setIsResearching(false);
    }
  };

  const handleUpdateContact = async () => {
    if (!researchData || !contactId) return;

    setIsUpdating(true);
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        toast.error("User ID not found. Please log in again.");
        return;
      }

      const updateFields: any = {
        id: contactId,
      };

      // Only add fields that have valid data
      if (researchData.address && researchData.address !== "Not available") {
        updateFields.address = researchData.address;
      }
      if (researchData.phone && researchData.phone !== "Not available") {
        updateFields.mobile = researchData.phone;
      }
      if (researchData.email && researchData.email !== "Not available") {
        updateFields.email = researchData.email;
      }
      if (researchData.owner && researchData.owner !== "Not available") {
        updateFields.contact_person = researchData.owner;
      }
      if (researchData.industry && researchData.industry !== "Not available") {
        updateFields.industry = researchData.industry;
      }
      if (researchData.summary && researchData.summary !== "Not available") {
        updateFields.remarks = researchData.summary;
      }

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
            body: [updateFields],
            dirty: "true",
          },
        ],
      };

      const apiRoot = await getApiRoot();
      const response = await fetch(`${apiRoot}/api/public/tdata/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to update contact");

      toast.success("Contact updated successfully");
      onOpenChange(false);
      
      if (onUpdate) {
        onUpdate(researchData);
      }
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Failed to update contact");
    } finally {
      setIsUpdating(false);
    }
  };

  // Trigger research when dialog opens
  useEffect(() => {
    if (isOpen && !researchData && !isResearching) {
      handleResearch();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Company Research: {companyName}</DialogTitle>
        </DialogHeader>
        
        {isResearching ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Researching company information...</p>
            </div>
          </div>
        ) : researchData ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Summary</h3>
              <p className="text-sm text-muted-foreground">{researchData.summary}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Industry</h3>
              <Badge variant="secondary">{researchData.industry}</Badge>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Products & Services</h3>
              <p className="text-sm text-muted-foreground">{researchData.products}</p>
            </div>

            {researchData.owner && researchData.owner !== "Not available" && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Owner / CEO</h3>
                <p className="text-sm text-muted-foreground">{researchData.owner}</p>
              </div>
            )}

            {researchData.managementContacts && researchData.managementContacts !== "Not available" && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Management Contacts</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{researchData.managementContacts}</p>
              </div>
            )}

            {researchData.address && researchData.address !== "Not available" && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Address</h3>
                <p className="text-sm text-muted-foreground">{researchData.address}</p>
              </div>
            )}

            {researchData.phone && researchData.phone !== "Not available" && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Phone</h3>
                <p className="text-sm text-muted-foreground">{researchData.phone}</p>
              </div>
            )}

            {researchData.email && researchData.email !== "Not available" && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Email</h3>
                <p className="text-sm text-muted-foreground">{researchData.email}</p>
              </div>
            )}

            {researchData.size && researchData.size !== "Not available" && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Company Size</h3>
                <p className="text-sm text-muted-foreground">{researchData.size}</p>
              </div>
            )}

            {researchData.recentNews && researchData.recentNews !== "Not available" && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Recent News</h3>
                <p className="text-sm text-muted-foreground">{researchData.recentNews}</p>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {contactId && researchData && (
            <Button onClick={handleUpdateContact} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Contact"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
