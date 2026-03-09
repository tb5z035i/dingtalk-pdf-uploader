const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizePdfFilename(filename: string): string {
  const trimmed = filename.trim().replace(INVALID_FILENAME_CHARS, "_");
  const collapsedWhitespace = trimmed.replace(/\s+/g, " ");
  const normalized = collapsedWhitespace || "document.pdf";
  return normalized.toLowerCase().endsWith(".pdf") ? normalized : `${normalized}.pdf`;
}
