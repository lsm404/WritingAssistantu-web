export function normalizeEmailInput(email: string) {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmailAddress(email: string) {
  const normalized = normalizeEmailInput(email);

  if (!normalized || normalized.length > 254) return false;
  if (/\s/.test(normalized)) return false;
  if (/[^\x21-\x7e]/.test(normalized)) return false;

  const parts = normalized.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || !domain || local.length > 64) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;
  if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) {
    return false;
  }

  const tld = labels[labels.length - 1];
  return /^[a-z]{2,}$/i.test(tld);
}
