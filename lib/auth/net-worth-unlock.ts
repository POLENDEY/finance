import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "nw_unlock";
const MAX_AGE_SECONDS = 60 * 15;

type UnlockPayload = {
  profileId: number;
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET environment variable.");
  }
  return secret;
}

async function sign(encodedPayload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload)
  );
  return Buffer.from(signature).toString("base64url");
}

async function encodeUnlock(payload: UnlockPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${await sign(encoded)}`;
}

async function decodeUnlock(value: string): Promise<UnlockPayload | null> {
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = await sign(encoded);
  if (signature.length !== expected.length) {
    return null;
  }

  let valid = true;
  for (let i = 0; i < signature.length; i += 1) {
    if (signature.charCodeAt(i) !== expected.charCodeAt(i)) {
      valid = false;
    }
  }
  if (!valid) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as UnlockPayload;

    if (!payload.profileId || !payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function setNetWorthUnlock(profileId: number) {
  const payload: UnlockPayload = {
    profileId,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, await encodeUnlock(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearNetWorthUnlock() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isNetWorthUnlocked(profileId: number) {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) {
    return false;
  }
  const payload = await decodeUnlock(value);
  return payload?.profileId === profileId;
}

export async function getNetWorthUnlockFromRequest(request: NextRequest) {
  const value = request.cookies.get(COOKIE_NAME)?.value;
  if (!value) {
    return null;
  }
  return decodeUnlock(value);
}
