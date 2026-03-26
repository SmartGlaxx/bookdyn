import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Receipt, RefreshCw, Coins, Download,
  ExternalLink,
} from "lucide-react";
import PricingModal from "@/components/PricingModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPlanDisplayName } from "@/lib/plans";

interface InvoiceData {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  created: string | null;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
}

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
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [profile, setProfile] = useState<{ credits_used: number; credits_limit: number } | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [invoiceRes, profileRes] = await Promise.all([
        supabase.functions.invoke("manage-subscription", {
          body: { action: "list_invoices" },
        }),
        supabase.from("profiles").select("credits_used, credits_limit").eq("id", user.id).single(),
      ]);
      setInvoices(invoiceRes.data?.invoices || []);
      if (profileRes.data) setProfile(profileRes.data);
    } catch (err: any) {
      toast({ title: "Error loading data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // After returning from credit purchase checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("credits_purchased")) {
      window.history.replaceState({}, "", "/manage-subscription");
      loadData();
    }
  }, []);

  const remainingCredits = profile ? Math.max(0, profile.credits_limit - profile.credits_used) : 0;
  const creditsPercent = profile
    ? Math.min(100, (profile.credits_used / profile.credits_limit) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-3">
          <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          <span className="text-lg font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-serif font-bold">Billing & Credits</h1>
            <p className="text-sm text-muted-foreground">Manage your credits and view purchase history</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Credits Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Coins className="w-6 h-6 text-primary" />
                    <div>
                      <CardTitle className="text-xl">Your Credits</CardTitle>
                      <CardDescription>
                        Pay as you go — 5 free credits/month + buy more anytime
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {remainingCredits}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Credits used</span>
                      <span className="text-foreground font-medium">
                        {profile.credits_used} / {profile.credits_limit}
                      </span>
                    </div>
                    <Progress value={creditsPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      1 credit = 1,000 words · $1 = 10 credits · Purchased credits never expire
                    </p>
                  </div>
                )}

                <Button variant="hero" onClick={() => setPricingOpen(true)} className="w-full sm:w-auto">
                  <Coins className="w-4 h-4 mr-2" /> Buy More Credits
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Purchase History */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-muted-foreground" /> Purchase History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No purchases yet</p>
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

      <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
    </div>
  );
};

export default ManageSubscription;