import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { AdminTable, type AdminColumn } from "@/components/admin/admin-table";
import { UsersFilters } from "@/components/admin/users-filters";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { getAdminUsers } from "@/lib/data/admin";
import { formatShortDate } from "@/lib/utils/format";
import { roleLabel } from "@/lib/roles";
import type { AdminUserListItem } from "@/types";

export const metadata: Metadata = { title: "Utilisateurs" };

function asString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const columns: AdminColumn<AdminUserListItem>[] = [
  {
    key: "name",
    header: "Utilisateur",
    primary: true,
    cell: (u) => (
      <Link
        href={`/admin/users/${u.id}`}
        className="font-semibold text-ink-900 underline-offset-2 hover:text-primary-700 hover:underline"
      >
        {u.name || "—"}
      </Link>
    ),
  },
  { key: "email", header: "E-mail", cell: (u) => <span className="text-ink-500">{u.email}</span> },
  {
    key: "level",
    header: "Niveau",
    cell: (u) => u.schoolLevel ?? <span className="text-ink-300">—</span>,
  },
  {
    key: "createdAt",
    header: "Inscription",
    cell: (u) => formatShortDate(u.createdAt),
  },
  {
    key: "status",
    header: "Statut",
    cell: (u) =>
      u.emailVerified ? (
        <Badge tone="success" size="sm">
          Vérifié
        </Badge>
      ) : (
        <Badge tone="neutral" size="sm">
          Non vérifié
        </Badge>
      ),
  },
  {
    key: "plan",
    header: "Plan",
    cell: (u) =>
      u.plan === "premium_plus" ? (
        <Badge tone="warning" size="sm">
          Premium+
        </Badge>
      ) : u.plan === "premium" ? (
        <Badge tone="warning" size="sm">
          Premium
        </Badge>
      ) : (
        <Badge tone="neutral" size="sm">
          Gratuit
        </Badge>
      ),
  },
  {
    key: "role",
    header: "Rôle",
    cell: (u) =>
      u.role === "admin" ? (
        <Badge tone="primary" size="sm">
          {roleLabel(u.role)}
        </Badge>
      ) : (
        <span className="text-ink-500">{roleLabel(u.role)}</span>
      ),
  },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const query = asString(sp.q);
  const plan =
    sp.plan === "free" || sp.plan === "premium" || sp.plan === "premium_plus"
      ? sp.plan
      : undefined;
  const role =
    sp.role === "student" || sp.role === "admin" ? sp.role : undefined;
  const page = Number(asString(sp.page)) > 0 ? Number(sp.page) : 1;

  const { items, total, page: currentPage, pageCount } = await getAdminUsers({
    query,
    plan,
    role,
    page,
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">
        Comptes réels inscrits sur EduIA. Le compte de démonstration est masqué.
      </p>

      <Card className="p-5 sm:p-6">
        <UsersFilters />

        <div className="mt-5">
          <AdminTable
            columns={columns}
            rows={items}
            getRowKey={(u) => u.id}
            empty={
              <EmptyState
                icon={Users}
                title={
                  query || plan || role
                    ? "Aucun utilisateur ne correspond"
                    : "Aucun utilisateur inscrit"
                }
                description={
                  query || plan || role
                    ? "Ajuste ta recherche ou tes filtres."
                    : "Les comptes créés sur EduIA apparaîtront ici."
                }
                className="border-0 py-12"
              />
            }
          />
        </div>

        {items.length > 0 ? (
          <div className="mt-5 border-t border-line-soft pt-4">
            <AdminPagination
              page={currentPage}
              pageCount={pageCount}
              total={total}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
