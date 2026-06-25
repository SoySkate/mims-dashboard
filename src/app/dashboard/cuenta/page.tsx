import { getCurrentUser } from "@/lib/auth/dal";
import { ChangePasswordForm } from "./change-password-form";

export default async function CuentaPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Cuenta</h1>
        <p className="mt-1 text-sm text-muted">
          {user.email} · {user.negocioNombre}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display mb-1 text-base font-bold text-text">Cambiar contraseña</h2>
        <p className="mb-4 text-sm text-muted">Mínimo 8 caracteres.</p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
