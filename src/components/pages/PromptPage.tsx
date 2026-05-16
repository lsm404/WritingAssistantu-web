import { useMemo, useState, type MouseEvent } from "react";
import { App as AntApp, Button, Input, Modal, Popconfirm, Typography } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import type { PromptSlot } from "../../lib/app-ui";

const { TextArea } = Input;
const { Paragraph } = Typography;

function formatCreated(at?: string) {
  if (!at) return "创建于 —";
  try {
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return "创建于 —";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `创建于 ${y}/${m}/${day}`;
  } catch {
    return "创建于 —";
  }
}

type Props = {
  promptSlots: PromptSlot[];
  onSelectPrompt: (id: string) => void;
  onSavePrompt: (id: string, name: string, content: string) => Promise<boolean>;
  onCreatePrompt?: (name: string, content: string) => Promise<boolean>;
  onDeletePrompt?: (id: string) => void | Promise<void>;
};

export function PromptPage({
  promptSlots,
  onSelectPrompt,
  onSavePrompt,
  onCreatePrompt,
  onDeletePrompt,
}: Props) {
  const { message } = AntApp.useApp();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [viewSlot, setViewSlot] = useState<PromptSlot | null>(null);
  const [editSlot, setEditSlot] = useState<PromptSlot | null>(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");

  const librarySlots = useMemo(
    () => promptSlots.filter((s) => s.id !== "prompt-default"),
    [promptSlots],
  );

  const resetCreateForm = () => {
    setNewPromptName("");
    setNewPromptContent("");
  };

  const openEdit = (slot: PromptSlot, event?: MouseEvent) => {
    event?.stopPropagation();
    setEditSlot(slot);
    setEditName(slot.name);
    setEditContent(slot.content);
  };

  const handleCreateModalOk = async () => {
    const name = newPromptName.trim();
    const content = newPromptContent.trim();
    if (!name) {
      message.warning("请输入提示词名称");
      throw new Error("validation");
    }
    if (!content) {
      message.warning("请输入提示词内容");
      throw new Error("validation");
    }
    if (!onCreatePrompt) return;

    const ok = await onCreatePrompt(name, content);
    if (!ok) {
      throw new Error("save-failed");
    }
    setCreateModalOpen(false);
  };

  const handleEditModalOk = async () => {
    if (!editSlot) return;
    const name = editName.trim();
    const content = editContent.trim();
    if (!name) {
      message.warning("请输入提示词名称");
      throw new Error("validation");
    }
    if (!content) {
      message.warning("请输入提示词内容");
      throw new Error("validation");
    }
    const ok = await onSavePrompt(editSlot.id, name, content);
    if (!ok) {
      throw new Error("save-failed");
    }
    setEditSlot(null);
  };

  return (
    <div className="prompt-library-wrap">
      <div className="ui-card prompt-library-toolbar">
        <div className="prompt-library-toolbar-text">
          <div className="card-title">提示词词库</div>
        </div>
        <div className="prompt-library-toolbar-actions">
          <Button type="primary" onClick={() => setCreateModalOpen(true)} icon={<PlusOutlined />}>
            新增提示词
          </Button>
        </div>
      </div>

      {librarySlots.length === 0 ? (
        <div className="prompt-library-empty">
          <div className="prompt-library-empty-icon-wrap">
            <FileTextOutlined className="prompt-library-empty-icon" aria-hidden />
          </div>
          <div className="prompt-library-empty-title">暂无提示词</div>
          <p className="prompt-library-empty-desc">点击右上角「新增提示词」创建第一条，或在工作中随时切换通用模板。</p>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            新增提示词
          </Button>
        </div>
      ) : (
        <div className="prompt-card-grid">
          {librarySlots.map((slot) => (
            <div
              key={slot.id}
              role="button"
              tabIndex={0}
              className="prompt-library-card"
              onClick={() => onSelectPrompt(slot.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectPrompt(slot.id);
                }
              }}
            >
              <div className="prompt-library-card-body">
                <div className="prompt-library-card-title">{slot.name}</div>
                <div className="prompt-library-card-meta-row">
                  <span>{slot.content.length.toLocaleString()} 字</span>
                  <span className="prompt-library-card-meta-dot" aria-hidden />
                  <span>{formatCreated(slot.createdAt)}</span>
                </div>
              </div>

              <div className="prompt-library-card-footer" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="prompt-library-card-view" onClick={() => setViewSlot(slot)}>
                  <EyeOutlined />
                  查看
                </button>
                <div className="prompt-library-card-icon-actions">
                  <button
                    type="button"
                    className="prompt-library-card-icon-btn"
                    title="编辑"
                    aria-label="编辑"
                    onClick={(e) => openEdit(slot, e)}
                  >
                    <EditOutlined />
                  </button>
                  <Popconfirm
                    title="删除提示词"
                    description="确定要删除这条提示词吗？"
                    onConfirm={() => void onDeletePrompt?.(slot.id)}
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
        title="新增提示词"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreateModalOk}
        okText="保存"
        cancelText="取消"
        width={520}
        destroyOnHidden
        afterClose={resetCreateForm}
      >
        <div className="form-item">
          <div className="form-item-label">提示词名称</div>
          <Input
            value={newPromptName}
            onChange={(e) => setNewPromptName(e.target.value)}
            placeholder="例如：小红书爆款"
            maxLength={16}
          />
        </div>
        <div className="form-item" style={{ marginTop: 16 }}>
          <div className="form-item-label">提示词内容</div>
          <TextArea
            value={newPromptContent}
            onChange={(e) => setNewPromptContent(e.target.value)}
            autoSize={{ minRows: 8, maxRows: 16 }}
            placeholder="在这里输入提示词的内容"
          />
        </div>
      </Modal>

      <Modal
        title={viewSlot ? `查看：${viewSlot.name}` : "查看"}
        open={!!viewSlot}
        onCancel={() => setViewSlot(null)}
        footer={
          <Button type="primary" onClick={() => setViewSlot(null)}>
            关闭
          </Button>
        }
        width={640}
        destroyOnHidden
      >
        {viewSlot ? (
          <Paragraph className="prompt-view-modal-content">{viewSlot.content}</Paragraph>
        ) : null}
      </Modal>

      <Modal
        title={editSlot?.id === "prompt-default" ? "编辑通用模板" : "编辑提示词"}
        open={!!editSlot}
        onCancel={() => setEditSlot(null)}
        onOk={handleEditModalOk}
        okText="保存"
        cancelText="取消"
        width={520}
        destroyOnHidden
        afterClose={() => {
          setEditName("");
          setEditContent("");
        }}
      >
        {editSlot ? (
          <>
            <div className="form-item">
              <div className="form-item-label">提示词名称</div>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={16}
                disabled={editSlot.id === "prompt-default"}
              />
            </div>
            <div className="form-item" style={{ marginTop: 16 }}>
              <div className="form-item-label">提示词内容</div>
              <TextArea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoSize={{ minRows: 10, maxRows: 18 }}
              />
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
