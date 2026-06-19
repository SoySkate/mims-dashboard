"use server";

import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as z from "zod";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/auth-schema";
import { createSession, deleteSession } from "./session";

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
