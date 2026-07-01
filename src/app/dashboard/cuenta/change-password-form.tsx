"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, type ChangePasswordState } from "@/lib/auth/actions";
import { PasswordInput } from "@/components/password-input";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful change.
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <form ref={formRef} action={action} className="flex max-w-sm flex-col gap-4">
      <Field id="actual" label="Contraseña actual" autoComplete="current-password" />
      <Field id="nueva" label="Nueva contraseña" autoComplete="new-password" />
      <Field id="repetir" label="Repetir nueva contraseña" autoComplete="new-password" />

      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-sm text-secondary">
          Contraseña actualizada correctamente.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

function Field({ id, label, autoComplete }: { id: string; label: string; autoComplete: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label-mono">
        {label}
      </label>
      <PasswordInput
        id={id}
        name={id}
        autoComplete={autoComplete}
        required
        className="w-full rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-text placeholder-muted outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </div>
  );
}
