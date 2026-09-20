/**
 * Déclenche le téléchargement d'un contenu texte généré côté client.
 * (À utiliser uniquement dans des composants client.)
 */
export function downloadTextFile(
  fileName: string,
  content: string,
  mime = "text/plain;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
