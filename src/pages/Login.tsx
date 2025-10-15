import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoFull from "@/assets/logo-full.png";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("https://demo.opterix.in/api/public/token", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password, cookie: "opterix", detail: "Lovable" }),
      });

      const data = await response.json();
      setDebugInfo(JSON.stringify(data, null, 2));

      if (!response.ok) throw new Error("Login failed");
      
      // Store user data
      localStorage.setItem("userId", data.id);
      localStorage.setItem("userToken", JSON.stringify(data));
      
      toast.success("Login successful!");
      navigate("/");
    } catch (error) {
      setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error("Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <img src={logoFull} alt="OpteriX" className="h-12 mx-auto" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Lead Manager
            </h1>
            <p className="text-muted-foreground mt-2">Sign in to manage your leads</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 bg-card p-8 rounded-lg border border-border">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {debugInfo && (
          <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
            <p className="text-xs font-semibold mb-2">Debug Info:</p>
            <pre className="text-xs overflow-auto">{debugInfo}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
