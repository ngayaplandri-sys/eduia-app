import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SettingsSectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/** Gabarit d'une section de la page Paramètres : puce d'icône + titre + contenu. */
export function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
          <Icon className="size-[1.1rem]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-title-sm font-bold text-ink-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-ink-500">{description}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </Card>
  );
}
