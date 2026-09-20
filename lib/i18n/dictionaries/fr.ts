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
      "Soumets tes réponses et reçois une correction détaillée avec des conseils pour progresser.",
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
    replace: "Remplacer",
    retry: "Réessayer",
    chooseAnother: "Choisir un autre fichier",
    removeFile: "Retirer le fichier",
    close: "Fermer",
    readImpossible: "Lecture impossible",
    textExtracted: "Texte extrait",
    imported: "Importé",
    ocrCharsRead: (count: string) => `${count} caractères lus par OCR`,
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
      "Dépose ta copie ou saisis tes réponses : reçois une note, un commentaire par question et des conseils pour progresser.",
    step1: "Déposer ta copie",
    step2: "Options de correction",
    dropLabel: "Dépose ta copie ici",
    dropHint: "PDF, Word, TXT ou photo de ta copie",
    formats: "PDF, Word, TXT ou image (JPG, PNG, WEBP) · 15 Mo max",
    orTypeAnswers: "Ou saisis tes réponses",
    answersPlaceholder: "Recopie ici tes réponses, numérotées par question…",
    relatedExam: "Épreuve concernée",
    noExamSaved: "Aucune épreuve enregistrée",
    level: "Niveau / Classe",
    levelPlaceholder: "Entre ton niveau ou ta classe (ex. Terminale)",
    questionsMeta: (count: number, subject: string, level: string) =>
      `${count} questions · ${subject} · ${level}`,
    scale: "Barème",
    strictness: "Niveau d'exigence",
    correctionPages: "Nombre de pages du corrigé",
    optConseils: "Ajouter des conseils personnalisés",
    optExplications: "Ajouter des explications détaillées",
    submit: "Corriger ma copie",
    submitAnswerKey: "Générer le corrigé",
    submitting: "Correction en cours…",
    analyzingImage: "Analyse de l'image…",
    answerKeyHint:
      "Sans copie déposée, l'IA reprend l'épreuve et son cours d'origine pour produire le corrigé type : réponses attendues, barème et explications.",
    resultTitle: "Correction générée",
    resultTitleAnswerKey: "Corrigé généré",
    emptyTitle: "Aucune correction pour l'instant",
    emptyBody:
      "Dépose une copie ou saisis tes réponses, puis lance la correction : le bilan détaillé s'affichera ici.",
    loadingSr: "Correction de la copie en cours…",
    loadingHeading: "Correction en cours",
    loadingBanner:
      "EduIA lit ta copie, note chaque question et rédige un bilan en 10 à 40 secondes.",
    timeout:
      "La correction a pris trop de temps. Réessaie, ou avec une copie plus courte.",
    connectionLost:
      "Connexion interrompue. Vérifie ta connexion internet puis réessaie.",
    genericFailure:
      "La correction de la copie a échoué. Réessaie dans un instant.",
    docTitle: "Corrigé détaillé",
    metaLevel: "Niveau / Classe",
    metaSubject: "Matière",
    metaTheme: "Chapitre / Thème",
    metaDate: "Date",
    metaLength: "Longueur du corrigé",
    yourAnswer: "Ta réponse",
    expectedAnswer: "Correction attendue",
    explanation: "Explication :",
    scoreAria: "Note obtenue",
    detailByQuestion: "Détail par question",
    answerKeyByQuestion: "Corrigé par question",
    strengths: "Points forts",
    improvements: "Points à travailler",
    advice: "Conseils pour progresser",
    methodAdvice: "Conseils de méthode",
    ptShort: (earned: number, max: number) => `${earned} / ${max} pt`,
    ptMax: (max: number) => `${max} pt`,
    footer: (by: string, date: string, max: number) =>
      `Correction générée par ${by} · ${date} · Barème sur ${max} points`,
    footerAnswerKey: (by: string, date: string, max: number) =>
      `Corrigé généré par ${by} · ${date} · Barème sur ${max} points`,
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
    importButton: "Importer un document",
    importSelected: (names: string) =>
      `« ${names} » sélectionné. L'envoi vers le stockage (Supabase Storage) sera branché ici.`,
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
    previewSoon:
      "L'aperçu du document sera disponible une fois le stockage (Supabase Storage) connecté.",
    openUnavailable:
      "Aucun résumé n'est encore associé à ce document. Résume-le pour pouvoir l'ouvrir.",
    downloadSoon:
      "Le téléchargement du fichier d'origine sera disponible une fois le stockage connecté.",
    renameTitle: "Renommer le document",
    renameBody: "Choisis un nouveau nom pour ce document.",
    renameField: "Nom du document",
    renamed: "Document renommé. La persistance sera assurée par Supabase.",
    deleteTitle: "Supprimer ce document ?",
    deleteBody: (name: string) => `« ${name} » sera retiré de ta bibliothèque.`,
    deleted: "Document supprimé de la liste.",
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
    notificationsTitle: "Notifications",
    notificationsDescription:
      "Sois prévenu quand un résumé, une épreuve ou une correction est prêt.",
    emailNotifications: "Notifications par e-mail",
    enabled: "Activées",
    disabled: "Désactivées",
    notificationsToggleAria: "Activer les notifications par e-mail",
    notificationsOn: "Notifications activées.",
    notificationsOff: "Notifications désactivées.",
    subscriptionTitle: "Abonnement",
    subscriptionDescription: "État de ton compte EduIA.",
    planPremium: "EduIA Premium",
    planPremiumPlus: "EduIA Premium+",
    planFree: "Offre gratuite",
    planActive: "Actif",
    planFreeLabel: "Gratuit",
    premiumFullAccess: "500 crédits renouvelés chaque mois.",
    premiumPlusFullAccess: "1 000 crédits renouvelés chaque mois.",
    freeQuota: "20 crédits offerts à l'inscription, sans renouvellement.",
    manageSubscription: "Gérer l'abonnement",
    goPremium: "Passer à Premium",
    signOutTitle: "Se déconnecter",
    signOutBody: "Ferme ta session EduIA sur cet appareil.",
    signOut: "Se déconnecter",
  },

  premium: {
    metaTitle: "Premium",
    metaDescription:
      "Choisis ton forfait EduIA : crédits gratuits à l'inscription, ou un abonnement mensuel pour résumer, générer et corriger sans y penser.",
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
      "Ton compte gratuit te donne 20 crédits à l'inscription pour tester tous les outils. Passe à un forfait payant pour un quota qui se renouvelle chaque mois.",
    heroBodyPremium:
      "500 crédits renouvelés chaque mois pour résumer, générer, corriger et discuter avec l'Assistant IA sans compter.",
    heroBodyPremiumPlus:
      "1 000 crédits renouvelés chaque mois — le forfait le plus généreux, pour un usage intensif.",
    comparisonTitle: "Gratuit vs Premium vs Premium+",
    colFeature: "Fonctionnalité",
    colFree: "Gratuit",
    colPremium: "Premium",
    colPremiumPlus: "Premium+",
    planFreeTitle: "Gratuit",
    planFreeDesc: "20 crédits offerts pour découvrir EduIA.",
    planPremiumTitle: "Premium",
    planPremiumDesc: "500 crédits chaque mois.",
    planPremiumPlusTitle: "Premium+",
    planPremiumPlusDesc: "1 000 crédits chaque mois.",
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
      "1 000 crédits chaque mois": "1 000 crédits chaque mois",
      "Non disponible": "Non disponible",
      "Incluse": "Incluse",
    } as Record<string, string>,
    pricePeriod: "/mois",
  },

  aide: {
    metaTitle: "Aide & support",
    metaDescription:
      "Trouve de l'aide sur EduIA : FAQ, contact par e-mail ou WhatsApp, et signalement de problème.",
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
    topicWhatsappTitle: "WhatsApp",
    topicWhatsappDesc: "Discute directement avec notre équipe sur WhatsApp.",
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
    responseTime: "Nous répondons généralement sous 24 h (jours ouvrés).",
    supportDays: "Lundi - Vendredi",
    supportHours: "08h00 - 18h00",
    timezoneLabel: "Heure de Yaoundé (GMT+1)",
    prefilledMessage: "Bonjour, j'ai besoin d'aide avec EduIA.",
    contactSubject: "Demande d'aide · EduIA",
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
        a: "Dans « Corriger une épreuve », choisis l'épreuve de référence, dépose ta copie ou saisis tes réponses, règle le barème, puis lance la correction. Tu obtiens une note, un commentaire par question et des conseils pour progresser.",
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
    step1Title: "Comment tu t'appelles ?",
    step1Desc: "On l'utilisera pour personnaliser ton expérience.",
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
    continueWithGoogle: "Continuer avec Google",
    googlePending: "Redirection vers Google…",
    orDivider: "ou",
    metaLoginTitle: "Connexion",
    metaSignupTitle: "Inscription",
    rememberMe: "Se souvenir de moi",
    forgotPassword: "Mot de passe oublié ?",
    forgotPasswordComingSoon:
      "La réinitialisation du mot de passe arrive bientôt. Contacte le support si tu es bloqué·e.",
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
    },
    hero: {
      badge: "Votre assistant d'apprentissage intelligent",
      titleLine1: "Apprends mieux,",
      titleLine2: "avance plus loin",
      titleAria: "Apprends mieux, avance plus loin",
      subtitle:
        "EduIA t'aide à comprendre tes cours, générer des épreuves adaptées et corriger tes réponses grâce à l'intelligence artificielle.",
      ctaPrimary: "Commencer gratuitement",
      ctaSecondary: "Voir comment ça marche",
      imageAlt:
        "Deux élèves souriants devant un ordinateur portable au logo cerveau, utilisant l'intelligence artificielle, entourés d'icônes d'apprentissage",
    },
    socialProof:
      "Rejoins les premières promos qui révisent plus intelligemment avec EduIA.",
    video: {
      aria: "Vidéo de démonstration d'EduIA",
      fallback: "Ton navigateur ne prend pas en charge la lecture vidéo.",
    },
    features: {
      heading: "Tout ce dont tu as besoin pour",
      headingAccent: "réussir",
      subtitle:
        "Trois outils qui travaillent ensemble pour t'aider à comprendre, t'entraîner et progresser.",
      learnMore: "En savoir plus",
      items: [
        {
          title: "Résume tes cours",
          description:
            "Importe tes cours (PDF, Word, texte) et obtiens un résumé clair, structuré et facile à comprendre.",
        },
        {
          title: "Génère des épreuves",
          description:
            "Choisis tes chapitres, ton niveau et le type de questions. L'IA crée des épreuves adaptées à ton besoin.",
        },
        {
          title: "Corrige tes épreuves",
          description:
            "Soumets tes réponses et reçois une correction détaillée, des explications et des conseils pour progresser.",
        },
      ],
    },
    stats: [
      { value: "100 %", label: "Adapté à ton niveau et à ton programme" },
      { value: "3 min", label: "Pour transformer un cours en résumé clair" },
      { value: "24/7", label: "Ton assistant d'apprentissage disponible" },
      { value: "0 FCFA", label: "Pour créer ton compte, sans carte bancaire" },
    ],
    how: {
      badge: "Simple, rapide, efficace",
      heading: "Comment",
      headingAccent: "ça marche",
      steps: [
        {
          title: "Importe ton cours",
          description: "Ajoute ton fichier ou colle ton texte. L'IA analyse le contenu.",
        },
        {
          title: "Génère ou apprends",
          description: "Obtiens un résumé clair ou génère une épreuve adaptée.",
        },
        {
          title: "Corrige et progresse",
          description: "Soumets tes réponses et reçois ta correction et des conseils.",
        },
      ],
      mockup: {
        correctionResultLabel: "Résultat de la correction",
        scoreAria: "Score 16 sur 20",
        scoreLabel: "SCORE",
        praise: "Bravo ! Tu progresses très bien",
        goodAnswers: "Bonnes réponses",
        errors: "Erreurs",
        percentage: "Pourcentage",
        viewDetailedCorrection: "Voir le corrigé détaillé",
        generateExamLabel: "Générer une épreuve",
        subject: "Matière",
        subjectValue: "Mathématiques",
        level: "Niveau",
        levelValue: "Terminale",
        examType: "Type d'épreuve",
        examTypeValue: "QCM",
        questionCount: "Nombre de questions",
        questionCountValue: "20",
        generateExamCta: "Générer l'épreuve",
        resumeFileName: "Cours-Mathematiques.pdf",
        resumeImporting: "Import du document…",
        resumeAnalyzing: "Analyse en cours…",
        resumeBadge: "Résumé généré",
        resumeTitle: "Les fonctions dérivées",
        resumePoint1: "Définition et notation",
        resumePoint2: "Règles de calcul usuelles",
        resumePoint3: "Applications et exercices types",
        resumeCta: "Voir le résumé complet",
      },
      phoneAriaSummarize: "Aperçu : résumer un cours avec EduIA",
      phoneAriaGrade: "Aperçu : générer et corriger une épreuve avec EduIA",
    },
    pricing: {
      heading: "Des",
      headingAccent: "tarifs",
      headingSuffix: "simples",
      subtitle: "Commence gratuitement, passe au Premium quand tu veux aller plus loin.",
      period: "/mois",
      recommended: "Recommandé",
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
          "Résumés, épreuves, corrections illimités dans la limite du quota",
          "Assistance IA et analyse de documents",
          "Historique complet",
        ],
      },
      premiumPlus: {
        name: "Premium+",
        cta: "Passer au Premium+",
        points: (credits: number) => [
          `${credits} crédits chaque mois`,
          "Le quota le plus généreux, pour un usage intensif",
          "Assistance IA et analyse de documents",
          "Historique complet",
        ],
      },
    },
    cta: {
      heading: "Prêt à passer au niveau supérieur ?",
      subtitle: "Rejoins les élèves qui apprennent plus intelligemment avec EduIA.",
      button: "Commencer gratuitement",
      reassurance: "Gratuit · Rapide · Sans carte bancaire",
    },
    footer: {
      description: (name: string) =>
        `${name} est un assistant d'apprentissage basé sur l'intelligence artificielle : importe tes cours, génère des épreuves adaptées, corrige tes réponses et progresse chaque jour.`,
      navLabel: "Navigation pied de page",
      navHeading: "Navigation",
      accountLabel: "Compte",
      accountHeading: "Compte",
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

  credits: {
    // Garde-fou des routes IA (crédits insuffisants).
    insufficientMessage:
      "Crédits insuffisants. Rechargez vos crédits ou passez à un forfait supérieur pour continuer.",

    signupCreditsLabel: (count: number) => `${count} crédits offerts à l'inscription`,

    // Dashboard — section crédits.
    sectionTitle: "Tes crédits",
    availableLabel: "Crédits disponibles",
    usedLabel: "Crédits utilisés",
    availableOf: (available: number, total: number) => `${available} / ${total}`,
    noSubscriptionHint:
      "Palier gratuit — crédits d'inscription, sans renouvellement mensuel.",
    renewsOn: (date: string) => `Se renouvelle le ${date}`,
    usageSummaryTitle: "Résumé d'utilisation",
    usageSummaries: (count: number) => `Résumés effectués : ${count}`,
    usageExams: (count: number) => `Épreuves générées : ${count}`,
    usageCorrections: (count: number) => `Épreuves corrigées : ${count}`,
    usageAssistant: (count: number) =>
      `Questions posées à l'Assistant IA : ${count}`,

    // Bandeau « crédits insuffisants » (boutons d'action).
    insufficientTitle: "Crédits insuffisants",
    upgradeCta: "Voir les forfaits",
    rechargeCta: "Recharger des crédits",

    // Section recharge (page Premium).
    rechargeTitle: "Recharger des crédits",
    rechargeSubtitle:
      "Besoin de plus de crédits sans changer de forfait ? Achète un pack ponctuel.",
    rechargeCreditsLabel: (count: number) => `${count} crédits`,
    rechargeBuy: "Acheter",
    rechargeBuying: "Achat…",
    rechargeSuccess: (count: number) => `${count} crédits ajoutés à ton compte.`,
    rechargeError: "Impossible d'ajouter ces crédits pour le moment. Réessaie.",

    // Abonnement (remplace le toast « bientôt disponible »).
    subscribeCta: "S'abonner",
    subscribing: "Abonnement…",
    subscribeSuccess: (plan: string) => `Tu es maintenant abonné à ${plan} !`,
    subscribeError:
      "Impossible d'activer cet abonnement pour le moment. Réessaie.",
    alreadyOnPlan: "Ton forfait actuel",
  },
};

/**
 * Forme de référence des dictionnaires.
 */
export type Dictionary = typeof fr;
