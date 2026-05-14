"use client";

import { useState, type MouseEvent } from "react";
import { Button, Modal, Popconfirm, Typography } from "antd";
import {
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MessageOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { UserMembership, WechatAccount } from "../../lib/types";

const { Paragraph } = Typography;

type Props = {
  accounts: WechatAccount[];
  activeAccountId: string;
  isUploadingCover: boolean;
  onSelectAccount: (id: string) => void;
  onAddAccount: () => void;
  onEditAccount: (account: WechatAccount) => void;
  onRemoveAccount: (account: WechatAccount) => void;
  onPickCover: (accountId: string) => void;
  membership: UserMembership | null;
};

function maskAppId(appId: string) {
  const trimmed = appId.trim();
  if (!trimmed) return "未填写 AppID";
  if (trimmed.length <= 12) return `${trimmed.slice(0, 4)}...`;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}

function getWechatAccountLimit(membership: UserMembership | null) {
  if (!membership?.isActive) return 1;
  const limit = Number(membership.plan.wechatAccountLimit ?? 1);
  if (!Number.isFinite(limit) || limit <= 0) return 1;
  return limit > 500 ? Infinity : limit;
}

export function WechatAccountLibraryPage({
  accounts,
  activeAccountId,
  isUploadingCover,
  onSelectAccount,
  onAddAccount,
  onEditAccount,
  onRemoveAccount,
  onPickCover,
  membership,
}: Props) {
  const [viewAccount, setViewAccount] = useState<WechatAccount | null>(null);
  const accountLimit = getWechatAccountLimit(membership);

  const openEdit = (account: WechatAccount, event?: MouseEvent) => {
    event?.stopPropagation();
    onEditAccount(account);
  };

  const handleCardClick = (account: WechatAccount) => {
    onSelectAccount(account.id);
  };

  const handleAddAccount = () => {
    if (accounts.length >= accountLimit) {
      Modal.warning({
        title: "账号数量已达上限",
        content: `您当前的套餐最多允许绑定 ${accountLimit} 个公众号账号。如需添加更多，请前往「会员中心」升级套餐。`,
        okText: "我知道了",
      });
      return;
    }
    onAddAccount();
  };

  return (
    <div className="prompt-library-wrap">
      <div className="ui-card prompt-library-toolbar">
        <div className="prompt-library-toolbar-text">
          <div className="card-title">
            公众号
            <span style={{ fontSize: 13, fontWeight: 500, color: "#64748b", marginLeft: 10, opacity: 0.8 }}>
              ({accounts.length} / {accountLimit === Infinity ? "∞" : accountLimit})
            </span>
          </div>
          <div className="helper-text">管理发送草稿、上传封面使用的公众号；在工作台创作设置中可快速切换。</div>
        </div>
        <div className="prompt-library-toolbar-actions">
          <Button type="primary" onClick={handleAddAccount} icon={<PlusOutlined />}>
            新增公众号
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="prompt-library-empty">
          <div className="prompt-library-empty-icon-wrap">
            <MessageOutlined className="prompt-library-empty-icon" aria-hidden />
          </div>
          <div className="prompt-library-empty-title">暂无公众号</div>
          <p className="prompt-library-empty-desc">点击「新增公众号」添加配置后，即可在工作台选择并发送到草稿箱。</p>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAccount}>
            新增公众号
          </Button>
        </div>
      ) : (
        <div className="prompt-card-grid">
          {accounts.map((account) => (
            <div
              key={account.id}
              role="button"
              tabIndex={0}
              className={`prompt-library-card${account.id === activeAccountId ? " wechat-account-card-active" : ""}`}
              onClick={() => handleCardClick(account)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleCardClick(account);
                }
              }}
            >
              <div className="prompt-library-card-body">
                <div className="prompt-library-card-title">{account.name}</div>
                <div className="prompt-library-card-meta-row">
                  <span className="account-mono">{maskAppId(account.appId)}</span>
                  <span className="prompt-library-card-meta-dot" aria-hidden />
                  <span>{account.appSecret.trim() ? "Secret 已填" : "Secret 未填"}</span>
                  <span className="prompt-library-card-meta-dot" aria-hidden />
                  <span>{account.thumbMediaId.trim() ? "封面已配置" : "封面未配置"}</span>
                </div>
                {account.id === activeAccountId ? <div className="wechat-account-active-pill">当前使用</div> : null}
              </div>

              <div className="prompt-library-card-footer" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="prompt-library-card-view" onClick={() => setViewAccount(account)}>
                  <EyeOutlined />
                  查看
                </button>
                <button
                  type="button"
                  className="prompt-library-card-view"
                  onClick={() => onPickCover(account.id)}
                  disabled={isUploadingCover}
                >
                  <CloudUploadOutlined />
                  {isUploadingCover ? "上传中..." : "封面"}
                </button>
                <div className="prompt-library-card-icon-actions">
                  <button
                    type="button"
                    className="prompt-library-card-icon-btn"
                    title="编辑"
                    aria-label="编辑"
                    onClick={(event) => openEdit(account, event)}
                  >
                    <EditOutlined />
                  </button>
                  <Popconfirm
                    title="删除公众号"
                    description="确定删除该公众号配置吗？"
                    onConfirm={() => onRemoveAccount(account)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <button type="button" className="prompt-library-card-icon-btn danger" title="删除" aria-label="删除">
                      <DeleteOutlined />
                    </button>
                  </Popconfirm>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={viewAccount ? `查看：${viewAccount.name}` : "查看"}
        open={!!viewAccount}
        onCancel={() => setViewAccount(null)}
        footer={
          <Button type="primary" onClick={() => setViewAccount(null)}>
            关闭
          </Button>
        }
        width={560}
        destroyOnHidden
      >
        {viewAccount ? (
          <div className="wechat-account-view-modal">
            <Paragraph>
              <strong>账号名称</strong>
              <br />
              {viewAccount.name}
            </Paragraph>
            <Paragraph copyable={{ text: viewAccount.appId }}>
              <strong>AppID</strong>
              <br />
              <span className="account-mono">{viewAccount.appId || "-"}</span>
            </Paragraph>
            <Paragraph>
              <strong>Secret</strong>
              <br />
              {viewAccount.appSecret.trim() ? "已填写（出于安全不在此处展示全文）" : "未填写"}
            </Paragraph>
            <Paragraph copyable={{ text: viewAccount.thumbMediaId }}>
              <strong>封面 thumb_media_id</strong>
              <br />
              <span className="account-mono">{viewAccount.thumbMediaId || "-"}</span>
            </Paragraph>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
