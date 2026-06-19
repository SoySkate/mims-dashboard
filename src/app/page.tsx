import { redirect } from "next/navigation";

// proxy.ts already routes "/" by auth state; this is a server-side fallback.
export default function Home() {
  redirect("/dashboard");
}
