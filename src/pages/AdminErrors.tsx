import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Trash2, AlertTriangle, Server, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { isAdminEmail } from "@/lib/admin";

interface ErrorRow {
  id: string;
  source: "frontend" | "edge_function";
  function_name: string | null;
  user_id: string | null;
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function AdminErrors() {
  const { user, loading } = useAuth();
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [source, setSource] = useState<"all" | "frontend" | "edge_function">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email ?? "");

  const fetchErrors = useCallback(async () => {
    if (!isAdmin) return;
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-errors", {
        body: { action: "list", source, limit: 200 },
      });
      if (error) throw error;
      setErrors(data as ErrorRow[]);
    } catch {
      toast.error("Failed to load errors");
    } finally {
      setFetching(false);
    }
  }, [isAdmin, source]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const purgeOld = async () => {
    if (!confirm("Delete error logs older than 30 days?")) return;
    try {
      const { error } = await supabase.functions.invoke("admin-errors", {
        body: { action: "delete_old", days: 30 },
      });
      if (error) throw error;
      toast.success("Old logs purged");
      fetchErrors();
    } catch {
      toast.error("Purge failed");
    }
  };

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-serif font-bold">Error Logs</h1>
              <p className="text-sm text-muted-foreground">
                {errors.length} entries · backend + frontend uncaught errors
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="frontend">Frontend</SelectItem>
                <SelectItem value="edge_function">Edge Functions</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchErrors} disabled={fetching}>
              <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={purgeOld}>
              <Trash2 className="w-4 h-4 mr-1" /> Purge 30d+
            </Button>
          </div>
        </div>

        {fetching ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : errors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
            <AlertTriangle className="w-8 h-8 opacity-30" />
            No errors logged.
          </div>
        ) : (
          <div className="space-y-2">
            {errors.map((e) => {
              const isOpen = expanded === e.id;
              return (
                <div key={e.id} className="rounded-lg border bg-card">
                  <button
                    onClick={() => setExpanded(isOpen ? null : e.id)}
                    className="w-full text-left p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={
                        e.source === "frontend"
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                      }>
                        {e.source === "frontend" ? <Monitor className="w-3 h-3 mr-1" /> : <Server className="w-3 h-3 mr-1" />}
                        {e.source === "frontend" ? "Frontend" : "Edge"}
                      </Badge>
                      {e.function_name && (
                        <Badge variant="secondary" className="text-xs">{e.function_name}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(e.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-mono mt-1.5 break-words line-clamp-2">{e.message}</p>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2 text-xs">
                      {e.url && <div><span className="text-muted-foreground">URL: </span><span className="font-mono break-all">{e.url}</span></div>}
                      {e.user_id && <div><span className="text-muted-foreground">User: </span><span className="font-mono">{e.user_id}</span></div>}
                      {e.user_agent && <div className="text-muted-foreground truncate">UA: {e.user_agent}</div>}
                      {e.stack && (
                        <pre className="bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap text-[11px] font-mono max-h-64 overflow-y-auto">{e.stack}</pre>
                      )}
                      {e.context && Object.keys(e.context).length > 0 && (
                        <pre className="bg-muted/50 rounded p-2 overflow-x-auto text-[11px] font-mono">{JSON.stringify(e.context, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
