/**
 * Dictionnaire français — SOURCE DE VÉRITÉ de l'i18n d'EduIA.
 *
 * `en.ts` doit refléter exactement cette forme : `export const en: Dictionary`
 * échoue à la compilation si une clé manque ou change de type. Toute chaîne
 * visible de l'app élève passe par ici (l'admin et la landing restent en
 * français, non routés par ce dictionnaire).
 *
 * Convention : valeurs `string`, ou fonctions `(x) => string` pour l'interpolation.
 * `fr` n'est pas `as const` : les valeurs s'élargissent en `string` / `(x) => string`
 * si bien que `en: Dictionary` exige les mêmes clés/types — pas les mêmes textes.
 */

/** Points de barème (demi-points compris), au format de la langue. */
const points = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export const fr = {
  common: {
    home: "Accueil",
    save: "Enregistrer",
    saving: "Enregistrement…",
    saved: "Enregistré",
    cancel: "Annuler",
    close: "Fermer",
    back: "Retour",
    retry: "Réessayer",
    delete: "Supprimer",
    edit: "Modifier",
    confirm: "Confirmer",
    loading: "Chargement…",
    search: "Rechercher",
    open: "Ouvrir",
    view: "Voir",
    download: "Télécharger",
    print: "Imprimer",
    copy: "Copier",
    copied: "Copié",
    share: "Partager",
    yes: "Oui",
    no: "Non",
    required: "Requis",
    optional: "Facultatif",
    comingSoon: "Bientôt disponible",
    new: "Nouveau",
  },

  nav: {
    dashboard: "Tableau de bord",
    resumer: "Résumer mes cours",
    generer: "Générer une épreuve",
    corriger: "Corriger une épreuve",
    assistant: "Assistant IA",
    documents: "Documents",
    historique: "Historique",
    parametres: "Paramètres",
    aide: "Aide & support",
    admin: "Administration",
    premium: "Premium",
    primaryLabel: "Navigation principale",
  },

  layout: {
    tagline: "Ton assistant d'apprentissage",
    searchPlaceholder: "Rechercher un cours, une notion, une épreuve…",
    searchAria: "Rechercher",
    runSearch: "Lancer la recherche",
    openSearch: "Rechercher",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    menuTitle: "Menu",
    menuDescription: "Navigation principale d'EduIA",
    searchDialogTitle: "Rechercher",
    searchDialogDescription:
      "Retrouve tes documents, résumés, épreuves et corrections.",
    searchLoading: "Recherche en cours…",
    searchEmptyTitle: (query: string) => `Aucun résultat pour « ${query} »`,
    searchEmptyBody: "Essaie un autre mot, une matière ou un niveau scolaire.",
    searchGroupDocuments: "Documents",
    searchGroupSummaries: "Résumés",
    searchGroupExams: "Épreuves",
    searchGroupCorrections: "Corrections",
    searchResultAria: (title: string) => `Ouvrir « ${title} »`,
    searchMinChars: "Continue à taper (2 caractères minimum).",
    notifications: "Notifications",
    notificationsAria: (count: number) => `Notifications (${count} non lues)`,
    notificationsNew: (count: number) => `${count} nouvelles`,
    markAllRead: "Tout marquer comme lu",
    allMarkedRead: "Toutes les notifications sont marquées comme lues.",
    notificationsEmpty: "Aucune notification pour le moment.",
    profileMenu: "Menu du profil",
    settings: "Paramètres",
    goPremium: "Passer à Premium",
    signOut: "Se déconnecter",
    premiumCardTitle: "Passez à Premium",
    premiumCardBody:
      "Plus de limites, plus de puissance IA et des fonctionnalités avancées.",
    premiumCardCta: "Découvrir Premium",
  },

  dashboard: {
    metaTitle: "Tableau de bord",
    metaDescription:
      "Ton espace EduIA : accès rapide à tes cours, épreuves et corrections, et suivi de ton activité récente.",
    welcome: (name: string) => `Bienvenue ${name} !`,
    heroTitleBefore: "Ton assistant IA pour ",
    heroTitleAccent: "apprendre",
    heroBody:
      "Importe tes cours, génère des épreuves adaptées, corrige tes réponses et progresse chaque jour avec l'intelligence artificielle.",
    heroCta: "Commencer maintenant",
    statsDocumentsLabel: "Documents importés",
    statsSummariesLabel: "Résumés générés",
    statsActivityLabel: "Activité totale",
    actionResumerTitle: "Résumer mes cours",
    actionResumerBody:
      "Importe tes cours (PDF, Word, texte) et obtiens un résumé clair, structuré et facile à comprendre.",
    actionResumerCta: "Importer un cours",
    actionGenererTitle: "Générer une épreuve",
    actionGenererBody:
      "Choisis tes chapitres, ton niveau et le type de questions. L'IA génère une épreuve adaptée à ton besoin.",
    actionGenererCta: "Créer une épreuve",
    actionCorrigerTitle: "Corriger une épreuve",
    actionCorrigerBody:
      "Importe ou scanne n'importe quelle épreuve, même hors EduIA : correction détaillée, question par question.",
    actionCorrigerCta: "Corriger maintenant",
    recentActivity: "Activité récente",
    seeAllHistory: "Voir tout l'historique",
    activityEmptyTitle: "Aucune activité pour l'instant",
    activityEmptyBody:
      "Tes résumés, épreuves et corrections apparaîtront ici.",
    activityImportCta: "Importer un cours",
    colItem: "Élément",
    colType: "Type",
    colDate: "Date",
    colStatus: "Statut",
    colAction: "Action",
    rowActionsAria: (title: string) => `Actions pour « ${title} »`,
    rowSummaryPrefix: (type: string) => `EduIA · ${type}`,
    rowDateLabel: (date: string) => `Date : ${date}`,
    rowStatusLabel: (status: string) => `Statut : ${status}`,
    recapDownloaded: "Récapitulatif téléchargé (.txt).",
    itemRemoved: "Élément retiré de la liste.",
    deleteNeedsDb:
      "La suppression définitive sera enregistrée une fois la base de données connectée.",
    deleteItemTitle: "Supprimer cet élément ?",
    deleteItemBody: (title: string) => `« ${title} » sera retiré de ton historique.`,
  },

  activity: {
    types: {
      "Résumé": "Résumé",
      "Épreuve": "Épreuve",
      "Correction": "Correction",
    } as Record<string, string>,
    statuses: {
      "Résumé prêt": "Résumé prêt",
      "Prêt": "Prêt",
      "Prête": "Prête",
      "Corrigée": "Corrigée",
      "Corrigé type": "Corrigé type",
      "Brouillon": "Brouillon",
    } as Record<string, string>,
    actions: {
      "Voir": "Voir",
      "Ouvrir": "Ouvrir",
    } as Record<string, string>,
    /** Unité « page(s) » pour recomposer une méta d'activité localisée. */
    pageUnit: (count: number) => (count > 1 ? "pages" : "page"),
    verdicts: {
      correct: "Correct",
      partial: "Partiel",
      incorrect: "Incorrect",
    },
  },

  options: {
    subjects: {
      "Histoire": "Histoire",
      "Géographie": "Géographie",
      "Français": "Français",
      "Philosophie": "Philosophie",
      "Mathématiques": "Mathématiques",
      "Physique-Chimie": "Physique-Chimie",
      "SVT": "SVT",
      "SES": "SES",
      "Anglais": "Anglais",
    } as Record<string, string>,
    levels: {
      "4e": "4e",
      "3e": "3e",
      "Seconde": "Seconde",
      "Première": "Première",
      "Terminale": "Terminale",
      "Licence": "Licence",
    } as Record<string, string>,
    summaryStyles: {
      "Résumé clair": "Résumé clair",
      "Résumé détaillé": "Résumé détaillé",
      "Fiche de révision": "Fiche de révision",
    } as Record<string, string>,
    summaryDetail: {
      "Essentiel": "Essentiel",
      "Standard": "Standard",
      "Approfondi": "Approfondi",
    } as Record<string, string>,
    examTypes: {
      "Devoir surveillé": "Devoir surveillé",
      "Contrôle continu": "Contrôle continu",
      "Bac blanc": "Bac blanc",
      "Entraînement": "Entraînement",
    } as Record<string, string>,
    examDifficulty: {
      "Progressive": "Progressive",
      "Facile": "Facile",
      "Moyenne": "Moyenne",
      "Difficile": "Difficile",
    } as Record<string, string>,
    examMix: {
      "QCM": "QCM",
      "Questions ouvertes": "Questions ouvertes",
      "Vrai / Faux": "Vrai / Faux",
      "Mixte": "Mixte",
    } as Record<string, string>,
    gradingScales: {
      "/20": "/20",
      "/10": "/10",
      "Barème de l'épreuve": "Barème de l'épreuve",
    } as Record<string, string>,
    gradingStrictness: {
      "Indulgent": "Indulgent",
      "Standard": "Standard",
      "Strict": "Strict",
    } as Record<string, string>,
    /** « 3 pages » → localisé (les valeurs comme « 45 min », « 1h » restent identiques). */
    pageCountLabel: (count: number) => `${count} ${count > 1 ? "pages" : "page"}`,
    roles: {
      student: "Élève",
      admin: "Administrateur",
    },
  },

  feedback: {
    loadingTitle: "Chargement…",
    errorTitle: "Une erreur est survenue",
    errorBody: "Quelque chose s'est mal passé. Réessaie dans un instant.",
    sectionErrorBody:
      "Impossible de charger cette section pour le moment. Réessaie dans un instant.",
    appErrorTitle: "Cette page n'a pas pu se charger",
    appErrorBody:
      "Une erreur est survenue de notre côté. Réessaie dans un instant.",
    dashboardErrorTitle: "Impossible d'afficher le tableau de bord",
    dashboardErrorBody:
      "Une erreur est survenue lors du chargement de tes données. Réessaie dans un instant.",
    notFoundTitle: "Page introuvable",
    notFoundBody: "La page que tu cherches n'existe pas ou a été déplacée.",
    backToDashboard: "Retour au tableau de bord",
  },

  preferences: {
    title: "Préférences",
    description: "Langue et affichage de l'application.",
    language: "Langue",
    theme: "Thème d'affichage",
    themeLight: "Clair",
    themeDark: "Sombre",
    themeSystem: "Système",
    saved: "Préférence enregistrée.",
  },

  resultActions: {
    download: "Télécharger",
    preparing: "Préparation…",
    print: "Imprimer",
    copy: "Copier",
    copied: "Copié",
    share: "Partager",
    fileDownloaded: "Fichier téléchargé.",
    preparingPdf: "Préparation du PDF…",
    pdfDownloaded: "PDF téléchargé.",
    pdfFailed: "La création du PDF a échoué. Réessaie dans un instant.",
    clipboardUnavailable: "Impossible d'accéder au presse-papiers de ce navigateur.",
    sharedByClipboard: "Contenu copié, colle-le dans un e-mail, WhatsApp…",
    shareUnavailable: "Impossible de partager depuis ce navigateur.",
  },

  dropzone: {
    browse: "Parcourir les fichiers",
    close: "Fermer",
    textExtracted: "Texte extrait",
    imported: "Importé",
    imageTooHeavy: "Image trop lourde (25 Mo maximum). Réduis-la puis réessaie.",
    preparingAnalysis: "Préparation de l'analyse…",
    noReadableText:
      "Aucun texte lisible n'a été détecté. Essaie une photo plus nette, bien cadrée et sans reflet.",
    analysisFailed:
      "L'analyse de l'image a échoué. Vérifie ta connexion, puis réessaie.",
    analysisAria: "Analyse de l'image",
    // ── Import multi-fichiers (jusqu'à 5 pages/fichiers en une fois) ──────
    multiDropHint: (max: number) =>
      `Glisse-dépose jusqu'à ${max} pages ou fichiers ici`,
    multiFilesCount: (count: number, max: number) =>
      `${count} / ${max} fichiers`,
    addFile: "Ajouter un fichier",
    maxFilesReached: (max: number) =>
      `Limite de ${max} fichiers atteinte. Retire-en un pour en ajouter un autre.`,
    tooManySelected: (max: number, kept: number) =>
      `Tu ne peux importer que ${max} fichiers maximum au total. ${kept} sur la sélection ont été gardés, les autres ignorés.`,
    pageLabel: (n: number) => `Page ${n}`,
    removeFileNamed: (name: string) => `Retirer « ${name} »`,
    multiFileName: (count: number) => `${count} fichiers`,
    someFilesFailed:
      "Un ou plusieurs fichiers n'ont pas pu être lus et ont été ignorés. Les autres ont bien été ajoutés.",
    // ── Lecture des photos de cours par l'IA (vision) ─────────────────────
    ocrUploading: "Envoi de la photo…",
    ocrReading: "Lecture de l'écriture par l'IA…",
    ocrBlurry:
      "la photo est trop floue pour être lue. Reprends-la en tenant le téléphone immobile, mise au point sur le texte.",
    ocrTooDark:
      "la photo est trop sombre. Reprends-la dans un endroit bien éclairé, sans ombre sur la page.",
    ocrGlare:
      "un reflet masque une partie du texte. Incline légèrement le téléphone ou évite la lumière directe.",
    ocrCropped:
      "la page est coupée sur la photo. Recadre pour que toute la page soit visible.",
    ocrIllegibleHandwriting:
      "l'écriture n'a pas pu être déchiffrée. Essaie une photo plus proche et plus nette de la page.",
    ocrUnsupported:
      "ce format d'image n'est pas pris en charge. Utilise une photo JPG ou PNG.",
    fileFailed: (name: string, reason: string) => `« ${name} » : ${reason}`,
    partialText: "Lecture partielle",
    partialWarning: (name: string) =>
      `Certains passages de « ${name} » étaient difficiles à lire et sont marqués [illisible]. Tu peux continuer, ou reprendre la photo plus nette pour un résumé plus complet.`,
    // ── Scanner un document avec la caméra ────────────────────────────────
    scanWithCamera: "Scanner avec la caméra",
    scanTitle: "Scanner un document",
    scanHint: "Place toute la page dans le cadre, bien à plat et bien éclairée.",
    scanCapture: "Prendre la photo",
    scanDone: (count: number) =>
      count > 0 ? `Terminer (${count} page${count > 1 ? "s" : ""})` : "Terminer",
    scanCancel: "Annuler",
    scanStarting: "Ouverture de la caméra…",
    scanDenied:
      "Accès à la caméra refusé. Autorise la caméra pour ce site dans les réglages du navigateur, ou utilise l'appareil photo du téléphone.",
    scanUnavailable:
      "Aucune caméra n'est disponible dans ce navigateur. Utilise l'appareil photo du téléphone ou importe une photo.",
    scanUseNative: "Utiliser l'appareil photo",
    scanRemovePage: (n: number) => `Retirer la page scannée ${n}`,
    scanLimit: (max: number) => `Limite de ${max} pages atteinte.`,
    scanTorchOn: "Allumer la lampe",
    scanTorchOff: "Éteindre la lampe",
    scanSwitchCamera: "Changer de caméra",
    readyForAnalysis: "Prête pour l'analyse",
    movePageUp: (n: number) => `Remonter la page ${n}`,
    movePageDown: (n: number) => `Descendre la page ${n}`,
  },

  resumer: {
    metaTitle: "Résumer mes cours",
    metaDescription:
      "Importe tes cours (PDF, Word, texte) et obtiens un résumé clair, structuré et facile à comprendre.",
    step1: "Importer ton cours",
    step2: "Paramètres du résumé",
    step3: "Options supplémentaires",
    dropLabel: "Glisse-dépose ton cours ici",
    dropHint:
      "PDF, Word, TXT ou photo / capture d'écran de ton cours · jusqu'à 5 fichiers",
    formats: "PDF, Word, TXT ou image (JPG, PNG, WEBP) · 15 Mo max par fichier",
    level: "Niveau / Classe",
    levelPlaceholder: "Entre ton niveau ou ta classe (ex. Terminale)",
    subject: "Matière",
    subjectPlaceholder: "Entre la matière de ton cours (ex. Histoire)",
    chapter: "Chapitre",
    chapterPlaceholder: "Entre le chapitre de ton cours (ex. La digestion)",
    theme: "Thème",
    themePlaceholder: "Entre le thème de ton cours (ex. L'absorption des nutriments)",
    style: "Type de résumé",
    pages: "Nombre de pages",
    detail: "Niveau de détail",
    optPointsEssentiels: "Points essentiels",
    optDefinitions: "Définitions importantes",
    optFormules: "Formules / notions clés",
    optExemples: "Exemples",
    optExplicationsSimples: "Explications simplifiées",
    submit: "Résumer mon cours",
    submitting: "Génération du résumé en cours…",
    analyzingImage: "Analyse de l'image…",
    resultTitle: "Résumé généré",
    emptyTitle: "Aucun résumé pour l'instant",
    emptyBody:
      "Importe un cours et lance un résumé : ta fiche structurée s'affichera ici.",
    loadingSr: "Génération du résumé en cours…",
    loadingHeading: "Résumé en cours de génération",
    loadingBanner:
      "EduIA analyse ton cours et rédige un résumé structuré en 10 à 40 secondes.",
    metaLevel: "Niveau / Classe",
    metaStyle: "Type de résumé",
    metaSubject: "Matière",
    metaLength: "Longueur",
    metaChapter: "Chapitre",
    metaTheme: "Thème",
    metaCoursePages: "Pages du cours",
    blockKeyConcepts: "Notions clés",
    blockDefinitions: "Définitions importantes",
    blockKeyPoints: "Points clés à retenir",
    footer: (by: string, date: string) => `Résumé généré par ${by} · ${date}`,
    shareTitle: (title: string) => `Résumé · ${title}`,
    timeout:
      "La génération a pris trop de temps. Réessaie, ou avec un cours plus court.",
    connectionLost:
      "Connexion interrompue. Vérifie ta connexion internet puis réessaie.",
    genericFailure:
      "La génération du résumé a échoué. Réessaie dans un instant.",
    sourcePhoto: "Cours (photo)",
    sourceText: "Cours (texte)",
    docxUnreadable: (name: string) =>
      `Le fichier Word « ${name} » n'a pas pu être lu. Enregistre-le au format .docx (Word / LibreOffice récent) puis réessaie.`,
    docxEmpty: (name: string) =>
      `Le fichier Word « ${name} » semble vide ou ne contient pas de texte exploitable (images / scans non pris en charge).`,
  },

  generer: {
    metaTitle: "Générer une épreuve",
    metaDescription:
      "Choisis tes chapitres, ton niveau et le type de questions : l'IA génère une épreuve adaptée à ton besoin.",
    step1: "Importer ton cours",
    step2: "Paramètres de l'épreuve",
    step3: "Options supplémentaires",
    dropLabel: "Glisse-dépose ton fichier ici",
    dropHint:
      "PDF, Word, TXT ou photo / capture du cours à travailler · jusqu'à 5 fichiers",
    formats: "PDF, Word, TXT ou image (JPG, PNG, WEBP) · 15 Mo max par fichier",
    level: "Niveau / Classe",
    levelPlaceholder: "Entre ton niveau ou ta classe (ex. Terminale)",
    subject: "Matière",
    subjectPlaceholder: "Entre la matière à travailler (ex. Mathématiques)",
    theme: "Chapitre / Thème",
    themePlaceholder: "Entre le chapitre ou le thème (ex. La Révolution française)",
    examType: "Type d'épreuve",
    questionCount: "Nombre de questions",
    questionCountOption: (n: number) => `${n} questions`,
    questionType: "Type de questions",
    duration: "Durée",
    pages: "Nombre de pages",
    totalPoints: "Barème total",
    totalPointsOption: (n: number) => `${n} points`,
    difficulty: "Difficulté",
    language: "Langue de l'épreuve",
    languageFr: "Français",
    languageEn: "Anglais",
    institution: "Établissement (facultatif)",
    institutionPlaceholder: "Nom de l'établissement, affiché dans l'en-tête",
    optBareme: "Inclure un barème détaillé",
    optPageGarde: "Ajouter une page de garde",
    optMelanger: "Mélanger l'ordre des questions",
    optExplications: "Inclure des explications",
    submit: "Générer l'épreuve",
    submitting: "Génération de l'épreuve en cours…",
    analyzingImage: "Analyse de l'image…",
    resultTitle: "Épreuve générée",
    emptyTitle: "Aucune épreuve pour l'instant",
    emptyBody:
      "Choisis tes paramètres et génère une épreuve : elle s'affichera ici, prête à imprimer.",
    loadingSr: "Génération de l'épreuve en cours…",
    loadingHeading: "Épreuve en cours de génération",
    loadingBanner:
      "EduIA construit une épreuve adaptée à tes paramètres en 10 à 40 secondes.",
    timeout:
      "La génération a pris trop de temps. Réessaie, ou avec moins de questions.",
    connectionLost:
      "Connexion interrompue. Vérifie ta connexion internet puis réessaie.",
    genericFailure:
      "La génération de l'épreuve a échoué. Réessaie dans un instant.",
    metaLevel: "Niveau / Classe",
    metaDuration: "Durée",
    metaSubject: "Matière",
    metaQuestionCount: "Nombre de questions",
    metaTheme: "Chapitre / Thème",
    metaLength: "Longueur",
    metaExamType: "Type d'épreuve",
    metaDate: "Date",
    metaName: "Nom & Prénom",
    footerGoodWork: "Bon travail !",
    footerBy: (by: string, date: string) => `Épreuve générée par ${by} · ${date}`,
    footerScale: (points: number) => `Barème sur ${points} points`,
    shareTitle: (subject: string, level: string) =>
      `Épreuve · ${subject} · ${level}`,
    tfStatements: "Affirmations",
    tfTrue: "Vrai",
    tfFalse: "Faux",
    points: (n: number) => `(${n} points)`,
  },

  corriger: {
    metaTitle: "Corriger une épreuve",
    metaDescription:
      "Importe ou scanne n'importe quelle épreuve — même si elle n'a pas été créée avec EduIA — et reçois une correction détaillée, question par question.",
    anySourceTitle:
      "EduIA peut corriger vos épreuves, même lorsqu'elles n'ont pas été créées avec EduIA.",
    anySourceBody:
      "Ancien sujet, épreuve d'un professeur, photo d'une feuille, PDF ou capture d'écran : importe-la, EduIA s'occupe du reste.",
    stepExam: "L'épreuve à corriger",
    sourceImport: "Importer ou scanner",
    sourceEduia: "Mes épreuves EduIA",
    examDropLabel: "Importe ton épreuve ici",
    examDropHint:
      "PDF, photo, capture d'écran ou Word · plusieurs pages = une seule épreuve",
    examFormats: "PDF, Word, TXT ou image (JPG, PNG, WEBP) · 15 Mo max par fichier · 10 pages max",
    examAutoDetect:
      "EduIA détecte automatiquement la matière, le niveau, les questions et le barème.",
    stepCopy: "Ta copie (facultatif)",
    copyHint:
      "Ajoute tes réponses pour être noté question par question. Sans copie, EduIA rédige le corrigé complet de l'épreuve.",
    step2: "Options de correction",
    dropLabel: "Dépose ta copie ici",
    dropHint: "PDF, Word, TXT ou photo de ta copie",
    formats: "PDF, Word, TXT ou image (JPG, PNG, WEBP) · 15 Mo max",
    orTypeAnswers: "Ou saisis tes réponses",
    answersPlaceholder: "Recopie ici tes réponses, numérotées par question…",
    relatedExam: "Épreuve générée avec EduIA",
    noExamSaved: "Aucune épreuve enregistrée",
    level: "Niveau / Classe (facultatif)",
    levelPlaceholder: "Détecté automatiquement (ex. Terminale)",
    scale: "Barème",
    scaleHint:
      "Le barème indiqué sur l'épreuve est toujours respecté ; celui-ci ne sert que si l'épreuve n'en indique pas.",
    strictness: "Niveau d'exigence",
    correctionPages: "Nombre de pages du corrigé",
    optConseils: "Ajouter des conseils personnalisés",
    optExplications: "Ajouter des explications détaillées",
    submit: "Corriger ma copie",
    submitExam: "Corriger l'épreuve",
    submitAnswerKey: "Générer le corrigé",
    submitting: "Correction en cours…",
    analyzingImage: "Analyse de l'image…",
    answerKeyHint:
      "Sans copie déposée, l'IA reprend l'épreuve et son cours d'origine pour produire le corrigé type : réponses attendues, barème et explications.",
    resultTitle: "Correction générée",
    resultTitleAnswerKey: "Corrigé généré",
    newCorrection: "Nouvelle correction",
    emptyTitle: "Aucune correction pour l'instant",
    emptyBody:
      "Importe ou scanne une épreuve (ou dépose ta copie), puis lance la correction : le corrigé détaillé s'affichera ici.",
    loadingSr: "Correction de l'épreuve en cours…",
    loadingHeading: "Correction en cours",
    loadingBanner:
      "EduIA lit l'épreuve, résout chaque question et rédige le corrigé — jusqu'à 2 à 3 minutes pour une épreuve complète.",
    stageAnalyzing: "Analyse de l'épreuve",
    stageAnalyzingBody: "Lecture des pages, détection de la matière, des questions et du barème.",
    stageDetected: (subject: string, level: string | null, count: number) =>
      [subject, level, `${count} question${count > 1 ? "s" : ""} détectée${count > 1 ? "s" : ""}`]
        .filter(Boolean)
        .join(" · "),
    stageEduiaMatched: "Épreuve EduIA reconnue : son cours d'origine est utilisé.",
    stageCorrecting: "Correction détaillée",
    stageCorrectingBody: "Résolution de chaque question, démarche et explications.",
    timeout:
      "La correction a pris trop de temps. Réessaie, ou importe l'épreuve en plusieurs parties.",
    connectionLost:
      "Connexion interrompue. Vérifie ta connexion internet puis réessaie.",
    genericFailure:
      "La correction a échoué. Réessaie dans un instant.",
    imageUnreadable:
      "Cette image est trop floue pour être corrigée correctement. Merci de reprendre la photo avec une meilleure luminosité et de vérifier que toute la page est visible.",
    pdfUnreadable:
      "Ce document est illisible et ne peut pas être corrigé correctement. Importe une version plus nette, ou des photos bien éclairées de chaque page.",
    pageRef: (n: number, name: string) => `Page ${n} (${name})`,
    pageUnreadable: (pages: string, message: string) => `${pages} : ${message}`,
    notAnExam:
      "Aucune question n'a été détectée dans ce document. Vérifie que tu as bien importé le sujet de l'épreuve (et pas seulement un cours), puis réessaie.",
    partialNotice: (pages: string | null) =>
      pages
        ? `Certains passages (${pages}) étaient difficiles à lire : vérifie les énoncés concernés dans la correction.`
        : "Certains passages de l'épreuve étaient difficiles à lire : vérifie les énoncés concernés dans la correction.",
    copyLabel: "Copie",
    answerKeyBadge: "Corrigé type",
    docTitle: "Correction de l'épreuve",
    metaLevel: "Niveau / Classe",
    metaSubject: "Matière",
    metaTheme: "Chapitre / Thème",
    metaDate: "Date",
    metaLength: "Longueur du corrigé",
    metaScale: "Barème",
    metaSource: "Épreuve",
    scaleFromExam: (max: string) => `Sur ${max} — barème de l'épreuve`,
    scaleProposed: (max: string) => `Sur ${max} — répartition proposée par EduIA`,
    sourceExternal: "Importée (hors EduIA)",
    sourceEduiaLabel: "Générée avec EduIA",
    questionLabel: (n: number) => `Question ${n}`,
    statementLabel: "Énoncé",
    yourAnswer: "Ta réponse",
    expectedAnswer: "Réponse correcte",
    stepsLabel: "Démarche",
    explanationLabel: "Explication",
    explanation: "Explication :",
    scoreAria: "Note obtenue",
    totalLabel: "Total",
    totalAnswerKey: "Total du barème",
    detailByQuestion: "Détail par question",
    answerKeyByQuestion: "Corrigé par question",
    keyPoints: "Points à retenir",
    strengths: "Points forts",
    improvements: "Points à travailler",
    advice: "Conseils pour progresser",
    methodAdvice: "Conseils de méthode",
    ptShort: (earned: number, max: number) => `${points(earned)} / ${points(max)} pt`,
    ptMax: (max: number) => `${points(max)} pt`,
    footer: (by: string, date: string, max: number) =>
      `Correction générée par ${by} · ${date} · Barème sur ${points(max)} points`,
    footerAnswerKey: (by: string, date: string, max: number) =>
      `Corrigé généré par ${by} · ${date} · Barème sur ${points(max)} points`,
    shareTitle: (title: string) => `Correction · ${title}`,
  },

  assistant: {
    metaTitle: "Assistant IA",
    metaDescription:
      "Pose tes questions à l'Assistant IA d'EduIA : explications, exercices, révisions — un vrai tuteur pédagogique à ta disposition.",
    pageIntro:
      "Pose une question sur ton cours, un exercice ou une notion que tu ne comprends pas : l'Assistant t'explique, étape par étape.",
    newConversation: "Nouvelle conversation",
    newConversationConfirmTitle: "Démarrer une nouvelle conversation ?",
    newConversationConfirmBody:
      "La conversation actuelle sera effacée. Cette action est irréversible.",
    newConversationError:
      "Impossible de démarrer une nouvelle conversation. Réessaie.",
    inputPlaceholder: "Écris ta question ici…",
    inputAria: "Ta question pour l'Assistant IA",
    send: "Envoyer",
    thinking: "L'Assistant réfléchit…",
    emptyTitle: "Pose ta première question",
    emptyBody:
      "Par exemple, demande une explication, un exemple concret, ou de l'aide sur un exercice.",
    suggestion1: "Explique-moi cette leçon simplement.",
    suggestion2: "Je ne comprends pas les fractions.",
    suggestion3: "Aide-moi à résoudre cet exercice.",
    you: "Toi",
    assistantName: "Assistant IA",
    errorGeneric: "L'Assistant n'a pas pu répondre. Réessaie dans un instant.",
    errorConnection:
      "Connexion interrompue. Vérifie ta connexion internet puis réessaie.",
    timeout: "L'Assistant met trop de temps à répondre. Réessaie.",
    charLimit: "Message trop long (4000 caractères maximum).",
    disclaimer:
      "L'Assistant IA peut se tromper : vérifie toujours les informations importantes.",
  },

  documents: {
    metaTitle: "Documents",
    metaDescription:
      "Retrouve tous les cours et fichiers que tu as importés dans EduIA : résume-les, génère des épreuves ou télécharge-les.",
    intro:
      "Retrouve tous les cours et fichiers importés dans EduIA. Résume-les, génère des épreuves ou télécharge-les à tout moment.",
    importButton: "Importer un cours",
    statDocuments: "Documents",
    statStorage: "Espace utilisé",
    statStorageAria: "Espace de stockage utilisé",
    statSummaries: "Résumés générés",
    libraryTitle: "Ma bibliothèque",
    countLabel: (n: number) => `${n} document${n > 1 ? "s" : ""}`,
    searchPlaceholder: "Rechercher un document…",
    searchAria: "Rechercher un document",
    allSubjects: "Toutes les matières",
    filterBySubject: "Filtrer par matière",
    sortAria: "Trier les documents",
    sortRecent: "Plus récents",
    sortName: "Nom (A → Z)",
    sortPages: "Nombre de pages",
    emptyTitle: "Aucun document importé",
    emptyBody:
      "Importe tes cours (PDF, Word, TXT ou image) : tu pourras ensuite les résumer ou générer des épreuves.",
    emptyCta: "Résumer un cours",
    noneFoundTitle: "Aucun document trouvé",
    noneFoundBody:
      "Aucun document ne correspond à ta recherche. Modifie les filtres ou importe un nouveau cours.",
    cardPagesMeta: (kind: string, size: string, pages: number) =>
      `${kind} · ${size} · ${pages} page${pages > 1 ? "s" : ""}`,
    summaryAvailable: "Résumé disponible",
    toProcess: "À traiter",
    importedOn: (date: string) => `Importé le ${date}`,
    summarize: "Résumer",
    actionsAria: (name: string) => `Actions pour « ${name} »`,
    open: "Ouvrir",
    rename: "Renommer",
    download: "Télécharger",
    delete: "Supprimer",
    openUnavailable:
      "Aucun résumé n'est encore associé à ce document. Résume-le pour pouvoir l'ouvrir.",
    downloadFile: (name: string) => `Télécharger « ${name} »`,
    downloadUnavailable:
      "Le fichier d'origine de ce document n'est pas disponible : il a été importé avant la conservation des fichiers, ou ton espace de stockage était plein.",
    renameTitle: "Renommer le document",
    renameBody: "Choisis un nouveau nom pour ce document.",
    renameField: "Nom du document",
    renamed: "Document renommé.",
    renameFailed: "Le document n'a pas pu être renommé. Réessaie.",
    deleteTitle: "Supprimer ce document ?",
    deleteBody: (name: string) =>
      `« ${name} » et son fichier d'origine seront supprimés de ta bibliothèque. Les résumés déjà générés restent disponibles.`,
    deleted: "Document supprimé.",
    deleteFailed: "Le document n'a pas pu être supprimé. Réessaie.",
  },

  historique: {
    metaTitle: "Historique",
    metaDescription:
      "Retrouve tous les résumés, épreuves et corrections que tu as générés avec EduIA.",
    heading: "Toute mon activité",
    filterAll: "Tous",
    filterSummaries: "Résumés",
    filterExams: "Épreuves",
    filterCorrections: "Corrections",
    emptyTitle: "Aucune activité pour l'instant",
    emptyBody:
      "Tes résumés, épreuves et corrections apparaîtront ici dès que tu les auras générés.",
    emptyCta: "Importer un cours",
    noneOfTypeTitle: "Aucun élément de ce type",
    noneOfTypeBody: "Change de filtre pour retrouver tes autres activités.",
  },

  parametres: {
    metaTitle: "Paramètres",
    metaDescription:
      "Gère ton profil, tes préférences, ta sécurité, tes notifications et ton abonnement EduIA.",
    title: "Paramètres",
    profileTitle: "Mon profil",
    profileDescription: "Tes informations personnelles.",
    fullName: "Nom complet",
    email: "Adresse e-mail",
    edit: "Modifier",
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Annuler",
    profileSaved: "Profil enregistré.",
    profileSaveFailed: "L'enregistrement a échoué. Réessaie.",
    securityTitle: "Sécurité",
    securityDescription: "Modifie ton mot de passe.",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le nouveau mot de passe",
    passwordMismatch: "Les deux mots de passe ne correspondent pas.",
    currentPasswordWrong: "Le mot de passe actuel est incorrect.",
    passwordUpdateFailed: "La mise à jour a échoué. Réessaie.",
    updatePassword: "Mettre à jour le mot de passe",
    updatingPassword: "Mise à jour…",
    passwordUpdated: "Mot de passe mis à jour.",
    subscriptionTitle: "Abonnement",
    subscriptionDescription: "État de ton compte EduIA.",
    planPremium: "EduIA Premium",
    planPremiumPlus: "EduIA Premium+",
    planFree: "Offre gratuite",
    planActive: "Actif",
    planFreeLabel: "Gratuit",
    premiumFullAccess: "500 crédits pour chaque mois d'abonnement.",
    premiumPlusFullAccess: "1 000 crédits pour chaque mois d'abonnement.",
    freeQuota: "10 crédits offerts à l'inscription, sans renouvellement.",
    manageSubscription: "Gérer l'abonnement",
    goPremium: "Passer à Premium",
    signOutTitle: "Se déconnecter",
    signOutBody: "Ferme ta session EduIA sur cet appareil.",
    signOut: "Se déconnecter",
  },

  premium: {
    metaTitle: "Premium",
    metaDescription:
      "Deux offres EduIA : Gratuit (crédits offerts à l'inscription) ou Premium à 2 500 FCFA par mois, payé par Mobile Money ou carte, sans prélèvement automatique.",
    heroBadgeFree: "Palier gratuit",
    heroBadgePremium: "Compte Premium",
    heroBadgePremiumPlus: "Compte Premium+",
    heroTitleFreeBefore: "Débloque tout le potentiel d'",
    heroTitleFreeAccent: "EduIA",
    heroTitlePremiumBefore: "Profite de ",
    heroTitlePremiumAccent: "500 crédits",
    heroTitlePremiumAfter: " chaque mois",
    heroTitlePremiumPlusBefore: "Profite de ",
    heroTitlePremiumPlusAccent: "1 000 crédits",
    heroTitlePremiumPlusAfter: " chaque mois",
    heroBodyFree:
      "Ton compte gratuit te donne 10 crédits à l'inscription pour tester tous les outils. Passe à Premium pour 500 crédits chaque mois, à 2 500 FCFA par mois.",
    heroBodyPremium:
      "500 crédits pour chaque mois d'abonnement : résume, génère, corrige et discute avec l'Assistant IA sans compter.",
    heroBodyPremiumPlus:
      "1 000 crédits pour chaque mois d'abonnement — le forfait le plus généreux, pour un usage intensif.",
    comparisonTitle: "Gratuit vs Premium",
    colFeature: "Fonctionnalité",
    colFree: "Gratuit",
    colPremium: "Premium",
    planFreeTitle: "Gratuit",
    planFreeDesc: "10 crédits offerts pour découvrir EduIA.",
    planPremiumTitle: "Premium",
    planPremiumDesc: "500 crédits chaque mois.",
    planPremiumPlusTitle: "Premium+",
    planPremiumBadge: "Recommandé",
    priceFree: "0 FCFA",
    currentPlan: "Ton offre actuelle",
    creditsPerMonth: (count: number) => `${count} crédits/mois`,
    comparisonRows: {
      "Résumer mes cours": "Résumer mes cours",
      "Générer une épreuve": "Générer une épreuve",
      "Corriger une épreuve": "Corriger une épreuve",
      "Assistance IA": "Assistance IA",
      "Import et analyse des documents": "Import et analyse des documents",
      "Historique complet": "Historique complet",
      "Renouvellement des crédits": "Renouvellement des crédits",
      "5 crédits/résumé": "5 crédits/résumé",
      "10 crédits/épreuve": "10 crédits/épreuve",
      "10 crédits/copie": "10 crédits/copie",
      "1 crédit/question": "1 crédit/question",
      "500 crédits chaque mois": "500 crédits chaque mois",
      "Non disponible": "Non disponible",
      "Incluse": "Incluse",
    } as Record<string, string>,
    pricePeriod: "/mois",
  },

  aide: {
    metaTitle: "Aide & support",
    metaDescription:
      "Trouve de l'aide sur EduIA : FAQ, contact de l'équipe et signalement de problème.",
    title: "Aide & support",
    pageIntro:
      "Nous sommes là pour t'aider. Trouve rapidement une réponse ou contacte-nous.",
    topicsTitle: "Comment pouvons-nous t'aider ?",
    topicsSubtitle: "Choisis le moyen le plus adapté à ta demande.",
    topicFaqTitle: "Questions fréquentes",
    topicFaqDesc: "Retrouve les réponses aux questions les plus courantes.",
    topicContactTitle: "Nous contacter",
    topicContactDesc:
      "Envoie-nous un message et nous te répondrons rapidement.",
    reportTitle: "Signaler un problème",
    reportTileDesc: "Rencontre un bug ou un souci ? Signale-le ici.",
    reportDialogBody: "Décris ce qui ne va pas, l'équipe EduIA s'en occupe.",
    reportType: "Type",
    reportDescription: "Description",
    reportDescriptionPlaceholder:
      "Ce que tu faisais, ce qui s'est passé, la page concernée…",
    reportTypeBug: "Un bug / une erreur",
    reportTypeSuggestion: "Une suggestion",
    reportTypeQuestion: "Une question",
    reportTypeOther: "Autre",
    reportSend: "Envoyer",
    reportSending: "Envoi…",
    reportSent: "Merci ! Ton signalement a bien été transmis à l'équipe.",
    reportTooShort: "Merci de décrire le problème (au moins 10 caractères).",
    reportSendFailed:
      "Impossible d'envoyer ton signalement pour le moment. Réessaie.",
    faqTitle: "Questions fréquentes",
    faqSubtitle: "Les bases pour bien démarrer avec EduIA.",
    tipTitle: "Conseil : consulte d'abord notre FAQ",
    tipBody: "Tu y trouveras peut-être déjà la réponse à ta question.",
    tipCta: "Voir la FAQ",
    contactTitle: "Autres moyens de contact",
    contactWhatsapp: "WhatsApp",
    contactWhatsappDesc:
      "Discute avec notre équipe sur WhatsApp pour une assistance rapide.",
    contactWhatsappCta: "Ouvrir WhatsApp",
    contactEmail: "Email",
    contactEmailDesc: "Écris-nous à tout moment, nous te répondrons rapidement.",
    contactEmailCta: "Envoyer un email",
    contactEmailCopied: (email: string) =>
      `Adresse copiée : ${email}. Colle-la dans ta messagerie si elle ne s'est pas ouverte automatiquement.`,
    contactHoursTitle: "Heures d'assistance",
    responseTime: "Nous répondons généralement sous 24 h, 7 jours sur 7.",
    supportDays: "Lundi - Dimanche",
    supportHours: "08h00 - 19h00",
    timezoneLabel: "Heure de l'Afrique (GMT+1)",
    prefilledMessage: "Bonjour, j'ai besoin d'aide avec EduIA.",
    contactSubject: "Demande d'aide EduIA",
    faq: {
      import: {
        q: "Comment importer un cours ?",
        a: "Ouvre « Résumer mes cours » ou « Documents », puis dépose un fichier PDF, Word ou texte (jusqu'à 15 Mo) dans la zone d'import. Tu peux aussi cliquer sur la zone pour parcourir tes fichiers.",
      },
      summarize: {
        q: "Comment résumer un cours ?",
        a: "Dans « Résumer mes cours », importe ton document, indique la matière et le niveau, choisis le type de résumé (clair, détaillé ou fiche de révision), puis clique sur « Résumer mon cours ». Le résumé structuré s'affiche à droite.",
      },
      generate: {
        q: "Comment générer une épreuve ?",
        a: "Dans « Générer une épreuve », sélectionne la matière, les chapitres à couvrir, le type de questions (QCM, questions ouvertes ou mixte) et le nombre de questions, puis lance la génération. L'épreuve apparaît avec son corrigé.",
      },
      grade: {
        q: "Comment corriger une épreuve ?",
        a: "Dans « Corriger une épreuve », importe ou scanne l'épreuve — même si elle n'a pas été créée avec EduIA (ancien sujet, photo, PDF…) — ou choisis une de tes épreuves EduIA. EduIA détecte la matière et les questions, puis rédige un corrigé détaillé. Ajoute ta copie si tu veux être noté question par question.",
      },
      account: {
        q: "Comment gérer mon compte ?",
        a: "Dans « Paramètres », tu peux modifier ton profil (nom, e-mail), changer ton mot de passe, régler la langue et les notifications, et gérer ton abonnement. Le bouton « Se déconnecter » se trouve en bas de la page.",
      },
    },
  },

  onboarding: {
    header: "Configurons ton espace EduIA",
    subheader:
      "Quelques questions pour personnaliser ton expérience d'apprentissage.",
    stepOf: (step: number, total: number) => `Étape ${step} sur ${total}`,
    back: "Précédent",
    next: "Suivant",
    finish: "Terminer",
    saving: "Enregistrement…",
    step1Title: "Faisons connaissance",
    step1Desc: "Ton prénom et ton pays, pour personnaliser ton expérience.",
    firstName: "Prénom",
    firstNamePlaceholder: "Ton prénom",
    step2Title: "Dans quel niveau es-tu ?",
    step2Desc: "Ça nous permet d'adapter le contenu à ton programme.",
    step3Title: "Quelles sont tes matières principales ?",
    step3Desc: "Sélectionne toutes celles qui te concernent.",
    step4Title: "Quel est ton objectif principal ?",
    step4Desc: "On mettra en avant les outils les plus utiles pour toi.",
    step5Title: "Dans quelles matières veux-tu progresser ?",
    step5Desc: "Choisis parmi tes matières principales.",
    step6Title: "Comment préfères-tu apprendre ?",
    step6Desc: "Dernière question, promis !",
    saveFailed:
      "Impossible d'enregistrer tes réponses pour le moment. Réessaie.",
    invalidAnswers:
      "Certaines réponses sont invalides. Recharge la page et réessaie.",
    goals: {
      comprendre: {
        label: "Comprendre mes cours",
        description: "Des explications claires, chapitre par chapitre.",
      },
      reviser: {
        label: "Réviser efficacement",
        description: "Des résumés et des fiches pour ancrer les notions.",
      },
      notes: {
        label: "Améliorer mes notes",
        description: "Progresser durablement dans mes matières.",
      },
      examen: {
        label: "Préparer un examen",
        description: "M'entraîner dans les conditions du jour J.",
      },
      devoirs: {
        label: "Faire mes devoirs",
        description: "De l'aide au quotidien sur mes exercices.",
      },
    },
    styles: {
      resume: {
        label: "Des résumés",
        description: "L'essentiel, clair et synthétique.",
      },
      explications: {
        label: "Des explications détaillées",
        description: "Comprendre chaque étape en profondeur.",
      },
      exercices: {
        label: "Des exercices",
        description: "Apprendre en pratiquant.",
      },
      qcm: {
        label: "Des QCM",
        description: "Tester mes connaissances rapidement.",
      },
      quiz: {
        label: "Des quiz interactifs",
        description: "Réviser en s'amusant.",
      },
    },
  },

  auth: {
    loginTitle: "Se connecter",
    signupTitle: "Créer un compte",
    loginSubtitle: (name: string) => `Content de te revoir sur ${name}.`,
    signupSubtitle: (name: string) => `Rejoins ${name} et apprends plus vite.`,
    fullName: "Nom complet",
    email: "Adresse e-mail",
    password: "Mot de passe",
    loginSubmit: "Se connecter",
    signupSubmit: "Créer mon compte",
    loginPending: "Connexion…",
    signupPending: "Création…",
    haveAccount: "Déjà un compte ? ",
    noAccount: "Pas encore de compte ? ",
    goLogin: "Se connecter",
    goSignup: "Créer un compte",
    errInvalidCredentials:
      "Adresse e-mail ou mot de passe incorrect. Veuillez vérifier vos identifiants.",
    errUserExists: "Un compte existe déjà avec cette adresse e-mail.",
    errPasswordShort: "Le mot de passe doit contenir au moins 8 caractères.",
    errPasswordLong: "Le mot de passe est trop long.",
    errInvalidEmail: "Adresse e-mail invalide.",
    errSignupFailed: "La création du compte a échoué. Réessaie.",
    errLoginFailed: "La connexion a échoué. Réessaie.",
    errGoogleFailed: "La connexion avec Google a échoué. Réessaie.",
    errGoogleCancelled: "Connexion avec Google annulée. Tu peux réessayer ou utiliser ton e-mail.",
    errGoogleAccountNotLinked:
      "Un compte EduIA existe déjà avec cette adresse e-mail. Connecte-toi avec ton e-mail et ton mot de passe.",
    continueWithGoogle: "Continuer avec Google",
    googlePending: "Redirection vers Google…",
    orDivider: "ou",
    metaLoginTitle: "Connexion",
    metaSignupTitle: "Inscription",
    rememberMe: "Se souvenir de moi",
    forgotPassword: "Mot de passe oublié ?",
    forgotPasswordUnavailable: (email: string) =>
      `La réinitialisation par e-mail n'est pas encore disponible. Écris-nous à ${email} si tu es bloqué·e.`,
    metaForgotTitle: "Mot de passe oublié",
    metaResetTitle: "Nouveau mot de passe",
    forgotTitle: "Mot de passe oublié",
    forgotSubtitle:
      "Indique l'adresse e-mail de ton compte : nous t'enverrons un lien pour choisir un nouveau mot de passe.",
    forgotSubmit: "Envoyer le lien",
    forgotPending: "Envoi…",
    forgotSentTitle: "Vérifie ta boîte e-mail",
    forgotSentBody: (email: string) =>
      `Si un compte existe pour ${email}, un lien de réinitialisation vient d'y être envoyé. Il est valable 1 heure. Pense à regarder dans les courriers indésirables.`,
    forgotFailed: "La demande n'a pas pu être envoyée. Réessaie dans quelques minutes.",
    backToLogin: "Retour à la connexion",
    resetTitle: "Nouveau mot de passe",
    resetSubtitle: "Choisis un nouveau mot de passe pour ton compte (8 caractères minimum).",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirme le mot de passe",
    resetSubmit: "Enregistrer le mot de passe",
    resetPending: "Enregistrement…",
    errPasswordMismatch: "Les deux mots de passe ne correspondent pas.",
    resetInvalidTitle: "Lien expiré",
    resetInvalidBody:
      "Ce lien de réinitialisation n'est plus valable (expiré ou déjà utilisé). Demande-en un nouveau.",
    requestNewLink: "Demander un nouveau lien",
    resetFailed: "Le mot de passe n'a pas pu être modifié. Réessaie.",
    resetDoneTitle: "Mot de passe modifié",
    resetDoneBody:
      "Ton mot de passe a été changé et tes autres sessions ont été fermées. Connecte-toi avec ton nouveau mot de passe.",
    showcaseEyebrow: "Plateforme d'apprentissage IA",
    showcaseSlogan: "Apprends mieux, avance plus loin.",
    showcaseDescription:
      "EduIA aide chaque étudiant à comprendre ses cours plus vite : résumés clairs, épreuves générées sur mesure, corrections détaillées et un Assistant IA disponible à tout moment pour répondre à tes questions.",
    showcaseBilingualNote: "Disponible en français et en anglais",
    showcaseToolSummarize: "Résumer",
    showcaseToolGenerate: "Générer",
    showcaseToolGrade: "Corriger",
    showcaseToolAssistant: "Assistant IA",
  },

  marketing: {
    nav: {
      home: "Accueil",
      features: "Fonctionnalités",
      how: "Comment ça marche",
      pricing: "Tarifs",
      about: "À propos",
    },
    header: {
      dashboardCta: "Mon tableau de bord",
      login: "Se connecter",
      signup: "Commencer gratuitement",
      languageAria: "Changer de langue",
      openMenu: "Ouvrir le menu",
      closeMenu: "Fermer le menu",
      navLabel: "Navigation principale",
      mobileNavLabel: "Navigation mobile",
      sheetTitle: "Navigation",
      sheetDescription: "Liens de navigation et connexion",
      homeAria: "EduIA, retour à l'accueil",
    },
    hero: {
      badge: "L'IA au service de l'apprentissage",
      titleLine1: "Des cours aux épreuves,",
      titleLine2: "tout devient ",
      titleAccent: "plus simple.",
      subtitle:
        "Résumés clairs, épreuves adaptées et corrections détaillées, créés en quelques secondes à partir de tes propres cours.",
      ctaPrimary: "Commencer gratuitement",
      ctaSecondary: "Voir la démo",
      imageAlt:
        "Une élève révise le soir devant son ordinateur portable, dans une bibliothèque baignée de lumière violette",
      cards: {
        summaryLabel: "Résumé généré",
        summaryTitle: "La photosynthèse",
        summaryMeta: "SVT · Terminale",
        examLabel: "Épreuve créée",
        examTitle: "Devoir surveillé",
        examMeta: "4 parties, barème sur 20",
        correctionLabel: "Correction détaillée",
        correctionScore: "16/20",
        correctionPraise: "Belle progression",
        assistantLabel: "Assistant IA",
        assistantQuestion: "Explique-moi le cycle de Calvin.",
      },
    },
    statsLabel: "EduIA en bref",
    stats: [
      { value: "100 %", label: "Adapté à ton niveau et à ton programme" },
      { value: "3 min", label: "Pour transformer un cours en résumé clair" },
      { value: "24/7", label: "Ton assistant d'apprentissage disponible" },
      { value: "0 FCFA", label: "Pour créer ton compte, sans carte bancaire" },
    ],
    how: {
      heading: "Comment",
      headingAccent: "ça marche",
      headingSuffix: " ?",
      subtitle: "Trois étapes simples pour transformer tes cours en résultats.",
      steps: [
        {
          title: "Importe ton cours",
          description:
            "PDF, Word, texte ou photo de ton cahier : EduIA lit tout, même l'écriture manuscrite.",
        },
        {
          title: "Génère ton contenu",
          description:
            "En quelques secondes, un résumé structuré, une épreuve adaptée à ton niveau, ou les deux.",
        },
        {
          title: "Apprends et progresse",
          description:
            "Réponds, fais-toi corriger question par question et suis tes progrès.",
        },
      ],
      screens: {
        time: "9:41",
        fileName: "Cours-SVT.pdf",
        filePages: "3 pages",
        formats: ["PDF", "Image", "Word"],
        previewLabel: "Aperçu du document",
        analyze: "Analyser avec l'IA",
        analyzing: "Analyse du cours par l'IA…",
        summaryReady: "Résumé du cours",
        keyPoints: ["Chloroplastes", "Photolyse", "Cycle de Calvin"],
        subjectValue: "SVT",
        levelValue: "Terminale",
        questionsValue: "10",
        durationValue: "2h",
        totalPointsValue: "20 points",
        examReady: "Épreuve prête",
        examMeta: "4 parties, barème sur 20",
        correctionLabel: "Correction",
        praise: "Belle progression",
      },
      phoneAriaSummarize: "Aperçu : importer un cours et obtenir son résumé avec EduIA",
      phoneAriaGrade: "Aperçu : générer une épreuve et voir sa correction avec EduIA",
    },
    demo: {
      heading: "Vois EduIA",
      headingAccent: "en action",
      subtitle: "Découvre l'interface d'EduIA en moins d'une minute.",
      play: "Lancer la vidéo",
      video: {
        aria: "Vidéo de démonstration d'EduIA",
        fallback: "Ton navigateur ne prend pas en charge la lecture vidéo.",
      },
    },
    features: {
      heading: "De ton cours à ta",
      headingAccent: "réussite",
      subtitle:
        "Chaque outil prend le relais du précédent : ton cours devient un parcours de révision complet.",
      stepsLabel: "Les étapes du parcours EduIA",
      steps: [
        {
          label: "Cours",
          title: "Pars de ce que tu as déjà",
          body: "Un PDF, un document Word, du texte collé ou jusqu'à 5 photos de ton cahier, lus comme un seul cours.",
        },
        {
          label: "Résumé",
          title: "Un résumé structuré, fidèle à ton cours",
          body: "Grandes parties, sous-parties, définitions et points clés : une vraie fiche de révision, sans rien inventer.",
        },
        {
          label: "Épreuve",
          title: "Une épreuve comme en classe",
          body: "Parties A à D, barème exact, difficulté progressive, en français ou en anglais, prête à imprimer en PDF.",
        },
        {
          label: "Correction",
          title: "Une correction qui explique",
          body: "Une note sur ton barème, l'explication de chaque réponse et des conseils concrets pour progresser.",
        },
        {
          label: "Progression",
          title: "Tout ton travail au même endroit",
          body: "Tes documents, résumés, épreuves et corrections restent dans ton historique, prêts pour tes révisions.",
        },
      ],
      previews: {
        course: {
          dropTitle: "Glisse-dépose tes fichiers",
          dropHint: "PDF, Word, texte ou photo, jusqu'à 5 fichiers",
          files: ["Cours-SVT.pdf", "Chapitre-3.docx", "Photo-cahier.jpg"],
          reading: "Lecture des pages",
          readingCount: "3 / 5",
        },
        summary: {
          title: "La photosynthèse",
          part1: "Définition et bilan",
          sub1: "Rôle des chloroplastes",
          sub1Body:
            "La photosynthèse se déroule dans les chloroplastes, grâce à la chlorophylle qui capte l'énergie lumineuse.",
          sub2: "Équation bilan",
          part2: "Les deux phases",
        },
        exam: {
          title: "Évaluation de SVT",
          level: "Classe : Terminale",
          duration: "Durée : 2h",
          scale: "Barème : 20 pts",
          partLabel: "PARTIE A",
          partTitle: "Connaissances et compréhension",
          partPoints: "8 pts",
          question: "Quelle est la définition de la photosynthèse ?",
          choices: [
            "La production de matière organique à partir de lumière",
            "La consommation de dioxygène pendant la nuit",
          ],
          question2: "Dans quel organite se déroule-t-elle ?",
          points: "2 pts",
        },
        correction: {
          score: "16/20",
          scoreLabel: "Note obtenue",
          rows: [
            { question: "A.1", verdict: "Juste", points: "2 / 2" },
            { question: "A.2", verdict: "Partiel", points: "1 / 2" },
            { question: "B.1", verdict: "Juste", points: "3 / 3" },
          ],
          feedback: "A.2 : précise le rôle des thylakoïdes dans la phase claire.",
        },
        progress: {
          heading: "Historique",
          items: [
            { type: "Résumé", title: "La photosynthèse", status: "Prêt" },
            { type: "Épreuve", title: "Évaluation de SVT", status: "Prête" },
            { type: "Correction", title: "Évaluation de SVT", status: "16/20" },
          ],
          creditsLabel: "Crédits disponibles",
          creditsValue: "465 / 500",
        },
      },
      extrasHeading: "Et aussi, dans ton espace",
      extras: [
        {
          title: "Assistant IA",
          body: "Pose tes questions à toute heure : l'assistant t'explique tes cours simplement.",
        },
        {
          title: "Documents",
          body: "Tous tes cours importés, au même endroit, filtrables par matière.",
        },
        {
          title: "Historique",
          body: "Chaque résumé, épreuve et correction, daté et accessible en un clic.",
        },
      ],
      extrasPreview: {
        assistantQuestion: "Pourquoi la phase sombre a-t-elle besoin d'ATP ?",
        assistantAnswer:
          "Le cycle de Calvin utilise l'énergie de l'ATP, produit pendant la phase claire, pour fixer le CO2 et fabriquer du glucose.",
        documents: ["Cours-SVT.pdf", "Histoire-Chapitre-2.docx", "Maths-Fonctions.pdf"],
        documentsFilter: "SVT",
        history: [
          { label: "Résumé : La photosynthèse", time: "Aujourd'hui" },
          { label: "Épreuve : Fonctions affines", time: "Hier" },
          { label: "Correction : 16/20", time: "Lundi" },
        ],
      },
    },
    subjects: {
      heading: "Toutes tes",
      headingAccent: "matières",
      subtitle:
        "Du collège au supérieur, EduIA s'adapte à la matière et au niveau que tu indiques.",
      items: [
        { name: "Mathématiques", topics: "Fonctions, équations, géométrie" },
        { name: "Physique-Chimie", topics: "Mécanique, électricité, réactions" },
        { name: "SVT", topics: "Cellule, génétique, écosystèmes" },
        { name: "Histoire", topics: "Guerres mondiales, décolonisation" },
        { name: "Géographie", topics: "Territoires, mondialisation" },
        { name: "ECM", topics: "Citoyenneté, droits, institutions" },
        { name: "Français", topics: "Analyse de texte, dissertation" },
        { name: "Philosophie", topics: "Conscience, liberté, vérité" },
        { name: "Anglais", topics: "Grammar, reading, writing" },
        { name: "Et toutes les autres", topics: "Économie, informatique, langues…" },
      ],
    },
    why: {
      heading: "Un assistant intelligent pour",
      headingAccent: "mieux apprendre",
      headingSuffix: ".",
      subtitle:
        "Moins de temps à mettre en forme tes cours, plus de temps pour comprendre et t'entraîner.",
      benefits: [
        {
          title: "Résumés structurés",
          body: "Des fiches claires, organisées en parties et sous-parties.",
        },
        {
          title: "Épreuves adaptées",
          body: "À ton niveau, à ta matière et à ton barème.",
        },
        {
          title: "Corrections pédagogiques",
          body: "Chaque erreur expliquée, avec la bonne méthode.",
        },
        {
          title: "Gain de temps",
          body: "Ton cours devient un support de révision en quelques secondes.",
        },
        {
          title: "Apprentissage efficace",
          body: "Révise, entraîne-toi, fais-toi corriger, recommence.",
        },
        {
          title: "Accessible partout",
          body: "Sur ordinateur, tablette et téléphone, en français ou en anglais.",
        },
      ],
      imageAlt:
        "Un élève sourit en prenant des notes dans son cahier, à côté de son ordinateur portable",
      cards: {
        sheetLabel: "Fiche de révision prête",
        sheetTitle: "Les fonctions affines",
        sheetMeta: "Mathématiques · Seconde",
        assistantLabel: "Assistant IA",
        assistantQuestion: "Pourquoi a > 0 rend f croissante ?",
      },
    },
    proof: {
      text: "Rejoins les premières promos qui révisent plus intelligemment avec EduIA.",
      testimonialsHeading: "Ce qu'en disent les élèves",
    },
    pricing: {
      heading: "Des",
      headingAccent: "tarifs",
      headingSuffix: "simples",
      subtitle: "Commence gratuitement, passe au Premium quand tu veux aller plus loin.",
      period: "/mois",
      recommended: "Recommandé",
      credits: (credits: number) => `${credits} crédits`,
      creditsOnce: "offerts à l'inscription",
      creditsMonthly: "chaque mois",
      choosePlan: "Choisir cette offre",
      free: {
        name: "Gratuit",
        cta: "Commencer gratuitement",
        points: (credits: number) => [
          `${credits} crédits offerts à l'inscription`,
          "Résumés, épreuves, corrections et Assistant IA",
          "Accès à ton tableau de bord",
        ],
      },
      premium: {
        name: "Premium",
        cta: "Passer au Premium",
        points: (credits: number) => [
          `${credits} crédits chaque mois`,
          "Résumés, épreuves et corrections dans la limite de ton quota",
          "Assistant IA et analyse de documents",
          "Historique complet",
        ],
      },
      costsHeading: "Ce que coûte chaque outil",
      costs: {
        resumer: "Résumé de cours",
        generer: "Épreuve générée",
        corriger: "Correction",
        assistant: "Message à l'assistant",
      },
      costUnit: (credits: number) => (credits > 1 ? `${credits} crédits` : `${credits} crédit`),
    },
    payment: {
      heading: "Paiement simple, en FCFA",
      subtitle: "Des règles claires, pour savoir exactement ce que tu paies.",
      points: {
        fcfa: "Tous les prix sont affichés en FCFA.",
        noCard: "Le compte gratuit ne demande aucune carte bancaire.",
        premium: (price: string, credits: number) => `Premium : ${price} par mois, ${credits} crédits inclus.`,
        monthly: "Abonnement d'un mois, sans prélèvement automatique : tu renouvelles quand tu veux.",
      },
      methodsHeading: "Moyens de paiement acceptés",
    },
    cta: {
      heading: "Prêt à apprendre plus",
      headingAccent: "intelligemment",
      headingSuffix: " ?",
      subtitle: (credits: number) =>
        `Crée ton compte gratuitement et reçois ${credits} crédits pour essayer tous les outils.`,
      button: "Commencer gratuitement",
      secondary: "Voir les tarifs",
      reassurance: "Gratuit et sans carte bancaire.",
      laptopAria: "Aperçu du tableau de bord EduIA",
      sampleName: "Awa",
    },
    footer: {
      description: (name: string) =>
        `${name} est un assistant d'apprentissage basé sur l'intelligence artificielle : importe tes cours, génère des épreuves adaptées, corrige tes réponses et progresse chaque jour.`,
      productHeading: "Produit",
      resourcesHeading: "Ressources",
      accountHeading: "Compte",
      languageHeading: "Langue",
      help: "Aide & support",
      contact: "Contact",
      login: "Se connecter",
      signup: "Commencer gratuitement",
      copyright: (name: string, year: number) =>
        `© ${year} ${name}. Tous droits réservés.`,
    },
  },

  ui: {
    close: "Fermer",
    confirm: "Confirmer",
    cancel: "Annuler",
  },

  ai: {
    notSignedIn: "Connecte-toi pour utiliser cette fonctionnalité.",
    invalidRequest: "Requête invalide.",
    fileTooLarge: (size: string) =>
      `Fichier trop volumineux (${size}). Limite : 15 Mo, sépare ton cours en plusieurs parties.`,
    unsupportedFormat:
      "Format non pris en charge. Importe un PDF, un fichier Word (.docx), un fichier texte ou une photo de ton cours.",
    tooManyFiles: (max: number) =>
      `Trop de fichiers envoyés (maximum ${max}).`,
    uploadFailed:
      "Le fichier n'a pas pu être envoyé. Vérifie ta connexion internet et réessaie.",
    keyInvalid:
      "Clé OpenAI invalide ou manquante côté serveur. Vérifie OPENAI_API_KEY dans .env.local.",
    serviceUnavailable:
      "Le service IA est momentanément indisponible. Réessaie plus tard ; si le problème persiste, signale-le depuis « Aide & support ».",
    rateLimited:
      "Trop de demandes envoyées à l'IA pour le moment. Réessaie dans quelques instants.",
    timeout:
      "L'IA met trop de temps à répondre. Réessaie, ou raccourcis ton cours si le document est très long.",
    connectionFailed:
      "Connexion au service IA impossible pour le moment. Réessaie dans un instant.",
    badRequest: "La demande envoyée à l'IA est invalide.",
    apiError: "Le service IA est momentanément indisponible. Réessaie.",
    unexpected: "Une erreur inattendue est survenue pendant la génération.",
    truncated:
      "La réponse de l'IA a été coupée car trop longue. Réessaie, ou choisis un nombre de pages plus court.",
    contentFiltered:
      "L'IA n'a pas pu traiter cette demande. Reformule ou modifie le contenu envoyé.",
    noOutput: (label: string) =>
      `L'IA n'a pas pu générer de ${label} exploitable. Réessaie.`,
    noAnswerToGrade:
      "Rien à corriger : sélectionne une épreuve, dépose une copie ou saisis tes réponses.",
    labelSummary: "résumé",
    labelExam: "épreuve",
    labelCorrection: "correction",
  },

  country: {
    label: "Dans quel pays étudies-tu ?",
    placeholder: "Choisis ton pays",
    groupAfrica: "Afrique",
    groupOther: "Autres pays",
    other: "Autre pays",
    unknown: "Inconnu",
    privacyNote:
      "Ton pays sert uniquement aux statistiques d'EduIA et à mieux adapter l'application à ton programme.",
    promptTitle: "Dans quel pays étudies-tu ?",
    promptBody: "Aide-nous à adapter EduIA à ton pays et à ton programme scolaire.",
    promptSave: "Enregistrer",
    promptSaving: "Enregistrement…",
    promptSaved: "Pays enregistré, merci !",
    promptFailed: "Impossible d'enregistrer ton pays. Réessaie.",
  },

  credits: {
    // Garde-fou des routes IA (crédits insuffisants).
    insufficientMessage:
      "Crédits insuffisants. Passe à Premium (500 crédits par mois) ou renouvelle ton abonnement pour continuer.",

    signupCreditsLabel: (count: number) => `${count} crédits offerts à l'inscription`,

    // Dashboard — section crédits.
    sectionTitle: "Tes crédits",
    availableLabel: "Crédits disponibles",
    usedLabel: "Crédits utilisés",
    availableOf: (available: number, total: number) => `${available} / ${total}`,
    unlimitedValue: "Illimités",
    unlimitedHint: "Compte administrateur : crédits illimités pour tes tests, aucun paiement nécessaire.",
    noSubscriptionHint:
      "Palier gratuit — crédits d'inscription, sans renouvellement mensuel.",
    activeUntil: (date: string) => `Actif jusqu'au ${date}`,
    usageSummaryTitle: "Résumé d'utilisation",
    usageSummaries: (count: number) => `Résumés effectués : ${count}`,
    usageExams: (count: number) => `Épreuves générées : ${count}`,
    usageCorrections: (count: number) => `Épreuves corrigées : ${count}`,
    usageAssistant: (count: number) =>
      `Questions posées à l'Assistant IA : ${count}`,

    // Bandeau « crédits insuffisants » (boutons d'action).
    insufficientTitle: "Crédits insuffisants",
    upgradeCta: "Voir l'offre Premium",
  },

  billing: {
    payWithMaketou: "Payer avec Maketou",
    renewCta: "Renouveler (+1 mois)",
    redirecting: "Redirection vers le paiement…",
    activeUntil: (date: string) => `Actif jusqu'au ${date}`,
    downgradeLocked: "Disponible à la fin de ton abonnement Premium+",
    unavailable: "Paiement bientôt disponible",
    secureLine: "Paiement sécurisé via Maketou",
    cardLabel: "Carte bancaire",
    noAutoRenew: "Pas de prélèvement automatique : chaque paiement couvre un mois, tu renouvelles quand tu veux.",
    testOfferTitle: "Offre de test (admin)",
    testOfferBody: (price: string, credits: number) =>
      `Vrai paiement de ${price} pour vérifier l'intégration → ${credits} crédits.`,
    errorNotConfigured: "Le paiement n'est pas encore disponible. Réessaie plus tard.",
    errorTooMany: "Trop de tentatives de paiement en peu de temps. Réessaie dans une heure.",
    errorDowngrade: "Tu pourras choisir Premium à la fin de ton abonnement Premium+.",
    errorGeneric: "Le paiement n'a pas pu démarrer. Réessaie dans un instant.",
    returnMetaTitle: "Confirmation du paiement",
    checkingTitle: "Confirmation du paiement…",
    checkingBody: "Nous vérifions ton paiement auprès de Maketou. Cela prend en général quelques secondes.",
    successTitle: "Paiement confirmé — accès activé",
    successPlan: (plan: string, date: string) => `${plan} est actif jusqu'au ${date}.`,
    successBalance: (total: number) => `Tu as maintenant ${total} crédits disponibles.`,
    dashboardCta: "Aller au tableau de bord",
    premiumCta: "Voir mon abonnement",
    failedTitle: "Paiement non abouti",
    failedBody: "Le paiement n'a pas été finalisé. Si tu as été débité, ton accès s'activera automatiquement dès que Maketou l'aura confirmé — au plus tard à ta prochaine visite sur EduIA.",
    retryCta: "Réessayer",
    pendingTitle: "Paiement en cours de confirmation",
    pendingBody: "Tu peux fermer cette page : ton accès s'activera automatiquement dès que Maketou aura confirmé le paiement — en général en quelques minutes, au plus tard à ta prochaine visite sur EduIA.",
    confirmedOnVisit: "Paiement Maketou confirmé : ton achat a été ajouté à ton compte.",
    loginTitle: "Connecte-toi pour finaliser",
    loginBody: "Connecte-toi au compte avec lequel tu as payé : ton paiement sera confirmé automatiquement.",
    loginCta: "Se connecter",
  },
};

/**
 * Forme de référence des dictionnaires.
 */
export type Dictionary = typeof fr;
