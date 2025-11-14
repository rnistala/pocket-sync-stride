import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiRoot, getStatuses } from "@/lib/config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLeadContext } from "@/contexts/LeadContext";
import { CompanyResearchDialog } from "@/components/CompanyResearchDialog";

export const AddContactForm = () => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResearchDialogOpen, setIsResearchDialogOpen] = useState(false);
  const [statuses, setStatuses] = useState<string[]>([]);
  const { toast } = useToast();
  const { syncData } = useLeadContext();
  
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    city: "",
    mobile: "",
    email: "",
    profile: "",
    status: "",
    contact_person: "",
    address: "",
    remarks: "",
    industry: "",
  });

  useEffect(() => {
    const loadStatuses = async () => {
      const loadedStatuses = await getStatuses();
      setStatuses(loadedStatuses);
      setFormData(prev => ({ ...prev, status: loadedStatuses[0] || "" }));
    };
    loadStatuses();
  }, []);

  const handleFillWithAI = () => {
    if (!formData.company.trim()) {
      toast({
        title: "Error",
        description: "Please enter a company name first",
        variant: "destructive",
      });
      return;
    }
    setIsResearchDialogOpen(true);
  };

  const handleResearchUpdate = (data: any) => {
    setFormData(prev => ({
      ...prev,
      mobile: data.phone && data.phone !== "Not available" ? data.phone : prev.mobile,
      email: data.email && data.email !== "Not available" ? data.email : prev.email,
      contact_person: data.owner && data.owner !== "Not available" ? data.owner : prev.contact_person,
      address: data.address && data.address !== "Not available" ? data.address : prev.address,
      industry: data.industry && data.industry !== "Not available" ? data.industry : prev.industry,
      remarks: data.summary && data.summary !== "Not available" ? data.summary : prev.remarks,
    }));
    toast({
      title: "Success",
      description: "Company details filled successfully",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        toast({
          title: "Error",
          description: "User ID not found. Please log in again.",
          variant: "destructive",
        });
        return;
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
            body: [
              {
                name: formData.name,
                company: formData.company,
                city: formData.city,
                mobile: formData.mobile,
                email: formData.email,
                profile: formData.profile,
                status: formData.status,
                contact_person: formData.contact_person,
                address: formData.address,
                remarks: formData.remarks,
                agent: userId,
                contact_id: "",
                followup_on: new Date().toISOString().split("T")[0],
                industry: formData.industry,
              },
            ],
            dirty: "true",
          },
        ],
      };

      const apiRoot = await getApiRoot();
      const response = await fetch(
        `${apiRoot}/api/public/tdata/${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create contact");
      }

      toast({
        title: "Success",
        description: "Contact created successfully",
      });

      // Reset form
      setFormData({
        name: "",
        company: "",
        city: "",
        mobile: "",
        email: "",
        profile: "",
        status: statuses[0] || "",
        contact_person: "",
        address: "",
        remarks: "",
        industry: "",
      });

      setOpen(false);
      
      // Sync data to refresh the list
      await syncData();
    } catch (error) {
      console.error("Error creating contact:", error);
      toast({
        title: "Error",
        description: "Failed to create contact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Create a new contact. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                required
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
              />
            </div>
          </div>

          {formData.company.trim() && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleFillWithAI}
                disabled={!formData.company.trim()}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Fill with AI
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                required
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile *</Label>
              <Input
                id="mobile"
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) =>
                  setFormData({ ...formData, mobile: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="email@example.com, another@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile">Profile</Label>
              <Input
                id="profile"
                value={formData.profile}
                onChange={(e) =>
                  setFormData({ ...formData, profile: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) =>
                  setFormData({ ...formData, contact_person: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>

      <CompanyResearchDialog
        isOpen={isResearchDialogOpen}
        onOpenChange={setIsResearchDialogOpen}
        companyName={formData.company}
        city={formData.city}
        onUpdate={handleResearchUpdate}
      />
    </Dialog>
  );
};
