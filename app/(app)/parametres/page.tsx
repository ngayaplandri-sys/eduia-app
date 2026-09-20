import type { Metadata } from "next";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { requireUser } from "@/lib/data/user";
import { getDictionary } from "@/lib/i18n/server";
import { ProfileSettings } from "@/components/parametres/profile-settings";
import { PreferencesSettings } from "@/components/parametres/preferences-settings";
import { SecuritySettings } from "@/components/parametres/security-settings";
import { NotificationsSettings } from "@/components/parametres/notifications-settings";
import { SubscriptionSettings } from "@/components/parametres/subscription-settings";
import { SignOutCard } from "@/components/parametres/sign-out-card";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.parametres.metaTitle,
    description: dict.parametres.metaDescription,
  };
}

export default async function ParametresPage() {
  const [user, dict] = await Promise.all([requireUser(), getDictionary()]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: dict.common.home, href: "/dashboard" },
          { label: dict.parametres.title },
        ]}
      />

      <div className="max-w-3xl space-y-5">
        <ProfileSettings user={user} />
        <PreferencesSettings />
        <SecuritySettings />
        <NotificationsSettings />
        <SubscriptionSettings plan={user.plan} />
        <SignOutCard />
      </div>
    </div>
  );
}
