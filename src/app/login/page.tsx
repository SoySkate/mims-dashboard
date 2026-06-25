import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

// Contacts for password recovery (no automated reset). Edit here if they change.
const CONTACT_EMAILS = ["andreu@mims.studio", "franc@mims.studio"];

export default async function LoginPage() {
  // Already logged in -> go straight to the dashboard.
  const session = await readSession();
  if (session?.userId) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        {/* Brand wordmark */}
        <div className="mb-8 text-center">
          <span className="font-display text-3xl font-extrabold text-text">
            mims<span className="text-accent">.</span>
          </span>
          <p className="label-mono mt-2">Panel de gestión</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8 shadow-xl shadow-black/20">
          <h1 className="font-display mb-1 text-xl font-bold text-text">Inicia sesión</h1>
          <p className="mb-6 text-sm text-muted">Gestiona tu agente de reservas.</p>
          <LoginForm />

          <details className="group mt-5 border-t border-border pt-4 text-sm">
            <summary className="cursor-pointer list-none text-muted transition-colors hover:text-text">
              ¿Has olvidado tu contraseña?
            </summary>
            <p className="mt-3 text-muted">
              Ponte en contacto con nosotros en{" "}
              {CONTACT_EMAILS.map((email, i) => (
                <span key={email}>
                  {i > 0 && " o "}
                  <a href={`mailto:${email}`} className="text-accent hover:underline">
                    {email}
                  </a>
                </span>
              ))}{" "}
              y te ayudamos a recuperar el acceso.
            </p>
          </details>
        </div>

        <p className="label-mono mt-6 text-center">mims · agente de reservas</p>
      </div>
    </main>
  );
}
