"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { replyToConversation } from "@/lib/chatwoot/actions";

export function ReplyBox({ conversationId }: { conversationId: number }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    const text = content.trim();
    if (!text || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await replyToConversation({ conversationId, content: text });
      if (!res.ok) {
        setError(res.error);
      } else {
        setContent("");
        router.refresh(); // show the sent message in the thread
      }
    });
  }

  return (
    <div className="border-t border-border p-3">
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      <div className="flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter = newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Escribe una respuesta…"
          className="max-h-32 min-h-[38px] flex-1 resize-none rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text placeholder-muted outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={send}
          disabled={pending || !content.trim()}
          className="h-[38px] shrink-0 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          {pending ? "…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
