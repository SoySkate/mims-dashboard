/**
 * Block 5 verification WITHOUT changing any live conversation's effective state.
 * 1) 404 guard: toggle on an absent conv id is rejected.
 * 2) Endpoint works: set the first Tasqueta conversation to its CURRENT status (a no-op),
 *    proving toggle_status returns OK without altering bot/human behaviour.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import "@/lib/db/client"; // side-effect: ensure .env.local is loaded before chatwoot reads env
import { listConversations, setConversationStatus } from "@/lib/chatwoot/conversations";
import { ChatwootError, isChatwootConfigured } from "@/lib/chatwoot/client";

async function main() {
  if (!isChatwootConfigured()) {
    console.log("✗ Chatwoot sin configurar");
    process.exitCode = 1;
    return;
  }

  // 1) 404 guard
  try {
    await setConversationStatus(6, 999999, "open");
    console.log("✗ FAIL guard: no dio 404");
  } catch (e) {
    if (e instanceof ChatwootError && e.status === 404) console.log("✓ guard: conv inexistente -> 404");
    else console.log(`? guard: ${(e as Error).message}`);
  }

  // 2) no-op round-trip on Tasqueta (account 7, inbox 7)
  const convs = await listConversations(7, 7);
  const c = convs[0];
  if (!c) {
    console.log("· (sin conversaciones activas en Tasqueta para el no-op)");
    return;
  }
  const current = c.status === "open" || c.status === "pending" ? c.status : "pending";
  try {
    await setConversationStatus(7, c.id, current);
    console.log(`✓ endpoint OK: conv #${c.id} fijada a su estado actual "${current}" (sin cambios reales)`);
  } catch (e) {
    console.log(`✗ endpoint: ${(e as Error).message}`);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => process.exit());
