import type { Metadata } from "next";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { ResumerWorkspace } from "@/components/resumer/resumer-workspace";
import { getLatestCourseSummary } from "@/lib/data/summary";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.resumer.metaTitle,
    description: dict.resumer.metaDescription,
  };
}

export default async function ResumerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const id = typeof sp.id === "string" ? sp.id : undefined;

  const [{ document, summary }, dict] = await Promise.all([
    getLatestCourseSummary(id),
    getDictionary(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: dict.common.home, href: "/dashboard" },
          { label: dict.resumer.metaTitle },
        ]}
      />

      <ResumerWorkspace initialDocument={document} initialSummary={summary} />
    </div>
  );
}
