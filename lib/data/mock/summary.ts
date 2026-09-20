import type { CourseSummary } from "@/types";

export const mockCourseSummary: CourseSummary = {
  title: "Histoire — La Seconde Guerre mondiale",
  subject: "Histoire",
  level: "Terminale",
  theme: "La Seconde Guerre mondiale (1939-1945)",
  styleLabel: "Résumé clair",
  pageCountLabel: "3 pages",
  status: "Prêt",
  generatedBy: "EduIA",
  generatedAt: "2024-05-12T14:30:00",
  pagesSummarized: 12,
  sections: [
    {
      heading: "1. Contexte",
      paragraphs: [
        "La 2ème Guerre mondiale (1939-1945) est un conflit mondial opposant les Alliés (France, Royaume-Uni, URSS, États-Unis...) aux Puissances de l'Axe (Allemagne, Italie, Japon...).",
      ],
    },
    {
      heading: "2. Causes principales",
      bullets: [
        { text: "Traité de Versailles jugé humiliant pour l'Allemagne." },
        {
          text: "Montée des régimes totalitaires (nazisme, fascisme, militarisme japonais).",
        },
        { text: "Crise économique de 1929 qui fragilise les démocraties." },
        {
          text: "Politique d'expansion territoriale de l'Allemagne, de l'Italie et du Japon.",
        },
      ],
    },
    {
      heading: "3. Déroulement du conflit",
      bullets: [
        {
          lead: "1939 :",
          text: "Invasion de la Pologne par l'Allemagne le 1er septembre → début de la guerre.",
        },
        { lead: "1940-1942 :", text: "Victoires de l'Axe en Europe et en Asie." },
        {
          lead: "1942-1943 :",
          text: "Tournant de la guerre (bataille de Stalingrad, El Alamein).",
        },
        { lead: "1944 :", text: "Débarquement en Normandie le 6 juin." },
        {
          lead: "1945 :",
          text: "Victoire des Alliés. Capitulation de l'Allemagne le 8 mai et du Japon le 2 septembre après les bombardements atomiques d'Hiroshima et Nagasaki.",
        },
      ],
    },
    {
      heading: "4. Conséquences",
      bullets: [
        { text: "Environ 60 à 80 millions de morts." },
        { text: "Création de l'ONU pour maintenir la paix." },
        { text: "Début de la Guerre froide entre les États-Unis et l'URSS." },
        {
          text: "Recomposition de la carte de l'Europe et décolonisation à venir.",
        },
      ],
    },
  ],
  keyConcepts: [
    "Puissances de l'Axe / Alliés",
    "Guerre totale",
    "Régime de Vichy",
    "Shoah",
    "Conférence de Yalta",
    "Ordre bipolaire",
  ],
  definitions: [
    {
      term: "Guerre totale",
      definition:
        "Conflit qui mobilise toutes les ressources d'un pays (humaines, économiques, scientifiques, idéologiques).",
    },
    {
      term: "Collaboration",
      definition:
        "Politique de coopération du régime de Vichy avec l'Allemagne nazie à partir de 1940.",
    },
    {
      term: "Shoah",
      definition:
        "Extermination systématique d'environ six millions de Juifs d'Europe par l'Allemagne nazie et ses complices.",
    },
  ],
  keyPoints: [
    "Le conflit débute le 1er septembre 1939 (invasion de la Pologne) et se termine le 2 septembre 1945.",
    "1942-1943 est le tournant : Stalingrad, El Alamein, Midway.",
    "La guerre s'accompagne d'un génocide (Shoah) et de crimes de masse.",
    "Elle débouche sur l'ONU, la Guerre froide et la décolonisation.",
  ],
};
