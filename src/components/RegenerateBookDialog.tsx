import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface RegenerateBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookTitle: string;
  onConfirm: () => void;
}

export function RegenerateBookDialog({ open, onOpenChange, bookTitle, onConfirm }: RegenerateBookDialogProps) {
  const [confirmTitle, setConfirmTitle] = useState("");

  const isMatch = confirmTitle === bookTitle;

  const handleConfirm = () => {
    if (isMatch) {
      onConfirm();
      setConfirmTitle("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setConfirmTitle(""); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Regenerate Book
          </DialogTitle>
          <DialogDescription>
            This will clear all generated content (outline, chapters, and characters) and allow you to regenerate from scratch. All settings will be preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Type the exact book title to confirm (case-sensitive):
          </p>
          <p className="text-sm font-medium font-serif px-3 py-2 bg-muted rounded-md">
            {bookTitle}
          </p>
          <Input
            value={confirmTitle}
            onChange={(e) => setConfirmTitle(e.target.value)}
            placeholder="Enter book title..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && isMatch) handleConfirm();
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setConfirmTitle(""); }}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!isMatch} onClick={handleConfirm} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
