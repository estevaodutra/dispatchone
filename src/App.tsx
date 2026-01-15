import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/i18n";
import { AppLayout } from "@/components/layout";

// Pages
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import PhoneNumbers from "./pages/PhoneNumbers";
import DispatchLogs from "./pages/DispatchLogs";
import Instances from "./pages/Instances";
import Alerts from "./pages/Alerts";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/numbers" element={<PhoneNumbers />} />
                <Route path="/logs" element={<DispatchLogs />} />
                <Route path="/instances" element={<Instances />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
