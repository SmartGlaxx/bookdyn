import { motion } from "framer-motion";
import { BookOpen, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const CheckEmail = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex items-center justify-center gap-3 mb-10">
          <div
            style={{
              padding: 8,
              borderRadius: 10,
              background: "hsla(35,92%,55%,0.12)",
              display: "flex",
            }}
          >
            <BookOpen size={20} color="var(--primary)" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-2xl">Authoryti</h1>
            <p className="text-xs text-muted-foreground">AI-Powered Book Creation</p>
          </div>
        </div>

        <Card className="border-border/50 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Mail className="w-12 h-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-serif">Check Your Email</CardTitle>
            <CardDescription className="text-base leading-relaxed mt-2">
              We've sent a confirmation link to your email address. Please click the link to verify your account and get
              started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-sm text-muted-foreground text-center">
                Didn't receive the email? Check your spam folder or try signing up again.
              </p>
            </div>
            <Button className="w-full h-11" variant="outline" onClick={() => navigate("/auth")}>
              Back to Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default CheckEmail;
