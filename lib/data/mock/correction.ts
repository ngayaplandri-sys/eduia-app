import type { ExamCorrection } from "@/types";

export const mockExamCorrection: ExamCorrection = {
  examTitle: "Épreuve mixte — La Seconde Guerre mondiale",
  subject: "Histoire",
  level: "Terminale",
  theme: "La Seconde Guerre mondiale",
  dateLabel: "27 mai 2026",
  pageCountLabel: "4 pages",
  score: 15,
  maxScore: 20,
  appreciation: "Bien",
  summary:
    "Bonne maîtrise de la chronologie européenne et des grands accords. Les erreurs portent surtout sur le théâtre pacifique et la distinction des fronts.",
  status: "Corrigée",
  correctedBy: "EduIA",
  correctedAt: "2024-05-13T09:15:00",
  questions: [
    {
      prompt:
        "Quel événement marque le début de la Seconde Guerre mondiale en Europe ?",
      studentAnswer:
        "L'invasion de la Pologne par l'Allemagne, le 1er septembre 1939.",
      expectedAnswer:
        "L'invasion de la Pologne par l'Allemagne le 1er septembre 1939 ; la France et le Royaume-Uni déclarent la guerre le 3 septembre.",
      pointsEarned: 2,
      pointsMax: 2,
      verdict: "correct",
      feedback: "Réponse exacte et correctement datée.",
    },
    {
      prompt:
        "Quel pacte de non-agression l'Allemagne et l'URSS signent-elles en août 1939 ?",
      studentAnswer: "Le pacte germano-soviétique (Molotov-Ribbentrop).",
      expectedAnswer:
        "Le pacte germano-soviétique (Molotov-Ribbentrop), 23 août 1939, assorti d'un protocole secret partageant la Pologne et l'Europe de l'Est.",
      pointsEarned: 2,
      pointsMax: 2,
      verdict: "correct",
      feedback:
        "Correct. Tu pourrais mentionner son protocole secret prévoyant le partage de la Pologne.",
    },
    {
      prompt:
        "Quelle bataille constitue le tournant de la guerre sur le front de l'Est ?",
      studentAnswer: "La bataille de Midway.",
      expectedAnswer:
        "La bataille de Stalingrad (août 1942 - février 1943). Midway (juin 1942) est le tournant du théâtre pacifique, pas du front de l'Est.",
      pointsEarned: 0,
      pointsMax: 2,
      verdict: "incorrect",
      feedback:
        "Confusion de théâtre : Midway est le tournant dans le Pacifique. Sur le front de l'Est, il s'agit de Stalingrad.",
    },
    {
      prompt: "À quelle date a lieu le débarquement allié en Normandie ?",
      studentAnswer: "Le 6 juin 1944.",
      expectedAnswer: "Le 6 juin 1944 (opération Overlord, « Jour J »).",
      pointsEarned: 2,
      pointsMax: 2,
      verdict: "correct",
      feedback: "Exact.",
    },
    {
      prompt:
        "Explique pourquoi la période 1942-1943 est considérée comme un tournant du conflit.",
      studentAnswer:
        "En 1942-1943, les Alliés reprennent l'avantage. À Stalingrad, la 6e armée allemande capitule en février 1943. Les États-Unis, entrés en guerre après Pearl Harbor, mobilisent leur industrie.",
      expectedAnswer:
        "Il faut couvrir les trois théâtres : front de l'Est (Stalingrad), Afrique du Nord (El Alamein), Pacifique (Midway), puis conclure sur le passage des Alliés à l'offensive et le rôle de l'industrie américaine.",
      pointsEarned: 4,
      pointsMax: 6,
      verdict: "partial",
      feedback:
        "Bon repérage de Stalingrad et de l'engagement américain. Il manque le théâtre pacifique (Midway) et l'Afrique du Nord (El Alamein), ainsi qu'une conclusion. Structure ta réponse par théâtre d'opérations.",
    },
    {
      prompt:
        "Quelles sont les principales conséquences géopolitiques de la Seconde Guerre mondiale ?",
      studentAnswer:
        "La guerre fait environ 60 millions de morts. L'ONU est créée en 1945 pour maintenir la paix. Le monde se divise entre le bloc américain et le bloc soviétique, ce qui ouvre la guerre froide. Les colonies réclament leur indépendance.",
      expectedAnswer:
        "Bilan humain (~60 millions de morts), création de l'ONU (1945), procès de Nuremberg (1945-1946), affaiblissement durable de l'Europe, émergence des deux Grands et Guerre froide, amorce de la décolonisation.",
      pointsEarned: 5,
      pointsMax: 6,
      verdict: "correct",
      feedback:
        "Réponse complète et bien organisée. Ajoute le procès de Nuremberg (1945-1946) et l'affaiblissement durable de l'Europe.",
    },
  ],
  strengths: [
    "Chronologie de la guerre en Europe bien maîtrisée (1939, 1942-1943, 6 juin 1944).",
    "Connaissance précise des accords et des acteurs (pacte germano-soviétique, Alliés / Axe).",
    "Réponses rédigées claires, appuyées sur des dates.",
  ],
  improvements: [
    "Distinguer les théâtres d'opérations : front de l'Est (Stalingrad) et Pacifique (Midway).",
    "Compléter le bilan de la guerre : procès de Nuremberg, affaiblissement de l'Europe.",
    "Conclure chaque question ouverte par une phrase de synthèse.",
  ],
  advice: [
    "Réalise une frise 1939-1945 en trois bandes : Europe, Pacifique, Afrique du Nord.",
    "Pour les questions ouvertes, applique le plan « constat → explication → exemple daté → bilan ».",
    "Génère une nouvelle épreuve QCM sur le chapitre pour ancrer les dates et les lieux clés.",
  ],
};
