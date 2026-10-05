/**
 * Projection d'une interface HTML sur l'écran d'un téléphone photographié.
 *
 * Les photos de smartphones de la landing ont été générées avec un écran
 * magenta uni ; ses quatre coins ont été mesurés au pixel près (intersection
 * des droites ajustées sur chaque bord, voir `marketingPhone` dans
 * lib/config/marketing.ts). On calcule ici l'homographie qui envoie le
 * rectangle de l'interface (0,0 → largeur,hauteur) sur ce quadrilatère, puis
 * on l'exprime en `matrix3d` CSS : le navigateur dessine alors la vraie
 * interface EduIA en perspective exacte sur la vitre (avec
 * `transform-origin: 0 0`).
 */

export type Point = readonly [number, number];

export interface Quad {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
}

/** Résout le système linéaire `a · x = b` (élimination de Gauss, pivot partiel). */
function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = m[row][col] / m[col][col];
      for (let k = col; k <= n; k++) m[row][k] -= factor * m[col][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/**
 * `matrix3d(...)` qui projette un élément de `width` × `height` (origine en
 * haut à gauche) sur `quad`, exprimé dans le même repère que celui-ci.
 */
export function quadToMatrix3d(width: number, height: number, quad: Quad): string {
  const src: Point[] = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  const dst: Point[] = [quad.tl, quad.tr, quad.br, quad.bl];
  const a: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const [h0, h1, h2, h3, h4, h5, h6, h7] = solve(a, b);
  // Colonnes de la matrice 4×4 (ordre attendu par `matrix3d`).
  const values = [h0, h3, 0, h6, h1, h4, 0, h7, 0, 0, 1, 0, h2, h5, 0, 1];
  return `matrix3d(${values.map((value) => Number(value.toFixed(10))).join(",")})`;
}
