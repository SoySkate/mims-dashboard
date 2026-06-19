import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { logout } from "@/lib/auth/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // getCurrentUser -> verifySession (redirects to /login if no valid session).
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <span className="text-sm font-semibold text-gray-900">{user.negocioNombre}</span>
            <span className="ml-2 text-xs text-gray-400">{user.negocioSlug}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{user.email}</span>
            <form action={logout}>
              <button className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100">
                Salir
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-4 px-4 pb-2 text-sm">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            Inicio
          </Link>
          <Link href="/dashboard/calendario" className="text-gray-600 hover:text-gray-900">
            Calendario
          </Link>
          <Link href="/dashboard/mensajes" className="text-gray-600 hover:text-gray-900">
            Mensajes
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
