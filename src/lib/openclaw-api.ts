import type {
  AuthSession,
  AuthUser,
  DraftPayload,
  DraftResponse,
  GeneratePayload,
  GenerateResponse,
  HealthcheckResult,
  ImageGeneratePayload,
  ImageGenerateResponse,
  MembershipPlan,
  ModelConfig,
  UploadThumbResponse,
  UserMembership,
  UserQuotaSummary,
  WechatAccount,
} from "./types";

import { getOrCreateDeviceId } from "./device-id";
import {
  encodeWechatAppSecretForTransport,
  encryptWechatAppSecretForTransport,
  isWechatTransportCryptoUnavailable,
} from "./wechat-account-transport-crypto";

const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export const defaultBackendBaseUrl = envBaseUrl || "";

export async function backendHealthcheck(baseUrl: string): Promise<HealthcheckResult> {
  const response = await fetch(`${baseUrl}/health`);

  if (!response.ok) {
    throw new Error(`Healthcheck failed with status ${response.status}`);
  }

  const data = (await response.json()) as { ok?: boolean };

  return {
    ok: data.ok === true,
    message: data.ok ? "Backend is reachable." : "Backend returned an unexpected payload.",
  };
}

export async function registerAccount(
  baseUrl: string,
  payload: { email: string; password: string; displayName: string; inviteCode: string },
): Promise<{ user: AuthUser }> {
  const deviceId = getOrCreateDeviceId();
  const response = await fetch(`${baseUrl}/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await parseError(response);
  }

  const data = (await response.json()) as { user: AuthUser };
  return { user: data.user };
}

export async function loginAccount(
  baseUrl: string,
  payload: { email: string; password: string },
): Promise<AuthSession> {
  const response = await fetch(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return (await response.json()) as AuthSession;
}

export async function fetchCurrentUser(
  baseUrl: string,
  token: string,
  options?: { signal?: AbortSignal },
): Promise<{
  user: AuthUser;
  membership: UserMembership | null;
  quota: UserQuotaSummary | null;
  session: { expiresAt: string };
}> {
  const response = await fetch(`${baseUrl}/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    await parseError(response);
  }

  return (await response.json()) as {
    user: AuthUser;
    membership: UserMembership | null;
    quota: UserQuotaSummary | null;
    session: { expiresAt: string };
  };
}

export async function fetchMembershipPlans(baseUrl: string): Promise<MembershipPlan[]> {
  const response = await fetch(`${baseUrl}/v1/plans`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
  });

  if (!response.ok) {
    await parseError(response);
  }

  const data = (await response.json()) as { plans: MembershipPlan[] };
  return data.plans;
}

export async function checkoutMembership(
  baseUrl: string,
  token: string,
  planCode: string,
): Promise<{ membership: UserMembership; order: { orderNo: string; amountLabel: string } }> {
  const response = await fetch(`${baseUrl}/v1/memberships/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ planCode }),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return (await response.json()) as {
    membership: UserMembership;
    order: { orderNo: string; amountLabel: string };
  };
}

export function buildGeneratePayload(payload: GeneratePayload) {
  return {
    system_prompt: payload.systemPrompt?.trim() || undefined,
    topic: payload.topic,
    audience: payload.audience || undefined,
    style: payload.style || undefined,
    length: payload.length,
    mode: payload.mode || undefined,
    creation_mode: payload.creationMode,
    source_article: payload.sourceArticle || undefined,
    current_article_md: payload.currentArticleMd || undefined,
    rewrite_goal: payload.rewriteGoal || undefined,
    reference_focus: payload.referenceFocus || undefined,
    reference_level: payload.referenceLevel || undefined,
    expression_mode: payload.expressionMode || undefined,
    enable_web_search: payload.enableWebSearch ?? undefined,
    regenerate_for_de_ai: payload.regenerateForDeAi || undefined,
    client_source: payload.clientSource || "web",
  };
}

export function buildDraftPayload(payload: DraftPayload) {
  return {
    title: payload.title,
    content_md: payload.contentMd,
    content_html: payload.contentHtml || undefined,
    digest: payload.digest || undefined,
    author: payload.author || undefined,
    wechat_appid: payload.wechatAppId || undefined,
    wechat_appsecret: payload.wechatAppSecret || undefined,
    wechat_thumb_media_id: payload.wechatThumbMediaId || undefined,
    wechat_base_url: payload.wechatBaseUrl || undefined,
  };
}

async function parseError(response: Response): Promise<never> {
  let message = `Request failed with status ${response.status}`;
  const rawText = await response.text().catch(() => "");

  try {
    const data = JSON.parse(rawText) as { detail?: string; error?: string; message?: string };
    if (data.detail) {
      message = data.detail;
    } else if (data.message) {
      message = data.message;
    } else if (data.error) {
      message = data.error;
    }
  } catch {
    if (rawText) {
      message = rawText;
    }
  }

  console.error("[openclaw-api] request failed", {
    url: response.url,
    status: response.status,
    body: rawText,
  });

  throw new Error(message);
}

export async function generateArticle(
  baseUrl: string,
  token: string,
  payload: GeneratePayload,
  onChunk?: (delta: string) => void,
): Promise<GenerateResponse> {
  const response = await fetch(`${baseUrl}/article/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(buildGeneratePayload(payload)),
  });

  if (!response.ok) {
    await parseError(response);
  }

  const data = (await response.json()) as {
    ok: boolean;
    article_md: string;
    meta: {
      model: string;
      length: GeneratePayload["length"];
      mode?: GeneratePayload["mode"];
      creation_mode: GeneratePayload["creationMode"];
    };
    quota?: UserQuotaSummary;
  };

  if (onChunk && data.article_md) {
    onChunk(data.article_md);
  }

  return {
    ok: data.ok,
    articleMd: data.article_md,
    meta: {
      model: data.meta.model,
      length: data.meta.length,
      mode: data.meta.mode,
      creationMode: data.meta.creation_mode,
    },
    quota: data.quota,
  };
}

export async function sendWechatDraft(
  baseUrl: string,
  payload: DraftPayload,
): Promise<DraftResponse> {
  const response = await fetch(`${baseUrl}/wechat/draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildDraftPayload(payload)),
  });

  if (!response.ok) {
    await parseError(response);
  }

  const data = (await response.json()) as { media_id?: string };
  return {
    mediaId: data.media_id,
  };
}

export async function uploadWechatThumb(
  baseUrl: string,
  file: File,
  account?: {
    appId?: string;
    appSecret?: string;
  },
): Promise<UploadThumbResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    if (account?.appId) {
      formData.append("wechat_appid", account.appId);
    }
    if (account?.appSecret) {
      formData.append("wechat_appsecret", account.appSecret);
    }

    const response = await fetch(`${baseUrl}/wechat/upload_thumb`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      await parseError(response);
    }

    const data = (await response.json()) as { thumb_media_id: string; url?: string };
    return {
      thumbMediaId: data.thumb_media_id,
      url: data.url,
    };
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("上传请求未成功到达服务，请检查代理配置、线上服务连通性，以及服务器是否开放上传接口。");
    }
    throw error;
  }
}

// ===== Image Generation =====

export function buildImagePayload(payload: ImageGeneratePayload) {
  return {
    prompt: payload.prompt,
    negative_prompt: payload.negativePrompt || undefined,
    size: payload.size,
    quality: payload.quality,
    n: payload.n,
  };
}

export async function generateImage(payload: ImageGeneratePayload): Promise<ImageGenerateResponse> {
  const response = await fetch(`${payload.baseUrl}/image/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${payload.authToken}`,
    },
    body: JSON.stringify({
      prompt: payload.prompt,
      negative_prompt: payload.negativePrompt || undefined,
      size: payload.size,
      quality: payload.quality,
      n: payload.n,
      watermark: payload.watermark,
    }),
  });

  if (!response.ok) {
    await parseError(response);
  }

  const data = (await response.json()) as {
    images?: Array<{
      url?: string;
      b64_json?: string;
      revised_prompt?: string;
    }>;
    meta?: {
      model?: string;
    };
    quota?: UserQuotaSummary;
  };

  return {
    ok: true,
    images: data.images || [],
    meta: {
      model: data.meta?.model || "",
      size: payload.size,
      quality: payload.quality,
      n: payload.n,
    },
    quota: data.quota,
  };
}

// ===== Model Configuration =====

export async function fetchModelConfig(baseUrl: string, token: string): Promise<ModelConfig> {
  const response = await fetch(`${baseUrl}/v1/model-config`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await parseError(response);
  }

  const data = (await response.json()) as { config: ModelConfig };
  return data.config;
}

export async function updateModelConfig(baseUrl: string, token: string, config: Partial<ModelConfig>): Promise<ModelConfig> {
  const response = await fetch(`${baseUrl}/v1/model-config`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    await parseError(response);
  }

  const data = (await response.json()) as { config: ModelConfig };
  return data.config;
}

export async function fetchUserPrompts(baseUrl: string, token: string): Promise<{ prompts: any[] }> {
  const response = await fetch(`${baseUrl}/v1/prompts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function createUserPrompt(baseUrl: string, token: string, payload: { name: string; content: string }): Promise<{ prompt: any }> {
  const response = await fetch(`${baseUrl}/v1/prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateUserPrompt(baseUrl: string, token: string, promptId: string, payload: { name: string; content: string }): Promise<{ prompt: any }> {
  const response = await fetch(`${baseUrl}/v1/prompts/${promptId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteUserPrompt(baseUrl: string, token: string, promptId: string): Promise<{ ok: boolean }> {
  const response = await fetch(`${baseUrl}/v1/prompts/${promptId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchUserWechatAccounts(
  baseUrl: string,
  token: string,
): Promise<{ accounts: WechatAccount[]; activeAccountId: string }> {
  const response = await fetch(`${baseUrl}/v1/wechat-accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchWechatAccountsEncryptionKey(
  baseUrl: string,
  token: string,
): Promise<{ publicKeyPem: string }> {
  const response = await fetch(`${baseUrl}/v1/wechat-accounts/encryption-key`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function saveUserWechatAccounts(
  baseUrl: string,
  token: string,
  payload: { accounts: WechatAccount[]; activeAccountId: string },
): Promise<{ accounts: WechatAccount[]; activeAccountId: string }> {
  const { publicKeyPem } = await fetchWechatAccountsEncryptionKey(baseUrl, token);

  const accountsPayload = await Promise.all(
    payload.accounts.map(async (a) => {
      const trimmedSecret = a.appSecret.trim();
      const item: {
        id: string;
        name: string;
        appId: string;
        thumbMediaId: string;
        appSecretEncrypted?: string;
        appSecretBase64?: string;
      } = {
        id: a.id,
        name: a.name,
        appId: a.appId,
        thumbMediaId: a.thumbMediaId,
        appSecretEncrypted: "",
      };

      if (!trimmedSecret) return item;

      try {
        item.appSecretEncrypted = await encryptWechatAppSecretForTransport(trimmedSecret, publicKeyPem);
      } catch (error) {
        if (!isWechatTransportCryptoUnavailable(error)) {
          throw error;
        }
        delete item.appSecretEncrypted;
        item.appSecretBase64 = encodeWechatAppSecretForTransport(trimmedSecret);
      }

      return item;
    }),
  );

  const response = await fetch(`${baseUrl}/v1/wechat-accounts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      accounts: accountsPayload,
      activeAccountId: payload.activeAccountId,
    }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}
