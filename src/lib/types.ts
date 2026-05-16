export type ArticleLength = "short" | "medium" | "long";

export type WritingMode =
  | "standard"
  | "story"
  | "case_study"
  | "listicle"
  | "analysis";

export type CreationMode = "synthesized" | "rewrite";

export type RewriteGoal =
  | "new_article"
  | "new_angle"
  | "more_conversational"
  | "more_actionable";

export type ReferenceFocus = "mixed" | "structure" | "tone" | "opening";

export type ReferenceLevel = "low" | "medium" | "high";

export type ExpressionMode =
  | "standard"
  | "conversational"
  | "de_ai"
  | "opinionated";

export interface RuntimeInfo {
  platform: string;
  arch: string;
  tauriVersion: string;
  version: string;
}

export interface GeneratePayload {
  topic: string;
  audience?: string;
  style?: string;
  length: ArticleLength;
  imageCount?: number;
  mode?: WritingMode;
  systemPrompt: string;
  creationMode: CreationMode;
  sourceArticle?: string;
  rewriteGoal?: RewriteGoal;
  referenceFocus?: ReferenceFocus;
  referenceLevel?: ReferenceLevel;
  expressionMode?: ExpressionMode;
  apiKey?: string;
  apiModel?: string;
  apiBaseUrl?: string;
  enableWebSearch?: boolean;
  imagePrompt?: string;
  regenerateForDeAi?: boolean;
  clientSource?: string;
}

export interface WechatAccount {
  id: string;
  name: string;
  appId: string;
  appSecret: string;
  thumbMediaId: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  signupInviteCode?: string | null;
  membershipContactWechat?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipPlan {
  id: string;
  code: string;
  name: string;
  billingType: "monthly" | "lifetime";
  priceCents: number;
  priceLabel: string;
  durationDays: number | null;
  isLifetime: boolean;
  isActive: boolean;
  sortOrder: number;
  planCategory?: "text_only" | "text_image";
  supportsImage?: boolean;
  textDailyLimit: number;
  textMonthlyLimit?: number;
  imageMonthlyLimit: number;
  deAiMonthlyLimit: number;
  wechatAccountLimit: number;
  tagline: string;
  features: string[];
}

export interface UserMembership {
  id: string;
  status: string;
  startAt: string;
  endAt: string | null;
  isActive: boolean;
  plan: MembershipPlan;
}

export type QuotaResetMode = "calendar_day" | "calendar_month" | "rolling_days" | "membership_total";

export interface UsageQuotaItem {
  limit: number;
  used: number;
  remaining: number;
  periodKey: string;
  resetMode: QuotaResetMode;
  /** 滚动周期天数；会员按月时图片为 null */
  resetEveryDays: number | null;
  /** 下一轮额度恢复的 UTC 时刻（ISO 8601）；展示时换算为本地时间 */
  quotaRefreshAt?: string | null;
}

export interface UserQuotaSummary {
  source: string;
  /** 未开通会员时为 true，表示使用可配置天数的滚动窗口 */
  usesFreeRollingWindows?: boolean;
  text: UsageQuotaItem;
  image: UsageQuotaItem;
  deAi: UsageQuotaItem;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export interface DraftPayload {
  title: string;
  contentMd: string;
  contentHtml?: string;
  digest?: string;
  author?: string;
  wechatAppId?: string;
  wechatAppSecret?: string;
  wechatThumbMediaId?: string;
  wechatBaseUrl?: string;
}

export interface HealthcheckResult {
  ok: boolean;
  message: string;
}

export interface GenerateResponse {
  ok: boolean;
  articleMd: string;
  meta: {
    model: string;
    length: ArticleLength;
    mode?: WritingMode;
    creationMode: "synthesized" | "rewrite";
  };
  quota?: UserQuotaSummary;
}

export interface DraftResponse {
  mediaId?: string;
}

export interface UploadThumbResponse {
  thumbMediaId: string;
  url?: string;
}

export type ImageSize = "1024x1024" | "1024x1792" | "1792x1024";

export type ImageQuality = "standard" | "hd";

export interface ImageGeneratePayload {
  prompt: string;
  negativePrompt?: string;
  size: ImageSize;
  quality: ImageQuality;
  n: number;
  watermark?: boolean;
  authToken: string;
  baseUrl: string;
}

export interface ImageGenerateResponse {
  ok: boolean;
  images: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  meta: {
    model: string;
    size: ImageSize;
    quality: ImageQuality;
    n: number;
  };
  quota?: UserQuotaSummary;
}

export interface ModelConfig {
  textApiKey: string;
  textModel: string;
  enableWebSearch: boolean;
}
