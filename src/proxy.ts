import { NextResponse, type NextRequest } from "next/server";
import { decryptSession } from "@/lib/auth/session";

// Next 16: the former `middleware.ts` convention is now `proxy.ts`.
// This is an OPTIMISTIC check (cookie only, no DB). Real enforcement lives in the
// DAL (verifySession) close to the data — see src/lib/auth/dal.ts.

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = req.cookies.get("session")?.value;
  const session = await decryptSession(token);
  const isAuthed = Boolean(session?.userId);

  const isProtected = path === "/" || path.startsWith("/dashboard");
  const isLogin = path === "/login";

  if (isProtected && !isAuthed) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (isLogin && isAuthed) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
  // Root: send authed users to the dashboard.
  if (path === "/" && isAuthed) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes, Next internals and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
