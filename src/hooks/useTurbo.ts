import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canAccessTurbo } from "@/lib/plans";

export interface TurboStatus {
  streakDays: number;
  totalWordsWritten: number;
  turboUnlocked: boolean;
  turboWordsRemaining: number;
  turboWordsCapacity: number;
  turboCyclesCompleted: number;
  lastActivityDate: string | null;
  plan: string;
  isLoading: boolean;
}

const STREAK_GOAL = 30;
const WORDS_GOAL = 500000;

export function useTurbo() {
  const { user } = useAuth();
  const [status, setStatus] = useState<TurboStatus>({
    streakDays: 0,
    totalWordsWritten: 0,
    turboUnlocked: false,
    turboWordsRemaining: 0,
    turboWordsCapacity: 50000,
    turboCyclesCompleted: 0,
    lastActivityDate: null,
    plan: "free",
    isLoading: true,
  });

  const fetchStatus = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("streak_days, turbo_unlocked, turbo_words_remaining, turbo_words_capacity, turbo_cycles_completed, last_activity_date, plan")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      setStatus(s => ({ ...s, isLoading: false }));
      return;
    }

    // Sum words written across the past 30 days from turbo_progress
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceISO = since.toISOString().slice(0, 10);

    const { data: progressRows } = await supabase
      .from("turbo_progress")
      .select("words_written, activity_date")
      .eq("user_id", user.id)
      .gte("activity_date", sinceISO);

    const wordsLast30 = (progressRows || []).reduce(
      (sum: number, row: any) => sum + (row.words_written || 0),
      0
    );

    const plan = (data as any).plan || "free";
    // Elite plan: Turbo is auto-enabled with full capacity, bypassing streak/word requirements.
    const isElitePlan = plan === "elite";
    const baseCapacity = (data as any).turbo_words_capacity || 50000;
    const eliteCapacity = Math.max(baseCapacity, 100000);
    setStatus({
      streakDays: (data as any).streak_days || 0,
      totalWordsWritten: wordsLast30,
      turboUnlocked: isElitePlan ? true : ((data as any).turbo_unlocked || false),
      turboWordsRemaining: isElitePlan
        ? eliteCapacity
        : ((data as any).turbo_words_remaining || 0),
      turboWordsCapacity: isElitePlan ? eliteCapacity : baseCapacity,
      turboCyclesCompleted: (data as any).turbo_cycles_completed || 0,
      lastActivityDate: (data as any).last_activity_date || null,
      plan,
      isLoading: false,
    });
  }, [user]);

  // Record a zero-word activity on login to keep streak alive
  const recordLoginActivity = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.rpc("record_writing_activity", {
        _user_id: user.id,
        _words: 0,
        _credits: 0,
      });
      // Refresh status after recording
      await fetchStatus();
    } catch (err) {
      console.error("Login activity recording failed:", err);
    }
  }, [user, fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-record daily login activity
  useEffect(() => {
    if (!user) return;
    const key = `streak_login_${user.id}_${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    recordLoginActivity();
  }, [user, recordLoginActivity]);

  const recordActivity = useCallback(async (words: number, credits: number) => {
    if (!user) return;

    const { data, error } = await supabase.rpc("record_writing_activity", {
      _user_id: user.id,
      _words: words,
      _credits: credits,
    });

    if (!error && data) {
      const result = data as any;
      setStatus(s => ({
        ...s,
        streakDays: result.streak_days,
        totalWordsWritten: s.totalWordsWritten + (words || 0),
        turboUnlocked: result.turbo_unlocked,
        turboWordsRemaining: result.turbo_words_remaining,
        turboWordsCapacity: result.turbo_words_capacity,
      }));
    }
  }, [user]);

  // Plan-gated Turbo access
  const hasTurboPlanAccess = canAccessTurbo(status.plan);
  const canUseAutoDraft = hasTurboPlanAccess && status.turboUnlocked && status.turboWordsRemaining > 0;
  const isElite = status.plan === "elite";

  const streakProgress = Math.min(100, (status.streakDays / STREAK_GOAL) * 100);
  const wordsProgress = Math.min(100, (status.totalWordsWritten / WORDS_GOAL) * 100);
  const turboWordsProgress = status.turboWordsCapacity > 0
    ? Math.min(100, (status.turboWordsRemaining / status.turboWordsCapacity) * 100)
    : 0;

  return {
    ...status,
    hasTurboPlanAccess,
    canUseAutoDraft,
    isElite,
    streakProgress,
    wordsProgress,
    turboWordsProgress,
    recordActivity,
    refreshStatus: fetchStatus,
    STREAK_GOAL,
    WORDS_GOAL,
  };
}
