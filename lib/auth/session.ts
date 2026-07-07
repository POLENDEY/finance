import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "fm_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
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

async function encodeSession(payload: SessionPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${await sign(encoded)}`;
}

async function decodeSession(value: string): Promise<SessionPayload | null> {
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
    ) as SessionPayload;

    if (!payload.profileId || !payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createSession(profileId: number) {
  const payload: SessionPayload = {
    profileId,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, await encodeSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) {
    return null;
  }
  return decodeSession(value);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionFromRequest(request: NextRequest) {
  const value = request.cookies.get(COOKIE_NAME)?.value;
  if (!value) {
    return null;
  }
  return decodeSession(value);
}

export { COOKIE_NAME };
