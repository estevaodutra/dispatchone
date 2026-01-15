import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Mock data
interface Alert {
  id: string;
  severity: "info" | "warning" | "error" | "success";
  title: string;
  description: string;
  entity: string;
  timestamp: string;
  read: boolean;
}

const mockAlerts: Alert[] = [
  {
    id: "1",
    severity: "error",
    title: "High Failure Rate Detected",
    description: "Campaign 'Summer Promo 2025' exceeded 5% failure threshold",
    entity: "Campaign: Summer Promo 2025",
    timestamp: "5 min ago",
    read: false,
  },
  {
    id: "2",
    severity: "warning",
    title: "Number Entering Warming Period",
    description: "Number +55 21 99876-5432 has been moved to warming status",
    entity: "Number: +55 21 99876-5432",
    timestamp: "15 min ago",
    read: false,
  },
  {
    id: "3",
    severity: "warning",
    title: "Provider Response Degraded",
    description: "Z-API response times increased by 40%",
    entity: "Provider: Z-API",
    timestamp: "32 min ago",
    read: true,
  },
  {
    id: "4",
    severity: "info",
    title: "Campaign Completed",
    description: "Campaign 'Holiday Offers' finished with 96.5% success rate",
    entity: "Campaign: Holiday Offers",
    timestamp: "1 hour ago",
    read: true,
  },
  {
    id: "5",
    severity: "success",
    title: "Provider Recovered",
    description: "Evolution API health restored to normal levels",
    entity: "Provider: Evolution API",
    timestamp: "2 hours ago",
    read: true,
  },
  {
    id: "6",
    severity: "error",
    title: "Number Banned",
    description: "Number +55 41 91234-8765 was banned by WhatsApp",
    entity: "Number: +55 41 91234-8765",
    timestamp: "5 hours ago",
    read: true,
  },
];

const severityConfig = {
  info: {
    icon: Info,
    bgClass: "bg-info/10",
    iconClass: "text-info",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-warning/10",
    iconClass: "text-warning",
  },
  error: {
    icon: AlertCircle,
    bgClass: "bg-error/10",
    iconClass: "text-error",
  },
  success: {
    icon: CheckCircle,
    bgClass: "bg-success/10",
    iconClass: "text-success",
  },
};

export default function Alerts() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");

  const filteredAlerts = mockAlerts.filter((alert) => {
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    const matchesRead =
      readFilter === "all" ||
      (readFilter === "unread" && !alert.read) ||
      (readFilter === "read" && alert.read);
    return matchesSeverity && matchesRead;
  });

  const unreadCount = mockAlerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Alerts"
        description="System notifications and critical alerts"
        actions={
          <Button variant="outline" size="sm">
            Mark All as Read
          </Button>
        }
      />

      {/* Unread badge */}
      {unreadCount > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="destructive" className="rounded-full px-2 py-0.5">
            {unreadCount}
          </Badge>
          <span className="text-muted-foreground">unread alerts</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="success">Success</SelectItem>
          </SelectContent>
        </Select>
        <Select value={readFilter} onValueChange={setReadFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length > 0 ? (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;

            return (
              <Card
                key={alert.id}
                className={`shadow-elevation-sm transition-all hover:shadow-elevation-md ${
                  !alert.read ? "border-l-2 border-l-primary" : ""
                }`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`rounded-full p-2 ${config.bgClass}`}>
                    <Icon className={`h-4 w-4 ${config.iconClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className={`font-medium ${!alert.read ? "" : "text-muted-foreground"}`}>
                          {alert.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-0.5">{alert.description}</p>
                        <Badge variant="secondary" className="mt-2 text-xs font-normal">
                          {alert.entity}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {alert.timestamp}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title="No alerts"
          description="You're all caught up! No alerts match your current filters."
        />
      )}
    </div>
  );
}
