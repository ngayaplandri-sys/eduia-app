import type { GeneratedExam } from "@/types";

export const mockGeneratedExam: GeneratedExam = {
  title: "Épreuve d'Histoire",
  subject: "Histoire",
  level: "Terminale",
  theme: "La Seconde Guerre mondiale",
  examType: "Devoir surveillé",
  durationLabel: "1h30",
  pageCountLabel: "3 pages",
  questionCount: 12,
  dateLabel: "27 mai 2026",
  totalPoints: 20,
  status: "Prête",
  generatedBy: "EduIA",
  generatedAt: "2024-05-11T16:45:00",
  parts: [
    {
      title: "Partie 1 : QCM",
      points: 6,
      instructions:
        "Pour chaque question, une seule réponse est correcte. Coche la bonne réponse.",
      questions: [
        {
          kind: "qcm",
          points: 1,
          prompt:
            "Quel événement marque le début de la Seconde Guerre mondiale en Europe ?",
          choices: [
            { letter: "A", text: "L'attaque de Pearl Harbor", correct: false },
            {
              letter: "B",
              text: "L'invasion de la Pologne (1er septembre 1939)",
              correct: true,
            },
            {
              letter: "C",
              text: "L'annexion de l'Autriche (Anschluss)",
              correct: false,
            },
            { letter: "D", text: "La bataille de France", correct: false },
          ],
        },
        {
          kind: "qcm",
          points: 1,
          prompt: "Quel pacte de non-agression est signé en août 1939 ?",
          choices: [
            { letter: "A", text: "Le pacte Briand-Kellogg", correct: false },
            { letter: "B", text: "Les accords de Munich", correct: false },
            {
              letter: "C",
              text: "Le pacte germano-soviétique (Molotov-Ribbentrop)",
              correct: true,
            },
            { letter: "D", text: "Le pacte tripartite", correct: false },
          ],
        },
        {
          kind: "qcm",
          points: 1,
          prompt:
            "Quelle bataille est considérée comme le tournant sur le front de l'Est ?",
          choices: [
            { letter: "A", text: "La bataille d'Angleterre", correct: false },
            { letter: "B", text: "La bataille de Stalingrad", correct: true },
            { letter: "C", text: "La bataille de Midway", correct: false },
            { letter: "D", text: "La bataille des Ardennes", correct: false },
          ],
        },
        {
          kind: "qcm",
          points: 1,
          prompt: "Le débarquement allié en Normandie a lieu le :",
          choices: [
            { letter: "A", text: "8 mai 1945", correct: false },
            { letter: "B", text: "6 juin 1944", correct: true },
            { letter: "C", text: "11 novembre 1943", correct: false },
            { letter: "D", text: "2 septembre 1945", correct: false },
          ],
        },
        {
          kind: "qcm",
          points: 1,
          prompt:
            "Quelle conférence de février 1945 réunit Roosevelt, Churchill et Staline ?",
          choices: [
            { letter: "A", text: "La conférence de Téhéran", correct: false },
            { letter: "B", text: "La conférence de Potsdam", correct: false },
            { letter: "C", text: "La conférence de Yalta", correct: true },
            { letter: "D", text: "La conférence de Wannsee", correct: false },
          ],
        },
        {
          kind: "qcm",
          points: 1,
          prompt:
            "Quelles villes japonaises subissent un bombardement atomique en août 1945 ?",
          choices: [
            { letter: "A", text: "Tokyo et Osaka", correct: false },
            { letter: "B", text: "Hiroshima et Nagasaki", correct: true },
            { letter: "C", text: "Kyoto et Nagoya", correct: false },
            { letter: "D", text: "Yokohama et Kobe", correct: false },
          ],
        },
      ],
    },
    {
      title: "Partie 2 : Questions ouvertes",
      points: 11,
      instructions:
        "Réponds aux questions suivantes en rédigeant des paragraphes structurés et argumentés.",
      questions: [
        {
          kind: "open",
          points: 4,
          prompt:
            "Explique pourquoi la période 1942-1943 constitue un tournant du conflit.",
          subQuestions: [
            "Présente la situation militaire avant 1942.",
            "Cite et localise au moins trois batailles décisives.",
            "Conclus sur le basculement du rapport de force.",
          ],
          expectedAnswer:
            "Avant 1942, l'Axe domine (Blitzkrieg, avancée en URSS et dans le Pacifique). En 1942-1943, les Alliés reprennent l'initiative : Stalingrad (front de l'Est), El Alamein (Afrique du Nord), Midway (Pacifique). Les États-Unis, entrés en guerre après Pearl Harbor, mobilisent leur industrie. Les Alliés passent à l'offensive sur tous les théâtres.",
        },
        {
          kind: "open",
          points: 4,
          prompt:
            "Montre que la Seconde Guerre mondiale est une guerre d'anéantissement.",
          subQuestions: [
            "Définis la notion de guerre d'anéantissement.",
            "Donne des exemples de violences de masse contre les civils.",
            "Évoque le génocide des Juifs et des Tsiganes.",
          ],
          expectedAnswer:
            "Guerre d'anéantissement : volonté de détruire totalement l'ennemi, combattants comme civils. Exemples : bombardements de villes (Londres, Dresde, Hiroshima), massacres (Oradour-sur-Glane), famines organisées. Le génocide (Shoah, Porajmos) est planifié à la conférence de Wannsee (1942) et mis en œuvre dans les camps d'extermination.",
        },
        {
          kind: "open",
          points: 3,
          prompt:
            "Quelles sont les principales conséquences géopolitiques du conflit ?",
          expectedAnswer:
            "Bilan humain d'environ 60 millions de morts ; création de l'ONU (1945) ; procès de Nuremberg (1945-1946) ; affaiblissement de l'Europe ; émergence des deux « Grands » (États-Unis / URSS) et début de la Guerre froide ; amorce de la décolonisation.",
        },
      ],
    },
    {
      title: "Partie 3 : Vrai ou Faux",
      points: 3,
      instructions:
        "Indique si chaque affirmation est vraie ou fausse en cochant la bonne case.",
      questions: [
        {
          kind: "truefalse",
          points: 3,
          prompt: "Coche « Vrai » ou « Faux » pour chaque affirmation.",
          statements: [
            {
              text: "Le régime de Vichy est instauré en 1940.",
              isTrue: true,
            },
            {
              text: "Les États-Unis entrent en guerre dès septembre 1939.",
              isTrue: false,
            },
            {
              text: "La capitulation allemande est signée le 8 mai 1945.",
              isTrue: true,
            },
          ],
        },
      ],
    },
  ],
};
