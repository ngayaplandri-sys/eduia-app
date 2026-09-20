import { LoadingState } from "@/components/feedback/loading-state";
import { getDictionary } from "@/lib/i18n/server";

export default async function DashboardLoading() {
  const dict = await getDictionary();
  return <LoadingState label={dict.feedback.loadingTitle} />;
}
