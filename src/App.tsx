import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LeadProvider } from "@/contexts/LeadContext";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ContactInteractions from "./pages/ContactInteractions";
import Tickets from "./pages/Tickets";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Detect the base path from the current URL
const getBasePath = () => {
  const path = window.location.pathname;
  // If we're at root or the path ends with .html, return '/'
  if (path === '/' || path.endsWith('.html') || path.endsWith('index.html')) {
    return '/';
  }
  // Otherwise, return the directory path
  return path.endsWith('/') ? path : path.substring(0, path.lastIndexOf('/') + 1);
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <LeadProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={getBasePath()}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/contact/:id/details" element={<ContactInteractions />} />
              <Route path="/tickets" element={<Tickets />} />
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
