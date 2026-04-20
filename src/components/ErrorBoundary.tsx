import React from "react";
import { reportError } from "@/lib/errorReporter";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error.message, {
      stack: error.stack,
      context: { componentStack: info.componentStack },
    });
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full text-center space-y-4">
            <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
            <h1 className="text-xl font-serif font-semibold">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              The error has been logged. Try reloading the page.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={this.reset}>Dismiss</Button>
              <Button onClick={() => window.location.reload()}>Reload</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
