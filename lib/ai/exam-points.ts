import type { ExamPart } from "@/types";

/**
 * Garantit un barème EXACT pour une épreuve générée : chaque question a des
 * points positifs, les points d'une partie = somme de ses questions, et le total
 * de l'épreuve = `target`.
 *
 * L'IA vise déjà ce total ; on ne fait que corriger ses écarts éventuels :
 * mise à l'échelle proportionnelle, arrondi au demi-point (au quart de point si
 * l'épreuve compte plus de questions que de demi-points disponibles), puis
 * l'écart d'arrondi résiduel est réparti sur les questions les plus lourdes.
 * Sans dépendance serveur : testable isolément.
 */
export function balanceExamPoints(parts: ExamPart[], target: number): ExamPart[] {
  const questions = parts.flatMap((part) => part.questions);
  if (questions.length === 0 || !(target > 0)) return parts;

  const unit = target / questions.length >= 0.5 ? 0.5 : 0.25;
  const round = (value: number) => Math.round(value / unit) * unit;

  const raw = questions.map((q) =>
    Number.isFinite(q.points) && q.points > 0 ? q.points : 1,
  );
  const rawTotal = raw.reduce((sum, p) => sum + p, 0);
  const points = raw.map((p) => Math.max(unit, round((p * target) / rawTotal)));

  // Ordre de répartition de l'écart résiduel : questions les plus lourdes d'abord.
  const order = points
    .map((p, index) => ({ p, index }))
    .sort((a, b) => b.p - a.p)
    .map((entry) => entry.index);

  let diff = round(target - points.reduce((sum, p) => sum + p, 0));
  for (let i = 0; diff !== 0 && i < 100_000; i += 1) {
    const index = order[i % order.length];
    const step = diff > 0 ? unit : -unit;
    if (step < 0 && points[index] <= unit) continue;
    points[index] = round(points[index] + step);
    diff = round(diff - step);
  }

  let cursor = 0;
  return parts.map((part) => {
    const balanced = part.questions.map((question) => ({
      ...question,
      points: points[cursor++],
    }));
    return {
      ...part,
      questions: balanced,
      points: round(balanced.reduce((sum, q) => sum + q.points, 0)),
    };
  });
}
