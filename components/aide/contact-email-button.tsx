"use client";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { supportConfig } from "@/lib/config/support";

/**
 * `mailto:` est le seul mécanisme web standard capable d'ouvrir un vrai
 * compositeur de mail — on garde donc un `<a href="mailto:...">` natif,
 * sans rien intercepter : quand l'appareil a un client mail par défaut
 * (Outlook, Mail, ou Gmail enregistré comme gestionnaire dans le
 * navigateur), le clic ouvre directement un message pré-rempli vers
 * l'adresse admin.
 *
 * Cette ouverture reste néanmoins hors du contrôle du site : si l'appareil
 * n'a aucun client mail associé au protocole (cas fréquent sous
 * Windows/Edge sans Outlook installé), c'est le navigateur/l'OS qui décide
 * de la suite (souvent un onglet vide) — aucun code web ne peut le forcer à
 * ouvrir autre chose. On ajoute donc, en secours systématique et fiable
 * quel que soit l'appareil : la copie automatique de l'adresse dans le
 * presse-papiers avec confirmation visible, pour que l'utilisateur puisse
 * toujours coller l'adresse dans la messagerie de son choix.
 */
export function ContactEmailButton({ className }: { className?: string }) {
  const { dict } = useI18n();
  const t = dict.aide;

  const { toast } = useToast();

  const mailtoUrl = `mailto:${supportConfig.email}?subject=${encodeURIComponent(
    t.contactSubject,
  )}`;

  function handleClick() {
    void navigator.clipboard
      ?.writeText(supportConfig.email)
      .then(() => toast(t.contactEmailCopied(supportConfig.email), "success"))
      .catch(() => {});
  }

  return (
    <a href={mailtoUrl} onClick={handleClick} className={className}>
      {t.contactEmailCta}
      <ArrowUpRight className="size-4" aria-hidden />
    </a>
  );
}
