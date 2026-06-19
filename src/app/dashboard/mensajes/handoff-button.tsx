"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setHandoff } from "@/lib/chatwoot/actions";

/**
 * Toggle handoff for the active conversation.
 * status "open" = human is handling it (bot quiet) → button offers "Activar bot" (→ pending).
 * status "pending" = bot answering → button offers "Atender yo" (→ open).
 */
export function HandoffButton({ conversationId, status }: { conversationId: number; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isHuman = status === "open";

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await setHandoff({ conversationId, humano: !isHuman });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={toggle}
        disabled={pending}
        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
          isHuman
            ? "border-accent/40 text-accent hover:bg-accent/10"
            : "border-secondary/50 text-secondary hover:bg-secondary/10"
        }`}
        title={isHuman ? "Devolver la conversación al bot" : "Silenciar el bot y atender tú"}
      >
        {pending ? "…" : isHuman ? "Activar bot" : "Atender yo"}
      </button>
      {error && <span className="mt-0.5 text-[10px] text-danger">{error}</span>}
    </div>
  );
}
