import jsPDF from "jspdf";
import { Book } from "@/types/book";

export function exportBookToPdf(book: Book) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ---- Title Page ----
  y = pageHeight * 0.35;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  const titleLines = doc.splitTextToSize(book.title, contentWidth);
  doc.text(titleLines, pageWidth / 2, y, { align: "center" });
  y += titleLines.length * 12;

  if (book.subtitle) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(16);
    const subLines = doc.splitTextToSize(book.subtitle, contentWidth);
    doc.text(subLines, pageWidth / 2, y + 6, { align: "center" });
  }

  // ---- Chapters ----
  const chapters = book.outline?.chapters || [];

  for (const chapter of chapters) {
    doc.addPage();
    y = margin;

    // Chapter title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    const chTitle = `Chapter ${chapter.chapterNumber}: ${chapter.title}`;
    const chTitleLines = doc.splitTextToSize(chTitle, contentWidth);
    doc.text(chTitleLines, margin, y);
    y += chTitleLines.length * 9 + 6;

    // Subsections
    for (const sub of chapter.subsections) {
      if (!sub.content) continue;

      ensureSpace(20);

      // Subsection title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      const subTitleLines = doc.splitTextToSize(sub.title, contentWidth);
      doc.text(subTitleLines, margin, y);
      y += subTitleLines.length * 6 + 4;

      // Content
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const paragraphs = sub.content.split(/\n\n|\n/);

      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        const lines = doc.splitTextToSize(trimmed, contentWidth);
        for (const line of lines) {
          ensureSpace(7);
          doc.text(line, margin, y);
          y += 5.5;
        }
        y += 3; // paragraph spacing
      }

      y += 4; // subsection spacing
    }
  }

  // Generate blob and trigger download via anchor click
  const filename = book.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_").toLowerCase();
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
