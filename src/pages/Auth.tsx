import { useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Mail, Lock, ArrowRight, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTurnstile } from "@/hooks/useTurnstile";
import { supabase } from "@/integrations/supabase/client";
import { TURNSTILE_SITE_KEY } from "@/lib/security";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();

  const onTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const onTurnstileError = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const onTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const { containerRef: turnstileRef, reset: resetTurnstile } = useTurnstile({
    siteKey: TURNSTILE_SITE_KEY,
    onVerify: onTurnstileVerify,
    onError: onTurnstileError,
    onExpire: onTurnstileExpire,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <span className="text-lg font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const verifyTurnstile = async (): Promise<boolean> => {
    if (!turnstileToken) {
      toast({ title: "Verification required", description: "Please complete the security check.", variant: "destructive" });
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke("verify-turnstile", {
        body: { token: turnstileToken },
      });

      if (error || !data?.success) {
        toast({ title: "Verification failed", description: "Please try again.", variant: "destructive" });
        resetTurnstile();
        setTurnstileToken(null);
        return false;
      }
      return true;
    } catch {
      // If verification service is down, allow through (fail open for UX)
      return true;
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Missing email", description: "Please enter your email address.", variant: "destructive" });
      return;
    }

    const verified = await verifyTurnstile();
    if (!verified) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: "Reset failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "We've sent you a password reset link." });
        setIsForgotPassword(false);
      }
    } finally {
      setIsSubmitting(false);
      resetTurnstile();
      setTurnstileToken(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast({ title: "Missing fields", description: "Please enter both email and password.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    const verified = await verifyTurnstile();
    if (!verified) return;

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Welcome back!", description: "You've successfully signed in." });
        }
      } else {
        const { data, error } = await signUp(email, password);
        if (error) {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        } else if (data?.user && !data.session) {
          setShowVerification(true);
        } else {
          toast({ title: "Account created!", description: "You can now start creating books." });
        }
      }
    } finally {
      setIsSubmitting(false);
      resetTurnstile();
      setTurnstileToken(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent glow">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="font-serif font-bold text-2xl">BookForge</h1>
            <p className="text-xs text-muted-foreground">AI Book Creation Engine</p>
          </div>
        </div>

        <Card className="border-border/50 shadow-lg">
          {showVerification ? (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <CheckCircle className="w-16 h-16 text-success" />
                </div>
                <CardTitle className="text-2xl font-serif">Check Your Email</CardTitle>
                <CardDescription>
                  We've sent a verification link to <strong>{email}</strong>. Please click the link to verify your account before signing in.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => { setShowVerification(false); setIsLogin(true); }}
                >
                  Back to Sign In
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1 text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isForgotPassword ? "forgot" : isLogin ? "login" : "signup"}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardTitle className="text-2xl font-serif">
                      {isForgotPassword ? "Reset Password" : isLogin ? "Welcome Back" : "Create Account"}
                    </CardTitle>
                    <CardDescription>
                      {isForgotPassword
                        ? "Enter your email to receive a reset link"
                        : isLogin
                          ? "Sign in to continue your book projects"
                          : "Start creating AI-powered books today"}
                    </CardDescription>
                  </motion.div>
                </AnimatePresence>
              </CardHeader>
              <CardContent>
                {isForgotPassword ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    {/* Turnstile rendered below outside conditional */}

                    <Button type="submit" className="w-full" variant="hero" disabled={isSubmitting}>
                      <span className="flex items-center gap-2">
                        {isSubmitting ? "Sending..." : "Send Reset Link"}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </Button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(false)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Back to <span className="text-primary font-medium">Sign In</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10"
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          {isLogin && (
                            <button
                              type="button"
                              onClick={() => setIsForgotPassword(true)}
                              className="text-xs text-primary hover:text-primary/80 transition-colors"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10"
                            autoComplete={isLogin ? "current-password" : "new-password"}
                          />
                        </div>
                      </div>

                      {/* Turnstile widget */}
                      <div ref={turnstileRef} className="flex justify-center" />

                      <Button
                        type="submit"
                        className="w-full"
                        variant="hero"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Sparkles className="w-4 h-4" />
                            </motion.div>
                            {isLogin ? "Signing in..." : "Creating account..."}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            {isLogin ? "Sign In" : "Create Account"}
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </form>

                    <div className="mt-6 text-center">
                      <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isLogin ? (
                          <>
                            Don't have an account?{" "}
                            <span className="text-primary font-medium">Sign up</span>
                          </>
                        ) : (
                          <>
                            Already have an account?{" "}
                            <span className="text-primary font-medium">Sign in</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
