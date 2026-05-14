/** RSA-OAEP (SHA-256) 加密微信公众号 Secret，仅用于传到服务端前封装载荷 */

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

  const key = await crypto.subtle.importKey(
    "spki",
    pemToSpkiArrayBuffer(publicKeyPem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );

  const enc = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, new TextEncoder().encode(plaintext));

  const bytes = new Uint8Array(enc);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}
