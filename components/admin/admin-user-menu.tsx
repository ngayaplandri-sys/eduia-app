"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ArrowLeft, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { roleLabel } from "@/lib/roles";
import type { User } from "@/types";

export function AdminUserMenu({ user }: { user: User }) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-[background-color,transform] duration-200 ease-out hover:-translate-y-px hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:hover:translate-y-0 sm:pr-2"
        >
          <Avatar src={user.avatarUrl} name={user.name} size={38} />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-bold text-ink-900">
              {user.name.split(" ")[0]}
            </span>
            <span className="block text-[0.75rem] text-ink-400">
              {roleLabel(user.role)}
            </span>
          </span>
          <ChevronDown
            className="hidden size-4 text-ink-400 sm:block"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[15rem]">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <Avatar src={user.avatarUrl} name={user.name} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink-900">{user.name}</p>
            <p className="truncate text-[0.75rem] text-ink-400">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <ArrowLeft />
            Retour à EduIA
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            signOut();
          }}
          className="text-danger-600 focus:bg-danger-50 focus:text-danger-600 [&_svg]:text-danger-600"
        >
          <LogOut />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
