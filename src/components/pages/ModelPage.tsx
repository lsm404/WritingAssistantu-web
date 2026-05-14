import { LockOutlined } from "@ant-design/icons";
import type { UserMembership } from "../../lib/types";

type Props = {
  authToken: string;
  baseUrl: string;
  membership: UserMembership | null;
};

export function ModelPage(_props: Props) {
  return (
    <div className="single-panel-wrap">
      <div className="ui-card single-panel-card">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 24px",
            gap: 16,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "linear-gradient(145deg, #eef0ff, #e0e2ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: "#6366f1",
            }}
          >
            <LockOutlined />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>模型由管理员统一配置</div>
          <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.8, maxWidth: 340 }}>
            文本模型和图片模型的 API Key、模型名称均由服务端统一维护，无需在客户端配置。
          </div>
        </div>
      </div>
    </div>
  );
}
