import { MobileNav } from "./mobile-nav";
import { HeaderTitle } from "./header-title";
import { SearchBar, SearchTrigger } from "@/components/search/search-bar";
import { NotificationButton } from "@/components/notifications/notification-button";
import { IdentityMenu } from "@/components/user/identity-menu";
import type { User } from "@/types";

export function Header({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line-soft bg-canvas/85 backdrop-blur-md">
      <div className="flex h-header items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <MobileNav user={user} />
          <HeaderTitle />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <SearchBar className="hidden md:flex md:w-[15rem] lg:w-[26rem]" />
          <SearchTrigger />
          <NotificationButton />
          <div className="mx-0.5 hidden h-8 w-px bg-line-soft sm:block" />
          <IdentityMenu user={user} variant="compact" />
        </div>
      </div>
    </header>
  );
}
