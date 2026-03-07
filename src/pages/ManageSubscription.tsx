import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, CreditCard, Receipt, ArrowUpDown, XCircle,
  RefreshCw, Check, Crown, Sparkles, Zap, Download,
  ExternalLink, AlertTriangle, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
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
  current_period_end: string;
  current_period_start: string;
  plan: string;
  price_id: string;
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
  created: string;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
}

const PLANS = [
  { id: "starter", name: "Starter", price: 9, credits: 100, icon: Sparkles },
  { id: "pro", name: "Pro", price: 29, credits: 500, icon: Crown },
  { id: "unlimited", name: "Unlimited", price: 79, credits: null, icon: Crown },
];

const ManageSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [profile, setProfile] = useState<{ plan: string; credits_used: number; credits_limit: number } | null>(null);

  const [changePlanOpen, setChangePlanOpen] = useState(false);
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

  const handleChangePlan = async (newPlan: string) => {
    setActionLoading(newPlan);
    try {
      await invoke("change_plan", { new_plan: newPlan });
      toast({ title: "Plan updated!", description: `You're now on the ${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)} plan.` });
      setChangePlanOpen(false);
      await loadData();
    } catch (err: any) {
      toast({ title: "Failed to change plan", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    setActionLoading("cancel");
    try {
      await invoke("cancel_subscription");
      toast({ title: "Subscription canceled", description: "You'll retain access until the end of your billing period." });
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
      toast({ title: "Subscription reactivated!", description: "Your subscription will continue." });
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
      const data = await invoke("update_payment_method");
      // For payment method update we need Stripe.js — fall back to customer portal for this one action
      const portalData = await supabase.functions.invoke("customer-portal");
      if (portalData.data?.url) {
        window.open(portalData.data.url, "_blank");
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
                            ? `Cancels on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                            : `Renews on ${new Date(subscription!.current_period_end).toLocaleDateString()}`
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
                {/* Credits usage */}
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

                {/* Cancel warning */}
                {subscription?.cancel_at_period_end && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Your subscription is set to cancel. You'll lose access to paid features after the billing period ends.</span>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  {isFree ? (
                    <Button variant="hero" onClick={() => navigate("/plans")}>
                      <Sparkles className="w-4 h-4 mr-2" /> Upgrade Plan
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setChangePlanOpen(true)}>
                        <ArrowUpDown className="w-4 h-4 mr-2" /> Change Plan
                      </Button>
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
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm font-medium">
                              {new Date(inv.created).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{inv.status}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm">
                            ${(inv.amount_paid / 100).toFixed(2)} {inv.currency.toUpperCase()}
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

      {/* Change Plan Dialog */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>
              Select a new plan. Changes take effect immediately with prorated billing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {PLANS.map((plan) => {
              const isCurrentPlan = plan.id === subscription?.plan;
              return (
                <button
                  key={plan.id}
                  disabled={isCurrentPlan || actionLoading === plan.id}
                  onClick={() => handleChangePlan(plan.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left
                    ${isCurrentPlan
                      ? "border-primary/50 bg-primary/5 cursor-default"
                      : "border-border hover:border-primary/30 hover:bg-muted/50 cursor-pointer"
                    } disabled:opacity-60`}
                >
                  <div className="flex items-center gap-3">
                    <plan.icon className={`w-5 h-5 ${isCurrentPlan ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan.credits ? `${plan.credits} credits/mo` : "Unlimited credits"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">${plan.price}/mo</span>
                    {isCurrentPlan && <Badge variant="secondary" className="text-xs">Current</Badge>}
                    {actionLoading === plan.id && <RefreshCw className="w-4 h-4 animate-spin" />}
                  </div>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChangePlanOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of the current billing period
              ({subscription ? new Date(subscription.current_period_end).toLocaleDateString() : ""}). 
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
