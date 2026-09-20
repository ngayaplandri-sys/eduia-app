import { AuthShowcasePanel } from "@/components/auth/auth-showcase-panel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-8 sm:px-6 sm:py-10 lg:h-dvh lg:overflow-y-auto lg:px-10 lg:py-[clamp(0.75rem,4vh,3rem)]">
      <div className="flex w-full max-w-[1160px] flex-col overflow-hidden rounded-[1.5rem] shadow-[var(--shadow-pop)] ring-1 ring-line-soft sm:rounded-[1.75rem] lg:flex-row">
        <AuthShowcasePanel />
        <div className="flex flex-1 items-center justify-center bg-surface px-4 py-8 sm:px-6 sm:py-10 lg:w-1/2 lg:px-10 lg:py-[clamp(1rem,4vh,2.5rem)]">
          {children}
        </div>
      </div>
    </main>
  );
}
