import { Button, Input, Popconfirm, Radio, Select, Space, Spin } from "antd";
import {
  BulbOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  LoadingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { GeneratePayload, WechatAccount } from "../../lib/types";
import {
  parseWorkspaceOptionalEnum,
  parseWorkspaceOptionalImageCount,
  WORKSPACE_TOPIC_MAX_CHARS,
  workspaceOptionalEnumValue,
  workspaceOptionalImageCountValue,
  type PromptSlot,
} from "../../lib/app-ui";

const { TextArea } = Input;

type Props = {
  articleDraft: GeneratePayload;
  resultMarkdown: string;
  settingsCollapsed: boolean;
  isGenerating?: boolean;
  isGeneratingImages?: boolean;
  isSendingDraft?: boolean;
  showImageCountSelector?: boolean;
  imageCountOptions: Array<{ label: string; value: string | number }>;
  styleOptions: Array<{ label: string; value: string }>;
  rewriteGoalOptions: Array<{ label: string; value: string }>;
  referenceFocusOptions: Array<{ label: string; value: string }>;
  referenceLevelOptions: Array<{ label: string; value: string }>;
  accounts: WechatAccount[];
  activeAccountId: string;
  onAccountChange: (id: string) => void;
  promptSlots: PromptSlot[];
  activePromptId: string;
  onPromptChange: (id: string) => void;
  onToggleSettings: () => void;
  onArticleFieldChange: <K extends keyof GeneratePayload>(key: K, value: GeneratePayload[K]) => void;
  onResultMarkdownChange: (value: string) => void;
  onSourceFilePick: () => void;
  onCopyMarkdown: () => void;
  onClearResult: () => void;
  onPreview: () => void;
  onRegenerateArticle: () => void;
};

export function WorkspacePage({
  articleDraft,
  resultMarkdown,
  settingsCollapsed,
  isGenerating = false,
  isGeneratingImages = false,
  isSendingDraft = false,
  showImageCountSelector = true,
  imageCountOptions,
  styleOptions,
  rewriteGoalOptions,
  referenceFocusOptions,
  referenceLevelOptions,
  accounts,
  activeAccountId,
  onAccountChange,
  promptSlots,
  activePromptId,
  onPromptChange,
  onToggleSettings,
  onArticleFieldChange,
  onResultMarkdownChange,
  onSourceFilePick,
  onCopyMarkdown,
  onClearResult,
  onPreview,
  onRegenerateArticle,
}: Props) {
  return (
    <div className="workspace-page">
      <div className="workspace-tip-outer">
        <div className="workspace-tip-banner" role="note">
          <BulbOutlined className="workspace-tip-icon" aria-hidden />
          <div className="workspace-tip-copy">
            <p className="workspace-tip-p">
              <strong className="workspace-tip-kicker">AI 辅助创作：</strong>
              <span>
                AI 负责效率，你负责深度。 在智能底稿上，勾勒你的专属洞见。
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className={`panels-row${showImageCountSelector ? "" : " panels-row--text-only"}`}>
        <section className={`settings-panel${settingsCollapsed ? " settings-panel--collapsed" : ""}`}>
          <div className="ui-card">
            <div className={`card-header${settingsCollapsed ? " card-header--icon-only" : ""}`}>
              {!settingsCollapsed ? (
                <>
                  <span className="card-title">创作设置</span>
                  <Button type="text" size="small" icon={<MenuFoldOutlined />} onClick={onToggleSettings}>
                    收起
                  </Button>
                </>
              ) : (
                <Button
                  type="text"
                  size="small"
                  className="settings-panel-expand-trigger"
                  icon={<MenuUnfoldOutlined />}
                  onClick={onToggleSettings}
                  aria-label="展开创作设置"
                  title="展开创作设置"
                />
              )}
            </div>

            {!settingsCollapsed ? (
              <div className="form-section">
                <div className="form-item">
                  <div className="form-item-label">创作模式</div>
                  {/* <Radio.Group
                    className="mode-radio-group"
                    value={articleDraft.creationMode}
                    onChange={(event) => onArticleFieldChange("creationMode", event.target.value)}
                    buttonStyle="solid"
                  >
                    <Radio.Button value="synthesized">原创生成</Radio.Button>
                    <Radio.Button value="rewrite">参考改写</Radio.Button>
                  </Radio.Group> */}
                </div>

                <div className="form-item">
                  <div className="form-item-label">
                    主题
                    <span className="required-star">*</span>
                  </div>
                  <Input
                    placeholder="输入文章主题或核心观点"
                    value={articleDraft.topic}
                    onChange={(event) =>
                      onArticleFieldChange("topic", event.target.value.slice(0, WORKSPACE_TOPIC_MAX_CHARS))
                    }
                    suffix={
                      <span className="input-counter">
                        {articleDraft.topic.length}/{WORKSPACE_TOPIC_MAX_CHARS}
                      </span>
                    }
                    maxLength={WORKSPACE_TOPIC_MAX_CHARS}
                  />
                </div>

                <div className="form-item">
                  <div className="form-item-label">公众号</div>
                  <Select
                    placeholder={accounts.length ? "选择公众号" : "请先在「公众号」页添加配置"}
                    value={accounts.some((a) => a.id === activeAccountId) ? activeAccountId : undefined}
                    onChange={onAccountChange}
                    options={accounts.map((a) => ({ label: a.name, value: a.id }))}
                  />
                </div>

                <div className="form-item">
                  <div className="form-item-label">提示词</div>
                  <Select
                    placeholder="选择提示词模板"
                    value={promptSlots.some((s) => s.id === activePromptId) ? activePromptId : undefined}
                    onChange={onPromptChange}
                    options={promptSlots.map((s) => ({ label: s.name, value: s.id }))}
                  />
                  <div className="helper-text" style={{ marginTop: 6 }}>
                    当前通用提示词已深度优化，建议谨慎切换以确保输出质量。
                  </div>
                </div>
                {showImageCountSelector ? (
                  <div className="form-item">
                    <div className="form-item-label">{"\u914d\u56fe\u6570\u91cf"}</div>
                    <Select
                      value={workspaceOptionalImageCountValue(articleDraft.imageCount)}
                      onChange={(value) => onArticleFieldChange("imageCount", parseWorkspaceOptionalImageCount(value))}
                      options={imageCountOptions}
                    />
                  </div>
                ) : null}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "4px" }}>
                  {/* <div className="form-item">
                    <div className="form-item-label">模式</div>
                    <Select
                      value={workspaceOptionalEnumValue(articleDraft.mode)}
                      onChange={(value) =>
                        onArticleFieldChange(
                          "mode",
                          parseWorkspaceOptionalEnum<NonNullable<GeneratePayload["mode"]>>(value),
                        )
                      }
                      options={modeOptions}
                    />
                  </div> */}
                  {showImageCountSelector && (articleDraft.imageCount ?? 0) > 0 && (
                    <div className="form-item" style={{ gridColumn: "span 2" }}>
                      <div className="form-item-label">图片要求</div>
                      <Input
                        placeholder="可选，例如：极简画风、商务科技感、温暖治愈等"
                        value={articleDraft.imagePrompt}
                        onChange={(e) => onArticleFieldChange("imagePrompt", e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {articleDraft.creationMode === "rewrite" ? (
                  <>
                    <div className="form-row">
                      <div className="form-item">
                        <div className="form-item-label">改写目标</div>
                        <Select
                          value={workspaceOptionalEnumValue(articleDraft.rewriteGoal)}
                          onChange={(value) =>
                            onArticleFieldChange(
                              "rewriteGoal",
                              parseWorkspaceOptionalEnum<NonNullable<GeneratePayload["rewriteGoal"]>>(value),
                            )
                          }
                          options={rewriteGoalOptions}
                        />
                      </div>
                      <div className="form-item">
                        <div className="form-item-label">参考重点</div>
                        <Select
                          value={workspaceOptionalEnumValue(articleDraft.referenceFocus)}
                          onChange={(value) =>
                            onArticleFieldChange(
                              "referenceFocus",
                              parseWorkspaceOptionalEnum<NonNullable<GeneratePayload["referenceFocus"]>>(value),
                            )
                          }
                          options={referenceFocusOptions}
                        />
                      </div>
                      <div className="form-item">
                        <div className="form-item-label">参考强度</div>
                        <Select
                          value={workspaceOptionalEnumValue(articleDraft.referenceLevel)}
                          onChange={(value) =>
                            onArticleFieldChange(
                              "referenceLevel",
                              parseWorkspaceOptionalEnum<NonNullable<GeneratePayload["referenceLevel"]>>(value),
                            )
                          }
                          options={referenceLevelOptions}
                        />
                      </div>
                    </div>

                    <div className="form-item">
                      <div className="form-item-label">参考文章</div>
                      <TextArea
                        value={articleDraft.sourceArticle}
                        onChange={(event) => onArticleFieldChange("sourceArticle", event.target.value.slice(0, 5000))}
                        autoSize={{ minRows: 8, maxRows: 12 }}
                        placeholder="粘贴参考文章、链接摘要，或导入文本文件"
                        maxLength={5000}
                      />
                      <div className="helper-row">
                        <span className="helper-text">{(articleDraft.sourceArticle ?? "").length}/5000</span>
                        <Button onClick={onSourceFilePick} icon={<FileTextOutlined />}>
                          导入文件
                        </Button>
                      </div>
                    </div>
                  </>
                ) : null}

              </div>
            ) : null}
          </div>
        </section>

        <section className="results-panel">
          <div className="ui-card results-card">
            <div className="card-title-plain">生成结果</div>

            <div className="article-content-area" style={{ position: "relative" }}>
              {isGenerating && (
                <div className="image-gen-overlay">
                  <Spin
                    indicator={<LoadingOutlined style={{ fontSize: 38, color: "rgba(255,255,255,0.92)" }} spin />}
                  />
                  <span className="image-gen-overlay-text">正在生成文章...</span>
                </div>
              )}
              <TextArea
                className="editor-textarea"
                placeholder={isGenerating ? "" : "文章内容会在这里生成..."}
                value={resultMarkdown}
                onChange={(event) => onResultMarkdownChange(event.target.value)}
                autoSize={false}
                readOnly={isGenerating}
                disabled={isSendingDraft}
              />
              {isGeneratingImages && (
                <div className="image-gen-overlay">
                  <Spin
                    indicator={<LoadingOutlined style={{ fontSize: 38, color: "rgba(255,255,255,0.92)" }} spin />}
                  />
                  <span className="image-gen-overlay-text">
                    <PictureOutlined style={{ marginRight: 6 }} />
                    正在生成配图...
                  </span>
                </div>
              )}
              {isSendingDraft && (
                <div className="result-loading-overlay">
                  <div className="result-loading-inner">
                    <Spin
                      indicator={<LoadingOutlined style={{ fontSize: 32, color: "#6366f1" }} spin />}
                    />
                    <span className="result-loading-text">正在发送到草稿箱...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="results-footer">
              <Space className="results-footer-left">
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={onPreview}
                  disabled={isGenerating || isSendingDraft || !resultMarkdown.trim()}
                >
                  预览
                </Button>
                <Button size="small" icon={<CopyOutlined />} onClick={onCopyMarkdown} disabled={isGenerating || isSendingDraft}>
                  复制
                </Button>
                <Button size="small" icon={<DeleteOutlined />} danger onClick={onClearResult} disabled={isGenerating || isSendingDraft}>
                  清空
                </Button>
                {resultMarkdown.trim() ? (
                  <span className="results-footer-right">
                    <Popconfirm
                      title="二次去AI"
                      description="额度有限，仅在朱雀偶发标红、当前稿件不够稳时使用。"
                      okText="开始优化"
                      cancelText="先不"
                      placement="topRight"
                      onConfirm={onRegenerateArticle}
                    >
                      <Button
                        size="small"
                        className="results-footer-retry-btn"
                        icon={<ReloadOutlined />}
                        disabled={isGenerating || isSendingDraft}
                      >
                        二次去AI
                      </Button>
                    </Popconfirm>
                  </span>
                ) : null}
              </Space>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
