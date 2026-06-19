import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Already logged in -> go straight to the dashboard.
  const session = await readSession();
  if (session?.userId) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">mims-dashboard</h1>
        <p className="mb-6 text-sm text-gray-500">Inicia sesión para gestionar tu negocio.</p>
        <LoginForm />
      </div>
    </main>
  );
}
