import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, CreditCard, Receipt, ArrowUpDown, XCircle,
  RefreshCw, Crown, Sparkles, Zap, Download,
  ExternalLink, AlertTriangle, RotateCcw,
} from "lucide-react";
import PricingModal from "@/components/PricingModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionData {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  current_period_start: string | null;
  plan: string;
  price_id: string;
  pending_plan?: string | null;
  pending_plan_at?: string | null;
}

interface PaymentMethodData {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface InvoiceData {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  created: string | null;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
}

const PLANS = [
  { id: "starter", name: "Starter", price: 9, credits: 100, icon: Sparkles },
  { id: "pro", name: "Pro", price: 29, credits: 500, icon: Crown },
  { id: "unlimited", name: "Unlimited", price: 79, credits: null, icon: Crown },
];

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "N/A";
  }
}

const ManageSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [profile, setProfile] = useState<{ plan: string; credits_used: number; credits_limit: number; pending_plan?: string | null; pending_plan_at?: string | null } | null>(null);

  const [pricingOpen, setPricingOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const invoke = useCallback(async (action: string, params: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("manage-subscription", {
      body: { action, ...params },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [subData, invoiceData, profileRes] = await Promise.all([
        invoke("get_subscription"),
        invoke("list_invoices"),
        supabase.from("profiles").select("plan, credits_used, credits_limit").eq("id", user.id).single(),
      ]);
      setSubscription(subData.subscription);
      setPaymentMethod(subData.payment_method);
      setInvoices(invoiceData.invoices || []);
      if (profileRes.data) setProfile(profileRes.data);
    } catch (err: any) {
      toast({ title: "Error loading subscription", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, invoke, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // After returning from Stripe portal/checkout, refresh data and check subscription
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("updated") === "true" || params.get("checkout") === "success") {
      // Clean up URL
      window.history.replaceState({}, "", "/manage-subscription");
      // Trigger check-subscription to sync profile from Stripe
      const syncPlan = async () => {
        try {
          await supabase.functions.invoke("check-subscription");
        } catch {}
        // Reload local data after sync
        await loadData();
      };
      syncPlan();
    }
  }, []);

  const handleCancel = async () => {
    setActionLoading("cancel");
    try {
      const result = await invoke("cancel_subscription");
      const effectiveDate = formatDate(result.effective_date);
      toast({
        title: "Subscription canceled",
        description: `You'll retain access until ${effectiveDate}. After that, you'll move to the Free plan.`,
      });
      setCancelOpen(false);
      await loadData();
    } catch (err: any) {
      toast({ title: "Failed to cancel", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    setActionLoading("reactivate");
    try {
      await invoke("reactivate_subscription");
      toast({ title: "Subscription reactivated!", description: "Your subscription will continue as normal." });
      await loadData();
    } catch (err: any) {
      toast({ title: "Failed to reactivate", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePayment = async () => {
    setActionLoading("payment");
    try {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "open_portal" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        toast({ title: "Unable to open payment settings", description: "Please try again later.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const currentPlan = PLANS.find(p => p.id === (subscription?.plan || profile?.plan));
  const isUnlimited = currentPlan?.id === "unlimited";
  const creditsPercent = profile && !isUnlimited
    ? Math.min(100, (profile.credits_used / profile.credits_limit) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-3">
          <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          <span className="text-lg font-medium">Loading subscription...</span>
        </div>
      </div>
    );
  }

  const isFree = !subscription || profile?.plan === "free";
  const hasPendingDowngrade = !!subscription?.pending_plan;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-serif font-bold">Manage Subscription</h1>
            <p className="text-sm text-muted-foreground">View and manage your plan, billing, and payment details</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Current Plan Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentPlan ? <currentPlan.icon className="w-6 h-6 text-primary" /> : <Zap className="w-6 h-6 text-muted-foreground" />}
                    <div>
                      <CardTitle className="text-xl">{currentPlan?.name || "Free"} Plan</CardTitle>
                      <CardDescription>
                        {isFree ? "No active subscription" : (
                          subscription?.cancel_at_period_end
                            ? `Cancels on ${formatDate(subscription.current_period_end)}`
                            : `Renews on ${formatDate(subscription?.current_period_end)}`
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-serif font-bold">${currentPlan?.price || 0}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Credits used this period</span>
                      <Badge variant="secondary">
                        {isUnlimited ? "∞" : `${profile.credits_used}/${profile.credits_limit}`}
                      </Badge>
                    </div>
                    {!isUnlimited && (
                      <Progress value={creditsPercent} className="h-2" />
                    )}
                  </div>
                )}

                {subscription?.cancel_at_period_end && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Your subscription is set to cancel on {formatDate(subscription.current_period_end)}.
                      You'll lose access to paid features after that date.
                    </span>
                  </div>
                )}

                {hasPendingDowngrade && !subscription?.cancel_at_period_end && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-foreground text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
                    <span>
                      Switching to <strong className="capitalize">{subscription?.pending_plan}</strong> on {formatDate(subscription?.pending_plan_at)}.
                      You keep full access until then.
                    </span>
                  </div>
                )}

                <Separator />

                <div className="flex flex-wrap gap-3">
                  <Button variant={isFree ? "hero" : "outline"} onClick={() => setPricingOpen(true)}>
                    {isFree ? (
                      <><Sparkles className="w-4 h-4 mr-2" /> Upgrade Plan</>
                    ) : (
                      <><ArrowUpDown className="w-4 h-4 mr-2" /> Change Plan</>
                    )}
                  </Button>
                  {!isFree && (
                    <>
                      {subscription?.cancel_at_period_end ? (
                        <Button variant="outline" onClick={handleReactivate} disabled={actionLoading === "reactivate"}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          {actionLoading === "reactivate" ? "Reactivating..." : "Reactivate"}
                        </Button>
                      ) : (
                        <Button variant="ghost" className="text-destructive" onClick={() => setCancelOpen(true)}>
                          <XCircle className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Method Card */}
          {!isFree && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-muted-foreground" /> Payment Method
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleUpdatePayment} disabled={actionLoading === "payment"}>
                      {actionLoading === "payment" ? "Opening..." : "Update"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {paymentMethod ? (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <CreditCard className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{paymentMethod.brand} •••• {paymentMethod.last4}</p>
                        <p className="text-sm text-muted-foreground">Expires {paymentMethod.exp_month}/{paymentMethod.exp_year}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No payment method on file</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Billing History */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-muted-foreground" /> Billing History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoices yet</p>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{formatDate(inv.created)}</p>
                          <p className="text-xs text-muted-foreground capitalize">{inv.status}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm">
                            ${(inv.amount_paid / 100).toFixed(2)} {inv.currency?.toUpperCase()}
                          </span>
                          {inv.invoice_pdf && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          {inv.hosted_invoice_url && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Pricing Modal (replaces old upgrade + change plan dialogs) */}
      <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />

      {/* Cancel Confirmation */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until {formatDate(subscription?.current_period_end)}.
              After that, you'll be moved to the Free plan with 5 credits/month.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={actionLoading === "cancel"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading === "cancel" ? "Canceling..." : "Yes, Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageSubscription;
