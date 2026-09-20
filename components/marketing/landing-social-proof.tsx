import { Avatar } from "@/components/ui/avatar";
import { Reveal } from "@/components/motion/reveal";
import { getRecentMembers } from "@/lib/data/social-proof";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Bande de réassurance sous le hero — volontairement une section à part
 * (et non un texte de plus empilé dans le hero, dont la pile est déjà pleine :
 * badge + titre + sous-texte + CTA). La vidéo de démonstration est ancrée ici,
 * juste sous la phrase de réassurance, plutôt que dans une section séparée.
 *
 * Les avatars affichés sont ceux des derniers membres réellement inscrits
 * (photo de profil si disponible, sinon initiales) — jamais de faux profils.
 * Se met à jour à chaque rendu de la landing (page non mise en cache) : un
 * nouvel inscrit apparaît dès le rendu suivant.
 */
export async function LandingSocialProof() {
  const [members, dict] = await Promise.all([getRecentMembers(), getDictionary()]);
  const t = dict.marketing;

  return (
    <section className="bg-canvas pt-6 pb-14 sm:pt-8 sm:pb-16 lg:pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3">
          {members.length > 0 ? (
            <div className="flex -space-x-2.5" aria-hidden>
              {members.map((member) => (
                <Avatar
                  key={member.id}
                  src={member.avatarUrl}
                  name={member.name}
                  size={36}
                  className="ring-2 ring-canvas"
                />
              ))}
            </div>
          ) : null}
          <p className="max-w-xs text-center text-fine leading-snug text-ink-500 sm:max-w-none">
            {t.socialProof}
          </p>
        </div>

        <Reveal className="mx-auto mt-8 max-w-5xl sm:mt-10">
          <div className="overflow-hidden rounded-2xl border border-line bg-ink-900 shadow-[var(--shadow-elevated)]">
            <video
              controls
              playsInline
              preload="metadata"
              controlsList="nofullscreen nodownload noremoteplayback noplaybackrate"
              disablePictureInPicture
              disableRemotePlayback
              className="video-controls-minimal aspect-video h-auto w-full object-contain"
              aria-label={t.video.aria}
            >
              <source src="/videos/demo-eduia.mp4" type="video/mp4" />
              {t.video.fallback}
            </video>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
