import ReactMarkdown from "react-markdown";

type Props = {
  open: boolean;
  title: string;
  accountName: string;
  markdown: string;
  onClose: () => void;
};

export function WechatPreviewModal({ open, title, accountName, markdown, onClose }: Props) {
  if (!open) return null;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="phone-preview-overlay" onClick={onClose}>
      <div className="phone-preview-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="phone-frame">
          {/* 刘海 */}
          <div className="phone-notch" />

          {/* 状态栏 */}
          <div className="phone-status-bar">
            <span className="phone-time">{timeStr}</span>
            <div className="phone-status-icons">
              <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
                <rect x="0" y="4" width="3" height="7" rx="0.5" opacity="0.4"/>
                <rect x="4" y="2.5" width="3" height="8.5" rx="0.5" opacity="0.6"/>
                <rect x="8" y="1" width="3" height="10" rx="0.5" opacity="0.8"/>
                <rect x="12" y="0" width="3" height="11" rx="0.5"/>
              </svg>
              <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
                <path d="M8 2.4C5.6 2.4 3.5 3.4 2 5L0.5 3.5C2.4 1.3 5 0 8 0s5.6 1.3 7.5 3.5L14 5c-1.5-1.6-3.6-2.6-6-2.6z" opacity="0.4"/>
                <path d="M8 5.2c-1.7 0-3.2.7-4.3 1.8L2.2 5.5C3.7 3.9 5.7 3 8 3s4.3.9 5.8 2.5L12.3 7c-1.1-1.1-2.6-1.8-4.3-1.8z" opacity="0.7"/>
                <path d="M8 8c-.9 0-1.7.4-2.3 1L8 12l2.3-3c-.6-.6-1.4-1-2.3-1z"/>
              </svg>
              <div className="phone-battery">
                <div className="phone-battery-body">
                  <div className="phone-battery-fill" />
                </div>
                <div className="phone-battery-cap" />
              </div>
            </div>
          </div>

          {/* 顶部导航 */}
          <div className="phone-nav-bar">
            <svg className="phone-nav-back" width="10" height="16" viewBox="0 0 10 16" fill="none">
              <path d="M8.5 1L1.5 8L8.5 15" stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="phone-nav-title">公众号预览</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="4" cy="10" r="1.5" fill="#333"/>
              <circle cx="10" cy="10" r="1.5" fill="#333"/>
              <circle cx="16" cy="10" r="1.5" fill="#333"/>
            </svg>
          </div>

          {/* 文章内容区 */}
          <div className="phone-article-scroll">
            <div className="phone-article-body">
              {/* 标题 */}
              {title && <h1 className="phone-article-title">{title}</h1>}

              {/* 来源行 */}
              <div className="phone-article-meta">
                <span className="phone-original-badge">原创</span>
                <span className="phone-account-name">{accountName || "公众号"}</span>
                <span className="phone-meta-dot">·</span>
                <span className="phone-meta-date">
                  {now.getFullYear()}/{String(now.getMonth() + 1).padStart(2, "0")}/{String(now.getDate()).padStart(2, "0")}
                </span>
              </div>

              {/* 文章正文（Markdown 渲染） */}
              <div className="phone-article-content">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
                    h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
                    h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
                    p: ({ children }) => <p className="md-p">{children}</p>,
                    img: ({ src, alt }) => (
                      <img
                        className="md-img"
                        src={src}
                        alt={alt}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ),
                    strong: ({ children }) => <strong className="md-strong">{children}</strong>,
                    blockquote: ({ children }) => <blockquote className="md-blockquote">{children}</blockquote>,
                    ul: ({ children }) => <ul className="md-ul">{children}</ul>,
                    ol: ({ children }) => <ol className="md-ol">{children}</ol>,
                    li: ({ children }) => <li className="md-li">{children}</li>,
                    hr: () => <hr className="md-hr" />,
                  }}
                >
                  {/* 过滤掉第一个 h1 标题（已在上方单独展示） */}
                  {markdown.replace(/^#\s+.+\n?/, "")}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="phone-bottom-bar">
            <div className="phone-bottom-left">
              <div className="phone-avatar-small">
                <span>{(accountName || "号")[0]}</span>
              </div>
              <span className="phone-bottom-account">{accountName || "公众号"}</span>
            </div>
            <div className="phone-bottom-actions">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.6">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.6">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.6">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.6">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
          </div>

          {/* 底部 Home 条 */}
          <div className="phone-home-bar" />
        </div>

        {/* 关闭按钮 */}
        <button className="phone-preview-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}
