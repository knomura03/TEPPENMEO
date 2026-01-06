"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/server/auth/supabase-server";
import { isSupabaseConfigured } from "@/server/utils/env";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signInAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/app");
  }

  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/app");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return;
  }

  redirect("/app");
}

export async function signUpAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/app");
  }

  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/app");
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return;
  }

  redirect("/app");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/auth/sign-in");
}
