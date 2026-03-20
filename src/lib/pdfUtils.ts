/**
 * Utilidades para abrir/descargar PDFs sin popups bloqueados
 */

export function abrirPDF(pdfDataUri: string, nombreArchivo: string): void {
  const link = document.createElement("a");
  link.href = pdfDataUri;
  link.download = nombreArchivo;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function abrirPDFBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  abrirPDF(url, nombreArchivo);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
