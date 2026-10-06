import type { CorrectionQuestion } from "@/types";

const quarter = (value: number) => Math.round(value * 4) / 4;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/**
 * Répartit `target` points sur des poids positifs : mise à l'échelle
 * proportionnelle, arrondi au demi-point (au quart si les questions sont trop
 * nombreuses), écart d'arrondi résiduel reporté sur les questions les plus
 * lourdes — même méthode que `balanceExamPoints` pour les épreuves générées.
 */
function distribute(weights: number[], target: number): number[] {
  const unit = target / weights.length >= 0.5 ? 0.5 : 0.25;
  const round = (value: number) => Math.round(value / unit) * unit;
  const total = sum(weights);
  const points = weights.map((w) => Math.max(unit, round((w * target) / total)));

  const order = points
    .map((p, index) => ({ p, index }))
    .sort((a, b) => b.p - a.p)
    .map((entry) => entry.index);

  let diff = round(target - sum(points));
  for (let i = 0; diff !== 0 && i < 100_000; i += 1) {
    const index = order[i % order.length];
    const step = diff > 0 ? unit : -unit;
    if (step < 0 && points[index] <= unit) continue;
    points[index] = round(points[index] + step);
    diff = round(diff - step);
  }
  return points;
}

/** Groupe de questions noté globalement (« Exercice 2 : 6 points »). */
export interface PointsGroup {
  /** Rangs des questions du groupe dans la correction. */
  indices: number[];
  total: number;
}

/**
 * Garantit le barème d'une correction, quel que soit l'arrondi de l'IA :
 *  - `fixed` : points lus sur l'épreuve, question par question (même ordre),
 *    imposés tels quels ;
 *  - `groups` : points d'un exercice entier, partagés entre ses questions dont
 *    les points ne sont pas indiqués (au prorata de leur poids estimé) ;
 *  - `target` : total de l'épreuve — les questions restantes se partagent ce
 *    qu'il reste, et le total final vaut toujours `target`.
 *
 * Si les points lus contredisent le total écrit sur l'épreuve, le total
 * l'emporte : les points lus servent alors de poids. Les points obtenus suivent
 * la même mise à l'échelle que le maximum de leur question et restent compris
 * entre 0 et ce maximum.
 */
export function normalizeCorrectionPoints(
  questions: CorrectionQuestion[],
  options: {
    target: number | null;
    fixed?: (number | null)[] | null;
    groups?: PointsGroup[];
  },
): CorrectionQuestion[] {
  if (questions.length === 0) return questions;

  const modelMax = questions.map((q) =>
    Number.isFinite(q.pointsMax) && q.pointsMax > 0 ? q.pointsMax : 1,
  );
  const target = options.target && options.target > 0 ? options.target : null;
  const known: (number | null)[] =
    options.fixed && options.fixed.length === questions.length
      ? options.fixed.map((p) => (p !== null && p > 0 ? p : null))
      : questions.map(() => null);

  for (const group of options.groups ?? []) {
    const indices = group.indices.filter((i) => i >= 0 && i < questions.length);
    const open = indices.filter((i) => known[i] === null);
    const rest = group.total - sum(indices.map((i) => known[i] ?? 0));
    if (open.length > 0 && rest > 0) {
      const shares = distribute(open.map((i) => modelMax[i]), rest);
      open.forEach((i, k) => {
        known[i] = shares[k];
      });
    }
  }

  const missing = known.filter((p) => p === null).length;
  const knownTotal = sum(known.map((p) => p ?? 0));
  let maxima: number[];

  if (missing === questions.length) {
    maxima = target ? distribute(modelMax, target) : modelMax;
  } else if (missing === 0) {
    maxima =
      target && Math.abs(knownTotal - target) > 0.01
        ? distribute(known as number[], target)
        : (known as number[]);
  } else if (target && target - knownTotal > 0) {
    const rest = distribute(
      modelMax.filter((_, i) => known[i] === null),
      target - knownTotal,
    );
    let cursor = 0;
    maxima = known.map((p) => p ?? rest[cursor++]);
  } else if (target) {
    maxima = distribute(known.map((p, i) => p ?? modelMax[i]), target);
  } else {
    maxima = known.map((p, i) => p ?? modelMax[i]);
  }

  return questions.map((question, index) => {
    const max = maxima[index];
    const ratio = max / modelMax[index];
    const earned = Number.isFinite(question.pointsEarned) ? question.pointsEarned : 0;
    return {
      ...question,
      pointsMax: max,
      pointsEarned: Math.min(max, Math.max(0, quarter(earned * ratio))),
    };
  });
}
