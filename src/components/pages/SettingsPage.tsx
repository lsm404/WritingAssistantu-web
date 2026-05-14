import { Space, Typography } from "antd";
import type { RuntimeInfo, UserQuotaSummary } from "../../lib/types";

const { Title, Text } = Typography;

interface SettingsPageProps {
  runtimeInfo: RuntimeInfo | null;
  quota: UserQuotaSummary | null;
  onCheckUpdate: () => Promise<void>;
}

function formatRefreshTime(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function QuotaRow({
  tone,
  label,
  used,
  limit,
  refreshAt,
}: {
  tone: "text" | "image";
  label: string;
  used: number;
  limit: number;
  refreshAt?: string | null;
}) {
  const progress = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const refreshText = formatRefreshTime(refreshAt);

  return (
    <div className="settings-quota-row">
      <div className="settings-quota-row-head">
        <div>
          <span className="settings-quota-label">{label}</span>
          {refreshText ? <span className="settings-quota-refresh">{refreshText} 更新</span> : null}
        </div>
        <strong>{limit > 0 ? `${used} / ${limit}` : "-- / --"}</strong>
      </div>
      <div className="settings-quota-bar">
        <div className={`settings-quota-fill ${tone}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function SettingsPage({ quota }: SettingsPageProps) {
  const textLabel =
    quota?.usesFreeRollingWindows && quota.text.resetEveryDays
      ? `文章 · 每 ${quota.text.resetEveryDays} 天`
      : "本月文章";
  const imageLabel =
    quota?.usesFreeRollingWindows && quota.image.resetEveryDays
      ? `配图 · 每 ${quota.image.resetEveryDays} 天`
      : "本月配图";

  return (
    <div className="page-container settings-page">
      <div className="settings-page-inner">
        <Space className="settings-brand-panel" direction="vertical" size={32}>
          <div className="app-logo-container">
            <svg viewBox="0 0 32 32" width="56" height="56" fill="white">
              <path d="M16 2 C16 10 22 16 30 16 C22 16 16 22 16 30 C16 22 10 16 2 16 C10 16 16 10 16 2 Z" opacity="0.96" />
              <path d="M26 4 C26 7 28 9 31 9 C28 9 26 11 26 14 C26 11 24 9 21 9 C24 9 26 7 26 4 Z" opacity="0.75" />
              <path d="M7 23 C7 25 8.5 26.5 10.5 26.5 C8.5 26.5 7 28 7 30 C7 28 5.5 26.5 3.5 26.5 C5.5 26.5 7 25 7 23 Z" opacity="0.6" />
            </svg>
          </div>

          <div>
            <Title level={1} className="settings-brand-title">
              写作助手
            </Title>
            <Text className="settings-brand-subtitle">让创作更简单，让灵感随处可见</Text>
          </div>
        </Space>

        <section className="settings-mobile-quota">
          <div className="settings-quota-card">
            <div className="settings-quota-head">
              <div>
                <div className="settings-quota-kicker">额度概览</div>
                <h2>当前可用额度</h2>
              </div>
              <span>{quota?.usesFreeRollingWindows ? "免费版" : "当前套餐"}</span>
            </div>

            <QuotaRow
              tone="text"
              label={textLabel}
              used={quota?.text.used ?? 0}
              limit={quota?.text.limit ?? 0}
              refreshAt={quota?.text.quotaRefreshAt}
            />
            <QuotaRow
              tone="image"
              label={imageLabel}
              used={quota?.image.used ?? 0}
              limit={quota?.image.limit ?? 0}
              refreshAt={quota?.image.quotaRefreshAt}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
