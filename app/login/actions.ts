"use server";

import {
  createProfile,
  findProfileByLogin,
  verifyProfilePassword,
} from "@/lib/auth/profile";
import { clearSession, createSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export type AuthState = {
  error?: string;
  success?: string;
};

export async function signIn(
  _prev: void | AuthState | null,
  formData: FormData
): Promise<AuthState | null> {
  const login = (formData.get("email") as string).trim();
  const password = formData.get("password") as string;

  if (!login || !password) {
    return { error: "Email/username and password are required." };
  }

  try {
    const profile = await findProfileByLogin(login);

    if (!profile) {
      return { error: "Invalid email/username or password." };
    }

    const valid = await verifyProfilePassword(profile, password);
    if (!valid) {
      return { error: "Invalid email/username or password." };
    }

    await createSession(profile.id);
  } catch {
    return { error: "Unable to sign in right now. Please try again." };
  }

  redirect("/");
}

export async function signUp(
  _prev: void | AuthState | null,
  formData: FormData
): Promise<AuthState | null> {
  const username = (formData.get("username") as string).trim();
  const email = (formData.get("signupEmail") as string).trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const fullName = (formData.get("fullName") as string | null)?.trim() || null;

  if (!username) {
    return { error: "Username is required." };
  }

  if (!email) {
    return { error: "Email is required." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  try {
    const result = await createProfile({
      username,
      email,
      password,
      fullName,
    });

    if ("error" in result && result.error) {
      return { error: result.error };
    }

    if ("profileId" in result && typeof result.profileId === "number") {
      await createSession(result.profileId);
    }
  } catch {
    return { error: "Unable to create account right now. Please try again." };
  }

  redirect("/");
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}
