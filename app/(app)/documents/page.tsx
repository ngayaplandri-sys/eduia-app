import type { Metadata } from "next";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { DocumentStatsGrid } from "@/components/documents/document-stats";
import { DocumentLibrary } from "@/components/documents/document-library";
import { ImportDocumentButton } from "@/components/documents/import-document-button";
import { getDocuments } from "@/lib/data/documents";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.documents.metaTitle,
    description: dict.documents.metaDescription,
  };
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const initialQuery = typeof sp.q === "string" ? sp.q : "";

  const [{ documents, stats }, dict] = await Promise.all([
    getDocuments(),
    getDictionary(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: dict.common.home, href: "/dashboard" },
          { label: dict.documents.metaTitle },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-xl text-sm text-ink-500">{dict.documents.intro}</p>
        <ImportDocumentButton label={dict.documents.importButton} />
      </div>

      <DocumentStatsGrid stats={stats} />
      <DocumentLibrary documents={documents} initialQuery={initialQuery} />
    </div>
  );
}
