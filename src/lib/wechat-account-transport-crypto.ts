/** RSA-OAEP (SHA-256) 加密微信公众号 Secret，仅用于传到服务端前封装载荷 */

const TRANSPORT_CRYPTO_UNAVAILABLE = "WECHAT_ACCOUNT_TRANSPORT_CRYPTO_UNAVAILABLE";

export function isWechatTransportCryptoUnavailable(error: unknown) {
  return error instanceof Error && error.message === TRANSPORT_CRYPTO_UNAVAILABLE;
}

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(TRANSPORT_CRYPTO_UNAVAILABLE);
  }
  return subtle;
}

function pemToSpkiArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptWechatAppSecretForTransport(
  plaintext: string,
  publicKeyPem: string,
): Promise<string> {
  if (!plaintext.trim()) return "";

  const subtle = getSubtleCrypto();

  const key = await subtle.importKey(
    "spki",
    pemToSpkiArrayBuffer(publicKeyPem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );

  const enc = await subtle.encrypt({ name: "RSA-OAEP" }, key, new TextEncoder().encode(plaintext));

  const bytes = new Uint8Array(enc);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

export function encodeWechatAppSecretForTransport(plaintext: string): string {
  if (!plaintext.trim()) return "";

  const bytes = new TextEncoder().encode(plaintext);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}
