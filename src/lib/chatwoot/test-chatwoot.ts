/**
 * Block 1 smoke test: prove we can reach Chatwoot, detect the WhatsApp inbox per account,
 * and list conversations. Also caches the detected inbox id into negocios.chatwoot_inbox_id.
 * Run: npm run chatwoot:test   (needs a real CHATWOOT_TOKEN in .env.local)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { isNotNull } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db, pool } from "@/lib/db/client";
import { negocios } from "@/lib/db/schema";
import { isChatwootConfigured } from "@/lib/chatwoot/client";
import { getWhatsappInboxId } from "@/lib/chatwoot/inboxes";
import { listConversations } from "@/lib/chatwoot/conversations";
import { getThread } from "@/lib/chatwoot/messages";

async function main() {
  if (!isChatwootConfigured()) {
    console.log("✗ Chatwoot sin configurar. Pon CHATWOOT_TOKEN real en .env.local y reintenta.");
    process.exitCode = 1;
    return;
  }

  const rows = await db
    .select({ id: negocios.id, nombre: negocios.nombre, accountId: negocios.chatwootAccountId })
    .from(negocios)
    .where(isNotNull(negocios.chatwootAccountId));

  console.log(`Negocios con chatwoot_account_id: ${rows.length}\n`);

  for (const n of rows) {
    console.log(`▸ ${n.nombre}  (account ${n.accountId})`);
    try {
      const inboxId = await getWhatsappInboxId(n.accountId!);
      if (!inboxId) {
        console.log("  · sin inbox de WhatsApp\n");
        continue;
      }
      console.log(`  · WhatsApp inbox = ${inboxId}`);
      // Cache it for Block 3.
      await db.update(negocios).set({ chatwootInboxId: String(inboxId) }).where(eq(negocios.id, n.id));

      const convs = await listConversations(n.accountId!, inboxId);
      console.log(`  · conversaciones activas (open+pending): ${convs.length}`);
      for (const c of convs.slice(0, 5)) {
        const snippet = c.lastMessage.replace(/\s+/g, " ").slice(0, 50);
        console.log(`     #${c.id} [${c.status}] ${c.name ?? c.phone ?? "?"} — "${snippet}"`);
      }

      // Block 2: read the thread of the most recent conversation.
      if (convs[0]) {
        const thread = await getThread(n.accountId!, convs[0].id);
        const arrow = { in: "←", out: "→", activity: "·" } as const;
        console.log(`  · hilo de #${convs[0].id}: ${thread.length} mensajes (últimos 6):`);
        for (const m of thread.slice(-6)) {
          console.log(`     ${arrow[m.direction]} ${m.content.replace(/\s+/g, " ").slice(0, 55)}`);
        }
      }
      console.log("");
    } catch (e) {
      console.log(`  ✗ ${(e as Error).message}\n`);
    }
  }
}

main()
  .catch((e) => {
    console.error("✗ test-chatwoot failed:", e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
