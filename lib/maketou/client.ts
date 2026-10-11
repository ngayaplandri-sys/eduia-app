import "server-only";

/**
 * Client HTTP de l'API Maketou (https://docs-api.maketou.com) — deux
 * endpoints seulement : créer un panier, lire un panier.
 *
 * Règles tenues ici, quelle que soit la panne :
 *  - toute exception (réseau, encodage, JSON…) devient une `MaketouError`
 *    typée — jamais une exception brute qui finirait en 500 ou ferait planter
 *    le rapprochement ;
 *  - classement par statut HTTP D'ABORD (401/403 clé, 404 panier, 429 quota,
 *    ≥ 500 panne), le `code` du corps ensuite : un 5xx ne ressemble jamais à
 *    un problème de panier ;
 *  - un 2xx illisible (page HTML de maintenance, flux tronqué) est une PANNE
 *    (`MALFORMED_RESPONSE`), jamais une erreur de panier ;
 *  - messages sans données personnelles : du 422 NestJS on ne garde que
 *    `property` + règles, e-mails et téléphones masqués ; la clé API n'apparaît
 *    jamais dans un message, un log ou une réponse.
 */

export const MAKETOU_CART_STATUSES = [
  "waiting_payment",
  "completed",
  "abandoned",
  "payment_failed",
] as const;

export type MaketouCartStatus = (typeof MAKETOU_CART_STATUSES)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isMaketouCartId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export class MaketouError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number | null = null,
    public retryAfterSec: number | null = null,
  ) {
    super(message);
    this.name = "MaketouError";
  }
}

/** Pannes côté Maketou ou réseau : jamais une raison de clore un panier. */
export const MAKETOU_OUTAGE_CODES = new Set([
  "NETWORK_ERROR",
  "MALFORMED_RESPONSE",
  "INVALID_RESPONSE",
]);

export function isMaketouOutage(error: MaketouError): boolean {
  return MAKETOU_OUTAGE_CODES.has(error.code) || error.code.startsWith("HTTP_5");
}

/** Clé API valide en apparence : ASCII imprimable, sans espace, guillemet ni `#`. */
export function isWellFormedApiKey(key: string | undefined): key is string {
  return Boolean(key) && /^[\x21-\x7E]+$/.test(key as string) && !/["'#]/.test(key as string);
}

function baseUrl(): string {
  return (process.env.MAKETOU_API_URL?.trim() || "https://api.maketou.net").replace(/\/+$/, "");
}

function redact(text: string): string {
  return text
    .replace(/\S+@\S+/g, "[email]")
    .replace(/\+?\d[\d\s.-]{7,}\d/g, "[phone]");
}

/** Détail d'une erreur de validation sans donnée personnelle (« champ : règle »). */
function describe(message: unknown): string {
  if (typeof message === "string") return redact(message).slice(0, 300);
  if (!Array.isArray(message)) return "";
  return message
    .map((entry: unknown) => {
      if (typeof entry === "string") return redact(entry);
      if (!entry || typeof entry !== "object") return "";
      const { property, constraints } = entry as {
        property?: unknown;
        constraints?: Record<string, unknown>;
      };
      return [
        typeof property === "string" ? property : "",
        constraints ? Object.values(constraints).map(String).join(", ") : "",
      ]
        .filter(Boolean)
        .join(": ");
    })
    .filter(Boolean)
    .join("; ")
    .slice(0, 300);
}

type JsonObject = Record<string, unknown>;

async function call(
  op: string,
  path: string,
  method: "GET" | "POST",
  body: unknown,
  timeoutMs: number,
): Promise<{ json: JsonObject; remaining: number | null; limit: number | null }> {
  const key = process.env.MAKETOU_API_KEY?.trim();
  if (!isWellFormedApiKey(key)) {
    throw new MaketouError("MAKETOU_NOT_CONFIGURED", "MAKETOU_API_KEY missing or malformed");
  }

  let response: Response;
  try {
    response = await fetch(baseUrl() + path, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    throw new MaketouError(
      "NETWORK_ERROR",
      `Maketou ${op}: ${(error as Error)?.name ?? "error"}`,
    );
  }

  let json: unknown;
  try {
    const text = await response.text();
    json = text ? JSON.parse(text) : null;
  } catch {
    json = undefined;
  }

  const isObject = (value: unknown): value is JsonObject =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

  if (response.ok && !isObject(json)) {
    throw new MaketouError(
      "MALFORMED_RESPONSE",
      `Maketou ${op}: unreadable 2xx body`,
      response.status,
    );
  }

  if (!response.ok) {
    const status = response.status;
    const bodyCode = isObject(json) && typeof json.code === "string" ? json.code : "";
    const code =
      status === 401 || status === 403
        ? "INVALID_API_KEY"
        : status === 404
          ? "CART_NOT_FOUND"
          : status === 429
            ? "RATE_LIMITED"
            : status >= 500
              ? `HTTP_${status}`
              : bodyCode || (status === 400 || status === 422 ? "VALIDATION_ERROR" : `HTTP_${status}`);
    const retry = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
    const detail = isObject(json) ? describe(json.message) : "";
    throw new MaketouError(
      code,
      `Maketou ${op} failed (${status})${detail ? `: ${detail}` : ""}`,
      status,
      status === 429 && Number.isFinite(retry) ? retry : null,
    );
  }

  const header = (name: string) => {
    const value = Number.parseInt(response.headers.get(name) ?? "", 10);
    return Number.isFinite(value) ? value : null;
  };
  return {
    json: json as JsonObject,
    remaining: header("x-ratelimit-remaining"),
    limit: header("x-ratelimit-limit"),
  };
}

export interface MaketouCustomer {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

/** Crée un panier pour un produit (prix fixe : jamais de `customerPrice`). */
export async function createMaketouCart(input: {
  productDocumentId: string;
  redirectUrl: string;
  meta: Record<string, string>;
  customer: MaketouCustomer;
}): Promise<{ cartId: string; status: MaketouCartStatus; redirectUrl: string }> {
  const meta = Object.fromEntries(
    Object.entries(input.meta).filter(([, value]) => typeof value === "string" && value),
  );
  const { json } = await call(
    "createCart",
    "/api/v1/stores/cart/checkout",
    "POST",
    {
      productDocumentId: input.productDocumentId,
      email: input.customer.email,
      firstName: input.customer.firstName,
      lastName: input.customer.lastName,
      ...(input.customer.phone ? { phone: input.customer.phone } : {}),
      redirectURL: input.redirectUrl,
      ...(Object.keys(meta).length > 0 ? { meta } : {}),
    },
    15_000,
  );

  const cart = json.cart as JsonObject | undefined;
  const cartId = cart?.id;
  const url = json.redirectUrl;
  const isHttps = (value: unknown) => {
    try {
      return new URL(String(value)).protocol === "https:";
    } catch {
      return false;
    }
  };
  // Pas d'URL pour un panier qu'on ne pourrait jamais confirmer (fail closed).
  if (!isMaketouCartId(cartId) || typeof url !== "string" || !isHttps(url)) {
    throw new MaketouError("INVALID_RESPONSE", "Maketou createCart: unexpected response");
  }
  const status = MAKETOU_CART_STATUSES.includes(cart?.status as MaketouCartStatus)
    ? (cart?.status as MaketouCartStatus)
    : "waiting_payment";
  return { cartId, status, redirectUrl: url };
}

export interface MaketouCart {
  /** `null` = statut inconnu : ne jamais accorder. */
  status: MaketouCartStatus | null;
  /** Présent même en attente de paiement : JAMAIS une preuve de paiement. */
  paymentId: string | null;
  meta: Record<string, string>;
  rateLimitRemaining: number | null;
  rateLimitLimit: number | null;
}

/** Lit un panier : seule preuve de paiement possible (`status === "completed"`). */
export async function retrieveMaketouCart(cartId: string, timeoutMs = 15_000): Promise<MaketouCart> {
  // Un identifiant mal formé coûterait du quota pour un 404 certain.
  if (!isMaketouCartId(cartId)) {
    throw new MaketouError("CART_NOT_FOUND", "Maketou retrieveCart: not a cart id");
  }
  const { json, remaining, limit } = await call(
    "retrieveCart",
    `/api/v1/stores/cart/${cartId}`,
    "GET",
    undefined,
    timeoutMs,
  );
  if (typeof json.id !== "string" || json.id.toLowerCase() !== cartId.toLowerCase()) {
    throw new MaketouError("INVALID_RESPONSE", "Maketou retrieveCart: cart id mismatch");
  }
  const rawMeta = json.meta && typeof json.meta === "object" ? (json.meta as JsonObject) : {};
  const meta = Object.fromEntries(
    Object.entries(rawMeta).filter(([, value]) => typeof value === "string"),
  ) as Record<string, string>;
  return {
    status: MAKETOU_CART_STATUSES.includes(json.status as MaketouCartStatus)
      ? (json.status as MaketouCartStatus)
      : null,
    paymentId: typeof json.paymentId === "string" && json.paymentId ? json.paymentId : null,
    meta,
    rateLimitRemaining: remaining,
    rateLimitLimit: limit,
  };
}
