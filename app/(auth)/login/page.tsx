import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { getDictionary } from "@/lib/i18n/server";
import { isEmailConfigured } from "@/lib/email/send";
import { isGoogleAuthConfigured } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.auth.metaLoginTitle };
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm
        mode="login"
        passwordResetEnabled={isEmailConfigured()}
        googleEnabled={isGoogleAuthConfigured()}
      />
    </Suspense>
  );
}
