"use client";

import * as React from "react";

interface TypewriterLine {
  text: string;
  className?: string;
}

/** Délai entre deux caractères — rythme constant, volontairement pas de
 * hasard : un rythme régulier lit comme « fluide et professionnel », un
 * rythme aléatoire lit comme « nerveux ». */
const CHAR_DELAY_MS = 45;
/** Petite pause en fin de ligne, avant d'attaquer la suivante — imite la
 * pause naturelle d'une personne qui tape et passe à la ligne. */
const LINE_PAUSE_MS = 260;
/** Délai avant le tout premier caractère — laisse la page se stabiliser
 * visuellement avant que la frappe commence. */
const START_DELAY_MS = 150;
/** Pause une fois la phrase entièrement affichée, avant d'effacer et de
 * rejouer l'animation depuis le début. */
const PAUSE_AFTER_DONE_MS = 2000;

/**
 * Effet machine à écrire réel (pas un fade/slide) : construit le texte
 * caractère par caractère en JS, avec un curseur clignotant sur la ligne
 * activement tapée. Une fois la phrase entièrement affichée, elle reste
 * visible `PAUSE_AFTER_DONE_MS`, puis s'efface et la frappe recommence
 * depuis le début — boucle continue tant que la page reste ouverte.
 *
 * Le texte complet reste accessible immédiatement via `aria-label` posé par
 * l'appelant sur le `<h1>` parent : cette animation n'est elle-même que
 * visuelle (`aria-hidden`), jamais la seule source du contenu pour les
 * lecteurs d'écran/robots. `<noscript>` fournit un repli statique si le
 * JavaScript est indisponible. `prefers-reduced-motion` affiche la phrase
 * complète une seule fois, sans boucle (une animation qui recommence
 * indéfiniment est justement ce que ce réglage d'accessibilité demande
 * d'éviter).
 */
export function HeroTypewriter({ lines }: { lines: TypewriterLine[] }) {
  const [progress, setProgress] = React.useState<number[]>(() =>
    lines.map(() => 0),
  );
  const [activeLine, setActiveLine] = React.useState(0);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      // Différé au tick suivant : appeler setState directement dans le corps
      // de l'effet (plutôt que dans un callback asynchrone) déclenche des
      // rendus en cascade — pattern déjà rencontré ailleurs dans l'app.
      const id = window.setTimeout(() => {
        setProgress(lines.map((line) => line.text.length));
        setDone(true);
      }, 0);
      return () => window.clearTimeout(id);
    }

    let cancelled = false;
    let timers: number[] = [];

    function schedule(fn: () => void, delay: number) {
      timers.push(window.setTimeout(fn, delay));
    }

    function runCycle() {
      if (cancelled) return;

      // Nouveau cycle : efface (état vide) et repart de la première lettre.
      // Les timers du cycle précédent ont déjà tous été déclenchés à ce
      // stade — on vide juste le tableau pour ne pas le laisser grossir
      // indéfiniment au fil d'une boucle qui tourne tant que la page reste
      // ouverte.
      timers = [];
      setDone(false);
      setActiveLine(0);
      setProgress(lines.map(() => 0));

      let lineIndex = 0;
      let charIndex = 0;

      function tick() {
        if (cancelled) return;

        if (lineIndex >= lines.length) {
          setDone(true);
          schedule(runCycle, PAUSE_AFTER_DONE_MS);
          return;
        }

        const length = lines[lineIndex].text.length;
        if (charIndex < length) {
          charIndex += 1;
          const currentLine = lineIndex;
          const currentChar = charIndex;
          setActiveLine(currentLine);
          setProgress((previous) => {
            const next = previous.slice();
            next[currentLine] = currentChar;
            return next;
          });
          schedule(tick, CHAR_DELAY_MS);
        } else {
          lineIndex += 1;
          charIndex = 0;
          schedule(tick, LINE_PAUSE_MS);
        }
      }

      schedule(tick, START_DELAY_MS);
    }

    runCycle();

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [lines]);

  return (
    <>
      <span aria-hidden="true">
        {lines.map((line, index) => (
          <React.Fragment key={line.text}>
            <span className={line.className}>
              {/* Espace insécable si rien n'est encore tapé sur cette ligne :
                  la boîte de ligne (et donc la hauteur du h1) reste réservée
                  dès le premier rendu, pour ne jamais faire sauter le
                  paragraphe/CTA en dessous pendant que la frappe progresse. */}
              {line.text.slice(0, progress[index]) || " "}
              <span
                className="hero-caret"
                data-active={!done && activeLine === index ? "true" : "false"}
              />
            </span>
            {index < lines.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </span>
      <noscript>
        {lines.map((line, index) => (
          <React.Fragment key={line.text}>
            <span className={line.className}>{line.text}</span>
            {index < lines.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </noscript>
    </>
  );
}
