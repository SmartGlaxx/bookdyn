import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { CanvasSetupWizard } from "@/components/canvas/CanvasSetupWizard";
import { useBooks } from "@/hooks/useBooks";
import { CreateBookInput } from "@/types/book";
import { toast } from "sonner";

export default function NewBookPage() {
  const navigate = useNavigate();
  const { addBook, isCreating } = useBooks();
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (input: CreateBookInput) => {
    setSubmitting(true);
    try {
      const created = await addBook(input);
      if (created?.id) {
        navigate(`/dashboard/${created.id}`);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create book");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell projectLabel="New Book Project">
      <CanvasSetupWizard
        open
        onClose={() => navigate("/dashboard")}
        onCreate={handleCreate}
        isCreating={isCreating || submitting}
      />
    </AppShell>
  );
}