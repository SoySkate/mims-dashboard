"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/auth/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="label-mono">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-text placeholder-muted outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="label-mono">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-text placeholder-muted outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
