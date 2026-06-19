"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { getNegocioId } from "@/lib/auth/dal";
import { getNegocioChatwoot } from "./tenant";
import { sendReply } from "./messages";
import { setConversationStatus } from "./conversations";
import { ChatwootError } from "./client";

export type ReplyResult = { ok: true } | { ok: false; error: string };

const ReplySchema = z.object({
  conversationId: z.number().int().positive(),
  content: z.string().trim().min(1, "Mensaje vacío").max(4096),
});

// Heuristic: detect WhatsApp 24h re-engagement-window rejections in the error body.
function isWindowError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("24") ||
    m.includes("window") ||
    m.includes("ventana") ||
    m.includes("re-engage") ||
    m.includes("reengage") ||
    m.includes("template") ||
    m.includes("outside") ||
    m.includes("expired")
  );
}

export async function replyToConversation(input: unknown): Promise<ReplyResult> {
  const negocioId = await getNegocioId();
  const cfg = await getNegocioChatwoot(negocioId);
  if (!cfg) return { ok: false, error: "WhatsApp no configurado para este negocio" };

  const parsed = ReplySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  try {
    // accountId from the session -> a foreign conversationId yields 404 below.
    await sendReply(cfg.accountId, parsed.data.conversationId, parsed.data.content);
    revalidatePath("/dashboard/mensajes");
    return { ok: true };
  } catch (e) {
    if (e instanceof ChatwootError) {
      if (e.status === 404) return { ok: false, error: "Conversación no encontrada" };
      if (isWindowError(e.message)) {
        return {
          ok: false,
          error: "No se puede enviar: el cliente debe escribir primero (ventana de 24h de WhatsApp cerrada).",
        };
      }
      return { ok: false, error: `No se pudo enviar (Chatwoot ${e.status})` };
    }
    throw e;
  }
}

const HandoffSchema = z.object({
  conversationId: z.number().int().positive(),
  // true = human takes over (status open, bot quiet); false = give back to the bot (pending).
  humano: z.boolean(),
});

export async function setHandoff(input: unknown): Promise<ReplyResult> {
  const negocioId = await getNegocioId();
  const cfg = await getNegocioChatwoot(negocioId);
  if (!cfg) return { ok: false, error: "WhatsApp no configurado para este negocio" };

  const parsed = HandoffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos" };

  try {
    await setConversationStatus(
      cfg.accountId,
      parsed.data.conversationId,
      parsed.data.humano ? "open" : "pending",
    );
    revalidatePath("/dashboard/mensajes");
    return { ok: true };
  } catch (e) {
    if (e instanceof ChatwootError) {
      if (e.status === 404) return { ok: false, error: "Conversación no encontrada" };
      return { ok: false, error: `No se pudo cambiar el estado (Chatwoot ${e.status})` };
    }
    throw e;
  }
}
