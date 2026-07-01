"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setVozActivaAction } from "./voz-actions";

export function VozToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [activa, setActiva] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (pending) return;
    const next = !activa;
    setActiva(next); // optimistic
    setError(null);
    startTransition(async () => {
      const r = await setVozActivaAction(next);
      if (!r.ok) {
        setActiva(!next); // revert on failure
        setError(r.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2.5">
        <span className="text-sm text-text">
          {activa ? "Llamadas activas" : "Llamadas desactivadas"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={activa}
          aria-label="Activar o desactivar las llamadas"
          onClick={toggle}
          disabled={pending}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            activa ? "bg-accent" : "border border-border bg-elevated"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-text transition-transform ${
              activa ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
