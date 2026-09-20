import type { CourseSummary } from "@/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  localizeLevel,
  localizeSubject,
  localizeSummaryStyle,
} from "@/lib/i18n/labels";
import { localizePageCount } from "@/lib/i18n/labels";

/**
 * Version texte brut d'un résumé de cours — alimente le téléchargement `.txt`,
 * la copie et le partage (`ResultActions`).
 *
 * Volontairement hors de `lib/data/*` (pas de `server-only`) : consommé par le
 * panneau de résultat rendu côté client. `dict` localise les intitulés (le
 * contenu du résumé, lui, suit la langue de génération).
 */
export function summaryToPlainText(
  summary: CourseSummary,
  dict: Dictionary,
): string {
  const r = dict.resumer;
  const topic = [summary.chapter?.trim(), summary.theme?.trim()]
    .filter(Boolean)
    .join(" — ");

  const lines: string[] = [
    summary.title,
    [
      localizeSubject(summary.subject, dict),
      localizeLevel(summary.level, dict),
      topic,
    ]
      .filter(Boolean)
      .join(" · "),
    `${localizeSummaryStyle(summary.styleLabel, dict)} · ${localizePageCount(
      summary.pageCountLabel,
      dict,
    )}`,
    "",
  ];

  for (const section of summary.sections) {
    lines.push(section.heading);
    for (const p of section.paragraphs ?? []) lines.push(p);
    for (const b of section.bullets ?? [])
      lines.push(`- ${b.lead ? `${b.lead} ` : ""}${b.text}`);
    lines.push("");
  }

  if (summary.keyConcepts.length > 0) {
    lines.push(`${r.blockKeyConcepts} :`);
    lines.push(summary.keyConcepts.join(" · "));
    lines.push("");
  }

  if (summary.definitions.length > 0) {
    lines.push(`${r.blockDefinitions} :`);
    for (const d of summary.definitions)
      lines.push(`- ${d.term} : ${d.definition}`);
    lines.push("");
  }

  if (summary.keyPoints.length > 0) {
    lines.push(`${r.blockKeyPoints} :`);
    for (const point of summary.keyPoints) lines.push(`- ${point}`);
    lines.push("");
  }

  lines.push(r.footer(summary.generatedBy, "").replace(/ · $/, ""));
  return lines.join("\n").trim();
}
