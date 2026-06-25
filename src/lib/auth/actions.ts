"use server";

import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as z from "zod";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/auth-schema";
import { createSession, deleteSession } from "./session";
import { verifySession } from "./dal";

const LoginSchema = z.object({
  email: z.string().email("Email no válido").trim().toLowerCase(),
  password: z.string().min(1, "Introduce la contraseña"),
});

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Email o contraseña no válidos" };
  }
  const { email, password } = parsed.data;

  // Look up by lowercased email (matches the lower(email) unique index).
  const rows = await db
    .select({
      id: users.id,
      negocioId: users.negocioId,
      role: users.role,
      passwordHash: users.passwordHash,
      activo: users.activo,
    })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  const user = rows[0];

  // Always run a compare to reduce user-enumeration timing differences.
  const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);

  if (!user || !user.activo || !ok) {
    return { error: "Credenciales incorrectas" };
  }

  await createSession({ userId: user.id, negocioId: user.negocioId, role: user.role });
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

// ---- change password (while logged in) ----------------------------------------
const ChangePasswordSchema = z.object({
  actual: z.string().min(1, "Introduce tu contraseña actual"),
  nueva: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
  repetir: z.string().min(1, "Repite la nueva contraseña"),
});

export type ChangePasswordState = { error?: string; success?: boolean } | undefined;

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  // Identify the user from the session only (redirects to /login if not authed).
  const session = await verifySession();

  const parsed = ChangePasswordSchema.safeParse({
    actual: formData.get("actual"),
    nueva: formData.get("nueva"),
    repetir: formData.get("repetir"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }
  const { actual, nueva, repetir } = parsed.data;

  if (nueva !== repetir) {
    return { error: "La nueva contraseña y su repetición no coinciden" };
  }

  const rows = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  const user = rows[0];
  if (!user) return { error: "Usuario no encontrado" };

  // Same bcryptjs verify as login. Hash the new one with the same cost (10) used by the seeds.
  const ok = await bcrypt.compare(actual, user.passwordHash);
  if (!ok) return { error: "La contraseña actual no es correcta" };
  if (actual === nueva) return { error: "La nueva contraseña debe ser distinta de la actual" };

  const newHash = await bcrypt.hash(nueva, 10);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, session.userId));

  return { success: true };
}
