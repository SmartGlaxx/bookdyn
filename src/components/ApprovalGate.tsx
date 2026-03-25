import { motion } from "framer-motion";
import { Check, Pencil, RefreshCw, ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApprovalGateProps {
  type: "section" | "chapter" | "outline";
  title: string;
  onApprove: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onExpand?: () => void;
  onAddDialogue?: () => void;
  isProcessing?: boolean;
}

export function ApprovalGate({
  type,
  title,
  onApprove,
  onEdit,
  onRegenerate,
  onExpand,
  onAddDialogue,
  isProcessing = false,
}: ApprovalGateProps) {
  const typeLabel = type === "section" ? "Section" : type === "chapter" ? "Chapter" : "Outline";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <p className="text-sm font-medium">
          {typeLabel} ready for review: <span className="text-primary">{title}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="hero"
          size="sm"
          onClick={onApprove}
          disabled={isProcessing}
        >
          <Check className="w-4 h-4" />
          Approve & Continue
        </Button>

        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit} disabled={isProcessing}>
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
        )}

        {onRegenerate && (
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isProcessing}>
            <RefreshCw className="w-4 h-4" />
            Rewrite
          </Button>
        )}

        {onExpand && (
          <Button variant="ghost" size="sm" onClick={onExpand} disabled={isProcessing}>
            <ArrowRight className="w-4 h-4" />
            Expand
          </Button>
        )}

        {onAddDialogue && (
          <Button variant="ghost" size="sm" onClick={onAddDialogue} disabled={isProcessing}>
            <MessageSquare className="w-4 h-4" />
            Add Dialogue
          </Button>
        )}
      </div>
    </motion.div>
  );
}
