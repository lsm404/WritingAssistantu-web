const STORAGE_KEY = "openclaw-member-device-id";

/** 用于注册风控；同一浏览器持久化，重装/清存储后会变 */
export function getOrCreateDeviceId(): string {
  try {
    let id = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!id || id.trim().length < 8) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id.trim();
  } catch {
    return crypto.randomUUID();
  }
}
