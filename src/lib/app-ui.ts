import type {
  ArticleLength,
  ExpressionMode,
  GeneratePayload,
  ReferenceFocus,
  ReferenceLevel,
  RewriteGoal,
  WechatAccount,
  WritingMode,
} from "./types";

export type SidebarView = "workspace" | "membership" | "wechat" | "model" | "prompt" | "image" | "settings" | "agent";

export type PromptSlot = {
  id: string;
  name: string;
  defaultName: string;
  content: string;
  defaultContent: string;
  /** 服务端创建时间（ISO），可选 */
  createdAt?: string;
};

export type DraftMeta = {
  title: string;
  author: string;
  digest: string;
};

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function parseStoredValue<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function extractTitleFromMarkdown(markdown: string, fallback: string) {
  const heading = markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("# "));
  if (heading) return heading.replace(/^#\s+/, "").trim().slice(0, 64);
  return fallback.trim().slice(0, 64);
}

function stripLeadingTitleHeading(markdown: string) {
  return markdown.replace(/^\s*#\s+.+(?:\r?\n)+(?:\s*\r?\n)*/u, "");
}

export function summarizeMarkdown(markdown: string) {
  return markdown
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function stripUnicodeReplacementChars(text: string) {
  return String(text || "")
    .replace(/\uFFFD+/g, "")
    .replace(/\s+([，。！？；：])/g, "$1");
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(text: string) {
  let html = escapeHtml(text);
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
    const cleanAlt = escapeHtml(String(alt || "").trim());
    const cleanSrc = String(src || "").trim();
    return `<img src="${cleanSrc}" alt="${cleanAlt}" />`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const cleanHref = String(href || "").trim();
    return `<a href="${cleanHref}">${escapeHtml(String(label || "").trim())}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/&lt;br\s*\/?&gt;/gi, "<br />");
  return html;
}

export function markdownToWechatHtml(markdown: string) {
  const normalized = stripLeadingTitleHeading(markdown).replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const lines = normalized.split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listTag: "ul" | "ol" | null = null;
  let quoteLines: string[] = [];
  let pendingBlankLines = 0;

  const flushBlankLines = () => {
    if (pendingBlankLines <= 0) return;
    for (let i = 0; i < pendingBlankLines; i += 1) {
      html.push("<p><br /></p>");
    }
    pendingBlankLines = 0;
  };

  const flushParagraph = () => {
    if (!paragraph.length) return;
    flushBlankLines();
    html.push(`<p>${renderInlineMarkdown(paragraph.join("<br />"))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listTag || !listItems.length) return;
    flushBlankLines();
    html.push(`<${listTag}>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</${listTag}>`);
    listItems = [];
    listTag = null;
  };

  const flushQuote = () => {
    if (!quoteLines.length) return;
    flushBlankLines();
    html.push(`<blockquote><p>${renderInlineMarkdown(quoteLines.join("<br />"))}</p></blockquote>`);
    quoteLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      flushQuote();
      pendingBlankLines += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushBlankLines();
      flushParagraph();
      flushList();
      flushQuote();
      const level = Math.min(headingMatch[1].length, 6);
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushBlankLines();
      flushParagraph();
      flushList();
      flushQuote();
      html.push("<hr />");
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteLines.push(quoteMatch[1]);
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      flushQuote();
      if (listTag && listTag !== "ul") {
        flushList();
      }
      listTag = "ul";
      listItems.push(ulMatch[1].trim());
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      flushQuote();
      if (listTag && listTag !== "ol") {
        flushList();
      }
      listTag = "ol";
      listItems.push(olMatch[1].trim());
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushQuote();

  return html.join("\n");
}

export function maskValue(value: string, keepStart = 8, keepEnd = 5) {
  if (!value) return "未配置";
  if (value.length <= keepStart + keepEnd) return value;
  return `${value.slice(0, keepStart)}****${value.slice(-keepEnd)}`;
}

/** 新建/表单占位用的空账号（不含默认名称，列表初始为空） */
export function emptyWechatAccount(): WechatAccount {
  return {
    id: createId("account"),
    name: "",
    appId: "",
    appSecret: "",
    thumbMediaId: "",
  };
}

const PROMPT_GENERIC = "";



export function defaultPromptSlots(): PromptSlot[] {
  return [
    {
      id: "prompt-default",
      name: "通用模板",
      defaultName: "通用模板",
      content: PROMPT_GENERIC,
      defaultContent: PROMPT_GENERIC,
    },
  ];
}

export function defaultArticleDraft(): GeneratePayload {
  return {
    topic: "",
    length: "medium",
    systemPrompt: "",
    creationMode: "synthesized",
    sourceArticle: "",
    apiModel: "doubao-seed-2-0-pro-260215",
    apiBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    enableWebSearch: true,
    imagePrompt: "",
  };
}

export function defaultDraftMeta(): DraftMeta {
  return { title: "", author: "", digest: "" };
}

export const lengthOptions: Array<{ label: string; value: ArticleLength }> = [
  { label: "短文 (400-600 字)", value: "short" },
  { label: "中等 (600-800 字)", value: "medium" },
  { label: "长文 (1100-1300 字)", value: "long" },
];

/** 工作台主题字数上限（生成请求校验） */
export const WORKSPACE_TOPIC_MAX_CHARS = 1000;

export const modeOptions: Array<{ label: string; value: WritingMode }> = [
  { label: "标准干货", value: "standard" },
  { label: "故事化", value: "story" },
  { label: "案例拆解", value: "case_study" },
  { label: "清单型", value: "listicle" },
  { label: "分析型", value: "analysis" },
];

export const imageCountOptions = [
  { label: "不生成配图", value: 0 },
  { label: "1 张配图", value: 1 },
  { label: "2 张配图", value: 2 },
  { label: "3 张配图", value: 3 },
  { label: "4 张配图", value: 4 },
];

export const expressionModeOptions: Array<{ label: string; value: ExpressionMode }> = [
  { label: "标准表达", value: "standard" },
  { label: "更口语化", value: "conversational" },
  // { label: "去 AI 味", value: "de_ai" },
  { label: "观点更强", value: "opinionated" },
];

export const audienceOptions = [
  { label: "大学生", value: "大学生" },
  { label: "职场新人", value: "职场新人" },
  { label: "宝妈", value: "宝妈" },
  { label: "创业者", value: "创业者" },
  { label: "管理者", value: "管理者" },
  { label: "内容创作者", value: "内容创作者" },
];

export const styleOptions = [
  { label: "专业理性", value: "专业理性" },
  { label: "温暖治愈", value: "温暖治愈" },
  { label: "犀利直接", value: "犀利直接" },
  { label: "轻松口语", value: "轻松口语" },
  { label: "故事感强", value: "故事感强" },
  { label: "干货清单", value: "干货清单" },
];

/** 创作设置下拉「不选择」项的值；写入 GeneratePayload 时应为 undefined */
export const WORKSPACE_SELECT_NONE = "";

export const workspaceSelectNoneOption = { label: "不选择", value: WORKSPACE_SELECT_NONE };

export function workspaceOptionalFieldValue(field: string | undefined): string {
  const t = field?.trim();
  return t ? t : WORKSPACE_SELECT_NONE;
}

export function parseWorkspaceOptionalField(v: string): string | undefined {
  if (v === WORKSPACE_SELECT_NONE) return undefined;
  const t = v.trim();
  return t === "" ? undefined : v;
}

export function workspaceOptionalEnumValue<T extends string>(field: T | undefined): T | typeof WORKSPACE_SELECT_NONE {
  return (field ?? WORKSPACE_SELECT_NONE) as T | typeof WORKSPACE_SELECT_NONE;
}

export function parseWorkspaceOptionalEnum<T extends string>(v: string): T | undefined {
  if (v === WORKSPACE_SELECT_NONE || v === "") return undefined;
  return v as T;
}

/** 配图数量：与「不生成配图」区分，表示不在请求里指定数量（等价 undefined） */
export function workspaceOptionalImageCountValue(count: number | undefined): number | typeof WORKSPACE_SELECT_NONE {
  return count === undefined ? WORKSPACE_SELECT_NONE : count;
}

export function parseWorkspaceOptionalImageCount(v: string | number): number | undefined {
  if (v === WORKSPACE_SELECT_NONE || v === "") return undefined;
  return typeof v === "number" ? v : Number(v);
}

export const workspaceAudienceOptions = [workspaceSelectNoneOption, ...audienceOptions];
export const workspaceStyleOptions = [workspaceSelectNoneOption, ...styleOptions];
export const workspaceModeOptions = [workspaceSelectNoneOption, ...modeOptions];
export const workspaceExpressionModeOptions = [workspaceSelectNoneOption, ...expressionModeOptions];

export const workspaceImageCountOptions: Array<{ label: string; value: number | typeof WORKSPACE_SELECT_NONE }> = [
  { label: workspaceSelectNoneOption.label, value: WORKSPACE_SELECT_NONE },
  ...imageCountOptions,
];

export const rewriteGoalOptions: Array<{ label: string; value: RewriteGoal }> = [
  { label: "重写为新文章", value: "new_article" },
  { label: "换个切入角度", value: "new_angle" },
  { label: "更口语化", value: "more_conversational" },
  { label: "更可执行", value: "more_actionable" },
];

export const referenceFocusOptions: Array<{ label: string; value: ReferenceFocus }> = [
  { label: "综合参考", value: "mixed" },
  { label: "重点参考结构", value: "structure" },
  { label: "重点参考语气", value: "tone" },
  { label: "重点参考开头", value: "opening" },
];

export const referenceLevelOptions: Array<{ label: string; value: ReferenceLevel }> = [
  { label: "轻参考", value: "low" },
  { label: "中参考", value: "medium" },
  { label: "强参考", value: "high" },
];

export const workspaceRewriteGoalOptions = [workspaceSelectNoneOption, ...rewriteGoalOptions];
export const workspaceReferenceFocusOptions = [workspaceSelectNoneOption, ...referenceFocusOptions];
export const workspaceReferenceLevelOptions = [workspaceSelectNoneOption, ...referenceLevelOptions];
