import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Search, Copy, Shield, History, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const ADMIN_EMAILS = ["mailsmartcodes@gmail.com"];

interface UserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

interface OverrideRow {
  id: string;
  admin_email: string;
  target_email: string;
  reason: string | null;
  created_at: string;
}

export default function AdminUsers() {
  const { user, loading } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [target, setTarget] = useState<UserRow | null>(null);
  const [reason, setReason] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email ?? "");

  const search = useCallback(async () => {
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "search", query },
      });
      if (error) throw error;
      setUsers(data as UserRow[]);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  }, [query]);

  const fetchOverrides = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_overrides", limit: 100 },
      });
      if (error) throw error;
      setOverrides(data as OverrideRow[]);
    } catch {
      toast.error("Failed to load history");
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      search();
      fetchOverrides();
    }
  }, [isAdmin, search, fetchOverrides]);

  const generateOverride = async () => {
    if (!target) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "override_link",
          email: target.email,
          reason: reason || null,
          redirectTo: `${window.location.origin}/admin/override-callback`,
        },
      });
      if (error) throw error;
      setGeneratedLink((data as { link: string }).link);
      fetchOverrides();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to generate link");
    } finally {
      setGenerating(false);
    }
  };

  const closeDialog = () => {
    setTarget(null);
    setReason("");
    setGeneratedLink(null);
  };

  const copyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    toast.success("Link copied");
  };

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div>
            <h1 className="text-2xl font-serif font-bold">User Administration</h1>
            <p className="text-sm text-muted-foreground">
              Search users and generate one-time admin override links for support.
            </p>
          </div>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users"><Shield className="w-4 h-4 mr-1" />Users</TabsTrigger>
            <TabsTrigger value="history"><History className="w-4 h-4 mr-1" />Override History</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 mt-4">
            <form
              onSubmit={(e) => { e.preventDefault(); search(); }}
              className="flex gap-2"
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by email…"
                className="flex-1"
              />
              <Button type="submit" disabled={searching}>
                <Search className="w-4 h-4 mr-1" /> Search
              </Button>
            </form>

            <div className="space-y-2">
              {users.length === 0 && !searching && (
                <div className="text-center py-12 text-muted-foreground">No users found.</div>
              )}
              {users.map((u) => (
                <div key={u.id} className="rounded-lg border p-3 flex items-center justify-between gap-3 bg-card">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{u.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{u.id}</div>
                    <div className="text-xs text-muted-foreground">
                      Joined {new Date(u.created_at).toLocaleDateString()} ·
                      {" "}Last seen {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "never"}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setTarget(u)}>
                    <Shield className="w-3.5 h-3.5 mr-1" /> Override
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-2 mt-4">
            {overrides.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No overrides yet.</div>
            ) : (
              overrides.map((o) => (
                <div key={o.id} className="rounded-lg border p-3 bg-card text-sm">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-medium">{o.target_email}</span>
                    <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">By {o.admin_email}</div>
                  {o.reason && <div className="text-xs mt-1 italic">"{o.reason}"</div>}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!target} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Admin Override Link</DialogTitle>
              <DialogDescription>
                This creates a one-time sign-in link for <span className="font-medium">{target?.email}</span>.
                Open it in a private window. The action is logged.
              </DialogDescription>
            </DialogHeader>

            {!generatedLink ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Reason (logged)</label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. User reported failed payment, investigating book #abc123"
                    className="mt-1"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border p-2 bg-muted/30 break-all text-xs font-mono">
                  {generatedLink}
                </div>
                <p className="text-xs text-muted-foreground">
                  Single-use. Open in incognito to avoid replacing your own session.
                </p>
              </div>
            )}

            <DialogFooter>
              {!generatedLink ? (
                <>
                  <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
                  <Button onClick={generateOverride} disabled={generating}>
                    {generating ? "Generating…" : "Generate Link"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={copyLink}>
                    <Copy className="w-4 h-4 mr-1" /> Copy
                  </Button>
                  <Button asChild>
                    <a href={generatedLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" /> Open
                    </a>
                  </Button>
                  <Button variant="ghost" onClick={closeDialog}>Done</Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
