import type { ResponseInputContent } from "openai/resources/responses/responses";

/**
 * Une page (ou un fichier) importée dans « Corriger une épreuve », prête à être
 * transmise au modèle — dans l'ordre choisi par l'élève :
 *  - `pdf`   → lu nativement par OpenAI (`input_file` : texte + rendu des pages) ;
 *  - `image` → lue par la vision (`input_image`, pleine résolution) : graphiques,
 *    cartes, schémas et écriture manuscrite restent visibles par le modèle ;
 *  - `text`  → Word / TXT déjà extraits côté serveur, ou réponses transcrites.
 */
export type ExamAttachment =
  | { kind: "pdf"; label: string; filename: string; dataUrl: string }
  | { kind: "image"; label: string; dataUrl: string }
  | { kind: "text"; label: string; text: string };

/**
 * Contenu de message OpenAI pour une suite de pages : chaque page est précédée
 * de son repère (« Page 2 — photo.jpg ») pour que le modèle les lise dans
 * l'ordre comme UN seul document.
 */
export function attachmentsToContent(
  attachments: ExamAttachment[],
): ResponseInputContent[] {
  return attachments.flatMap<ResponseInputContent>((attachment) => {
    if (attachment.kind === "pdf") {
      return [
        { type: "input_text", text: `[${attachment.label}]` },
        {
          type: "input_file",
          filename: attachment.filename,
          file_data: attachment.dataUrl,
        },
      ];
    }
    if (attachment.kind === "image") {
      return [
        { type: "input_text", text: `[${attachment.label}]` },
        { type: "input_image", image_url: attachment.dataUrl, detail: "high" },
      ];
    }
    return [
      {
        type: "input_text",
        text: `[${attachment.label}]\n"""\n${attachment.text}\n"""`,
      },
    ];
  });
}
