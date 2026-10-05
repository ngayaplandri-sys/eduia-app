import Image from "next/image";
import { Quote } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Reveal } from "@/components/motion/reveal";
import { getRecentMembers } from "@/lib/data/social-proof";
import { testimonials } from "@/lib/config/testimonials";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Preuves — uniquement des données réelles :
 *  - les avatars des derniers membres réellement inscrits (photo de profil si
 *    disponible, sinon initiales), jamais de faux profils ;
 *  - les témoignages de `lib/config/testimonials.ts`, affichés seulement
 *    s'il y en a (la liste est vide tant qu'aucun avis réel n'a été recueilli).
 * Sans membre ni témoignage (base indisponible), la section ne s'affiche pas.
 */
export async function LandingProof() {
  const [members, dict] = await Promise.all([getRecentMembers(), getDictionary()]);
  const t = dict.marketing.proof;

  if (members.length === 0 && testimonials.length === 0) return null;

  return (
    <section className="relative bg-canvas pb-6 pt-4 sm:pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {members.length > 0 ? (
          <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-full px-6 py-4 text-center sm:flex-row sm:justify-center sm:text-left">
            <div className="flex -space-x-3" aria-hidden>
              {members.map((member, i) => (
                <span key={member.id} className="relative" style={{ zIndex: members.length - i }}>
                  <Avatar
                    src={member.avatarUrl}
                    name={member.name}
                    size={42}
                    className="ring-[3px] ring-canvas transition-transform duration-300 hover:-translate-y-1"
                  />
                </span>
              ))}
            </div>
            <p className="max-w-md text-[0.98rem] font-medium text-ink-700">{t.text}</p>
          </Reveal>
        ) : null}

        {testimonials.length > 0 ? (
          <div className="mt-14">
            <Reveal>
              <h2 className="text-center font-display text-[2rem] font-medium tracking-[-0.01em] text-ink-900 sm:text-[2.4rem]">
                {t.testimonialsHeading}
              </h2>
            </Reveal>
            <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((item, i) => (
                <li key={`${item.name}-${i}`}>
                  <Reveal delayMs={i * 110} className="h-full">
                    <figure className="flex h-full flex-col rounded-[1.5rem] bg-surface p-6 shadow-[var(--shadow-card)] ring-1 ring-line">
                      <Quote className="size-6 text-primary-300" aria-hidden />
                      <blockquote className="mt-4 flex-1 text-[0.98rem] leading-relaxed text-ink-700">
                        « {item.quote} »
                      </blockquote>
                      <figcaption className="mt-6 flex items-center gap-3">
                        {item.avatar ? (
                          <Image
                            src={item.avatar}
                            alt=""
                            width={44}
                            height={44}
                            className="size-11 rounded-full object-cover"
                          />
                        ) : (
                          <Avatar src={null} name={item.name} size={44} />
                        )}
                        <span>
                          <span className="block text-sm font-bold text-ink-900">{item.name}</span>
                          <span className="block text-fine text-ink-500">{item.role}</span>
                        </span>
                      </figcaption>
                    </figure>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
