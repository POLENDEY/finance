import bcrypt from "bcryptjs";
import { ensureDefaultCards } from "@/lib/finance/balance-cards";
import { createAdminClient } from "@/lib/supabase/admin";

export type Profile = {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  password: string;
  avatar_url: string | null;
  created: string;
};

export type PublicProfile = {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created: string;
};

function normalizeBcryptHash(hash: string) {
  return hash.replace(/^\$2y\$/, "$2a$");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function getProfileById(id: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profile")
    .select("id, username, full_name, email, avatar_url, created")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data as PublicProfile;
}

export async function findProfileByLogin(login: string) {
  const supabase = createAdminClient();
  const trimmed = login.trim();

  const byUsername = await supabase
    .from("profile")
    .select("id, username, full_name, email, password, avatar_url, created")
    .ilike("username", trimmed)
    .maybeSingle<Profile>();

  if (byUsername.data) {
    return byUsername.data;
  }

  const byEmail = await supabase
    .from("profile")
    .select("id, username, full_name, email, password, avatar_url, created")
    .ilike("email", trimmed)
    .maybeSingle<Profile>();

  if (byEmail.error) {
    throw new Error(byEmail.error.message);
  }

  return byEmail.data;
}

export async function findProfileByUsernameAndEmail(
  username: string,
  email: string
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profile")
    .select("id, username, email")
    .ilike("username", username.trim())
    .ilike("email", email.trim())
    .maybeSingle<{ id: number; username: string; email: string | null }>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function verifyProfilePassword(profile: Profile, password: string) {
  return bcrypt.compare(password, normalizeBcryptHash(profile.password));
}

export async function createProfile(input: {
  username: string;
  email: string;
  password: string;
  fullName: string | null;
}) {
  const supabase = createAdminClient();
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  const { data: existingUsername } = await supabase
    .from("profile")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (existingUsername) {
    return { error: "An account with this username already exists." };
  }

  const { data: existingEmail } = await supabase
    .from("profile")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existingEmail) {
    return { error: "An account with this email already exists." };
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const { data, error } = await supabase
    .from("profile")
    .insert({
      username,
      email,
      full_name: input.fullName,
      password: hashedPassword,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  const profileId = data.id as number;
  await ensureDefaultCards(profileId);

  return { profileId };
}

export async function updateProfile(
  profileId: number,
  input: {
    username: string;
    fullName: string | null;
    email: string;
  }
) {
  const supabase = createAdminClient();
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName?.trim() || null;

  if (!username) {
    return { error: "Username is required." };
  }

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  const { data: existingUsername } = await supabase
    .from("profile")
    .select("id")
    .ilike("username", username)
    .neq("id", profileId)
    .maybeSingle();

  if (existingUsername) {
    return { error: "This username is already taken." };
  }

  const { data: existingEmail } = await supabase
    .from("profile")
    .select("id")
    .ilike("email", email)
    .neq("id", profileId)
    .maybeSingle();

  if (existingEmail) {
    return { error: "This email is already in use." };
  }

  const { error } = await supabase
    .from("profile")
    .update({
      username,
      email,
      full_name: fullName,
    })
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function resetProfilePassword(
  profileId: number,
  newPassword: string
) {
  if (newPassword.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profile")
    .update({ password: hashedPassword })
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
