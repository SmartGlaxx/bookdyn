import { useState, useCallback, lazy, Suspense } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Mail, Lock, ArrowRight, Sparkles, CheckCircle, Star, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTurnstile } from "@/hooks/useTurnstile";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { TURNSTILE_SITE_KEY } from "@/lib/security";

const GlowingSphereScene = lazy(() => import("@/components/3d/GlowingSphere"));

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const Auth = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("mode") === "signup" ? false : true;

  // Persist plan selection from marketing site for post-signup checkout
  const planParam = searchParams.get("plan");
  if (planParam && ["starter", "pro", "unlimited"].includes(planParam)) {
    sessionStorage.setItem("pending_plan", planParam);
  }

  const [isLogin, setIsLogin] = useState(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const onTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);
  const onTurnstileError = useCallback(() => setTurnstileToken(null), []);
  const onTurnstileExpire = useCallback(() => setTurnstileToken(null), []);

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

  if (user) return <Navigate to="/dashboard" replace />;

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
      return true;
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
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
    if (!isLogin) {
      if (!fullName.trim()) {
        toast({ title: "Missing name", description: "Please enter your full name.", variant: "destructive" });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Passwords don't match", description: "Please make sure your passwords match.", variant: "destructive" });
        return;
      }
    }
    const verified = await verifyTurnstile();
    if (!verified) return;
    setIsSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        else toast({ title: "Welcome back!", description: "You've successfully signed in." });
      } else {
        const { data, error } = await signUp(email, password, fullName);
        if (error) toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        else if (data?.user && !data.session) {
          window.location.href = "/check-email";
        }
        else toast({ title: "Account created!", description: "Welcome to Authoryti!" });
      }
    } finally {
      setIsSubmitting(false);
      resetTurnstile();
      setTurnstileToken(null);
    }
  };

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Left panel — 3D + branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />

        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-12">
          <div className="w-full h-[400px] mb-8">
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="w-24 h-24 rounded-full bg-primary/20 animate-pulse-glow" /></div>}>
              <GlowingSphereScene variant="auth" />
            </Suspense>
          </div>

          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-3xl font-serif font-bold">
              Create Books with <span className="text-gradient">AI Power</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Join thousands of writers using Authoryti to turn ideas into complete, professionally structured books.
            </p>
            <div className="mt-8 p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50">
              <div className="flex gap-1 mb-2 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground italic">"Authoryti turned my rough ideas into a complete novel outline in minutes."</p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">— Sarah Chen, Self-Published Author</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent glow">
              <BookOpen className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl">Authoryti</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Book Creation</p>
            </div>
          </div>

          <Card className="border-border/50 shadow-lg bg-card/80 backdrop-blur-sm">
            {showVerification ? (
              <>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full bg-success/10">
                      <CheckCircle className="w-12 h-12 text-success" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-serif">Check Your Email</CardTitle>
                  <CardDescription>
                    We've sent a verification link to <strong>{email}</strong>. Please click the link to verify your account before signing in.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline" onClick={() => { setShowVerification(false); setIsLogin(true); }}>
                    Back to Sign In
                  </Button>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="space-y-1 text-center pb-2">
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
                      <CardDescription className="mt-2">
                        {isForgotPassword
                          ? "Enter your email to receive a reset link"
                          : isLogin
                            ? "Sign in to continue your book projects"
                            : "Start creating AI-powered books today"}
                      </CardDescription>
                    </motion.div>
                  </AnimatePresence>
                </CardHeader>
                <CardContent className="pt-4">
                  {isForgotPassword ? (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" autoComplete="email" />
                        </div>
                      </div>
                      <div ref={turnstileRef} className="flex justify-center box-border overflow-hidden max-w-full" />
                      <Button type="submit" className="w-full h-11" variant="hero" disabled={isSubmitting}>
                        {isSubmitting ? "Sending..." : "Send Reset Link"}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      <div className="text-center">
                        <button type="button" onClick={() => setIsForgotPassword(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          Back to <span className="text-primary font-medium">Sign In</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {/* Google Sign-In */}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 mb-4"
                        onClick={handleGoogleSignIn}
                      >
                        <GoogleIcon />
                        {isLogin ? "Sign in with Google" : "Sign up with Google"}
                      </Button>

                      <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name — signup only */}
                        {!isLogin && (
                          <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input id="fullName" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-11" autoComplete="name" />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" autoComplete="email" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            {isLogin && (
                              <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-primary hover:text-primary/80 transition-colors">
                                Forgot password?
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" autoComplete={isLogin ? "current-password" : "new-password"} />
                          </div>
                        </div>

                        {/* Confirm Password — signup only */}
                        {!isLogin && (
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-11" autoComplete="new-password" />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-center w-full overflow-hidden"><div ref={turnstileRef} className="shrink-0" style={{ width: 'min(100%, 300px)', transform: 'scale(0.82)', transformOrigin: 'center top' }} /></div>

                        <Button type="submit" className="w-full h-11" variant="hero" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <span className="flex items-center gap-2">
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
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
                        <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          {isLogin ? (
                            <>Don't have an account?{" "}<span className="text-primary font-medium">Sign up</span></>
                          ) : (
                            <>Already have an account?{" "}<span className="text-primary font-medium">Sign in</span></>
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
    </div>
  );
};

export default Auth;
