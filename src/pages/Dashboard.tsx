import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, MetricCard } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Send,
  CheckCircle,
  XCircle,
  Phone,
  Megaphone,
  TrendingUp,
  Activity,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

// Mock data for charts
const dispatchTrend = [
  { time: "00:00", sent: 1200, failed: 45 },
  { time: "04:00", sent: 800, failed: 32 },
  { time: "08:00", sent: 2400, failed: 89 },
  { time: "12:00", sent: 3200, failed: 120 },
  { time: "16:00", sent: 2800, failed: 95 },
  { time: "20:00", sent: 1600, failed: 52 },
];

const providerHealth = [
  { name: "Z-API", health: 98, dispatches: 12500 },
  { name: "Evolution", health: 95, dispatches: 8200 },
  { name: "Voice/URA", health: 100, dispatches: 4300 },
];

const recentActivity = [
  { id: 1, type: "dispatch", message: "Campaign 'Summer Promo' sent 1,200 messages", time: "2 min ago", status: "success" },
  { id: 2, type: "alert", message: "Number +55 11 98765-4321 marked as warming", time: "5 min ago", status: "warning" },
  { id: 3, type: "dispatch", message: "Batch #4521 completed with 98.5% delivery", time: "12 min ago", status: "success" },
  { id: 4, type: "error", message: "3 messages failed - Rate limit on Z-API", time: "18 min ago", status: "error" },
  { id: 5, type: "dispatch", message: "Voice campaign 'Reminder Q1' started", time: "25 min ago", status: "success" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleNewCampaign = () => {
    navigate("/campaigns");
    toast({
      title: "Create Campaign",
      description: "Redirecting to campaign creation...",
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRefreshing(false);
    toast({
      title: "Dashboard refreshed",
      description: "All metrics have been updated.",
    });
  };

  const handleViewAll = () => {
    navigate("/logs");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your communication dispatch system"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button className="gap-2" onClick={handleNewCampaign}>
              <Megaphone className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Dispatches"
          value="24,521"
          subtitle="Last 24 hours"
          icon={Send}
          trend={{ value: 12.5, label: "vs yesterday" }}
        />
        <MetricCard
          title="Success Rate"
          value="97.8%"
          subtitle="Delivery confirmed"
          icon={CheckCircle}
          trend={{ value: 2.1, label: "improvement" }}
        />
        <MetricCard
          title="Active Campaigns"
          value="8"
          subtitle="4 WhatsApp, 4 Voice"
          icon={Megaphone}
        />
        <MetricCard
          title="Active Numbers"
          value="42"
          subtitle="3 warming, 2 paused"
          icon={Phone}
          trend={{ value: -1, label: "from last week" }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dispatch Volume Chart */}
        <Card className="lg:col-span-2 shadow-elevation-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Dispatch Volume</CardTitle>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-error" />
                <span className="text-muted-foreground">Failed</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dispatchTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="time"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sent"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    stroke="hsl(var(--error))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Provider Health */}
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Provider Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={providerHealth} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Health"]}
                  />
                  <Bar
                    dataKey="health"
                    fill="hsl(var(--success))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-elevation-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Recent Activity
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" onClick={handleViewAll}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate("/logs")}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    activity.status === "success"
                      ? "bg-success/15 text-success"
                      : activity.status === "warning"
                      ? "bg-warning/15 text-warning"
                      : "bg-error/15 text-error"
                  }`}
                >
                  {activity.status === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : activity.status === "warning" ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{activity.message}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
