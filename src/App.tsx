import { useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/i18n";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leads = lazy(() => import("./pages/Leads"));
const CampaignsHub = lazy(() => import("./pages/campaigns/CampaignsHub"));
const DispatchCampaigns = lazy(() => import("./pages/campaigns/DispatchCampaigns"));
const GroupCampaignsPage = lazy(() => import("./pages/campaigns/GroupCampaignsPage"));
const PirateCampaigns = lazy(() => import("./pages/campaigns/PirateCampaigns"));
const URACampaigns = lazy(() => import("./pages/campaigns/URACampaigns"));
const CallCampaigns = lazy(() => import("./pages/campaigns/CallCampaigns"));
const PhoneNumbers = lazy(() => import("./pages/PhoneNumbers"));
const Logs = lazy(() => import("./pages/Logs"));
const Instances = lazy(() => import("./pages/Instances"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Billing = lazy(() => import("./pages/Billing"));
const Settings = lazy(() => import("./pages/Settings"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const WebhookEvents = lazy(() => import("./pages/WebhookEvents"));
const Auth = lazy(() => import("./pages/Auth"));
const OperatorScript = lazy(() => import("./pages/OperatorScript"));
const CallPanel = lazy(() => import("./pages/CallPanel"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <LanguageProvider>
          <AuthProvider>
            <CompanyProvider>
              <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
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
              </Suspense>
              </BrowserRouter>
              </TooltipProvider>
            </CompanyProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
