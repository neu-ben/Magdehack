"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sitzungFuer } from "@/lib/session";

// Login-Mock-up: kein Passwort, nur Auswahl der Person aus dem heutigen Dienstplan.
export async function anmelden(formData: FormData) {
  const id = String(formData.get("mitarbeiter_id") ?? "");
  if (!id || !(await sitzungFuer(id))) redirect("/?fehler=dienstplan");
  (await cookies()).set(SESSION_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 14 });
  redirect("/schicht");
}

export async function abmelden() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
