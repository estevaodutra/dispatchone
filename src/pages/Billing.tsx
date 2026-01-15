import { useState } from "react";
import { PageHeader, AlertBanner } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreditCard, Zap, ArrowUpRight, Download, Calendar, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

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

const plans = [
  { name: "Starter", price: "$49/mo", dispatches: 10000, campaigns: 5, numbers: 20 },
  { name: "Pro", price: "$99/mo", dispatches: 25000, campaigns: 15, numbers: 50 },
  { name: "Enterprise", price: "$299/mo", dispatches: 100000, campaigns: 50, numbers: 200 },
];

export default function Billing() {
  const { toast } = useToast();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [showUpdatePaymentDialog, setShowUpdatePaymentDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUsageAlert, setShowUsageAlert] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  const dispatchPercentage = (currentPlan.dispatches.used / currentPlan.dispatches.limit) * 100;

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate CSV content
    const headers = ["Period", "Dispatches", "Cost"];
    const csvContent = [
      headers.join(","),
      ...usageHistory.map((item) => [item.period, item.dispatches, item.cost].join(",")),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing-history-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsExporting(false);
    toast({
      title: "Export complete",
      description: "Billing history exported to CSV.",
    });
  };

  const handleUpgrade = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setShowUpgradeDialog(false);
    toast({
      title: "Plan upgraded!",
      description: "You've been upgraded to the Enterprise plan.",
    });
  };

  const handleChangePlan = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setShowChangePlanDialog(false);
    toast({
      title: "Plan changed",
      description: `You've switched to the ${selectedPlan} plan.`,
    });
  };

  const handleUpdatePayment = async () => {
    if (!paymentForm.cardNumber || !paymentForm.expiry || !paymentForm.cvc) {
      toast({
        title: "Error",
        description: "Please fill in all card details.",
        variant: "destructive",
      });
      return;
    }
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setShowUpdatePaymentDialog(false);
    setPaymentForm({ cardNumber: "", expiry: "", cvc: "" });
    toast({
      title: "Payment method updated",
      description: "Your new card has been saved.",
    });
  };

  const handleCancelSubscription = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setShowCancelDialog(false);
    toast({
      title: "Subscription cancelled",
      description: "Your subscription will end at the end of the billing period.",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Billing"
        description="Manage your subscription and track usage"
        actions={
          <Button className="gap-2" onClick={() => setShowUpgradeDialog(true)}>
            <ArrowUpRight className="h-4 w-4" />
            Upgrade Plan
          </Button>
        }
      />

      {/* Usage Warning */}
      {dispatchPercentage >= 80 && showUsageAlert && (
        <AlertBanner
          variant="warning"
          title="Approaching Dispatch Limit"
          description={`You've used ${dispatchPercentage.toFixed(0)}% of your monthly dispatch limit. Consider upgrading your plan.`}
          dismissible
          onDismiss={() => setShowUsageAlert(false)}
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
            <Button variant="outline" size="sm" onClick={() => setShowChangePlanDialog(true)}>
              Change Plan
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCancelDialog(true)}>
              Cancel Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage History */}
      <Card className="shadow-elevation-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Usage History</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExporting ? "Exporting..." : "Export"}
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
            <Button variant="outline" size="sm" onClick={() => setShowUpdatePaymentDialog(true)}>
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Enterprise</DialogTitle>
            <DialogDescription>
              Get 100,000 dispatches, 50 campaigns, and 200 numbers for $299/mo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between">
                <span>Dispatches</span>
                <span className="font-medium">100,000/mo</span>
              </div>
              <div className="flex justify-between">
                <span>Campaigns</span>
                <span className="font-medium">50</span>
              </div>
              <div className="flex justify-between">
                <span>Phone Numbers</span>
                <span className="font-medium">200</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Total</span>
                <span className="font-bold">$299/mo</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpgrade} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Upgrade Now"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>Select a new plan for your account.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                  selectedPlan === plan.name
                    ? "border-primary bg-primary/5"
                    : "hover:border-muted-foreground/50"
                } ${plan.name === currentPlan.name ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => plan.name !== currentPlan.name && setSelectedPlan(plan.name)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {plan.dispatches.toLocaleString()} dispatches • {plan.campaigns} campaigns •{" "}
                      {plan.numbers} numbers
                    </p>
                  </div>
                  <span className="font-bold">{plan.price}</span>
                </div>
                {plan.name === currentPlan.name && (
                  <Badge variant="secondary" className="mt-2">
                    Current Plan
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePlan} disabled={isProcessing || !selectedPlan}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Change Plan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Payment Dialog */}
      <Dialog open={showUpdatePaymentDialog} onOpenChange={setShowUpdatePaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Method</DialogTitle>
            <DialogDescription>Enter your new card details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="4242 4242 4242 4242"
                value={paymentForm.cardNumber}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, cardNumber: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={paymentForm.expiry}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, expiry: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  value={paymentForm.cvc}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, cvc: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdatePaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePayment} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Card"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel? Your subscription will remain active until the end
              of the current billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Subscription"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
