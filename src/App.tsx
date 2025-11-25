import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LeadProvider } from "@/contexts/LeadContext";
import { ThemeProvider } from "next-themes";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ContactInteractions from "./pages/ContactInteractions";
import Tickets from "./pages/Tickets";
import EditTicket from "./pages/EditTicket";
import UpdateTicket from "./pages/UpdateTicket";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import Marketing from "./pages/Marketing";

const queryClient = new QueryClient();

// Use different base paths for preview vs production
const getBasename = () => {
  const hostname = window.location.hostname;
  // If we're in Lovable preview or localhost, use root path
  if (hostname.includes('lovable') || hostname === 'localhost') {
    return '/';
  }
  // Otherwise use the configured base path for production
  return '/';
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <LeadProvider>
          <Toaster />
          <Sonner />
          <PWAUpdatePrompt />
          <BrowserRouter basename={getBasename()}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/contact/:id/details" element={<ContactInteractions />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/tickets/edit/:id" element={<EditTicket />} />
              <Route path="/tickets/update/:id" element={<UpdateTicket />} />
              <Route path="/install" element={<Install />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </LeadProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
