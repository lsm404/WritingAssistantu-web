import {
  AppstoreOutlined,
  BulbOutlined,
  CheckCircleFilled,
  LockOutlined,
  MessageOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { SidebarView } from "../lib/app-ui";
import { maskValue } from "../lib/app-ui";
import type { AuthUser, MembershipPlan, UserMembership, UserQuotaSummary, WechatAccount } from "../lib/types";

type Props = {
  activeView: SidebarView;
  currentUser: AuthUser;
  membership: UserMembership | null;
  quota: UserQuotaSummary | null;
  activeAccount?: WechatAccount;
  onViewChange: (view: SidebarView) => void;
  onLogout: () => void;
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

function quotaRefreshCaption(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    const ts = new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
    return `${ts} 更新额度`;
  } catch {
    return null;
  }
}

export function Sidebar({
  activeView,
  currentUser,
  membership,
  quota,
  activeAccount,
  onViewChange,
  onLogout,
}: Props) {
  const membershipLabel = membership?.isActive
    ? `${getPlanCategoryLabel(membership.plan)} - ${membership.plan.name}`
    : "普通用户";
  const membershipToneClass = getMembershipToneClass(membership?.plan?.name);
  const defaultQuota = membership?.isActive
    ? membership.plan
      ? {
          textMonthly: membership.plan.textMonthlyLimit ?? (membership.plan.textDailyLimit ?? 0) * 30,
          imageMonthly: membership.plan.imageMonthlyLimit ?? 0,
        }
      : null
    : { textMonthly: 2, imageMonthly: 3 };
  const textLimit = quota?.text.limit ?? defaultQuota?.textMonthly ?? 0;
  const imageLimit = quota?.image.limit ?? defaultQuota?.imageMonthly ?? 0;
  const textUsed = quota?.text.used ?? 0;
  const imageUsed = quota?.image.used ?? 0;
  const textProgress = textLimit > 0 ? Math.min(100, (textUsed / textLimit) * 100) : 0;
  const imageProgress = imageLimit > 0
    ? Math.min(100, (imageUsed / imageLimit) * 100)
    : 0;

  const textPeriodShort =
    quota?.usesFreeRollingWindows && quota.text.resetEveryDays
      ? `文章`
      : "文章";
  const imagePeriodShort =
    quota?.usesFreeRollingWindows && quota.image.resetEveryDays
      ? `配图`
      : "配图";

  const textRefreshLine = quotaRefreshCaption(quota?.text.quotaRefreshAt);
  const imageRefreshLine = quotaRefreshCaption(quota?.image.quotaRefreshAt);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <svg viewBox="0 0 32 32" width="24" height="24" fill="white">
            <path d="M16 2 C16 10 22 16 30 16 C22 16 16 22 16 30 C16 22 10 16 2 16 C10 16 16 10 16 2 Z" opacity="0.96" />
            <path d="M26 4 C26 7 28 9 31 9 C28 9 26 11 26 14 C26 11 24 9 21 9 C24 9 26 7 26 4 Z" opacity="0.75" />
            <path d="M7 23 C7 25 8.5 26.5 10.5 26.5 C8.5 26.5 7 28 7 30 C7 28 5.5 26.5 3.5 26.5 C5.5 26.5 7 25 7 23 Z" opacity="0.6" />
          </svg>
        </div>
        <div className="brand-name">
          <span className="main">写作助手</span>
          <span className="sub">桌面创作台</span>
        </div>
      </div>

      <nav className="nav-list sidebar-nav-main">
        <button className={`nav-item${activeView === "workspace" ? " active" : ""}`} onClick={() => onViewChange("workspace")}>
          <AppstoreOutlined />
          <span>工作台</span>
        </button>
        <button className={`nav-item${activeView === "membership" ? " active" : ""}`} onClick={() => onViewChange("membership")}>
          <LockOutlined />
          <span>会员中心</span>
        </button>
        <button className={`nav-item${activeView === "wechat" ? " active" : ""}`} onClick={() => onViewChange("wechat")}>
          <MessageOutlined />
          <span>公众号</span>
        </button>
        <button className={`nav-item${activeView === "prompt" ? " active" : ""}`} onClick={() => onViewChange("prompt")}>
          <BulbOutlined />
          <span>提示词词库</span>
        </button>
        <button className={`nav-item${activeView === "settings" ? " active" : ""}`} onClick={() => onViewChange("settings")}>
          <SettingOutlined />
          <span className="nav-label nav-label-desktop">设置</span>
          <span className="nav-label nav-label-mobile">额度</span>
        </button>
        {currentUser.role === "agent" ? (
          <button className={`nav-item${activeView === "agent" ? " active" : ""}`} onClick={() => onViewChange("agent")}>
            <TeamOutlined />
            <span>代理中心</span>
          </button>
        ) : null}
      </nav>

      <div className="sidebar-footer-card">
        <div className="footer-account-name">
          {currentUser.displayName || currentUser.email}
          <CheckCircleFilled style={{ color: "#22c55e", fontSize: 12, marginLeft: 4 }} />
        </div>
        <div className="footer-detail-row">
          <span className="footer-detail-key">账号</span>
          <span className="footer-detail-val">{maskValue(currentUser.email, 5, 8)}</span>
        </div>
        <div className="footer-detail-row">
          <span className={`footer-detail-val footer-membership-text ${membershipToneClass}`}>{membershipLabel}</span>
        </div>
        <div className="footer-thumb-status-slot">
          {membership?.isActive ? (
            <div className="footer-thumb-status">
              <div className="footer-thumb-dot ok" />
              <span>会员权益已激活</span>
            </div>
          ) : null}
        </div>

        <div className="footer-quota-card">
          <div className="footer-quota-head">
            <span>额度消耗</span>
          </div>

          <div className="footer-quota-item">
            <div className="footer-quota-refresh-meta footer-quota-refresh-meta-text">
              {textRefreshLine ?? ""}
            </div>
            <div className="footer-quota-title-row">
              <span className="footer-quota-title-text">{textPeriodShort}</span>
              <strong>{textLimit > 0 ? `${textUsed} / ${textLimit}` : "-- / --"}</strong>
            </div>
            <div className="footer-quota-bar">
              <div className="footer-quota-fill text" style={{ width: `${textProgress}%` }} />
            </div>
          </div>

          {membership?.isActive && getPlanCategoryLabel(membership.plan) === "文案创作" ? null : (
          <div className="footer-quota-item">
            <div className="footer-quota-refresh-meta footer-quota-refresh-meta-image">
              {imageRefreshLine ?? ""}
            </div>
            <div className="footer-quota-title-row">
              <span className="footer-quota-title-text">{imagePeriodShort}</span>
              <strong>{imageLimit > 0 ? `${imageUsed} / ${imageLimit}` : "-- / --"}</strong>
            </div>
            <div className="footer-quota-bar">
              <div className="footer-quota-fill image" style={{ width: `${imageProgress}%` }} />
            </div>
          </div>
        )}
        </div>

        <button className="sidebar-logout-btn" onClick={onLogout}>
          退出登录
        </button>
        <div className="footer-mini-account">工作台当前公众号：{activeAccount?.name || "未选择"}</div>
      </div>
    </aside>
  );
}
