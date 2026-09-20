import { getDictionary } from "@/lib/i18n/server";
import type { User } from "@/types";
import { SidebarInner } from "./sidebar-inner";

/** Rail latéral fixe — visible à partir de `lg`. */
export async function Sidebar({ user }: { user: User }) {
  const dict = await getDictionary();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar border-r border-line-soft lg:block">
      <SidebarInner user={user} tagline={dict.layout.tagline} />
    </aside>
  );
}
