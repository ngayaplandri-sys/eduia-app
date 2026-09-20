import type { Metadata } from "next";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { CorrectionWorkspace } from "@/components/corriger/correction-workspace";
import { getLatestCorrection } from "@/lib/data/correction";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.corriger.metaTitle,
    description: dict.corriger.metaDescription,
  };
}

export default async function CorrigerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const id = typeof sp.id === "string" ? sp.id : undefined;

  const [{ config, correction }, dict] = await Promise.all([
    getLatestCorrection(id),
    getDictionary(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: dict.common.home, href: "/dashboard" },
          { label: dict.corriger.metaTitle },
        ]}
      />

      <CorrectionWorkspace
        initialConfig={config}
        initialCorrection={correction}
      />
    </div>
  );
}
