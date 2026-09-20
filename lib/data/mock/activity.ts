import type { ActivityItem } from "@/types";

/** Reproduit fidèlement les 3 lignes « Activité récente » de la maquette. */
const mockRecentActivity: ActivityItem[] = [
  {
    id: "act_hist_ch2",
    title: "Histoire - Chapitre 2 : La 2ème Guerre mondiale",
    meta: "PDF • 12 pages",
    fileKind: "pdf",
    type: "Résumé",
    date: "2024-05-12T14:30:00",
    status: { label: "Résumé prêt", tone: "success" },
    action: { label: "Voir", href: "/resumer" },
  },
  {
    id: "act_qcm_20",
    title: "Épreuve QCM - 20 questions",
    meta: "Terminale S • Histoire",
    fileKind: "exam",
    type: "Épreuve",
    date: "2024-05-11T16:45:00",
    status: { label: "16/20", tone: "info" },
    action: { label: "Ouvrir", href: "/generer" },
  },
  {
    id: "act_philo",
    title: "Correction - Philosophie",
    meta: "Dissertation • 2 sujets",
    fileKind: "correction",
    type: "Correction",
    date: "2024-05-10T10:20:00",
    status: { label: "12/20", tone: "warning" },
    action: { label: "Voir", href: "/corriger" },
  },
];

/**
 * Journal complet (page « Historique ») — reprend les 3 activités récentes de la
 * maquette puis des entrées plus anciennes couvrant les 3 types.
 */
export const mockActivityHistory: ActivityItem[] = [
  ...mockRecentActivity,
  {
    id: "act_ep_suites",
    title: "Épreuve - Suites et limites",
    meta: "QCM • 10 questions",
    fileKind: "exam",
    type: "Épreuve",
    date: "2024-05-08T11:00:00",
    status: { label: "18/20", tone: "info" },
    action: { label: "Ouvrir", href: "/generer" },
  },
  {
    id: "act_res_suites",
    title: "Mathématiques - Suites et limites",
    meta: "PDF • 6 pages",
    fileKind: "pdf",
    type: "Résumé",
    date: "2024-05-04T09:30:00",
    status: { label: "Résumé prêt", tone: "success" },
    action: { label: "Voir", href: "/resumer" },
  },
  {
    id: "act_corr_dissert_hist",
    title: "Correction - Dissertation d'Histoire",
    meta: "Dissertation • 1 sujet",
    fileKind: "correction",
    type: "Correction",
    date: "2024-05-02T15:10:00",
    status: { label: "14/20", tone: "info" },
    action: { label: "Voir", href: "/corriger" },
  },
  {
    id: "act_res_roman",
    title: "Français - Le roman au XIXe siècle",
    meta: "DOCX • 11 pages",
    fileKind: "doc",
    type: "Résumé",
    date: "2024-04-20T13:50:00",
    status: { label: "Résumé prêt", tone: "success" },
    action: { label: "Voir", href: "/resumer" },
  },
  {
    id: "act_ep_roman",
    title: "Épreuve QCM - Le roman réaliste",
    meta: "QCM • 12 questions",
    fileKind: "exam",
    type: "Épreuve",
    date: "2024-04-18T17:20:00",
    status: { label: "Brouillon", tone: "neutral" },
    action: { label: "Ouvrir", href: "/generer" },
  },
  {
    id: "act_res_hist_ch1",
    title: "Histoire - Chapitre 1 : Fragilités des démocraties",
    meta: "PDF • 10 pages",
    fileKind: "pdf",
    type: "Résumé",
    date: "2024-04-15T10:00:00",
    status: { label: "Résumé prêt", tone: "success" },
    action: { label: "Voir", href: "/resumer" },
  },
  {
    id: "act_corr_geo",
    title: "Correction - QCM Géographie",
    meta: "QCM • 8 questions",
    fileKind: "correction",
    type: "Correction",
    date: "2024-04-12T10:00:00",
    status: { label: "11/20", tone: "warning" },
    action: { label: "Voir", href: "/corriger" },
  },
];
