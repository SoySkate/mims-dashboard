import { getCurrentUser } from "@/lib/auth/dal";
import { logout } from "@/lib/auth/actions";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // getCurrentUser -> verifySession (redirects to /login if no valid session).
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="font-display shrink-0 text-base font-extrabold text-text">
              mims<span className="text-accent">.</span>
            </span>
            <span className="truncate text-sm text-muted">{user.negocioNombre}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-muted sm:inline">{user.email}</span>
            <ThemeToggle />
            <form action={logout}>
              <button className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-text">
                Salir
              </button>
            </form>
          </div>
        </div>
        <NavLinks />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
