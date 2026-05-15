const STORAGE_KEY = "openclaw-member-device-id";

function createDeviceId() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex
      .slice(8, 10)
      .join("")}-${hex.slice(10, 16).join("")}`;
  }
  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 用于注册风控；同一浏览器持久化，重装/清存储后会变 */
export function getOrCreateDeviceId(): string {
  try {
    let id = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!id || id.trim().length < 8) {
      id = createDeviceId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id.trim();
  } catch {
    return createDeviceId();
  }
}
