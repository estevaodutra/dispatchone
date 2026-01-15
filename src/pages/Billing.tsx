import { PageHeader, UsageMeter, AlertBanner } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Zap, ArrowUpRight, Download, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Mock data
const currentPlan = {
  name: "Pro",
  price: "$99/mo",
  renewalDate: "Feb 15, 2025",
  dispatches: { used: 18420, limit: 25000 },
  campaigns: { used: 8, limit: 15 },
  numbers: { used: 42, limit: 50 },
};

const usageHistory = [
  { period: "January 2025", dispatches: 18420, cost: "$73.68" },
  { period: "December 2024", dispatches: 24100, cost: "$96.40" },
  { period: "November 2024", dispatches: 19500, cost: "$78.00" },
  { period: "October 2024", dispatches: 15200, cost: "$60.80" },
];

export default function Billing() {
  const dispatchPercentage = (currentPlan.dispatches.used / currentPlan.dispatches.limit) * 100;

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Billing"
        description="Manage your subscription and track usage"
        actions={
          <Button className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Upgrade Plan
          </Button>
        }
      />

      {/* Usage Warning */}
      {dispatchPercentage >= 80 && (
        <AlertBanner
          variant="warning"
          title="Approaching Dispatch Limit"
          description={`You've used ${dispatchPercentage.toFixed(0)}% of your monthly dispatch limit. Consider upgrading your plan.`}
          dismissible
        />
      )}

      {/* Current Plan */}
      <Card className="shadow-elevation-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{currentPlan.name} Plan</CardTitle>
                <p className="text-sm text-muted-foreground">{currentPlan.price}</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              Renews {currentPlan.renewalDate}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Meters */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dispatches</span>
                <span className="font-mono font-medium">
                  {currentPlan.dispatches.used.toLocaleString()} / {currentPlan.dispatches.limit.toLocaleString()}
                </span>
              </div>
              <Progress value={dispatchPercentage} className="h-2" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Campaigns</span>
                <span className="font-mono font-medium">
                  {currentPlan.campaigns.used} / {currentPlan.campaigns.limit}
                </span>
              </div>
              <Progress
                value={(currentPlan.campaigns.used / currentPlan.campaigns.limit) * 100}
                className="h-2"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Phone Numbers</span>
                <span className="font-mono font-medium">
                  {currentPlan.numbers.used} / {currentPlan.numbers.limit}
                </span>
              </div>
              <Progress
                value={(currentPlan.numbers.used / currentPlan.numbers.limit) * 100}
                className="h-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" size="sm">
              Change Plan
            </Button>
            <Button variant="ghost" size="sm">
              Cancel Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage History */}
      <Card className="shadow-elevation-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Usage History</CardTitle>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {usageHistory.map((item, index) => (
              <div
                key={item.period}
                className={`flex items-center justify-between py-3 ${
                  index !== usageHistory.length - 1 ? "border-b" : ""
                }`}
              >
                <div>
                  <p className="font-medium">{item.period}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.dispatches.toLocaleString()} dispatches
                  </p>
                </div>
                <span className="font-mono font-semibold">{item.cost}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card className="shadow-elevation-sm">
        <CardHeader>
          <CardTitle className="text-base">Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">•••• •••• •••• 4242</p>
                <p className="text-sm text-muted-foreground">Expires 12/26</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Update
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
