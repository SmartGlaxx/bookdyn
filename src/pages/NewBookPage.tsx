import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
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
    <div className="min-h-screen bg-background">
      <Navigation onCreateBook={() => navigate("/dashboard/new-book")} />
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <CanvasSetupWizard
          open
          onClose={() => navigate("/dashboard")}
          onCreate={handleCreate}
          isCreating={isCreating || submitting}
        />
      </main>
    </div>
  );
}