import { useState, useEffect } from "react";
import { LogOut, User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { getApiRoot } from "@/lib/config";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  name?: string;
  designation?: string;
  photo?: {
    path?: string;
    remarks?: string;
  } | {
    path?: string;
    remarks?: string;
  }[];
}

export const UserProfile = ({ onLogout }: { onLogout: () => void }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const { needRefresh, checkForUpdates, installUpdate } = usePWAUpdate();
  const { toast } = useToast();

  useEffect(() => {
    const loadUserData = async () => {
      const userToken = localStorage.getItem("userToken");
      if (!userToken) return;

      try {
        const data: UserData = JSON.parse(userToken);
        setUserData(data);

        // Parse photo from the response
        if (data.photo) {
          const apiRoot = await getApiRoot();
          let photoPath = "";

          console.log("Raw photo data:", data.photo);
          
          // Parse photo if it's a string
          let photoData = data.photo;
          if (typeof data.photo === 'string') {
            try {
              photoData = JSON.parse(data.photo);
            } catch (e) {
              console.error("Failed to parse photo data:", e);
            }
          }

          console.log("Parsed photo data:", photoData);
          console.log("Is array?", Array.isArray(photoData));

          // Handle both single photo object and array of photos
          if (Array.isArray(photoData)) {
            if (photoData.length > 0 && photoData[0] && photoData[0].path) {
              photoPath = photoData[0].path;
            }
          } else if (photoData && typeof photoData === "object" && "path" in photoData) {
            photoPath = photoData.path || "";
          }

          console.log("Extracted photo path:", photoPath);

          if (photoPath) {
            // Construct full photo URL with /photos prefix
            const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
            const fullPhotoUrl = `${apiRoot}/photos${cleanPath}`;
            console.log("Full photo URL:", fullPhotoUrl);
            setPhotoUrl(fullPhotoUrl);
          }
        }
      } catch (error) {
        console.error("Failed to parse user data:", error);
      }
    };

    loadUserData();
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    const updateAvailable = await checkForUpdates();
    setIsCheckingUpdates(false);
    
    if (updateAvailable || needRefresh) {
      toast({
        title: "Update Available",
        description: "A new version is ready to install.",
        action: (
          <Button size="sm" onClick={installUpdate}>
            Install Now
          </Button>
        ),
      });
    } else {
      toast({
        title: "No Updates",
        description: "You're running the latest version.",
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 rounded-full p-0"
          aria-label="User profile"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={photoUrl} 
              alt={userData?.name || "User"}
              onError={(e) => {
                console.error("Failed to load avatar image:", photoUrl);
              }}
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(userData?.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage 
                src={photoUrl} 
                alt={userData?.name || "User"}
                onError={(e) => {
                  console.error("Failed to load avatar image in dropdown:", photoUrl);
                }}
              />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(userData?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {userData?.name || "User"}
              </p>
              {userData?.designation && (
                <p className="text-xs text-muted-foreground truncate">
                  {userData.designation}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Theme</span>
              <ThemeToggle />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Check for Updates</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCheckForUpdates}
                disabled={isCheckingUpdates}
              >
                <RefreshCw className={`h-4 w-4 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Logout</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
