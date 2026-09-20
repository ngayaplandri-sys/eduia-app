/**
 * Grille 2 colonnes (config à gauche, résultat à droite) commune aux trois
 * outils IA — auparavant dupliquée à l'identique dans `resumer-workspace.tsx`,
 * `exam-workspace.tsx` et `correction-workspace.tsx`.
 */
export function ToolWorkspaceLayout({
  config,
  result,
}: {
  config: React.ReactNode;
  result: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[23rem_minmax(0,1fr)]">
      {config}
      {result}
    </div>
  );
}
