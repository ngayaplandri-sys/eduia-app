import "server-only";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { detectCountry } from "@/lib/http/geo";
import { OTHER_COUNTRY, isCountryCode } from "@/lib/config/countries";
import { currencyForCountry, isFcfaCurrency } from "@/lib/config/currencies";
import { PLAN_CREDITS } from "@/lib/config/credits";
import { formatFcfa } from "@/lib/admin/constants";
import { LOCALE_INTL } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";

/**
 * Prix de Premium affiché dans la monnaie de l'élève. Le paiement reste
 * encaissé en FCFA par Maketou (`PLAN_CREDITS.premium.paidFcfa`, frais de
 * paiement compris) : hors zone
 * FCFA, le prix local est un équivalent indicatif (« ≈ »), converti au taux du
 * jour, et le montant réellement prélevé en FCFA est toujours indiqué à côté.
 *
 * Pays retenu : celui déclaré par l'élève (onboarding), sinon celui de sa
 * connexion (en-tête Vercel `x-vercel-ip-country`) ; inconnu → FCFA.
 */

/**
 * Taux du jour (1 XAF = … dans chaque monnaie), jeu de données public et
 * gratuit, sans clé ni donnée personnelle envoyée ; mis en cache 12 h.
 */
const RATE_SOURCES = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xaf.json",
  "https://latest.currency-api.pages.dev/v1/currencies/xaf.json",
];
const RATE_CACHE_SECONDS = 12 * 60 * 60;

/** Taux du 23/11/2026, si le service de taux ne répond pas (1 XAF = …). */
const FALLBACK_RATES: Record<string, number> = {
  EUR: 0.0015245, USD: 0.0016771, GBP: 0.0012774, CHF: 0.0014065, CAD: 0.0024011,
  AUD: 0.0025241, NZD: 0.0030616, DKK: 0.011395, NOK: 0.016306, SEK: 0.017095,
  ISK: 0.20917, PLN: 0.0067856, CZK: 0.037292, HUF: 0.56681, RON: 0.0081563,
  RSD: 0.17934, MKD: 0.093861, ALL: 0.13725, BAM: 0.0029816, MDL: 0.030676,
  UAH: 0.07538, BYN: 0.0050203, RUB: 0.13634, GEL: 0.0043417, AMD: 0.60522,
  AZN: 0.002851, TRY: 0.08485, KZT: 0.7639, UZS: 20.11, KGS: 0.14667,
  TJS: 0.015416, TMT: 0.0058689, CNY: 0.011182, HKD: 0.013146, MOP: 0.01354,
  TWD: 0.055176, JPY: 0.26659, KRW: 2.2541, MNT: 6.0506, INR: 0.15564,
  BTN: 0.15564, PKR: 0.46351, BDT: 0.20847, LKR: 0.55706, NPR: 0.24914,
  MVR: 0.02589, AFN: 0.10809, IRR: 3247.4, IQD: 2.5397, SYP: 21.794,
  LBP: 150.47, JOD: 0.001189, ILS: 0.0055805, SAR: 0.006289, AED: 0.006159,
  QAR: 0.0061045, BHD: 0.00063057, KWD: 0.00052231, OMR: 0.00064547, YER: 0.39674,
  EGP: 0.091262, LYD: 0.010825, TND: 0.0050753, DZD: 0.22976, MAD: 0.016725,
  MRU: 0.068191, SDG: 1.0065, SSP: 9.6858, ETB: 0.27475, ERN: 0.025156,
  DJF: 0.29829, SOS: 0.95539, KES: 0.21816, UGX: 7.1001, TZS: 4.4682,
  RWF: 2.4734, BIF: 5.0372, CDF: 3.8874, AOA: 1.5375, ZMW: 0.034627,
  MWK: 2.9029, MZN: 0.10712, BWP: 0.023851, NAD: 0.029194, ZAR: 0.029194,
  LSL: 0.029194, SZL: 0.029194, MGA: 7.5768, MUR: 0.078437, SCR: 0.024063,
  KMF: 0.75, CVE: 0.16811, STN: 0.037684, GMD: 0.12436, GNF: 14.855,
  SLE: 0.03853, LRD: 0.28046, GHS: 0.019789, NGN: 2.2917, THB: 0.057067,
  VND: 43.292, LAK: 37.852, KHR: 6.8269, MMK: 3.5209, MYR: 0.0069116,
  SGD: 0.0021623, BND: 0.0021623, IDR: 30.514, PHP: 0.10705, PGK: 0.0075744,
  FJD: 0.00385, SBD: 0.013654, VUV: 0.20471, WST: 0.0047348, TOP: 0.0040391,
  XPF: 0.18192, MXN: 0.032015, GTQ: 0.012807, BZD: 0.0033736, HNL: 0.045016,
  NIO: 0.061631, CRC: 0.74924, CUP: 0.040162, DOP: 0.10089, HTG: 0.21939,
  JMD: 0.26501, BSD: 0.0016771, BBD: 0.0033541, TTD: 0.01137, XCD: 0.0045396,
  AWG: 0.0030019, KYD: 0.0013946, BMD: 0.0016771, COP: 5.8833, VES: 1.54,
  GYD: 0.35048, SRD: 0.062578, BRL: 0.0099831, PEN: 0.0057945, BOB: 0.019612,
  CLP: 1.7142, ARS: 2.6489, PYG: 10.547, UYU: 0.068045, FKP: 0.0012774,
  GIP: 0.0012774, SHP: 0.0012774,
};

async function fetchLiveRates(): Promise<Record<string, unknown> | null> {
  for (const url of RATE_SOURCES) {
    try {
      const response = await fetch(url, {
        next: { revalidate: RATE_CACHE_SECONDS },
        signal: AbortSignal.timeout(2500),
      });
      if (!response.ok) continue;
      const json: unknown = await response.json();
      const rates = (json as { xaf?: unknown } | null)?.xaf;
      if (rates && typeof rates === "object") return rates as Record<string, unknown>;
    } catch {
      // Service indisponible : source suivante, puis taux intégrés.
    }
  }
  return null;
}

/** 1 XAF = combien dans `currency` ; `null` si la monnaie est inconnue. */
async function xafRate(currency: string): Promise<number | null> {
  const fallback = FALLBACK_RATES[currency] ?? null;
  const live = (await fetchLiveRates())?.[currency.toLowerCase()];
  if (typeof live === "number" && Number.isFinite(live) && live > 0) {
    // Garde-fou contre une donnée aberrante du service de taux.
    if (!fallback || (live > fallback / 10 && live < fallback * 10)) return live;
  }
  return fallback;
}

/** Pays retenu pour les prix : déclaré par l'élève, sinon celui de sa connexion. */
async function pricingCountry(userId: string | null): Promise<string | null> {
  if (userId) {
    try {
      const [row] = await db
        .select({ country: schema.onboarding.country })
        .from(schema.onboarding)
        .where(eq(schema.onboarding.userId, userId))
        .limit(1);
      if (row?.country && row.country !== OTHER_COUNTRY && isCountryCode(row.country)) {
        return row.country;
      }
    } catch {
      // Pays déclaré illisible : on se rabat sur la connexion.
    }
  }
  return detectCountry(await headers());
}

/** Arrondi lisible d'un prix converti (3 chiffres significatifs au-delà de 1 000). */
function roundForDisplay(value: number): { value: number; digits: number } {
  if (value >= 1000) {
    const step = 10 ** (Math.floor(Math.log10(value)) - 2);
    return { value: Math.round(value / step) * step, digits: 0 };
  }
  if (value >= 10) return { value: Math.round(value), digits: 0 };
  return { value: Math.round(value * 100) / 100, digits: 2 };
}

/** Symbole court (₺, €, ₦…), sauf les « $ » ambigus des autres dollars (CA$, A$…). */
function currencyDisplay(currency: string, intlLocale: string): "narrowSymbol" | "symbol" {
  if (currency === "USD") return "narrowSymbol";
  try {
    const narrow = new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(1)
      .find((part) => part.type === "currency")?.value;
    return narrow === "$" ? "symbol" : "narrowSymbol";
  } catch {
    return "symbol";
  }
}

function formatMoney(value: number, currency: string, intlLocale: string): string {
  const rounded = value === 0 ? { value: 0, digits: 0 } : roundForDisplay(value);
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    currencyDisplay: currencyDisplay(currency, intlLocale),
    minimumFractionDigits: rounded.digits,
    maximumFractionDigits: rounded.digits,
  }).format(rounded.value);
}

function currencyName(currency: string, intlLocale: string): string {
  try {
    return new Intl.DisplayNames([intlLocale], { type: "currency" }).of(currency) ?? currency;
  } catch {
    return currency;
  }
}

export interface LocalPricing {
  /** Prix converti dans une autre monnaie que le FCFA. */
  converted: boolean;
  /** Nom de la monnaie affichée (« livre turque »), si convertie. */
  currencyName: string | null;
  /** Prix de Premium affiché (« ≈ 1 020 ₺ » ou « 12 000 FCFA »). */
  premium: string;
  /** Prix de l'offre gratuite (« 0 ₺ » ou « 0 FCFA »). */
  free: string;
  /** Montant réellement payé à Maketou, frais compris (« 12 000 FCFA »). */
  charged: string;
}

/** Prix des offres pour cet élève (ou ce visiteur), dans sa monnaie. */
export async function getLocalPricing(locale: Locale, userId: string | null): Promise<LocalPricing> {
  // Ce que l'élève paie vraiment (prix du produit + frais de la page de paiement).
  const premiumFcfa = PLAN_CREDITS.premium.paidFcfa;
  const fcfa: LocalPricing = {
    converted: false,
    currencyName: null,
    premium: formatFcfa(premiumFcfa),
    free: formatFcfa(PLAN_CREDITS.free.priceFcfa),
    charged: formatFcfa(premiumFcfa),
  };

  const currency = currencyForCountry(await pricingCountry(userId));
  if (!currency || isFcfaCurrency(currency)) return fcfa;
  const rate = await xafRate(currency);
  if (!rate) return fcfa;

  const intlLocale = LOCALE_INTL[locale] ?? "fr-FR";
  try {
    return {
      converted: true,
      currencyName: currencyName(currency, intlLocale),
      premium: `≈ ${formatMoney(premiumFcfa * rate, currency, intlLocale)}`,
      free: formatMoney(0, currency, intlLocale),
      charged: fcfa.charged,
    };
  } catch {
    return fcfa;
  }
}
