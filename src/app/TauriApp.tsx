"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { App as AntApp, Button, ConfigProvider, Input, Modal, Space, Tag } from "antd";
import { CheckCircleFilled, CloudUploadOutlined, RocketOutlined, SendOutlined } from "@ant-design/icons";
import {
  backendHealthcheck,
  fetchCurrentUser,
  fetchMembershipPlans,
  generateArticle,
  generateImage,
  loginAccount,
  registerAccount,
  sendWechatDraft,
  uploadWechatThumb,
  fetchUserPrompts,
  createUserPrompt,
  updateUserPrompt,
  deleteUserPrompt,
  fetchUserWechatAccounts,
  saveUserWechatAccounts,
} from "../lib/openclaw-api";
import { copyText } from "../lib/clipboard";
import { isValidEmailAddress, normalizeEmailInput } from "../lib/email";
// No tauri imports
import type {
  AuthSession,
  AuthUser,
  GeneratePayload,
  MembershipPlan,
  RuntimeInfo,
  UserMembership,
  UserQuotaSummary,
  WechatAccount,
} from "../lib/types";
import {
  emptyWechatAccount,
  defaultArticleDraft,
  defaultDraftMeta,
  defaultPromptSlots,
  extractTitleFromMarkdown,
  markdownToWechatHtml,
  type DraftMeta,
  type PromptSlot,
  summarizeMarkdown,
  stripUnicodeReplacementChars,
  type SidebarView,
  workspaceImageCountOptions,
  workspaceReferenceFocusOptions,
  workspaceReferenceLevelOptions,
  workspaceRewriteGoalOptions,
  workspaceStyleOptions,
  WORKSPACE_TOPIC_MAX_CHARS,
} from "../lib/app-ui";
import { Sidebar } from "../components/Sidebar";
import { WorkspacePage } from "../components/pages/WorkspacePage";
import { PromptPage } from "../components/pages/PromptPage";
import { WechatAccountLibraryPage } from "../components/pages/WechatAccountLibraryPage";
import { ModelPage } from "../components/pages/ModelPage";
import { PlaceholderPage } from "../components/pages/PlaceholderPage";
import { AgentDashboardPage } from "../components/pages/AgentDashboardPage";
import { ImagePage } from "../components/pages/ImagePage";
import { LoginPanel } from "./LoginPanel";
import { MembershipPage } from "../components/pages/MembershipPage";
import { WechatPreviewModal } from "../components/WechatPreviewModal";
import { SettingsPage } from "../components/pages/SettingsPage";

const MEMBER_BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";
const CONTENT_BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";

const AUTH_TOKEN_STORAGE_KEY = "openclaw.authToken";
const SETTINGS_COLLAPSED_STORAGE_KEY = "openclaw.settingsCollapsed";
const STARTUP_AUTH_TIMEOUT_MS = 5000;
const STARTUP_UPDATE_CHECK_DELAY_MS = 3500;
const WECHAT_COVER_MAX_BYTES = 5 * 1024 * 1024;
const EMAIL_FORMAT_MESSAGE = "邮箱格式不正确，请使用英文句号，例如 name@qq.com";

/** 历史版本与本应用曾写入的本地草稿/公众号缓存，启动时清除（不再使用 localStorage 持久化这些内容） */
const LEGACY_LOCAL_CACHE_KEYS = [
  "openclaw.wechatAccounts",
  "openclaw.activeAccountId",
  "openclaw.articleDraft",
  "openclaw.resultMarkdown",
  "openclaw.draftMeta",
  "openclaw.promptDefaultOverride",
  "openclaw.activePromptId",
] as const;

function pickPromptCreatedAt(p: Record<string, unknown>): string | undefined {
  const raw = p.created_at ?? p.createdAt;
  return typeof raw === "string" && raw.trim() ? raw : undefined;
}

const REGISTER_ERROR_HINT: Record<string, string> = {
  INVALID_EMAIL: EMAIL_FORMAT_MESSAGE,
  REGISTRATION_IP_LIMIT: "当前 IP 在近期注册次数过多，请稍后再试。",
  REGISTRATION_SUBNET_LIMIT: "当前网络环境注册次数过多，请稍后再试。",
  REGISTRATION_DEVICE_LIMIT: "本设备注册账号数已达上限，请使用已有账号登录。",
  INVALID_INVITE_CODE: "请输入 8 位字母邀请码（可含空格，系统会自动去掉非字母字符）。",
  INVITE_CODE_NOT_FOUND: "邀请码无效，请向代理人或客服索取有效邀请码。",
  AGENT_DISABLED: "该邀请码已停用，请联系客服。",
};

function getMembershipToneClass(planName?: string | null) {
  const name = String(planName || "");
  if (name.includes("基础月卡")) return "plan-tone-sun";
  if (name.includes("进阶季卡") || name.includes("进阶月卡")) return "plan-tone-sky";
  if (name.includes("至尊年卡") || name.includes("尊享月卡")) return "plan-tone-purple";
  return "plan-tone-default";
}

function getPlanCategoryLabel(plan?: Pick<MembershipPlan, "planCategory" | "imageMonthlyLimit"> | null) {
  return (plan?.planCategory ?? ((plan?.imageMonthlyLimit ?? 0) > 0 ? "text_image" : "text_only")) === "text_only"
    ? "文案创作"
    : "图文创作";
}

function getMembershipPlanLabel(membership: UserMembership | null, fallback: string) {
  return membership?.isActive && membership.plan
    ? `${getPlanCategoryLabel(membership.plan)} - ${membership.plan.name}`
    : fallback;
}

function isTextOnlyMembership(membership: UserMembership | null) {
  if (!membership?.isActive || !membership.plan) return false;
  return (membership.plan.planCategory ?? (membership.plan.imageMonthlyLimit > 0 ? "text_image" : "text_only")) === "text_only";
}

function getWechatAccountPersistFailureMessage(error: unknown) {
  if (error instanceof Error && error.message === "WECHAT_ACCOUNT_TRANSPORT_CRYPTO_UNAVAILABLE") {
    return "当前页面无法加密公众号 Secret，请使用 HTTPS、localhost 或桌面客户端后再保存";
  }
  return "公众号账号未能同步到服务器";
}

function InnerApp() {
  const { message, modal } = AntApp.useApp();
  const sourceFileInputRef = useRef<HTMLInputElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authToken, setAuthToken] = useState(() => (typeof window !== "undefined" ? window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) : "") || "");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [quota, setQuota] = useState<UserQuotaSummary | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const validViews = ["workspace", "prompt", "wechat", "model", "placeholder", "agent", "image", "membership", "settings"];
  const currentPathView = pathname?.replace(/^\//, "") || "workspace";
  const [activeView, setActiveViewState] = useState<SidebarView>(
    validViews.includes(currentPathView) ? (currentPathView as SidebarView) : "workspace"
  );

  const setActiveView = (view: SidebarView) => {
    setActiveViewState(view);
    router.push(`/${view}`);
  };

  useEffect(() => {
    const view = pathname?.replace(/^\//, "");
    if (view && validViews.includes(view) && view !== activeView) {
      setActiveViewState(view as SidebarView);
    }
  }, [pathname]);
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    displayName: "",
    inviteCode: "",
  });
  const [accounts, setAccounts] = useState<WechatAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState("");
  const accountsRef = useRef<WechatAccount[]>(accounts);
  const activeAccountIdRef = useRef(activeAccountId);
  accountsRef.current = accounts;
  activeAccountIdRef.current = activeAccountId;
  const [promptSlots, setPromptSlots] = useState<PromptSlot[]>(() => defaultPromptSlots());
  const [activePromptId, setActivePromptId] = useState("prompt-default");
  const [articleDraft, setArticleDraft] = useState<GeneratePayload>(() => defaultArticleDraft());
  const [draftMeta, setDraftMeta] = useState<DraftMeta>(() => defaultDraftMeta());
  const [resultMarkdown, setResultMarkdown] = useState("");
  useEffect(() => {
    void backendHealthcheck(MEMBER_BACKEND_BASE_URL).catch(() => undefined);
  }, []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isSendingDraft, setIsSendingDraft] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SETTINGS_COLLAPSED_STORAGE_KEY) === "true";
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountDialogMode, setAccountDialogMode] = useState<"create" | "edit">("create");
  const [accountDialogSaving, setAccountDialogSaving] = useState(false);
  const [accountForm, setAccountForm] = useState<WechatAccount>(() => emptyWechatAccount());
  /** 用于在切换 Tab 时同步 systemPrompt，避免与 persisted draft 的错位 guard 阻止显示通用模板内容 */
  const prevPromptIdRef = useRef<string | null>(null);
  /** 公众号卡片页「上传封面」时指定目标账号 id（非弹窗编辑态） */
  const coverPickAccountIdRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      for (const k of LEGACY_LOCAL_CACHE_KEYS) {
        window.localStorage.removeItem(k);
      }
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_COLLAPSED_STORAGE_KEY, String(settingsCollapsed));
  }, [settingsCollapsed]);

  const checkForAppUpdates = async (manual = false) => {
    // web 版本不需要检查更新
    if (manual) {
      message.success('当前已是最新版本');
    }
  };

  useEffect(() => {
    fetchMembershipPlans(MEMBER_BACKEND_BASE_URL).then(setPlans).catch(() => undefined);
  }, []);

  // 每次进入会员中心页面时，强制刷新一次套餐数据
  useEffect(() => {
    if (activeView === "membership") {
      fetchMembershipPlans(MEMBER_BACKEND_BASE_URL).then(setPlans).catch(() => undefined);
    }
  }, [activeView]);

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
    if (!token) {
      setAuthReady(true);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), STARTUP_AUTH_TIMEOUT_MS);

    fetchCurrentUser(MEMBER_BACKEND_BASE_URL, token, { signal: controller.signal })
      .then((result) => {
        setAuthToken(token);
        setCurrentUser(result.user);
        setMembership(result.membership);
        setQuota(result.quota);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        setAuthToken("");
        setCurrentUser(null);
        setMembership(null);
        setQuota(null);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setAuthReady(true);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const loadPromptsFromBackend = async (token: string) => {
    try {
      const data = await fetchUserPrompts(MEMBER_BACKEND_BASE_URL, token);
      const customPrompts = data.prompts.map((p: any) => ({
        id: p.id,
        name: p.name,
        defaultName: p.name,
        content: p.content,
        defaultContent: p.content,
        createdAt: pickPromptCreatedAt(p as Record<string, unknown>),
      }));
      setPromptSlots([...defaultPromptSlots(), ...customPrompts]);
    } catch (e) {
      console.error("Failed to load prompts", e);
    }
  };

  useEffect(() => {
    if (authToken && currentUser) {
      loadPromptsFromBackend(authToken);
    } else {
      setPromptSlots(defaultPromptSlots());
    }
  }, [authToken, currentUser]);

  useEffect(() => {
    if (!authToken || !currentUser) return;
    let cancelled = false;
    void fetchUserWechatAccounts(MEMBER_BACKEND_BASE_URL, authToken)
      .then(async (remote) => {
        if (cancelled) return;
        if (remote.accounts?.length) {
          setAccounts(remote.accounts);
          const aid =
            remote.activeAccountId && remote.accounts.some((a) => a.id === remote.activeAccountId)
              ? remote.activeAccountId
              : remote.accounts[0].id;
          setActiveAccountId(aid);
        } else {
          setAccounts([]);
          setActiveAccountId("");
        }
      })
      .catch((e) => console.error("fetch wechat accounts failed", e));
    return () => {
      cancelled = true;
    };
  }, [authToken, currentUser?.id]);

  useEffect(() => {
    if (!accounts.length) {
      if (activeAccountId !== "") setActiveAccountId("");
      return;
    }
    if (!accounts.some((account) => account.id === activeAccountId)) {
      setActiveAccountId(accounts[0].id);
    }
  }, [accounts, activeAccountId]);

  useEffect(() => {
    if (!promptSlots.length) {
      const fallback = defaultPromptSlots();
      setPromptSlots(fallback);
      setActivePromptId(fallback[0].id);
      return;
    }
    if (!promptSlots.some((slot) => slot.id === activePromptId)) {
      setActivePromptId(promptSlots[0].id);
    }
  }, [promptSlots, activePromptId]);

  useEffect(() => {
    if (authToken) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken || !currentUser || activeView !== "membership") {
      return;
    }

    void refreshCurrentUser(authToken).catch(() => undefined);

    const handleFocusRefresh = () => {
      void refreshCurrentUser(authToken).catch(() => undefined);
    };

    window.addEventListener("focus", handleFocusRefresh);
    return () => window.removeEventListener("focus", handleFocusRefresh);
    // Intentionally depend on stable user identity, not `currentUser` object: refreshing
    // replaces `currentUser` with a new reference every time and would retrigger this effect.
  }, [activeView, authToken, currentUser?.id]);

  const activeAccount = useMemo(
    () => accounts.find((account) => account.id === activeAccountId),
    [accounts, activeAccountId],
  );

  const persistWechatAccountsNow = async (nextAccounts: WechatAccount[], nextActiveId: string) => {
    if (!authToken || !currentUser) return true;
    try {
      await saveUserWechatAccounts(MEMBER_BACKEND_BASE_URL, authToken, {
        accounts: nextAccounts,
        activeAccountId: nextActiveId,
      });
      return true;
    } catch (e) {
      console.error("persist wechat accounts failed", e);
      message.warning(getWechatAccountPersistFailureMessage(e));
      return false;
    }
  };

  const handleActiveAccountChange = (id: string) => {
    if (id === activeAccountIdRef.current) return;
    setActiveAccountId(id);
    void persistWechatAccountsNow(accountsRef.current, id);
  };

  const membershipToneClass = useMemo(
    () => getMembershipToneClass(membership?.plan?.name),
    [membership?.plan?.name],
  );
  const isTextOnlyPlan = isTextOnlyMembership(membership);

  const activePrompt = useMemo(
    () => promptSlots.find((slot) => slot.id === activePromptId) ?? promptSlots[0],
    [promptSlots, activePromptId],
  );

  useEffect(() => {
    if (!activePrompt) return;
    const prev = prevPromptIdRef.current;
    prevPromptIdRef.current = activePromptId;

    if (prev === null) {
      setArticleDraft((current) => {
        const draftPrompt = (current.systemPrompt ?? "").trim();
        if (draftPrompt) return current;
        return { ...current, systemPrompt: activePrompt.content };
      });
      return;
    }

    if (prev !== activePromptId) {
      setArticleDraft((current) => ({ ...current, systemPrompt: activePrompt.content }));
    }
  }, [activePromptId, activePrompt]);

  const setArticleField = <K extends keyof GeneratePayload>(key: K, value: GeneratePayload[K]) => {
    setArticleDraft((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    if (!isTextOnlyPlan) return;
    setArticleDraft((current) =>
      (current.imageCount ?? 0) > 0 || current.imagePrompt
        ? { ...current, imageCount: 0, imagePrompt: "" }
        : current,
    );
  }, [isTextOnlyPlan]);

  const updateActiveAccount = (patch: Partial<WechatAccount>) => {
    if (!activeAccount) return;
    const next = accountsRef.current.map((account) =>
      account.id === activeAccount.id ? { ...account, ...patch } : account,
    );
    setAccounts(next);
    void persistWechatAccountsNow(next, activeAccount.id);
  };

  const updateActivePrompt = async (patch: Partial<PromptSlot>) => {
    if (!activePrompt) return;
    if (activePrompt.id === "prompt-default") {
      if (patch.name !== undefined && patch.name !== activePrompt.name) {
        message.warning("通用模板不能修改名称，但您可以新建提示词");
      }
      if (patch.content !== undefined) {
        setPromptSlots((current) =>
          current.map((slot) =>
            slot.id === "prompt-default" ? { ...slot, content: patch.content as string } : slot,
          ),
        );
      }
      return;
    }

    try {
      const nextName = patch.name ?? activePrompt.name;
      const nextContent = patch.content ?? activePrompt.content;
      await updateUserPrompt(MEMBER_BACKEND_BASE_URL, authToken, activePrompt.id, { name: nextName, content: nextContent });
      setPromptSlots((current) =>
        current.map((slot) => (slot.id === activePrompt.id ? { ...slot, name: nextName, content: nextContent } : slot)),
      );
    } catch (e) {
      message.error("保存提示词失败");
    }
  };

  const createNewPrompt = async (name: string, content: string): Promise<boolean> => {
    try {
      const res = await createUserPrompt(MEMBER_BACKEND_BASE_URL, authToken, { name, content });
      const raw = res.prompt as Record<string, unknown>;
      const id = String(raw.id ?? "").trim();
      if (!id) {
        message.error("保存提示词失败");
        return false;
      }
      const newPrompt: PromptSlot = {
        id,
        name: String(raw.name ?? name),
        defaultName: String(raw.name ?? name),
        content: String(raw.content ?? content),
        defaultContent: String(raw.content ?? content),
        createdAt: pickPromptCreatedAt(raw) ?? new Date().toISOString(),
      };
      setPromptSlots((current) => [...current, newPrompt]);
      setActivePromptId(newPrompt.id);
      setArticleField("systemPrompt", newPrompt.content);
      message.success("提示词已保存");
      return true;
    } catch (e) {
      message.error("保存提示词失败");
      return false;
    }
  };

  const savePromptById = async (slotId: string, name: string, content: string): Promise<boolean> => {
    const slot = promptSlots.find((s) => s.id === slotId);
    if (!slot) return false;
    const trimmedName = name.trim();
    if (!trimmedName) {
      message.warning("请输入提示词名称");
      return false;
    }
    if (slotId === "prompt-default") {
      setPromptSlots((current) =>
        current.map((s) => (s.id === "prompt-default" ? { ...s, content } : s)),
      );
      if (activePromptId === "prompt-default") {
        setArticleField("systemPrompt", content);
      }
      message.success("已保存");
      return true;
    }
    try {
      await updateUserPrompt(MEMBER_BACKEND_BASE_URL, authToken, slotId, {
        name: trimmedName,
        content,
      });
      setPromptSlots((current) =>
        current.map((s) => (s.id === slotId ? { ...s, name: trimmedName, content } : s)),
      );
      if (activePromptId === slotId) {
        setArticleField("systemPrompt", content);
      }
      message.success("提示词已保存");
      return true;
    } catch {
      message.error("保存提示词失败");
      return false;
    }
  };

  const deletePromptById = async (id: string) => {
    if (id === "prompt-default") {
      message.warning("无法删除通用模板");
      return;
    }
    try {
      await deleteUserPrompt(MEMBER_BACKEND_BASE_URL, authToken, id);
      const filtered = promptSlots.filter((p) => p.id !== id);
      setPromptSlots(filtered);
      if (activePromptId === id) {
        setActivePromptId("prompt-default");
        setArticleField("systemPrompt", filtered[0]?.content ?? "");
      }
      message.success("提示词已删除");
    } catch (e) {
      message.error("删除提示词失败");
    }
  };

  const switchPrompt = (id: string) => {
    setActivePromptId(id);
    const target = promptSlots.find((slot) => slot.id === id);
    if (target) setArticleField("systemPrompt", target.content ?? "");
  };

  const refreshCurrentUser = async (token: string) => {
    const result = await fetchCurrentUser(MEMBER_BACKEND_BASE_URL, token);
    setCurrentUser(result.user);
    setMembership(result.membership);
    setQuota(result.quota);
  };

  const applyQuotaFromResponse = (nextQuota?: UserQuotaSummary | null) => {
    if (nextQuota) {
      setQuota(nextQuota);
    }
  };

  const getFriendlyQuotaError = (error: unknown) => {
    if (!(error instanceof Error)) {
      return null;
    }

    if (error.message === "TEXT_QUOTA_EXCEEDED") {
      if (quota?.usesFreeRollingWindows && quota.text.resetEveryDays) {
        return `当前文章生成额度已用完（每 ${quota.text.resetEveryDays} 天恢复一次）。下个周期开始后会自动刷新，也可开通会员获得更高额度。`;
      }
      return "文章生成额度已用完，可开通更高套餐获得更多总额度。";
    }

    if (error.message === "IMAGE_QUOTA_EXCEEDED") {
      if (quota?.usesFreeRollingWindows && quota.image.resetEveryDays) {
        return `当前配图额度已用完（每 ${quota.image.resetEveryDays} 天恢复一次）。下个周期开始后会自动刷新，也可升级会员继续使用。`;
      }
      return "配图额度已用完，可升级会员继续使用。";
    }

    if (error.message === "DE_AI_QUOTA_EXCEEDED") {
      return "二次去 AI 额度已用完，请等下个周期刷新后再使用。";
    }

    if (error.message === "UNAUTHORIZED") {
      return "登录状态已失效，请重新登录后再试。";
    }

    return null;
  };

  const buildIllustrationPrompts = (articleMd: string, title: string, count: number, imagePrompt?: string) => {
    const sections = articleMd
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("![](") && !line.startsWith("# "));
    
    const styleRequirement = imagePrompt 
      ? `图片具体要求：${imagePrompt}`
      : "风格要求：简洁、质感、高级、适合公众号排版配图。";

    if (sections.length === 0) {
      return Array.from({ length: count }, () => [
        "文章配图，中文内容理解后生成画面。",
        styleRequirement,
        `文章内容：${title}`,
      ].join(" "));
    }

    return Array.from({ length: count }, (_, index) => {
      // 均匀分布：从文章不同位置选取内容作为配图依据
      const chunkIdx = Math.floor((index * sections.length) / count);
      const chunk = sections[chunkIdx] || sections[sections.length - 1] || title;
      return [
        "文章配图，中文内容理解后生成画面。",
        styleRequirement,
        `文章标题：${title}`,
        `配图重点：${chunk.replace(/^#+\s*/, "").slice(0, 120)}`,
      ].join(" ");
    });
  };

  const mergeArticleWithImages = (articleMd: string, imageUrls: string[]) => {
    if (!imageUrls.length) {
      return articleMd;
    }

    const lines = articleMd.split("\n");
    
    // 寻找潜在的插入点：优先找二级标题，其次三级标题，最后找段落间隙
    let insertionPoints = lines
      .map((line, index) => ({ line: line.trim(), index, type: 'h2' }))
      .filter((item) => item.line.startsWith("## "));

    if (insertionPoints.length === 0) {
      insertionPoints = lines
        .map((line, index) => ({ line: line.trim(), index, type: 'h3' }))
        .filter((item) => item.line.startsWith("### "));
    }

    if (insertionPoints.length === 0) {
      // 如果没有标题，寻找段落（空行后的非空行）
      insertionPoints = lines
        .map((line, index) => ({ line: line.trim(), index, type: 'p' }))
        .filter((item, i) => i > 0 && item.line && !lines[i - 1].trim());
    }

    if (insertionPoints.length === 0) {
      // 实在找不到结构，则均匀追加到末尾
      return [articleMd, ...imageUrls.map((url) => `\n![](${url})\n`)].join("\n");
    }

    const resultLines = [...lines];
    const pointCount = insertionPoints.length;
    const imageCount = imageUrls.length;

    // 为了避免 splice 导致索引偏移，我们从后往前插入
    for (let i = imageCount - 1; i >= 0; i--) {
      // 均匀选择插入点
      const pointIdx = Math.floor((i * pointCount) / imageCount);
      const point = insertionPoints[pointIdx];
      const imageUrl = imageUrls[i];
      
      // 如果是标题，插入在标题之后；如果是段落起始，插入在段落之前
      const insertAt = point.type === 'p' ? point.index : point.index + 1;
      resultLines.splice(insertAt, 0, "", `![](${imageUrl})`, "");
    }

    return resultLines.join("\n");
  };

  const generateArticleIllustrations = async ({
    articleMd,
    title,
    count,
    imagePrompt,
    authToken: currentToken,
  }: {
    articleMd: string;
    title: string;
    count: number;
    imagePrompt?: string;
    authToken: string;
  }) => {
    const prompts = buildIllustrationPrompts(articleMd, title, count, imagePrompt);
    const results = await Promise.all(
      prompts.map((prompt) =>
        generateImage({
          prompt,
          size: "1024x1024",
          quality: "standard",
          n: 1,
          authToken: currentToken,
          baseUrl: CONTENT_BACKEND_BASE_URL,
        }),
      ),
    );

    return results
      .flatMap((result) => result.images)
      .map((item) => item.url || (item.b64_json ? `data:image/png;base64,${item.b64_json}` : ""))
      .filter(Boolean);
  };

  const handleAuthSubmit = async () => {
    const normalizedEmail = normalizeEmailInput(authForm.email);

    if (!normalizedEmail || !authForm.password.trim()) {
      message.warning("请输入邮箱和密码");
      return;
    }

    if (authMode === "register" && !isValidEmailAddress(normalizedEmail)) {
      message.warning(EMAIL_FORMAT_MESSAGE);
      return;
    }

    if (authMode === "register" && !authForm.displayName.trim()) {
      message.warning("请输入昵称");
      return;
    }

    if (authMode === "register" && !authForm.inviteCode.trim()) {
      message.warning("请输入 8 位邀请码");
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === "register") {
        await registerAccount(MEMBER_BACKEND_BASE_URL, {
          email: normalizedEmail,
          password: authForm.password,
          displayName: authForm.displayName.trim(),
          inviteCode: authForm.inviteCode.trim(),
        });
        message.success("注册成功，请直接登录");
        setAuthMode("login");
        return;
      }

      const result: AuthSession = await loginAccount(MEMBER_BACKEND_BASE_URL, {
        email: normalizedEmail,
        password: authForm.password,
      });

      setAuthToken(result.token);
      setCurrentUser(result.user);
      await refreshCurrentUser(result.token);
      message.success("登录成功");
    } catch (error) {
      const raw = error instanceof Error ? error.message : "登录失败";
      const tip = authMode === "register" ? REGISTER_ERROR_HINT[raw] ?? raw : raw;
      message.error(tip);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken("");
    setCurrentUser(null);
    setMembership(null);
    setQuota(null);
    setAccounts([]);
    setActiveAccountId("");
    setArticleDraft(defaultArticleDraft());
    setDraftMeta(defaultDraftMeta());
    setResultMarkdown("");
    setAuthForm((current) => ({ ...current, password: "" }));
    message.success("已退出登录");
  };

  const handleCheckout = async (planCode: string) => {
    if (!authToken) {
      message.warning("请先登录");
      return;
    }

    const targetPlan = plans.find((plan) => plan.code === planCode);
    const contactWechat = currentUser?.membershipContactWechat?.trim() || "Jiale-8888888";
    modal.info({
      title: `开通${targetPlan?.name ?? "会员"}`,
      okText: "我知道了",
      content: (
        <div style={{ lineHeight: 1.8, color: "#475467", paddingTop: 8 }}>
          <div>当前版本暂不支持在线自助支付。</div>
          <div style={{ marginTop: 6 }}>
            如需开通会员，请联系微信：
            <span
              style={{
                marginLeft: 6,
                color: "#7c3aed",
                fontWeight: 800,
                letterSpacing: "0.02em",
              }}
            >
              {contactWechat}
            </span>
          </div>
          <div style={{ marginTop: 6 }}>添加时建议备注：会员开通 + 当前登录邮箱，方便我们更快处理。</div>
          <Button
            size="small"
            type="primary"
            style={{ marginTop: 12 }}
            onClick={async () => {
              if (await copyText(contactWechat)) {
                message.success("微信号已复制");
              } else {
                message.error("复制失败，请手动复制");
              }
            }}
          >
            复制微信号
          </Button>
        </div>
      ),
    });
  };

  const openCreateAccountDialog = () => {
    setAccountDialogMode("create");
    setAccountForm({
      id: `account-${Math.random().toString(36).slice(2, 10)}`,
      name: `公众号 ${accounts.length + 1}`,
      appId: "",
      appSecret: "",
      thumbMediaId: "",
    });
    setAccountDialogOpen(true);
  };

  const openEditAccountDialog = (account?: WechatAccount) => {
    const target = account ?? activeAccount;
    if (!target) {
      message.warning("暂无公众号可编辑");
      return;
    }
    setAccountDialogMode("edit");
    setAccountForm({ ...target });
    setAccountDialogOpen(true);
  };

  const submitAccountDialog = async () => {
    if (accountDialogSaving) return;

    const trimmedName = accountForm.name.trim();
    if (!trimmedName) {
      message.warning("请填写账号名称");
      return;
    }

    const payload: WechatAccount = {
      ...accountForm,
      name: trimmedName,
      appId: accountForm.appId.trim(),
      appSecret: accountForm.appSecret.trim(),
      thumbMediaId: accountForm.thumbMediaId.trim(),
    };

    setAccountDialogSaving(true);
    try {
      if (accountDialogMode === "create") {
        const next = [...accountsRef.current, payload];
        const saved = await persistWechatAccountsNow(next, payload.id);
        if (!saved) return;
        setAccounts(next);
        setActiveAccountId(payload.id);
        message.success("已新增公众号账号");
      } else {
        const next = accountsRef.current.map((account) => (account.id === payload.id ? payload : account));
        const saved = await persistWechatAccountsNow(next, payload.id);
        if (!saved) return;
        setAccounts(next);
        setActiveAccountId(payload.id);
        message.success("已更新公众号账号");
      }

      setAccountDialogOpen(false);
    } finally {
      setAccountDialogSaving(false);
    }
  };

  const removeAccountByTarget = async (account: WechatAccount) => {
    const nextAccounts = accounts.filter((a) => a.id !== account.id);
    const nextId = activeAccountId === account.id ? nextAccounts[0]?.id ?? "" : activeAccountId;
    const saved = await persistWechatAccountsNow(nextAccounts, nextId);
    if (!saved) return;
    setAccounts(nextAccounts);
    setActiveAccountId(nextId);
    message.success("已删除公众号账号");
  };

  const requestCoverPickForAccount = (accountId: string) => {
    coverPickAccountIdRef.current = accountId;
    coverFileInputRef.current?.click();
  };

  const handleSourceFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      setArticleField("sourceArticle", text.slice(0, 5000));
      message.success(`已导入参考内容：${file.name}`);
    } catch {
      message.error("参考文件读取失败");
    }
  };

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const pickedId = coverPickAccountIdRef.current;
    coverPickAccountIdRef.current = null;

    const uploadTarget = accountDialogOpen
      ? accountForm
      : pickedId
        ? accounts.find((a) => a.id === pickedId) ?? activeAccount
        : activeAccount;
    if (!uploadTarget) return;

    if (!uploadTarget.appId.trim() || !uploadTarget.appSecret.trim()) {
      message.warning("请先填写公众号的 AppID 和 Secret");
      return;
    }
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      message.warning("封面图只支持 PNG 或 JPG");
      return;
    }
    if (file.size > WECHAT_COVER_MAX_BYTES) {
      message.warning("封面图大小不能超过 5MB");
      return;
    }

    setIsUploadingCover(true);
    try {
      const result = await uploadWechatThumb(CONTENT_BACKEND_BASE_URL, file, {
        appId: uploadTarget.appId,
        appSecret: uploadTarget.appSecret,
      });
      if (accountDialogOpen) {
        setAccountForm((current) => ({ ...current, thumbMediaId: result.thumbMediaId }));
      } else {
        const id = uploadTarget.id;
        const next = accountsRef.current.map((a) => (a.id === id ? { ...a, thumbMediaId: result.thumbMediaId } : a));
        setAccounts(next);
        void persistWechatAccountsNow(next, activeAccountIdRef.current);
      }
      message.success("封面图上传成功");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "封面图上传失败");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleGenerateArticle = async (regenerateForDeAi = false) => {
    if (articleDraft.topic.length > WORKSPACE_TOPIC_MAX_CHARS) {
      message.warning(`主题请勿超过 ${WORKSPACE_TOPIC_MAX_CHARS} 字`);
      return;
    }
    if (articleDraft.creationMode === "synthesized" && !articleDraft.topic.trim()) {
      message.warning("请先填写文章主题");
      return;
    }
    if (articleDraft.creationMode === "rewrite") {
      if (!articleDraft.sourceArticle?.trim()) {
        message.warning("参考改写模式下，请先填写参考文章");
        return;
      }
      if (articleDraft.sourceArticle.trim().length < 300) {
        message.warning("参考文章内容偏短，建议至少提供 300 字以上");
        return;
      }
    }

    if (false && (articleDraft.imageCount ?? 0) > 0 && !membership?.isActive) {
      message.warning("当前账号未开通会员，本次只生成文章内容，不生成配图");
    }

    if ((articleDraft.imageCount ?? 0) > 0 && !membership?.isActive) {
      message.info("将按照免费版周期性配图额度扣减；若额度不足会提示您是否开通会员。");
    }

    const requestDraft = isTextOnlyPlan ? { ...articleDraft, imageCount: 0, imagePrompt: "" } : articleDraft;
    const previousResultMarkdown = resultMarkdown;
    const previousDraftMeta = draftMeta;
    let hasReceivedArticleDelta = false;

    setIsGenerating(true);
    if (!regenerateForDeAi) {
      setResultMarkdown("");
      setDraftMeta((current) => ({ ...current, title: "", digest: "" }));
    }
    try {
      const result = await generateArticle(
        CONTENT_BACKEND_BASE_URL,
        authToken,
        {
          ...requestDraft,
          regenerateForDeAi,
          systemPrompt: (requestDraft.systemPrompt ?? "").trim() || activePrompt?.content || "",
        },
        (delta) => {
          setResultMarkdown((prev) => {
            const nextMarkdown = regenerateForDeAi && !hasReceivedArticleDelta ? delta : prev + delta;
            hasReceivedArticleDelta = true;
            return stripUnicodeReplacementChars(nextMarkdown);
          });
        },
      );
      applyQuotaFromResponse(result.quota);
      const cleanArticleMd = stripUnicodeReplacementChars(result.articleMd);
      const title = extractTitleFromMarkdown(cleanArticleMd, articleDraft.topic);
      const digest = summarizeMarkdown(cleanArticleMd);
      let finalMarkdown = cleanArticleMd;

      if ((articleDraft.imageCount ?? 0) > 0) {
        setIsGeneratingImages(true);
        try {
          const imageUrls = await generateArticleIllustrations({
            articleMd: cleanArticleMd,
            title,
            count: articleDraft.imageCount ?? 0,
            imagePrompt: articleDraft.imagePrompt,
            authToken,
          });
          finalMarkdown = stripUnicodeReplacementChars(mergeArticleWithImages(cleanArticleMd, imageUrls));
          setResultMarkdown(finalMarkdown);
          await refreshCurrentUser(authToken);
        } finally {
          setIsGeneratingImages(false);
        }
      } else {
        setResultMarkdown(finalMarkdown);
      }

      setDraftMeta((current) => ({
        title: regenerateForDeAi ? title : current.title || title,
        author: current.author || activeAccount?.name || "",
        digest: regenerateForDeAi ? digest : current.digest || digest,
      }));
      message.success(
        (articleDraft.imageCount ?? 0) > 0
          ? "文章和配图生成完成"
          : "文章生成完成",
      );
    } catch (error) {
      if (regenerateForDeAi) {
        setResultMarkdown(previousResultMarkdown);
        setDraftMeta(previousDraftMeta);
      }
      if (authToken) {
        void refreshCurrentUser(authToken).catch(() => undefined);
      }
      message.error(getFriendlyQuotaError(error) ?? (error instanceof Error ? error.message : "文章生成失败"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendDraft = async () => {
    if (!activeAccount) {
      message.warning("请先选择公众号账号");
      return;
    }
    if (!resultMarkdown.trim()) {
      message.warning("请先生成文章内容");
      return;
    }
    if (!activeAccount.appId.trim() || !activeAccount.appSecret.trim()) {
      message.warning("请先补全当前公众号的 AppID 和 Secret");
      return;
    }
    if (!activeAccount.thumbMediaId.trim()) {
      message.warning("请先上传封面图或填写 thumb_media_id");
      return;
    }

    const title = draftMeta.title.trim() || extractTitleFromMarkdown(resultMarkdown, articleDraft.topic);
    if (!title) {
      message.warning("请先补充文章标题");
      return;
    }

    setIsSendingDraft(true);
    try {
      const cleanMarkdown = stripUnicodeReplacementChars(resultMarkdown);
      const contentHtml = stripUnicodeReplacementChars(markdownToWechatHtml(cleanMarkdown));
      const result = await sendWechatDraft(CONTENT_BACKEND_BASE_URL, {
        title,
        author: draftMeta.author.trim() || activeAccount.name,
        digest: draftMeta.digest.trim(),
        contentMd: cleanMarkdown,
        contentHtml,
        wechatAppId: activeAccount.appId,
        wechatAppSecret: activeAccount.appSecret,
        wechatThumbMediaId: activeAccount.thumbMediaId,
      });
      message.success(result.mediaId ? `已发送到草稿箱：${result.mediaId}` : "已发送到草稿箱");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "发送到草稿箱失败");
    } finally {
      setIsSendingDraft(false);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!resultMarkdown.trim()) {
      message.warning("当前没有可复制的内容");
      return;
    }
    if (await copyText(resultMarkdown)) {
      message.success("Markdown 已复制");
    } else {
      message.error("复制失败，请手动复制");
    }
  };

  const handleClearResult = () => {
    setResultMarkdown("");
    setDraftMeta((current) => ({ ...current, title: "", digest: "" }));
    message.success("已清空生成结果");
  };

  const renderHeaderTitle = () => {
    switch (activeView) {
      case "membership":
        return "会员中心";
      case "wechat":
        return "公众号";
      case "prompt":
        return "提示词词库";
      case "model":
        return "模型设置";
      case "image":
        return "AI 图片生成";
      case "settings":
        return "应用设置";
      default:
        return "文章创作";
    }
  };

  if (!authReady) {
    return <div className="auth-loading-screen">正在加载账号状态...</div>;
  }

  if (!currentUser) {
    return (
      <LoginPanel
        apiBaseUrl={MEMBER_BACKEND_BASE_URL}
        onAuthed={(token, user) => {
          setAuthToken(token);
          setCurrentUser(user);
          refreshCurrentUser(token).catch(() => undefined);
        }}
      />
    );
  }

  return (
    <div className="app-container">
      <Sidebar
        activeView={activeView}
        currentUser={currentUser}
        membership={membership}
        quota={quota}
        activeAccount={activeAccount}
        onViewChange={setActiveView}
        onLogout={handleLogout}
      />

      <div className="main-wrapper">
        <header className="header">
          <div className="header-main-row">
            <div className="header-title">{renderHeaderTitle()}</div>
            <Space className="header-status-actions">
            <Tag
              color="default"
              className={`header-membership-tag ${membershipToneClass}`}
            >
              {getMembershipPlanLabel(membership, "未开通会员")}
            </Tag>
              <span className="header-user-pill">{currentUser.displayName}</span>
            </Space>
          </div>

          {activeView === "workspace" ? (
            <Space className="header-workspace-actions">
                <Button
                  className="header-send-draft-btn"
                  icon={<SendOutlined />}
                  onClick={handleSendDraft}
                  loading={isSendingDraft}
                  disabled={isGenerating}
                >
                  {isSendingDraft ? "发送中..." : "发送到草稿箱"}
                </Button>
                <Button
                  className="header-generate-btn"
                  type="primary"
                  icon={<RocketOutlined />}
                  onClick={() => void handleGenerateArticle()}
                  loading={isGenerating}
                  disabled={isSendingDraft}
                >
                  {isGenerating ? "生成中..." : "生成文章"}
                </Button>
            </Space>
          ) : null}
        </header>

        {activeView === "workspace" ? (
          <WorkspacePage
            articleDraft={articleDraft}
            resultMarkdown={resultMarkdown}
            settingsCollapsed={settingsCollapsed}
            isGenerating={isGenerating}
            isGeneratingImages={isGeneratingImages}
            isSendingDraft={isSendingDraft}
            showImageCountSelector={!isTextOnlyPlan}
            imageCountOptions={workspaceImageCountOptions}
            styleOptions={workspaceStyleOptions}
            rewriteGoalOptions={workspaceRewriteGoalOptions}
            referenceFocusOptions={workspaceReferenceFocusOptions}
            referenceLevelOptions={workspaceReferenceLevelOptions}
            accounts={accounts}
            activeAccountId={activeAccountId}
            onAccountChange={handleActiveAccountChange}
            promptSlots={promptSlots}
            activePromptId={activePromptId}
            onPromptChange={switchPrompt}
            onToggleSettings={() => setSettingsCollapsed((value) => !value)}
            onArticleFieldChange={setArticleField}
            onResultMarkdownChange={setResultMarkdown}
            onSourceFilePick={() => sourceFileInputRef.current?.click()}
            onCopyMarkdown={handleCopyMarkdown}
            onClearResult={handleClearResult}
            onPreview={() => setPreviewOpen(true)}
            onRegenerateArticle={() => void handleGenerateArticle(true)}
          />
        ) : null}

        {activeView === "membership" ? (
          <MembershipPage
            plans={plans}
            membership={membership}
            quota={quota}
            loading={!!checkoutLoading}
            activePlanCode={checkoutLoading}
            onCheckout={(planCode) => void handleCheckout(planCode)}
          />
        ) : null}

        {activeView === "prompt" ? (
          <PromptPage
            promptSlots={promptSlots}
            onSelectPrompt={switchPrompt}
            onSavePrompt={savePromptById}
            onCreatePrompt={createNewPrompt}
            onDeletePrompt={deletePromptById}
          />
        ) : null}

        {activeView === "wechat" ? (
          <WechatAccountLibraryPage
            accounts={accounts}
            activeAccountId={activeAccountId}
            isUploadingCover={isUploadingCover}
            onSelectAccount={handleActiveAccountChange}
            onAddAccount={openCreateAccountDialog}
            onEditAccount={(a) => openEditAccountDialog(a)}
            onRemoveAccount={removeAccountByTarget}
            onPickCover={requestCoverPickForAccount}
            membership={membership}
          />
        ) : null}

        {activeView === "model" ? (
          <ModelPage
            authToken={authToken || ""}
            baseUrl={MEMBER_BACKEND_BASE_URL}
            membership={membership}
          />
        ) : null}

        {activeView === "image" ? (
          <ImagePage
            membership={membership}
            quota={quota}
            authToken={authToken || ""}
            baseUrl={MEMBER_BACKEND_BASE_URL}
            onQuotaChange={applyQuotaFromResponse}
            onRefreshMembership={() => refreshCurrentUser(authToken || "")}
          />
        ) : null}

        {activeView === "settings" ? (
          <SettingsPage
            runtimeInfo={runtimeInfo}
            quota={quota}
            onCheckUpdate={() => checkForAppUpdates(true)}
          />
        ) : null}

        {activeView === "agent" ? (
          <AgentDashboardPage
            authToken={authToken || ""}
            baseUrl={MEMBER_BACKEND_BASE_URL}
          />
        ) : null}

        <footer className="footer">
          <div className="footer-left">
            <span className="footer-saved">
              <CheckCircleFilled style={{ color: "#94a3b8" }} />
              草稿未写入本地
            </span>
            <span>刷新页面或退出登录后，未导出的创作内容将清空</span>
          </div>
          <div className="footer-right">
            <span className="footer-tip-dot">•</span>
            支持直接发送到公众号草稿箱，减少来回复制粘贴
          </div>
          <a className="footer-icp" href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">
            冀ICP备2024091417号
          </a>
        </footer>
      </div>

      <input
        ref={sourceFileInputRef}
        type="file"
        accept=".txt,.md,text/plain"
        style={{ display: "none" }}
        onChange={handleSourceFileChange}
      />
      <input
        ref={coverFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        style={{ display: "none" }}
        onChange={handleCoverUpload}
      />

      <WechatPreviewModal
        open={previewOpen}
        title={draftMeta.title || extractTitleFromMarkdown(resultMarkdown, articleDraft.topic)}
        accountName={activeAccount?.name || ""}
        markdown={resultMarkdown}
        onClose={() => setPreviewOpen(false)}
      />

      <Modal
        title={accountDialogMode === "create" ? "新增公众号账号" : "编辑公众号账号"}
        open={accountDialogOpen}
        onCancel={() => {
          if (!accountDialogSaving) setAccountDialogOpen(false);
        }}
        onOk={submitAccountDialog}
        confirmLoading={accountDialogSaving}
        okText={accountDialogMode === "create" ? "创建" : "保存"}
        cancelText="取消"
        width={460}
      >
        <div className="account-form-grid">
          <div className="form-item">
            <div className="form-item-label">账号名称</div>
            <Input
              value={accountForm.name}
              onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="例如：公众号主号"
            />
          </div>
          <div className="form-item">
            <div className="form-item-label">公众号 AppID</div>
            <Input
              value={accountForm.appId}
              onChange={(event) => setAccountForm((current) => ({ ...current, appId: event.target.value }))}
              placeholder="填写公众号 AppID"
            />
          </div>
          <div className="form-item">
            <div className="form-item-label">公众号 Secret</div>
            <Input.Password
              value={accountForm.appSecret}
              onChange={(event) => setAccountForm((current) => ({ ...current, appSecret: event.target.value }))}
              placeholder="填写公众号 Secret"
            />
          </div>
          <div className="form-item">
            <div className="form-item-row">
              <div className="form-item-label">封面图 thumb_media_id</div>
              <Button
                size="small"
                icon={<CloudUploadOutlined />}
                onClick={() => coverFileInputRef.current?.click()}
                loading={isUploadingCover}
              >
                上传封面
              </Button>
            </div>
            <Input
              value={accountForm.thumbMediaId}
              onChange={(event) => setAccountForm((current) => ({ ...current, thumbMediaId: event.target.value }))}
              placeholder="也可以上传后自动回填"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#6366f1",
          borderRadius: 8,
          fontSize: 13,
          controlHeight: 34,
        },
      }}
    >
      <AntApp>
        <InnerApp />
      </AntApp>
    </ConfigProvider>
  );
}
