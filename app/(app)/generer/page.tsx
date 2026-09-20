import type { Metadata } from "next";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { ExamWorkspace } from "@/components/generer/exam-workspace";
import { getLatestExam } from "@/lib/data/exam";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.generer.metaTitle,
    description: dict.generer.metaDescription,
  };
}

export default async function GenererPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const id = typeof sp.id === "string" ? sp.id : undefined;

  const [{ config, exam }, dict] = await Promise.all([
    getLatestExam(id),
    getDictionary(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: dict.common.home, href: "/dashboard" },
          { label: dict.generer.metaTitle },
        ]}
      />

      <ExamWorkspace initialConfig={config} initialExam={exam} />
    </div>
  );
}
