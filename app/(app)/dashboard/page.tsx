import type { Metadata } from "next";
import { hasUnlimitedAccess, requireUser } from "@/lib/data/user";
import { getRecentActivity, getActivityHistory } from "@/lib/data/activity";
import { getDocuments } from "@/lib/data/documents";
import { getCreditWallet, getUsageSummary } from "@/lib/data/credits";
import { needsCountryAnswer } from "@/lib/data/onboarding";
import { getDictionary } from "@/lib/i18n/server";
import { HeroBanner } from "@/components/dashboard/hero-banner";
import { StatsStrip } from "@/components/dashboard/stats-strip";
import { CreditsSection } from "@/components/dashboard/credits-section";
import { ActionCardsGrid } from "@/components/dashboard/action-cards-grid";
import { RecentActivitySection } from "@/components/dashboard/recent-activity-section";
import { CountryPrompt } from "@/components/dashboard/country-prompt";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.dashboard.metaTitle,
    description: dict.dashboard.metaDescription,
  };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [activity, { stats }, fullHistory, wallet, usage, askCountry] = await Promise.all([
    getRecentActivity(),
    getDocuments(),
    getActivityHistory(),
    getCreditWallet(user.id),
    getUsageSummary(user.id),
    needsCountryAnswer(user.id),
  ]);

  return (
    <div className="space-y-6">
      <HeroBanner userName={user.name} />
      {askCountry ? <CountryPrompt /> : null}
      <StatsStrip stats={stats} activityCount={fullHistory.length} />
      <CreditsSection wallet={wallet} usage={usage} unlimited={hasUnlimitedAccess(user)} />
      <ActionCardsGrid />
      <RecentActivitySection items={activity} />
    </div>
  );
}
