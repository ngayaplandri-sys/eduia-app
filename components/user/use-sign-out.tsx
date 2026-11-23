"use client";

import * as React from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/client";

/**
 * Déconnexion avec confirmation (« Êtes-vous sûr de vouloir vous
 * déconnecter ? »), partagée par tous les boutons « Se déconnecter ».
 * `askSignOut()` ouvre la boîte ; `signOutDialog` est à rendre une fois, hors
 * du menu déroulant qui a déclenché l'action.
 * `labels` : textes imposés (espace admin, toujours en français).
 */
export function useConfirmedSignOut(labels?: {
  title: string;
  description: string;
  confirm: string;
  cancel: string;
}) {
  const { dict } = useI18n();
  const [open, setOpen] = React.useState(false);

  async function signOut() {
    await authClient.signOut();
    // Chargement complet (pas `router.push` + `router.refresh`, qui se
    // concurrencent) : repart sans session et vide le cache du routeur, qui
    // contient encore les pages du compte qu'on vient de quitter.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- rechargement voulu : la session vient de changer
    window.location.assign("/");
  }

  const signOutDialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title={labels?.title ?? dict.layout.signOutConfirmTitle}
      description={labels?.description ?? dict.layout.signOutConfirmBody}
      confirmLabel={labels?.confirm ?? dict.layout.signOut}
      cancelLabel={labels?.cancel}
      destructive
      onConfirm={() => {
        void signOut();
      }}
    />
  );

  return { askSignOut: () => setOpen(true), signOutDialog };
}
