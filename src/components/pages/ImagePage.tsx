import { useEffect, useState } from "react";
import { App as AntApp, Button, Card, Image, Input, Slider, Space, Spin, Switch, Tag, Typography } from "antd";
import {
  CopyOutlined,
  CrownOutlined,
  DownloadOutlined,
  PictureOutlined,
  RocketOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { fetchModelConfig, generateImage } from "../../lib/openclaw-api";
import { copyText } from "../../lib/clipboard";
import type {
  ImageGeneratePayload,
  ImageQuality,
  ImageSize,
  ModelConfig,
  UserMembership,
  UserQuotaSummary,
} from "../../lib/types";

type Props = {
  membership: UserMembership | null;
  quota: UserQuotaSummary | null;
  authToken: string;
  baseUrl: string;
  onQuotaChange?: (quota?: UserQuotaSummary | null) => void;
  onRefreshMembership?: () => Promise<void> | void;
};

const imageSizes: Array<{ value: ImageSize; label: string; ratio: string }> = [
  { value: "1024x1024", label: "正方形", ratio: "1:1" },
  { value: "1024x1792", label: "竖版", ratio: "9:16" },
  { value: "1792x1024", label: "横版", ratio: "16:9" },
];

const imageQualities: Array<{ value: ImageQuality; label: string; desc: string }> = [
  { value: "standard", label: "标准", desc: "速度更快" },
  { value: "hd", label: "高清", desc: "细节更好" },
];

function getFriendlyImageError(error: unknown, q: UserQuotaSummary | null) {
  if (!(error instanceof Error)) {
    return "图片生成失败";
  }

    if (error.message === "IMAGE_QUOTA_EXCEEDED") {
      if (q?.usesFreeRollingWindows && q.image.resetEveryDays) {
        return `当前配图额度已用完（每 ${q.image.resetEveryDays} 天恢复一次）。下个周期开始后会自动刷新，也可升级会员获得更高额度。`;
      }
      return "配图额度已用完，可升级会员继续使用。";
    }

  if (error.message === "UNAUTHORIZED") {
    return "登录状态已失效，请重新登录后再试。";
  }

  return error.message || "图片生成失败";
}

export function ImagePage({ membership, quota, authToken, baseUrl, onQuotaChange, onRefreshMembership }: Props) {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [size, setSize] = useState<ImageSize>("1024x1024");
  const [quality, setQuality] = useState<ImageQuality>("standard");
  const [imageCount, setImageCount] = useState(1);
  const [watermark, setWatermark] = useState(true);
  const [generatedImages, setGeneratedImages] = useState<
    Array<{
      url?: string;
      b64_json?: string;
      prompt: string;
      timestamp: number;
    }>
  >([]);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    textApiKey: "",
    textModel: "",
    enableWebSearch: false,
  });

  const isVipUser = membership?.isActive === true;
  const effectiveWatermark = isVipUser ? watermark : true;
  const textConfigReady = Boolean(modelConfig.textApiKey.trim() && modelConfig.textModel.trim());
  const imageQuotaText = quota ? `${quota.image.used} / ${quota.image.limit}` : "-- / --";
  const textQuotaText = quota ? `${quota.text.used} / ${quota.text.limit}` : "-- / --";

  useEffect(() => {
    void loadModelConfig();
  }, [authToken]);

  useEffect(() => {
    setWatermark(!isVipUser);
  }, [isVipUser]);

  const loadModelConfig = async () => {
    try {
      setLoading(true);
      const config = await fetchModelConfig(baseUrl, authToken);
      setModelConfig(config);
    } catch {
      message.error("加载模型配置失败");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      message.warning("请输入图片描述");
      return;
    }

    if (!textConfigReady) {
      message.warning("请先完成模型配置后再生成图片");
      return;
    }

    setGenerating(true);
    try {
      const payload: ImageGeneratePayload = {
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        size,
        quality,
        n: imageCount,
        watermark: effectiveWatermark,
        authToken,
        baseUrl,
      };

      const result = await generateImage(payload);
      onQuotaChange?.(result.quota);
      await onRefreshMembership?.();

      if (result.images.length > 0) {
        const timestamp = Date.now();
        const newImages = result.images.map((img, index) => ({
          ...img,
          prompt: prompt.trim(),
          timestamp: timestamp + index,
        }));
        setGeneratedImages((prev) => [...newImages, ...prev]);
        message.success(`成功生成 ${result.images.length} 张图片`);
      } else {
        message.error("图片生成失败，未返回有效图片");
      }
    } catch (error) {
      await onRefreshMembership?.();
      message.error(getFriendlyImageError(error, quota));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyPrompt = async (promptText: string) => {
    if (await copyText(promptText)) {
      message.success("提示词已复制");
    } else {
      message.error("复制失败");
    }
  };

  const handleDownloadImage = (imageUrl: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `openclaw-image-${Date.now()}.png`;
    link.click();
    message.success("图片开始下载");
  };

  const imageTagLabel =
    quota?.usesFreeRollingWindows && quota.image.resetEveryDays
      ? `配图 · 每 ${quota.image.resetEveryDays} 天`
      : "配图";
  const textTagLabel =
    quota?.usesFreeRollingWindows && quota.text.resetEveryDays
      ? `文章 · 每 ${quota.text.resetEveryDays} 天`
      : "文章";

  if (loading) {
    return (
      <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: "#666" }}>正在加载模型配置...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="image-page-wrap" style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
      <div className="image-page-hero" style={{ marginBottom: 24 }}>
        <div className="image-page-heading" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <PictureOutlined style={{ fontSize: 24, color: "#6366f1" }} />
          <Typography.Title level={2} style={{ margin: 0 }}>
            AI 图片生成
          </Typography.Title>
          <Tag color={isVipUser ? "gold" : "processing"} icon={<CrownOutlined />}>
            {isVipUser ? "会员额度" : "免费体验"}
          </Tag>
          <Tag color="blue">
            {imageTagLabel} {imageQuotaText}
          </Tag>
          <Tag color="geekblue">
            {textTagLabel} {textQuotaText}
          </Tag>
        </div>
        <Typography.Text type="secondary">
          {isVipUser
            ? "会员套餐：文章和配图按套餐总额度扣减；配图额度用完后，仍可继续生成文章。"
            : quota?.usesFreeRollingWindows
              ? "免费版：文章与 AI 配图各自按周期恢复额度（见上方标签）。配图用尽后，文章功能照常可用。"
              : "额度按服务端规则扣减；配图用尽后，仍可继续使用文章能力。"}
        </Typography.Text>
      </div>

      <div className="image-page-layout" style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <Card className="image-settings-card" title="生成设置" style={{ width: 420, flexShrink: 0 }} styles={{ body: { padding: 20 } }}>
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <div>
              <Typography.Text strong>图片描述</Typography.Text>
              <Input.TextArea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="例如：奶油质感的猫咪咖啡馆，午后暖阳，电影感构图"
                rows={4}
                style={{ marginTop: 8 }}
                disabled={generating}
              />
            </div>

            <div>
              <Typography.Text strong>负面提示词</Typography.Text>
              <Input.TextArea
                value={negativePrompt}
                onChange={(event) => setNegativePrompt(event.target.value)}
                placeholder="例如：模糊、低质量、畸形手部、水印"
                rows={2}
                style={{ marginTop: 8 }}
                disabled={generating}
              />
            </div>

            <div>
              <Typography.Text strong>图片尺寸</Typography.Text>
              <div className="image-option-row" style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {imageSizes.map((sizeOption) => (
                  <Button
                    key={sizeOption.value}
                    type={size === sizeOption.value ? "primary" : "default"}
                    onClick={() => setSize(sizeOption.value)}
                    disabled={generating}
                    style={{ flex: 1 }}
                  >
                    <div>
                      <div>{sizeOption.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{sizeOption.ratio}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Typography.Text strong>生成质量</Typography.Text>
              <div className="image-option-row" style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {imageQualities.map((qualityOption) => (
                  <Button
                    key={qualityOption.value}
                    type={quality === qualityOption.value ? "primary" : "default"}
                    onClick={() => setQuality(qualityOption.value)}
                    disabled={generating}
                    style={{ flex: 1 }}
                  >
                    <div>
                      <div>{qualityOption.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{qualityOption.desc}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Typography.Text strong>生成数量: {imageCount}</Typography.Text>
              <Slider
                min={1}
                max={4}
                value={imageCount}
                onChange={setImageCount}
                marks={{ 1: "1", 2: "2", 3: "3", 4: "4" }}
                style={{ marginTop: 8 }}
                disabled={generating}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Typography.Text strong>添加水印</Typography.Text>
                {!isVipUser ? (
                  <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>免费版默认保留水印，会员可关闭</div>
                ) : null}
              </div>
              <Switch
                checked={effectiveWatermark}
                onChange={setWatermark}
                disabled={generating || !isVipUser}
              />
            </div>

            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              loading={generating}
              onClick={handleGenerate}
              block
              style={{ marginTop: 16 }}
            >
              {generating ? "生成中..." : "生成图片"}
            </Button>

            {!textConfigReady ? (
              <div
                style={{
                  padding: 12,
                  background: "#fff7e6",
                  borderRadius: 8,
                  border: "1px solid #ffd591",
                  marginTop: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SettingOutlined style={{ color: "#fa8c16" }} />
                  <Typography.Text style={{ fontSize: 13, color: "#d46b08" }}>
                    请先到“模型设置”中完成文本模型配置，图片模型由服务端统一提供。
                  </Typography.Text>
                </div>
              </div>
            ) : null}
          </Space>
        </Card>

        <div className="image-results-panel" style={{ flex: 1 }}>
          {generatedImages.length === 0 ? (
            <Card style={{ textAlign: "center", padding: "60px 20px" }}>
              <PictureOutlined style={{ fontSize: 64, color: "#d1d5db", marginBottom: 16 }} />
              <Typography.Title level={4} type="secondary">
                生成结果会显示在这里
              </Typography.Title>
              <Typography.Text type="secondary">
                免费版与会员版均支持；系统将根据当前剩余配额自动扣减。
              </Typography.Text>
            </Card>
          ) : (
            <div className="image-result-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {generatedImages.map((img, index) => (
                <Card
                  key={`${img.timestamp}-${index}`}
                  styles={{ body: { padding: 12 } }}
                  actions={[
                    <Button
                      key="copy"
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => void handleCopyPrompt(img.prompt)}
                    >
                      复制提示词
                    </Button>,
                    img.url ? (
                      <Button
                        key="download"
                        type="text"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadImage(img.url!)}
                      >
                        下载
                      </Button>
                    ) : null,
                  ].filter(Boolean)}
                >
                  <div style={{ marginBottom: 8 }}>
                    {img.url ? (
                      <Image
                        src={img.url}
                        alt={img.prompt}
                        style={{ width: "100%", borderRadius: 8 }}
                        preview={{ mask: "预览" }}
                      />
                    ) : img.b64_json ? (
                      <Image
                        src={`data:image/png;base64,${img.b64_json}`}
                        alt={img.prompt}
                        style={{ width: "100%", borderRadius: 8 }}
                        preview={{ mask: "预览" }}
                      />
                    ) : (
                      <div
                        style={{
                          height: 200,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#f5f5f5",
                          borderRadius: 8,
                        }}
                      >
                        <Typography.Text type="secondary">图片加载失败</Typography.Text>
                      </div>
                    )}
                  </div>
                  <Typography.Text
                    style={{
                      fontSize: 12,
                      color: "#666",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={img.prompt}
                  >
                    {img.prompt}
                  </Typography.Text>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
