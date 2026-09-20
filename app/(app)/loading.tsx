import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { getDictionary } from "@/lib/i18n/server";

export default async function AppLoading() {
  const dict = await getDictionary();
  return <PageSkeleton label={dict.feedback.loadingTitle} />;
}
