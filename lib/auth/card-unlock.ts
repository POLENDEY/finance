import { cookies } from "next/headers";

const COOKIE_NAME = "finance_unlock";
const MAX_AGE_SECONDS = 60 * 15;

type UnlockPayload = {
  profileId: number;
  cardIds: number[];
  grandVisible: boolean;
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

    return {
      profileId: payload.profileId,
      cardIds: Array.isArray(payload.cardIds) ? payload.cardIds : [],
      grandVisible: payload.grandVisible ?? false,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

async function readPayload(profileId: number) {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) {
    return null;
  }
  const payload = await decodeUnlock(value);
  if (!payload || payload.profileId !== profileId) {
    return null;
  }
  return payload;
}

async function writePayload(payload: UnlockPayload) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, await encodeUnlock(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

async function getOrCreatePayload(profileId: number): Promise<UnlockPayload> {
  const existing = await readPayload(profileId);
  if (existing) {
    return existing;
  }
  return {
    profileId,
    cardIds: [],
    grandVisible: false,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
}

export async function getUnlockedCardIds(profileId: number) {
  const payload = await readPayload(profileId);
  return payload?.cardIds ?? [];
}

export async function isGrandNetWorthVisible(profileId: number) {
  const payload = await readPayload(profileId);
  return payload?.grandVisible ?? false;
}

export async function isCardUnlocked(profileId: number, cardId: number) {
  const cardIds = await getUnlockedCardIds(profileId);
  return cardIds.includes(cardId);
}

/** @deprecated Use isCardUnlocked / isGrandNetWorthVisible */
export async function isFinanceUnlocked(profileId: number) {
  const payload = await readPayload(profileId);
  if (!payload) {
    return false;
  }
  return payload.cardIds.length > 0 || payload.grandVisible;
}

export async function unlockCard(profileId: number, cardId: number) {
  const payload = await getOrCreatePayload(profileId);
  const cardIds = payload.cardIds.includes(cardId)
    ? payload.cardIds
    : [...payload.cardIds, cardId];

  await writePayload({
    ...payload,
    cardIds,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  });
}

export async function lockCard(profileId: number, cardId: number) {
  const payload = await readPayload(profileId);
  if (!payload) {
    return;
  }

  await writePayload({
    ...payload,
    cardIds: payload.cardIds.filter((id) => id !== cardId),
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  });
}

export async function setGrandNetWorthVisible(profileId: number, visible: boolean) {
  const payload = await getOrCreatePayload(profileId);
  await writePayload({
    ...payload,
    grandVisible: visible,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  });
}

export async function clearFinanceUnlock() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** @deprecated Use unlockCard */
export async function setFinanceUnlock(profileId: number) {
  await setGrandNetWorthVisible(profileId, true);
}

export async function clearAllCardUnlocks() {
  await clearFinanceUnlock();
}
