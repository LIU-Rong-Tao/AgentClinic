import type { AgentListItem, Ailment } from '../db/types.js';
import { Layout } from './Layout.js';

type AgentDetailProps = {
  agent: AgentListItem;
  ailments: Ailment[];
};

export function AgentDetail({ agent, ailments }: AgentDetailProps) {
  return (
    <Layout title={`${agent.name} · AgentClinic`}>
      <article class="agent-detail">
        <h2>{agent.name}</h2>
        <p>
          <strong>模型类型：</strong>
          {agent.model_type}
        </p>
        <p>
          <strong>状态：</strong>
          {agent.status.replaceAll('_', ' ')}
        </p>
        <h3>已记录病症</h3>
        {ailments.length === 0 ? (
          <p>暂无已记录病症</p>
        ) : (
          <ul>
            {ailments.map((ailment) => (
              <li key={ailment.id}>
                <strong>{ailment.name}</strong> — {ailment.description}
              </li>
            ))}
          </ul>
        )}
      </article>
      <p>
        <a href="/agents">← 返回 Agent 列表</a>
      </p>
    </Layout>
  );
}
