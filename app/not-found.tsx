import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { getDictionary } from "@/lib/i18n/server";

export default async function NotFound() {
  const dict = await getDictionary();
  const t = dict.feedback;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <BrainCircuit className="size-12 text-primary-600" strokeWidth={2} />
      <p className="mt-6 text-5xl font-extrabold tracking-tight text-ink-900">
        404
      </p>
      <h1 className="mt-2 text-lg font-bold text-ink-900">{t.notFoundTitle}</h1>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{t.notFoundBody}</p>
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "primary", size: "md" }), "mt-6")}
      >
        {t.backToDashboard}
      </Link>
    </main>
  );
}
