/**
 * Low-level Chatwoot Application API client. SERVER-SIDE ONLY.
 *
 * We use a runtime guard (not the `server-only` package) so the tsx smoke test can import
 * this directly. The token is read from a non-NEXT_PUBLIC env var, so it is never bundled
 * into client code anyway; the guard is belt-and-suspenders.
 *
 * SECURITY: CHATWOOT_TOKEN is a super-admin token that can read EVERY account. Callers must
 * always pass the accountId derived from the session — never one supplied by the client.
 */
if (typeof window !== "undefined") {
  throw new Error("chatwoot/client is server-only and must not run in the browser");
}

// Read env lazily (inside calls), not at module load: imports are hoisted above any
// dotenv config() in scripts, so a top-level read could see undefined.
function base() {
  return process.env.CHATWOOT_BASE_URL;
}
function token() {
  return process.env.CHATWOOT_TOKEN;
}

export class ChatwootError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ChatwootError";
  }
}

export function isChatwootConfigured(): boolean {
  const t = token();
  return Boolean(base() && t && !t.startsWith("PLACEHOLDER"));
}

/** GET/POST the Chatwoot Application API. `path` starts with `/accounts/...`. */
export async function chatwootFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const BASE = base();
  const TOKEN = token();
  if (!BASE || !TOKEN) {
    throw new ChatwootError(0, "Chatwoot no configurado (CHATWOOT_BASE_URL / CHATWOOT_TOKEN)");
  }
  if (TOKEN.startsWith("PLACEHOLDER")) {
    throw new ChatwootError(0, "CHATWOOT_TOKEN es el placeholder — pon el token real en .env.local");
  }

  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    cache: "no-store", // live data, never cache
    headers: {
      api_access_token: TOKEN,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ChatwootError(res.status, `${init?.method ?? "GET"} ${path} -> ${res.status} ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}
