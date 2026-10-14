import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { getDictionary } from "@/lib/i18n/server";
import { isGoogleAuthConfigured } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.auth.metaSignupTitle };
}

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" googleEnabled={isGoogleAuthConfigured()} />
    </Suspense>
  );
}
