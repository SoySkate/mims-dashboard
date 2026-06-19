/**
 * Block 4 verification — WITHOUT delivering any real WhatsApp message.
 * Only exercises sendReply against conversation ids that do NOT exist in the target account,
 * so Chatwoot returns 404 and nothing is ever sent. This proves the POST path works and the
 * account-scoped 404 guard (a foreign/absent conversationId is rejected, no delivery).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sendReply } from "@/lib/chatwoot/messages";
import { ChatwootError, isChatwootConfigured } from "@/lib/chatwoot/client";

async function expect404(label: string, account: number, conv: number) {
  try {
    await sendReply(account, conv, "[verificación — no debería entregarse]");
    console.log(`✗ FAIL ${label}: el POST NO dio error (¡podría haberse entregado!)`);
  } catch (e) {
    if (e instanceof ChatwootError && e.status === 404) {
      console.log(`✓ ${label}: 404 (rechazado, nada entregado)`);
    } else {
      console.log(`? ${label}: ${(e as Error).message}`);
    }
  }
}

async function main() {
  if (!isChatwootConfigured()) {
    console.log("✗ Chatwoot sin configurar");
    process.exitCode = 1;
    return;
  }
  // Dentos = account 6, which has conversations 1..3 only. conv 4 belongs to Tasqueta (acc 7).
  await expect404("Dentos(6) -> conv 4 (de Tasqueta)", 6, 4);
  await expect404("Dentos(6) -> conv 999999 (inexistente)", 6, 999999);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
