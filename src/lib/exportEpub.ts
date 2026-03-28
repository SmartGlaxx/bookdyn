import JSZip from "jszip";
import { Book } from "@/types/book";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function contentToXhtml(content: string): string {
  const paragraphs = content.split(/\n\n|\n/).filter((p) => p.trim());
  return paragraphs.map((p) => `<p>${escapeXml(p.trim())}</p>`).join("\n");
}

export function exportBookToEpub(book: Book) {
  const zip = new JSZip();
  const bookId = `urn:uuid:${book.id}`;
  const chapters = book.outline?.chapters || [];
  const safeTitle = escapeXml(book.title);

  // mimetype (must be first, uncompressed)
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // META-INF/container.xml
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // Build chapter files
  const manifest: string[] = [];
  const spine: string[] = [];
  const toc: string[] = [];

  // Title page
  const titlePageHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${safeTitle}</title></head>
<body>
<div style="text-align:center;margin-top:40%;">
<h1>${safeTitle}</h1>
${book.subtitle ? `<h2>${escapeXml(book.subtitle)}</h2>` : ""}
</div>
</body>
</html>`;
  zip.file("OEBPS/title.xhtml", titlePageHtml);
  manifest.push(`<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`);
  spine.push(`<itemref idref="title"/>`);

  // Chapter files
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const fileId = `chapter${i + 1}`;
    const fileName = `${fileId}.xhtml`;

    let body = `<h1>${escapeXml(`Chapter ${ch.chapterNumber}: ${ch.title}`)}</h1>\n`;
    for (const sub of ch.subsections) {
      if (!sub.content) continue;
      body += `<h2>${escapeXml(sub.title)}</h2>\n`;
      body += contentToXhtml(sub.content) + "\n";
    }

    const chapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(ch.title)}</title></head>
<body>
${body}
</body>
</html>`;

    zip.file(`OEBPS/${fileName}`, chapterHtml);
    manifest.push(`<item id="${fileId}" href="${fileName}" media-type="application/xhtml+xml"/>`);
    spine.push(`<itemref idref="${fileId}"/>`);
    toc.push(`<navPoint id="nav-${fileId}" playOrder="${i + 2}"><navLabel><text>Chapter ${ch.chapterNumber}: ${escapeXml(ch.title)}</text></navLabel><content src="${fileName}"/></navPoint>`);
  }

  // content.opf
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${safeTitle}</dc:title>
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifest.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${spine.join("\n    ")}
  </spine>
</package>`;
  zip.file("OEBPS/content.opf", opf);

  // toc.ncx
  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
  </head>
  <docTitle><text>${safeTitle}</text></docTitle>
  <navMap>
    <navPoint id="nav-title" playOrder="1">
      <navLabel><text>Title Page</text></navLabel>
      <content src="title.xhtml"/>
    </navPoint>
    ${toc.join("\n    ")}
  </navMap>
</ncx>`;
  zip.file("OEBPS/toc.ncx", ncx);

  // Generate and download
  zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" }).then((blob) => {
    const filename = book.title
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.epub`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
