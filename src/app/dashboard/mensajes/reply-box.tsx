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
    <div className="border-t border-gray-200 p-3">
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
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
          className="max-h-32 min-h-[38px] flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
        <button
          onClick={send}
          disabled={pending || !content.trim()}
          className="h-[38px] shrink-0 rounded-md bg-gray-900 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
