import { useState, useEffect } from "react";
import { Table, Tag, Typography, Card, Space, message, Statistic, Row, Col } from "antd";
import { UserOutlined, CrownOutlined, CalendarOutlined, TeamOutlined } from "@ant-design/icons";
import type { AuthUser, UserMembership } from "../../lib/types";

const { Title, Text } = Typography;

interface AgentUser {
  id: string;
  email: string;
  displayName: string;
  status: string;
  createdAt: string;
  membership: UserMembership | null;
}

interface Props {
  authToken: string;
  baseUrl: string;
}

export function AgentDashboardPage({ authToken, baseUrl }: Props) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AgentUser[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/agent/my-users`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const columns = [
    {
      title: "创作者",
      key: "user",
      render: (record: AgentUser) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.displayName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
        </Space>
      ),
    },
    {
      title: "会员状态",
      key: "membership",
      render: (record: AgentUser) => {
        const isActive = record.membership?.isActive;
        return (
          <Tag color={isActive ? "gold" : "default"} icon={isActive ? <CrownOutlined /> : null}>
            {isActive ? record.membership?.plan.name : "普通用户"}
          </Tag>
        );
      },
    },
    {
      title: "注册时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (val: string) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: "#94a3b8" }} />
          <Text type="secondary">{new Date(val).toLocaleDateString()}</Text>
        </Space>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "active" ? "green" : "red"}>
          {status === "active" ? "正常" : "禁用"}
        </Tag>
      ),
    },
  ];

  const activeVipCount = users.filter(u => u.membership?.isActive).length;

  return (
    <div className="page-container agent-dashboard">
      <div className="page-content" style={{ padding: '24px' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={3}>代理管理中心</Title>
          <Text type="secondary">查看并管理通过您的注册码加入的创作者。</Text>
        </div>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card bordered={false} className="premium-card">
              <Statistic
                title="已邀请用户"
                value={users.length}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#7c3aed' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false} className="premium-card">
              <Statistic
                title="活跃会员"
                value={activeVipCount}
                prefix={<CrownOutlined />}
                valueStyle={{ color: '#d97706' }}
              />
            </Card>
          </Col>
        </Row>

        <Card bordered={false} className="premium-card">
          <Table
            loading={loading}
            dataSource={users}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </div>
    </div>
  );
}
