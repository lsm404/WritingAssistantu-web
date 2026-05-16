import { GiftOutlined, LockOutlined, MailOutlined, RobotOutlined, WechatOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";

type AuthMode = "login" | "register";

type Props = {
  mode: AuthMode;
  loading: boolean;
  form: {
    email: string;
    password: string;
    displayName: string;
    inviteCode: string;
  };
  onModeChange: (mode: AuthMode) => void;
  onFieldChange: (key: "email" | "password" | "displayName" | "inviteCode", value: string) => void;
  onSubmit: () => void;
};

export function LoginPage({ mode, loading, form, onModeChange, onFieldChange, onSubmit }: Props) {
  return (
    <div className="auth-shell">
      <div className="auth-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-hero-badge">
            <span className="badge-dot"></span>
            写作助手
          </div>
          <h1>智能写作助手</h1>
          <p>
            专为内容创作者打造。集成多账号管理、智能提示词与快捷排版，让每一次灵感都变为爆款。
          </p>

          <div className="auth-feature-grid">
            <div className="auth-feature-card premium-card">
              <div className="feature-icon-wrapper wechat-icon">
                <WechatOutlined />
              </div>
              <div>
                <strong>微信多账号管理</strong>
                <span>在桌面端无缝完成从构思、撰写到一键群发的所有步骤。</span>
              </div>
            </div>
            <div className="auth-feature-card premium-card">
              <div className="feature-icon-wrapper ai-icon">
                <RobotOutlined />
              </div>
              <div>
                <strong>AI 智能创作增强</strong>
                <span>内置丰富的提示词与 AI 辅助能力，自动生成高质量配文与插图。</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card premium-glass">
          <div className="auth-card-top">
            <div className="auth-title-block">
              <span className="auth-kicker">Welcome</span>
              <h2>{mode === "login" ? "欢迎回来，创作者" : "开启你的创作之旅"}</h2>
              <p>{mode === "login" ? "登录账号，继续你的桌面工作流。" : "快速注册，探索智能写作与多账号管理的全新体验。"}</p>
            </div>
            <div className="auth-tabs">
              <button
                className={`auth-tab ${mode === "login" ? "active" : ""}`}
                onClick={() => onModeChange("login")}
              >
                登录账号
              </button>
              <button
                className={`auth-tab ${mode === "register" ? "active" : ""}`}
                onClick={() => onModeChange("register")}
              >
                注册账号
              </button>
            </div>
          </div>

          <div className="auth-form">
            <div className={`auth-field-wrapper ${mode === "register" ? "expanded" : ""}`}>
              <label className="auth-field">
                <span>创作者昵称</span>
                <Input
                  className="premium-input"
                  size="large"
                  value={form.displayName}
                  onChange={(event) => onFieldChange("displayName", event.target.value)}
                  placeholder="例如：林大大"
                />
              </label>
            </div>

            {mode === "register" ? (
              <label className="auth-field auth-field-invite-code">
                <span>激活码（8 位字母）</span>
                <Input
                  className="premium-input invite-code-input"
                  size="large"
                  prefix={<GiftOutlined className="input-icon" />}
                  value={form.inviteCode}
                  onChange={(event) => {
                    const v = event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8);
                    onFieldChange("inviteCode", v);
                  }}
                  placeholder="例如：ABCDEFGH"
                  maxLength={8}
                />
              </label>
            ) : null}

            <label className="auth-field">
              <span>邮箱账号</span>
              <Input
                className="premium-input"
                size="large"
                prefix={<MailOutlined className="input-icon" />}
                value={form.email}
                onChange={(event) => onFieldChange("email", event.target.value)}
                placeholder="name@example.com"
              />
            </label>

            <label className="auth-field">
              <span>密码</span>
              <Input.Password
                className="premium-input"
                size="large"
                prefix={<LockOutlined className="input-icon" />}
                value={form.password}
                onChange={(event) => onFieldChange("password", event.target.value)}
                placeholder="至少 6 位字符"
                onPressEnter={onSubmit}
              />
            </label>

            <Button className="premium-submit-btn" type="primary" size="large" block loading={loading} onClick={onSubmit}>
              {mode === "login" ? "登录并进入工作台" : "注册账号并继续"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
