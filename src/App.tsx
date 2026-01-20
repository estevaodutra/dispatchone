import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/i18n";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout";
import { CampaignsLayout } from "@/components/layout/CampaignsLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import GroupCampaigns from "./pages/GroupCampaigns";
import PhoneNumbers from "./pages/PhoneNumbers";
import DispatchLogs from "./pages/DispatchLogs";
import Instances from "./pages/Instances";
import Alerts from "./pages/Alerts";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import ApiDocs from "./pages/ApiDocs";
import ApiLogs from "./pages/ApiLogs";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Public route */}
                  <Route path="/auth" element={<Auth />} />
                  
                  {/* Protected routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Dashboard />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/campaigns"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <CampaignsLayout />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Campaigns />} />
                    <Route path="groups" element={<GroupCampaigns />} />
                  </Route>
                  <Route
                    path="/numbers"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <PhoneNumbers />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/logs"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <DispatchLogs />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/instances"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Instances />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/api-logs"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <ApiLogs />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/alerts"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Alerts />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/billing"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Billing />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Settings />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/api-docs"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <ApiDocs />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
