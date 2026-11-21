import "server-only";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { AiUsageKind } from "@/types";

export interface AiUsageTokens {
  inputTokens: number | null;
  outputTokens: number | null;
}

/**
 * Enregistre un appel IA dans `ai_usage` (alimente `/admin/ai`). Ne stocke
 * aucune clé ni aucun contenu, seulement des compteurs. Silencieux en cas
 * d'échec : le journal ne doit jamais casser la réponse à l'utilisateur.
 */
export async function logAiUsage(entry: {
  userId: string;
  kind: AiUsageKind;
  model: string;
  status: "success" | "error";
  tokens?: AiUsageTokens;
}): Promise<void> {
  try {
    await db.insert(schema.aiUsage).values({
      userId: entry.userId,
      kind: entry.kind,
      model: entry.model,
      status: entry.status,
      inputTokens: entry.tokens?.inputTokens ?? null,
      outputTokens: entry.tokens?.outputTokens ?? null,
    });
  } catch (error) {
    console.error("logAiUsage : échec de l'enregistrement", error);
  }
}

/** Début de la journée UTC en cours : les plafonds quotidiens repartent à minuit UTC. */
const TODAY = sql`date_trunc('day', now(), 'UTC')`;

/**
 * Verrou par compte et par type d'appel, le temps de la transaction : des
 * demandes envoyées en rafale passent une par une devant le plafond, au lieu
 * de toutes lire le même compteur avant qu'aucune ne soit enregistrée.
 */
function lockFor(userId: string, kind: AiUsageKind) {
  return sql`select pg_advisory_xact_lock(hashtext(${`ai-usage:${kind}:${userId}`}))`;
}

/**
 * Réserve un appel IA dans le plafond du jour (`limit` appels, `null` =
 * illimité) AVANT d'appeler OpenAI : la ligne est créée « en cours » et compte
 * tout de suite. Renvoie son id, ou `null` si le plafond est atteint.
 * À clore avec `finishAiCall`.
 */
export async function reserveAiCall(entry: {
  userId: string;
  kind: AiUsageKind;
  model: string;
  limit: number | null;
}): Promise<string | null> {
  return db.transaction(async (tx) => {
    await tx.execute(lockFor(entry.userId, entry.kind));
    if (entry.limit !== null) {
      const [row] = await tx
        .select({ n: count() })
        .from(schema.aiUsage)
        .where(
          and(
            eq(schema.aiUsage.userId, entry.userId),
            eq(schema.aiUsage.kind, entry.kind),
            gte(schema.aiUsage.createdAt, TODAY),
          ),
        );
      if (Number(row?.n ?? 0) >= entry.limit) return null;
    }
    const [inserted] = await tx
      .insert(schema.aiUsage)
      .values({
        userId: entry.userId,
        kind: entry.kind,
        model: entry.model,
        status: "pending",
      })
      .returning({ id: schema.aiUsage.id });
    return inserted.id;
  });
}

/** Clôt un appel réservé par `reserveAiCall` (silencieux en cas d'échec). */
export async function finishAiCall(
  id: string,
  status: "success" | "error",
  tokens?: AiUsageTokens,
): Promise<void> {
  try {
    await db
      .update(schema.aiUsage)
      .set({
        status,
        inputTokens: tokens?.inputTokens ?? null,
        outputTokens: tokens?.outputTokens ?? null,
      })
      .where(eq(schema.aiUsage.id, id));
  } catch (error) {
    console.error("finishAiCall : échec de l'enregistrement", error);
  }
}

/**
 * Voix du professeur : UNE ligne `speech` par compte et par journée UTC,
 * cumulée à chaque passage prononcé (une réponse en compte des dizaines).
 * Pour ce type, `inputTokens` = caractères prononcés et `outputTokens` =
 * millisecondes d'audio produites (le coût de la voix se compte à la minute).
 *
 * Réserve `chars` caractères dans le plafond du jour (`limit`, `null` =
 * illimité) avant la synthèse. Renvoie l'id de la ligne du jour, ou `null` si
 * le plafond serait dépassé.
 */
export async function reserveSpeech(entry: {
  userId: string;
  model: string;
  chars: number;
  limit: number | null;
}): Promise<string | null> {
  return db.transaction(async (tx) => {
    await tx.execute(lockFor(entry.userId, "speech"));
    const [today] = await tx
      .select({ id: schema.aiUsage.id, chars: schema.aiUsage.inputTokens })
      .from(schema.aiUsage)
      .where(
        and(
          eq(schema.aiUsage.userId, entry.userId),
          eq(schema.aiUsage.kind, "speech"),
          gte(schema.aiUsage.createdAt, TODAY),
        ),
      )
      .orderBy(schema.aiUsage.createdAt)
      .limit(1);
    const used = today?.chars ?? 0;
    if (entry.limit !== null && used + entry.chars > entry.limit) return null;
    if (today) {
      await tx
        .update(schema.aiUsage)
        .set({ inputTokens: sql`coalesce(${schema.aiUsage.inputTokens}, 0) + ${entry.chars}` })
        .where(eq(schema.aiUsage.id, today.id));
      return today.id;
    }
    const [inserted] = await tx
      .insert(schema.aiUsage)
      .values({
        userId: entry.userId,
        kind: "speech",
        model: entry.model,
        status: "success",
        inputTokens: entry.chars,
        outputTokens: 0,
      })
      .returning({ id: schema.aiUsage.id });
    return inserted.id;
  });
}

/**
 * Après la synthèse : ajoute la durée produite, ou rend les caractères
 * réservés si la synthèse a échoué (silencieux en cas d'échec).
 */
export async function settleSpeech(
  id: string,
  outcome: { audioMs: number } | { failedChars: number },
): Promise<void> {
  try {
    await db
      .update(schema.aiUsage)
      .set(
        "audioMs" in outcome
          ? { outputTokens: sql`coalesce(${schema.aiUsage.outputTokens}, 0) + ${Math.round(outcome.audioMs)}` }
          : {
              inputTokens: sql`greatest(coalesce(${schema.aiUsage.inputTokens}, 0) - ${outcome.failedChars}, 0)`,
            },
      )
      .where(eq(schema.aiUsage.id, id));
  } catch (error) {
    console.error("settleSpeech : échec de l'enregistrement", error);
  }
}

/** Durée d'un MP3 en millisecondes (somme des trames MPEG layer III). */
export function mp3DurationMs(audio: ArrayBuffer): number {
  const bytes = new Uint8Array(audio);
  let index = 0;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    index =
      10 +
      (((bytes[6] & 0x7f) << 21) |
        ((bytes[7] & 0x7f) << 14) |
        ((bytes[8] & 0x7f) << 7) |
        (bytes[9] & 0x7f));
  }
  const V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const RATES: Record<number, number[]> = {
    3: [44100, 48000, 32000],
    2: [22050, 24000, 16000],
    0: [11025, 12000, 8000],
  };
  let seconds = 0;
  while (index + 4 <= bytes.length) {
    if (bytes[index] !== 0xff || (bytes[index + 1] & 0xe0) !== 0xe0) {
      index++;
      continue;
    }
    const version = (bytes[index + 1] >> 3) & 3;
    const layer = (bytes[index + 1] >> 1) & 3;
    const bitrateIndex = bytes[index + 2] >> 4;
    const rateIndex = (bytes[index + 2] >> 2) & 3;
    const padding = (bytes[index + 2] >> 1) & 1;
    if (layer !== 1 || version === 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) {
      index++;
      continue;
    }
    const bitrate = (version === 3 ? V1 : V2)[bitrateIndex] * 1000;
    const rate = RATES[version][rateIndex];
    const samples = version === 3 ? 1152 : 576;
    seconds += samples / rate;
    index += Math.floor(((samples / 8) * bitrate) / rate) + padding;
  }
  return Math.round(seconds * 1000);
}
