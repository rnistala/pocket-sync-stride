import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLeadContext } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trash2, CheckCircle, Circle, HelpCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { AddInspirationDialog } from "@/components/AddInspirationDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getApiRoot } from "@/lib/config";
import opterixLogoDark from "@/assets/opterix-logo-dark.png";
import opterixLogoLight from "@/assets/opterix-logo-light.png";

type FilterType = "all" | "ticket_remark" | "followup_note" | "direct_entry";

const Inspirations = () => {
  const navigate = useNavigate();
  const { inspirations, deleteInspiration, toggleInspirationUsed, fetchInspirations } = useLeadContext();
  const [filter, setFilter] = useState<FilterType>("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Load photo URLs for inspirations with photos
  useEffect(() => {
    const loadPhotoUrls = async () => {
      const apiRoot = await getApiRoot();
      const urls: Record<string, string> = {};

      for (const inspiration of inspirations) {
        if (inspiration.photo && Array.isArray(inspiration.photo) && inspiration.photo.length > 0) {
          const photoData = inspiration.photo[0];
          let photoPath = "";

          if (typeof photoData === "string") {
            try {
              const parsed = JSON.parse(photoData);
              photoPath = parsed.path || "";
            } catch {
              photoPath = photoData;
            }
          } else if (photoData && typeof photoData === "object" && "path" in photoData) {
            photoPath = photoData.path || "";
          }

          if (photoPath) {
            const cleanPath = photoPath.startsWith("/") ? photoPath : `/${photoPath}`;
            urls[inspiration.id] = `${apiRoot}/photos${cleanPath}`;
          }
        }
      }

      setPhotoUrls(urls);
    };

    loadPhotoUrls();
  }, [inspirations]);

  const filteredInspirations = useMemo(() => {
    const filtered = filter === "all" 
      ? inspirations 
      : inspirations.filter((i) => i.source_type === filter);
    
    return filtered.sort((a, b) => 
      new Date(b.created).getTime() - new Date(a.created).getTime()
    );
  }, [inspirations, filter]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      total: inspirations.length,
      used: inspirations.filter((i) => i.is_used).length,
      thisWeek: inspirations.filter((i) => new Date(i.created) >= weekAgo).length,
    };
  }, [inspirations]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetchInspirations();
    } finally {
      setIsSyncing(false);
    }
  };

  const getSourceBadge = (sourceType: string) => {
    switch (sourceType) {
      case "ticket_remark":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Ticket</Badge>;
      case "followup_note":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Follow-up</Badge>;
      case "direct_entry":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Direct</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getBorderColor = (sourceType: string) => {
    switch (sourceType) {
      case "ticket_remark":
        return "border-l-blue-500";
      case "followup_note":
        return "border-l-green-500";
      case "direct_entry":
        return "border-l-purple-500";
      default:
        return "border-l-muted";
    }
  };

  return (
    <div className="min-h-screen bg-textured">
      <div className="sticky top-0 z-10 bg-textured backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-3 py-2 md:px-8 md:py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <img 
                  src={opterixLogoDark} 
                  alt="Opterix 360" 
                  className="h-7 dark:hidden"
                />
                <img 
                  src={opterixLogoLight} 
                  alt="Opterix 360" 
                  className="h-7 hidden dark:block"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="h-8 w-8"
                    >
                      <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sync inspirations</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Capture insights for SM posts & emails</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <h1 className="text-lg font-semibold text-foreground mb-3">Daily Inspirations</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.used}</p>
              <p className="text-xs text-muted-foreground">Used</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.thisWeek}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </Card>
          </div>

          {/* Filter Tabs */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList className="w-full grid grid-cols-4 h-9">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="ticket_remark" className="text-xs">Tickets</TabsTrigger>
              <TabsTrigger value="followup_note" className="text-xs">Follow-ups</TabsTrigger>
              <TabsTrigger value="direct_entry" className="text-xs">Direct</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 py-4 md:px-8 md:py-6">
        <div className="space-y-3">
          {filteredInspirations.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              <p className="text-sm">No inspirations yet</p>
              <p className="text-xs mt-1">Add notes from tickets, follow-ups, or create directly</p>
            </Card>
          ) : (
            filteredInspirations.map((inspiration) => (
              <Card 
                key={inspiration.id} 
                className={`p-3 border-l-4 ${getBorderColor(inspiration.source_type)} ${
                  inspiration.is_used ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getSourceBadge(inspiration.source_type)}
                    {inspiration.source_context && (
                      <span className="text-xs text-muted-foreground">{inspiration.source_context}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(inspiration.created), "dd-MMM")}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  {/* Thumbnail */}
                  {(photoUrls[inspiration.id] || (inspiration.screenshots && inspiration.screenshots.length > 0)) && (
                    <img
                      src={photoUrls[inspiration.id] || inspiration.screenshots?.[0]}
                      alt="Inspiration"
                      className="h-16 w-16 object-cover rounded-md flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                  
                  {/* Content */}
                  <p className="text-sm leading-relaxed line-clamp-3 flex-1">{inspiration.notes}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-border">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleInspirationUsed(inspiration.id)}
                        >
                          {inspiration.is_used ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{inspiration.is_used ? "Mark as unused" : "Mark as used"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteInspiration(inspiration.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </Card>
            ))
          )}
        </div>

        <footer className="mt-8 pb-4 text-center">
          <p className="text-xs text-muted-foreground">
            © Copyright ProductRx Consulting Pvt Ltd. All rights reserved.
          </p>
        </footer>
      </div>

      {/* Floating Add Button */}
      <AddInspirationDialog />
    </div>
  );
};

export default Inspirations;
