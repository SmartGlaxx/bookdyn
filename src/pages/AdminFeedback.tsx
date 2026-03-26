import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Star, Check, X, Filter, ArrowLeft, MessageSquare, Bug, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ADMIN_EMAILS = ["mailsmartcodes@gmail.com"];

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  bug: { label: "Bug Report", icon: <Bug className="w-3.5 h-3.5" />, color: "bg-red-500/10 text-red-500 border-red-500/20" },
  feature: { label: "Feature Request", icon: <Sparkles className="w-3.5 h-3.5" />, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  general: { label: "General", icon: <MessageSquare className="w-3.5 h-3.5" />, color: "bg-green-500/10 text-green-500 border-green-500/20" },
  testimonial: { label: "Testimonial", icon: <Star className="w-3.5 h-3.5" />, color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  other: { label: "Other", icon: <FileText className="w-3.5 h-3.5" />, color: "bg-muted text-muted-foreground border-border" },
};

interface Feedback {
  id: string;
  user_id: string;
  email: string | null;
  rating: number;
  category: string;
  message: string;
  created_at: string;
  reviewed: boolean;
}

export default function AdminFeedback() {
  const { user, loading } = useAuth();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRating, setFilterRating] = useState("all");

  const isAdmin = user && ADMIN_EMAILS.includes(user.email ?? "");

  const fetchFeedback = useCallback(async () => {
    if (!isAdmin) return;
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-feedback", {
        body: { action: "list" },
      });
      if (error) throw error;
      setFeedback(data as Feedback[]);
    } catch {
      toast.error("Failed to load feedback");
    } finally {
      setFetching(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const toggleReviewed = async (id: string, currentlyReviewed: boolean) => {
    const action = currentlyReviewed ? "mark_unreviewed" : "mark_reviewed";
    try {
      const { error } = await supabase.functions.invoke("admin-feedback", {
        body: { action, feedbackId: id },
      });
      if (error) throw error;
      setFeedback((prev) =>
        prev.map((f) => (f.id === id ? { ...f, reviewed: !currentlyReviewed } : f))
      );
    } catch {
      toast.error("Failed to update");
    }
  };

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const filtered = feedback.filter((f) => {
    if (filterCategory !== "all" && f.category !== filterCategory) return false;
    if (filterStatus === "reviewed" && !f.reviewed) return false;
    if (filterStatus === "unreviewed" && f.reviewed) return false;
    if (filterRating !== "all" && f.rating !== Number(filterRating)) return false;
    return true;
  });

  const stats = {
    total: feedback.length,
    unreviewed: feedback.filter((f) => !f.reviewed).length,
    avgRating: feedback.length
      ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
      : "—",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-serif font-bold">Feedback Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {stats.total} total · {stats.unreviewed} unreviewed · ⭐ {stats.avgRating} avg
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchFeedback} disabled={fetching}>
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="bug">🐛 Bug</SelectItem>
              <SelectItem value="feature">✨ Feature</SelectItem>
              <SelectItem value="general">💬 General</SelectItem>
              <SelectItem value="testimonial">⭐ Testimonial</SelectItem>
              <SelectItem value="other">📝 Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unreviewed">Unreviewed</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              {[5, 4, 3, 2, 1].map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {"⭐".repeat(r)} {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Feedback list */}
        {fetching ? (
          <div className="text-center py-12 text-muted-foreground">Loading feedback...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No feedback matches your filters.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((f) => {
              const cat = CATEGORY_META[f.category] ?? CATEGORY_META.other;
              return (
                <div
                  key={f.id}
                  className={`rounded-lg border p-4 space-y-2 transition-colors ${
                    f.reviewed ? "opacity-60 bg-muted/30" : "bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cat.color}>
                        {cat.icon}
                        <span className="ml-1">{cat.label}</span>
                      </Badge>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= f.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
                            }`}
                          />
                        ))}
                      </div>
                      {f.reviewed && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="w-3 h-3 mr-1" /> Reviewed
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant={f.reviewed ? "ghost" : "default"}
                      size="sm"
                      onClick={() => toggleReviewed(f.id, f.reviewed)}
                      className="shrink-0"
                    >
                      {f.reviewed ? (
                        <>
                          <X className="w-3.5 h-3.5 mr-1" /> Undo
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" /> Mark Reviewed
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{f.message}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{f.email ?? "No email"}</span>
                    <span>·</span>
                    <span>{new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
