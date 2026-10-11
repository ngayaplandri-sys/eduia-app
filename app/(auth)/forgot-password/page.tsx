import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isEmailConfigured } from "@/lib/email/send";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.auth.metaForgotTitle };
}

export default function ForgotPasswordPage() {
  // Sans envoi d'e-mails configuré, la page de connexion affiche déjà le
  // message « pas encore disponible » : on y renvoie.
  if (!isEmailConfigured()) redirect("/login");
  return <ForgotPasswordForm />;
}
