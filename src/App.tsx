import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/i18n";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout";

// Pages
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import {
  CampaignsHub,
  DispatchCampaigns,
  GroupCampaignsPage,
  PirateCampaigns,
  URACampaigns,
  CallCampaigns,
} from "./pages/campaigns";
import PhoneNumbers from "./pages/PhoneNumbers";
import Logs from "./pages/Logs";
import Instances from "./pages/Instances";
import Alerts from "./pages/Alerts";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import ApiDocs from "./pages/ApiDocs";
import WebhookEvents from "./pages/WebhookEvents";
import Auth from "./pages/Auth";
import OperatorScript from "./pages/OperatorScript";
import CallPanel from "./pages/CallPanel";
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
                    path="/painel-ligacoes"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <CallPanel />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Campaigns routes */}
                  <Route
                    path="/campaigns"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Outlet />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<CampaignsHub />} />
                    {/* WhatsApp */}
                    <Route path="whatsapp/despacho" element={<DispatchCampaigns />} />
                    <Route path="whatsapp/grupos" element={<GroupCampaignsPage />} />
                    <Route path="whatsapp/pirata" element={<PirateCampaigns />} />
                    {/* Telefonia */}
                    <Route path="telefonia/ura" element={<URACampaigns />} />
                    <Route path="telefonia/ligacao" element={<CallCampaigns />} />
                  </Route>

                  {/* Operator Call Script Route (minimal UI, no sidebar) */}
                  <Route
                    path="/call/script/:campaignId/:leadId"
                    element={
                      <ProtectedRoute>
                        <OperatorScript />
                      </ProtectedRoute>
                    }
                  />
                  
                  <Route
                    path="/leads"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Leads />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
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
                          <Logs />
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
                    path="/events"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <WebhookEvents />
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
