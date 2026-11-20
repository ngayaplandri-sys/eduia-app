import type { VoiceTutorLanguage } from "@/lib/config/voice-tutor";

/**
 * Langue probable d'un cours, d'après son texte : l'écriture d'abord (coréen,
 * japonais, chinois, russe, arabe, hindi), puis, pour l'alphabet latin, les
 * petits mots les plus fréquents de chaque langue. Sert seulement à préremplir
 * « Langue du document » : le professeur lit de toute façon le vrai texte.
 */

const SCRIPTS: { language: VoiceTutorLanguage; pattern: RegExp }[] = [
  { language: "ko", pattern: /[가-힯ᄀ-ᇿ]/g },
  { language: "ja", pattern: /[぀-ヿ]/g },
  { language: "zh", pattern: /[一-鿿]/g },
  { language: "ru", pattern: /[Ѐ-ӿ]/g },
  { language: "ar", pattern: /[؀-ۿ]/g },
  { language: "hi", pattern: /[ऀ-ॿ]/g },
];

const UZBEK_CYRILLIC = /[ўқғҳЎҚҒҲ]/g;

const STOPWORDS: Partial<Record<VoiceTutorLanguage, string[]>> = {
  fr: ["le", "les", "des", "est", "et", "une", "du", "que", "qui", "dans", "pour", "pas", "sur", "au", "avec", "cette", "sont", "aux", "ou", "par"],
  en: ["the", "and", "of", "to", "is", "in", "that", "it", "for", "are", "with", "as", "on", "this", "be", "by", "which", "from", "or", "an"],
  tr: ["ve", "bir", "bu", "için", "ile", "olarak", "olan", "gibi", "daha", "çok", "veya", "ise", "kadar", "sonra", "her", "olur", "ne", "değil", "şekilde", "tarafından"],
  // Ouzbek en alphabet latin (mots sans apostrophe : « boʻlib » serait coupé en deux).
  uz: ["va", "bilan", "uchun", "ham", "esa", "deb", "lekin", "yoki", "emas", "edi", "keyin", "kabi", "shu", "ular", "juda", "hamda", "orqali", "mumkin", "qilib", "hisoblanadi"],
  de: ["der", "die", "das", "und", "ist", "nicht", "mit", "den", "von", "zu", "ein", "eine", "im", "auf", "sich", "dem", "werden", "wird", "auch", "oder"],
  es: ["el", "los", "las", "y", "que", "en", "es", "por", "una", "para", "con", "del", "se", "al", "como", "más", "pero", "su", "lo", "son"],
  pt: ["os", "as", "e", "que", "em", "é", "um", "uma", "para", "com", "não", "do", "da", "dos", "das", "ao", "pelo", "pela", "são", "mais"],
  it: ["il", "di", "che", "è", "per", "un", "una", "non", "con", "del", "della", "sono", "gli", "nel", "alla", "anche", "come", "più", "dei", "delle"],
  nl: ["de", "het", "een", "en", "van", "is", "dat", "op", "te", "zijn", "met", "voor", "niet", "die", "worden", "wordt", "ook", "aan", "bij", "naar"],
  pl: ["i", "w", "na", "z", "się", "nie", "jest", "to", "że", "do", "jak", "po", "co", "ale", "przez", "są", "lub", "oraz", "dla", "od"],
  sw: ["na", "ya", "wa", "kwa", "ni", "za", "katika", "au", "hii", "kama", "pia", "cha", "vya", "hiyo", "ili", "lakini", "sana", "zaidi", "huo", "wake"],
  vi: ["và", "của", "là", "có", "các", "trong", "được", "cho", "không", "những", "một", "với", "người", "này", "để", "khi", "đã", "từ", "theo", "như"],
};

const STOPWORD_SETS = Object.entries(STOPWORDS).map(([language, words]) => ({
  language: language as VoiceTutorLanguage,
  words: new Set(words),
}));

export function detectLanguage(text: string): VoiceTutorLanguage | null {
  const sample = text.slice(0, 30_000);

  let bestScript: { language: VoiceTutorLanguage; count: number } | null = null;
  for (const { language, pattern } of SCRIPTS) {
    const count = sample.match(pattern)?.length ?? 0;
    if (count > (bestScript?.count ?? 0)) bestScript = { language, count };
  }
  const latin = sample.match(/\p{Script=Latin}/gu)?.length ?? 0;
  if (bestScript && bestScript.count > latin) {
    // Le japonais mêle kanji (chinois) et kana : quelques kana suffisent.
    if (bestScript.language === "zh" && (sample.match(SCRIPTS[1].pattern)?.length ?? 0) > bestScript.count * 0.05) {
      return "ja";
    }
    // L'ouzbek en cyrillique a ses lettres propres (ў, қ, ғ, ҳ), absentes du russe.
    if (bestScript.language === "ru" && (sample.match(UZBEK_CYRILLIC)?.length ?? 0) > bestScript.count * 0.01) {
      return "uz";
    }
    return bestScript.language;
  }

  const words = sample.toLocaleLowerCase().match(/\p{L}+/gu) ?? [];
  if (words.length < 20) return null;
  let best: { language: VoiceTutorLanguage; score: number } | null = null;
  for (const { language, words: set } of STOPWORD_SETS) {
    let score = 0;
    for (const word of words) if (set.has(word)) score += 1;
    if (score > (best?.score ?? 0)) best = { language, score };
  }
  return best && best.score >= 5 ? best.language : null;
}
