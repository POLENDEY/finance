import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";

export type Profile = {
  id: number;
  username: string;
  full_name: string | null;
  password: string;
  avatar_url: string | null;
  created: string;
};

function normalizeBcryptHash(hash: string) {
  return hash.replace(/^\$2y\$/, "$2a$");
}

export async function getProfileById(id: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profile")
    .select("id, username, full_name, avatar_url, created")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function findProfileByLogin(login: string) {
  const supabase = createAdminClient();
  const trimmed = login.trim();

  const { data, error } = await supabase
    .from("profile")
    .select("id, username, full_name, password, avatar_url, created")
    .eq("username", trimmed)
    .maybeSingle<Profile>();

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
  password: string;
  fullName: string | null;
}) {
  const supabase = createAdminClient();
  const username = input.username.trim();

  const { data: existing } = await supabase
    .from("profile")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return { error: "An account with this username already exists." };
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const { data, error } = await supabase
    .from("profile")
    .insert({
      username,
      full_name: input.fullName,
      password: hashedPassword,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { profileId: data.id as number };
}
