const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizePdfFilename(filename: string): string {
  const trimmed = filename.trim().replace(INVALID_FILENAME_CHARS, "_");
  const withoutRepeatedWhitespace = trimmed.replace(/\s+/g, " ");
  const normalized = withoutRepeatedWhitespace || "document.pdf";
  return normalized.toLowerCase().endsWith(".pdf") ? normalized : `${normalized}.pdf`;
}

export function isPdfFilename(filename: string): boolean {
  return filename.trim().toLowerCase().endsWith(".pdf");
}
