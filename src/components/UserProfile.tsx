import { useState, useEffect } from "react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { getApiRoot } from "@/lib/config";

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

          // Handle both single photo object and array of photos
          if (Array.isArray(data.photo) && data.photo.length > 0) {
            photoPath = data.photo[0]?.path || "";
          } else if (typeof data.photo === "object" && "path" in data.photo) {
            photoPath = data.photo.path || "";
          }

          if (photoPath) {
            // Construct full photo URL with /photos prefix
            const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
            setPhotoUrl(`${apiRoot}/photos${cleanPath}`);
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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 rounded-full p-0"
          aria-label="User profile"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={photoUrl} alt={userData?.name || "User"} />
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
              <AvatarImage src={photoUrl} alt={userData?.name || "User"} />
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

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
