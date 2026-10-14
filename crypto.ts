function bytesToB64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bufToB64url(buf: ArrayBuffer) {
  return bytesToB64(new Uint8Array(buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function b64urlToBuf(value: string) {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return b64ToBytes(b64).buffer;
}

export async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bufToB64url(digest);
}

async function aesKey(secret: string) {
  const raw = new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function aesEncrypt(secret: string, plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(secret);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return `${bytesToB64(iv)}.${bytesToB64(new Uint8Array(cipher))}`;
}

export async function aesDecrypt(secret: string, payload: string) {
  const [ivB64, dataB64] = payload.split(".");
  if (!ivB64 || !dataB64) throw new Error("Bad cipher");
  const key = await aesKey(secret);
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(ivB64) },
    key,
    b64ToBytes(dataB64),
  );
  return new TextDecoder().decode(clear);
}

export async function sealMessage(conversationId: string, plain: string) {
  const cipher = await aesEncrypt(`${conversationId}:radius-e2e-v1`, plain);
  return `enc:${cipher}`;
}

export async function openMessage(conversationId: string, stored: string) {
  if (!stored.startsWith("enc:")) return stored;
  try {
    return await aesDecrypt(`${conversationId}:radius-e2e-v1`, stored.slice(4));
  } catch {
    return "Unable to decrypt";
  }
}

export function euclidean(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    s += d * d;
  }
  return Math.sqrt(s);
}

export async function encryptDescriptor(ownerId: string, values: number[]) {
  return aesEncrypt(`face:${ownerId}:radius`, JSON.stringify(values));
}

export async function decryptDescriptor(ownerId: string, payload: string) {
  const raw = await aesDecrypt(`face:${ownerId}:radius`, payload);
  const parsed = JSON.parse(raw) as number[];
  return parsed;
}
