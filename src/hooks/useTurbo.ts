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
const WORDS_GOAL = 100000;

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
      .select("streak_days, total_words_written, turbo_unlocked, turbo_words_remaining, turbo_words_capacity, turbo_cycles_completed, last_activity_date, plan")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      setStatus(s => ({ ...s, isLoading: false }));
      return;
    }

    setStatus({
      streakDays: (data as any).streak_days || 0,
      totalWordsWritten: (data as any).total_words_written || 0,
      turboUnlocked: (data as any).turbo_unlocked || false,
      turboWordsRemaining: (data as any).turbo_words_remaining || 0,
      turboWordsCapacity: (data as any).turbo_words_capacity || 50000,
      turboCyclesCompleted: (data as any).turbo_cycles_completed || 0,
      lastActivityDate: (data as any).last_activity_date || null,
      plan: (data as any).plan || "free",
      isLoading: false,
    });
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

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
        totalWordsWritten: result.total_words_written,
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
