import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RefreshCw, Send, ChevronDown, ChevronUp, Users, TrendingUp, UserCheck, Newspaper, Globe } from "lucide-react";
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

interface FollowUpMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CompanyResearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  city?: string;
  contactId?: string;
  onUpdate?: (data: ResearchData) => void;
}

const quickActions = [
  { label: "Competitors", question: "Who are the main competitors of this company?", icon: Users },
  { label: "Financials", question: "What is known about this company's financials, revenue, or funding?", icon: TrendingUp },
  { label: "Key People", question: "Find more key people and decision makers at this company with their contact details", icon: UserCheck },
  { label: "Recent News", question: "What are the latest news and developments about this company?", icon: Newspaper },
  { label: "Social Media", question: "Find this company's LinkedIn, website, and social media presence", icon: Globe },
];

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
  const [isBriefOpen, setIsBriefOpen] = useState(true);
  
  // Follow-up conversation state
  const [followUpMessages, setFollowUpMessages] = useState<FollowUpMessage[]>([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [isFollowingUp, setIsFollowingUp] = useState(false);

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

  const handleFollowUp = async (question: string) => {
    if (!question.trim() || !companyName) return;

    // Add user message
    const userMessage: FollowUpMessage = { role: 'user', content: question };
    setFollowUpMessages(prev => [...prev, userMessage]);
    setFollowUpInput("");
    setIsFollowingUp(true);

    try {
      // Build context from initial research
      const previousContext = researchData 
        ? `Summary: ${researchData.summary}\nIndustry: ${researchData.industry}\nProducts: ${researchData.products}${researchData.owner ? `\nOwner: ${researchData.owner}` : ''}${researchData.address ? `\nAddress: ${researchData.address}` : ''}`
        : undefined;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-company-followup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            companyName,
            city,
            question,
            previousContext
          }),
        }
      );

      if (response.status === 429) {
        toast.error("Rate limit exceeded. Please try again later.");
        setFollowUpMessages(prev => prev.slice(0, -1)); // Remove user message
        return;
      }

      if (response.status === 402) {
        toast.error("AI credits depleted. Please add credits to your workspace.");
        setFollowUpMessages(prev => prev.slice(0, -1));
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to get follow-up response");
      }

      const data = await response.json();
      const assistantMessage: FollowUpMessage = { role: 'assistant', content: data.response };
      setFollowUpMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error with follow-up:", error);
      toast.error("Failed to get response");
      setFollowUpMessages(prev => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setIsFollowingUp(false);
    }
  };


  // Reset all state when company changes
  useEffect(() => {
    setResearchData(null);
    setFollowUpMessages([]);
    setFollowUpInput("");
  }, [companyName, contactId]);

  // Trigger research when dialog opens
  useEffect(() => {
    if (isOpen && !researchData && !isResearching) {
      handleResearch();
    }
  }, [isOpen, companyName]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFollowUp(followUpInput);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Company Research: {companyName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <ScrollArea className="flex-1 pr-4">
            {isResearching ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-3">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Researching company information...</p>
                </div>
              </div>
            ) : researchData ? (
              <div className="space-y-4">
                {/* Collapsible Initial Research Brief */}
                <Collapsible open={isBriefOpen} onOpenChange={setIsBriefOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                      <span className="font-semibold text-sm">Research Brief</span>
                      {isBriefOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    <div>
                      <h3 className="text-sm font-semibold mb-1">Summary</h3>
                      <p className="text-sm text-muted-foreground">{researchData.summary}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-1">Industry</h3>
                      <Badge variant="secondary">{researchData.industry}</Badge>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-1">Products & Services</h3>
                      <p className="text-sm text-muted-foreground">{researchData.products}</p>
                    </div>

                    {researchData.owner && researchData.owner !== "Not available" && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Owner / CEO</h3>
                        <p className="text-sm text-muted-foreground">{researchData.owner}</p>
                      </div>
                    )}

                    {researchData.managementContacts && researchData.managementContacts !== "Not available" && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Management Contacts</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{researchData.managementContacts}</p>
                      </div>
                    )}

                    {researchData.address && researchData.address !== "Not available" && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Address</h3>
                        <p className="text-sm text-muted-foreground">{researchData.address}</p>
                      </div>
                    )}

                    {researchData.phone && researchData.phone !== "Not available" && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Phone</h3>
                        <p className="text-sm text-muted-foreground">{researchData.phone}</p>
                      </div>
                    )}

                    {researchData.email && researchData.email !== "Not available" && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Email</h3>
                        <p className="text-sm text-muted-foreground">{researchData.email}</p>
                      </div>
                    )}

                    {researchData.size && researchData.size !== "Not available" && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Company Size</h3>
                        <p className="text-sm text-muted-foreground">{researchData.size}</p>
                      </div>
                    )}

                    {researchData.recentNews && researchData.recentNews !== "Not available" && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Recent News</h3>
                        <p className="text-sm text-muted-foreground">{researchData.recentNews}</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Conversation Area */}
                {followUpMessages.length > 0 && (
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-xs text-muted-foreground">Conversation:</p>
                    {followUpMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary/10 ml-8'
                            : 'bg-muted mr-8'
                        }`}
                      >
                        <p className="text-xs font-medium mb-1 text-muted-foreground">
                          {msg.role === 'user' ? 'You' : 'AI'}
                        </p>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                    {isFollowingUp && (
                      <div className="bg-muted p-3 rounded-lg mr-8">
                        <p className="text-xs font-medium mb-1 text-muted-foreground">AI</p>
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span className="text-sm text-muted-foreground">Researching...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </ScrollArea>

          {/* Quick Actions & Follow-up Input */}
          {researchData && (
            <div className="border-t pt-4 mt-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Dig Deeper:</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      onClick={() => handleFollowUp(action.question)}
                      disabled={isFollowingUp}
                      className="text-xs"
                    >
                      <action.icon className="h-3 w-3 mr-1" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question about this company..."
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isFollowingUp}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={() => handleFollowUp(followUpInput)}
                  disabled={!followUpInput.trim() || isFollowingUp}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
