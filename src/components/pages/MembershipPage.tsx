import {
  CheckCircleFilled,
  CrownFilled,
  FireFilled,
  RocketFilled,
  StarFilled,
} from "@ant-design/icons";
import { Button, Modal, Tag } from "antd";
import type { MembershipPlan, UserMembership, UserQuotaSummary } from "../../lib/types";

type Props = {
  plans: MembershipPlan[];
  membership: UserMembership | null;
  quota: UserQuotaSummary | null;
  loading: boolean;
  activePlanCode: string | null;
  onCheckout: (planCode: string) => void;
};

type PlanPreset = {
  code: string;
  fallbackName: string;
  fallbackPriceLabel: string;
  icon: React.ReactNode;
  accentClass: string;
  badge?: string;
  tagline: string;
  features: string[];
};

const planPresets: PlanPreset[] = [
  {
    code: "monthly_99",
    fallbackName: "基础月卡",
    fallbackPriceLabel: "59.90",
    icon: <FireFilled />,
    accentClass: "sun",
    tagline: "轻量起步，适合基础文字创作",
    features: ["150 次文章生成额度", "允许绑定 2 个公众号", "不支持 AI 生图功能"],
  },
  {
    code: "monthly_399",
    fallbackName: "进阶季卡",
    fallbackPriceLabel: "89.90",
    icon: <RocketFilled />,
    accentClass: "sky",
    badge: "日常主力",
    tagline: "覆盖稳定更新频率，适合日常持续输出",
    features: ["210 次文章生成额度", "30 张图片额度", "会员生图支持去水印", "允许绑定 5 个公众号"],
  },
  {
    code: "monthly_599",
    fallbackName: "专业月卡",
    fallbackPriceLabel: "109.90",
    icon: <StarFilled />,
    accentClass: "orange",
    tagline: "中高频创作更从容，效率和成本更平衡",
    features: ["450 次文章生成额度", "60 张图片额度", "会员生图支持去水印", "允许绑定 10 个公众号"],
  },
  {
    code: "monthly_990",
    fallbackName: "尊享月卡",
    fallbackPriceLabel: "199.00",
    icon: <CrownFilled />,
    accentClass: "purple",
    badge: "最受欢迎",
    tagline: "高频深度使用场景，给重度创作留足空间",
    features: ["1500 次文章生成额度", "150 张图片额度", "会员生图支持去水印", "不限制公众号绑定数量"],
  },
];

function formatDate(value: string | null) {
  if (!value) {
    return "长期有效";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPriceInteger(priceLabel?: string | null) {
  const value = Number.parseFloat(String(priceLabel ?? ""));
  if (!Number.isFinite(value)) {
    return String(priceLabel ?? "");
  }
  return String(Math.trunc(value));
}

function getPlanTextMonthlyLimit(plan?: MembershipPlan | null) {
  return plan?.textMonthlyLimit ?? (plan?.textDailyLimit ?? 0) * 30;
}

function normalizeFeatureLabel(feature: string, textMonthlyLimit: number) {
  return feature
    .replace(/每天\s*\d+\s*次文字创作/g, `${textMonthlyLimit} 次文章生成额度`)
    .replace(/^每月\s*/, "");
}

function getDisplayFeatures(features: string[], textMonthlyLimit: number) {
  return features
    .map((feature) => normalizeFeatureLabel(String(feature ?? "").trim(), textMonthlyLimit))
    .filter((feature) => feature.length > 0);
}

function getStatusText(membership: UserMembership | null, quotaSummary: UserQuotaSummary | null) {
  if (!membership?.isActive) {
    const textCycle = quotaSummary?.text.resetEveryDays ?? 3;
    const imageCycle = quotaSummary?.image.resetEveryDays ?? 7;
    const textLim = quotaSummary?.text.limit ?? 3;
    const imageLim = quotaSummary?.image.limit ?? 3;
    return `您正在使用免费版：每 ${textCycle} 天可享受 ${textLim} 次文章生成额度，每 ${imageCycle} 天可享受 ${imageLim} 张 AI 配图额度；两个周期分别计算，到期自动恢复。开通会员可获得套餐总额度。`;
  }

  if (membership.plan.isLifetime) {
    return "当前账号已开通长期会员权益，可持续使用完整会员能力。";
  }

  return `有效期至 ${formatDate(membership.endAt)}`;
}

function getPlanAccentClassByName(planName?: string | null) {
  const name = String(planName || "");
  if (name.includes("基础月卡")) return "sun";
  if (name.includes("进阶季卡") || name.includes("进阶月卡")) return "sky";
  if (name.includes("至尊年卡")) return "purple";
  return null;
}

function getPlanIconByAccent(accentClass: string) {
  switch (accentClass) {
    case "sun":
      return <FireFilled />;
    case "sky":
      return <RocketFilled />;
    case "purple":
      return <CrownFilled />;
    default:
      return <StarFilled />;
  }
}

function getFallbackPreset(plan: MembershipPlan, index: number): PlanPreset {
  const matchedAccent = getPlanAccentClassByName(plan.name);
  if (matchedAccent) {
    return {
      code: plan.code,
      fallbackName: plan.name,
      fallbackPriceLabel: plan.priceLabel,
      icon: getPlanIconByAccent(matchedAccent),
      accentClass: matchedAccent,
      badge: matchedAccent === "purple" ? "年度优选" : undefined,
      tagline: plan.tagline,
      features: plan.features,
    };
  }

  return {
    code: plan.code,
    fallbackName: plan.name,
    fallbackPriceLabel: plan.priceLabel,
    icon: planPresets[index % planPresets.length]?.icon ?? <StarFilled />,
    accentClass: planPresets[index % planPresets.length]?.accentClass ?? "sun",
    tagline: plan.tagline,
    features: plan.features,
  };
}

function getDisplayPlans(plans: MembershipPlan[]) {
  const activePlans = plans.filter((plan) => plan.isActive);

  return activePlans.map((plan, index) => ({
    preset: getFallbackPreset(plan, index),
    plan,
  }));
}

function getPlanCategory(plan?: Pick<MembershipPlan, "planCategory" | "imageMonthlyLimit"> | null) {
  return plan?.planCategory ?? ((plan?.imageMonthlyLimit ?? 0) > 0 ? "text_image" : "text_only");
}

function getPlanCategoryLabel(plan?: Pick<MembershipPlan, "planCategory" | "imageMonthlyLimit"> | null) {
  return getPlanCategory(plan) === "text_only" ? "文案创作" : "图文创作";
}

function getMembershipDisplayName(membership: UserMembership | null) {
  return membership?.isActive && membership.plan
    ? `${getPlanCategoryLabel(membership.plan)} - ${membership.plan.name}`
    : "普通用户";
}

export function MembershipPage({ plans, membership, quota, loading, activePlanCode, onCheckout }: Props) {
  const displayPlans = getDisplayPlans(plans);
  const textOnlyPlans = displayPlans.filter(({ plan }) => getPlanCategory(plan) === "text_only");
  const textImagePlans = displayPlans.filter(({ plan }) => getPlanCategory(plan) === "text_image");
  const currentPlanCode = membership?.isActive ? membership.plan.code : "";

  return (
    <div className="single-panel-wrap">
      <div className="membership-layout membership-layout-rich">
        <section className="membership-status-wrap">
          <div className="membership-status-card membership-status-card-rich">
            <div className="membership-status-main">
              <div className="membership-status-top">
                <span>当前状态</span>
                <Tag color={membership?.isActive ? "success" : "default"}>
                  {membership?.isActive ? "已激活" : "未开通"}
                </Tag>
              </div>
              <div className="membership-status-name">
                {getMembershipDisplayName(membership)}
              </div>
              <div className="membership-status-meta">{getStatusText(membership, quota)}</div>
            </div>
            <div className="membership-status-tags">
              {membership?.isActive ? (
                <>
                  <span>文章总额度</span>
                  <span>配图总额度</span>
                  <span>会员权益即时生效</span>
                </>
              ) : (
                <>
                  <span>文章 · 每 {quota?.text.resetEveryDays ?? 3} 天重置</span>
                  <span>配图 · 每 {quota?.image.resetEveryDays ?? 7} 天重置</span>
                  <span>开通会员 · 解锁更高额度</span>
                </>
              )}
            </div>
            <div className="membership-status-strip" />
          </div>
        </section>

        {[
          { title: "文案创作", items: textOnlyPlans },
          { title: "图文创作", items: textImagePlans },
        ].map(({ title, items }) => items.length > 0 && (
          <section key={title} className="membership-plan-section">
            <h2 className="membership-plan-section-title">{title}</h2>
            <div className="membership-plan-grid membership-plan-grid-rich">
          {items.map(({ preset, plan }) => {
            const isCurrent = Boolean(plan && currentPlanCode === plan.code);
            const buttonType = getPlanAccentClassByName(plan.name) === "purple" ? "primary" : "default";

            return (
              <article
                key={preset.code}
                className={[
                  "membership-plan-card",
                  "membership-plan-card-rich",
                  `membership-plan-${preset.accentClass}`,
                  preset.badge ? "featured" : "",
                  isCurrent ? "current" : "",
                ].join(" ")}
              >
                {preset.badge ? <span className="membership-card-hot">{preset.badge}</span> : null}

                <div className="membership-plan-top">
                  <div className="membership-plan-icon">{preset.icon}</div>
                  <div className="membership-plan-title-block">
                    <h3>{plan?.name ?? preset.fallbackName}</h3>
                    <p>{plan?.tagline ?? preset.tagline}</p>
                  </div>
                </div>

                <div className="membership-price-block">
                  <div className="membership-price-main">
                    <span className="membership-price-value">{formatPriceInteger(plan?.priceLabel ?? preset.fallbackPriceLabel)}</span>
                    <span className="membership-price-unit">元</span>
                  </div>
                  {/* {plan && (
                    <div className="membership-quota-badge-row">
                      <span className="quota-badge text-badge">{getPlanTextMonthlyLimit(plan)} 文</span>
                      <span className="quota-badge image-badge">{plan.imageMonthlyLimit} 图</span>
                      <span className="quota-badge account-badge">{plan.wechatAccountLimit > 500 ? '不限' : plan.wechatAccountLimit} 个公众号</span>
                    </div>
                  )} */}
                </div>

                <div className="membership-benefit-list membership-benefit-list-rich">
                  {getDisplayFeatures(
                    plan?.features ?? preset.features,
                    getPlanTextMonthlyLimit(plan),
                  ).map((featureLabel: string) => (
                      <div key={featureLabel}>
                        <CheckCircleFilled />
                        <span>{featureLabel}</span>
                      </div>
                  ))}
                  <div>
                    <CheckCircleFilled />
                    <span>登录后自动识别会员状态，无需重复配置</span>
                  </div>
                </div>

                <Button
                  type={buttonType}
                  size="large"
                  className="membership-plan-action"
                  loading={loading && activePlanCode === plan?.code}
                  disabled={isCurrent}
                  onClick={() => {
                    if (plan) onCheckout(plan.code);
                  }}
                >
                  {isCurrent ? "当前套餐" : "咨询开通"}
                </Button>
              </article>
            );
          })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
