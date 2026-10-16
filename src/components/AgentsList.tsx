import type { AgentListItem } from '../db/types.js';
import { Layout } from './Layout.js';

type AgentsListProps = {
  agents: AgentListItem[];
};

export function AgentsList({ agents }: AgentsListProps) {
  return (
    <Layout title="Agents · AgentClinic">
      <h2 id="agents-heading">Agents</h2>
      {agents.length === 0 ? (
        <p>暂无 Agent</p>
      ) : (
        <div
          class="agent-table-region"
          role="region"
          aria-label="Agent 列表"
          tabindex={0}
        >
          <table class="agent-table" aria-labelledby="agents-heading">
            <thead>
              <tr>
                <th scope="col">名称</th>
                <th scope="col">模型类型</th>
                <th scope="col">状态</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td>
                    <a href={`/agents/${agent.id}`}>{agent.name}</a>
                  </td>
                  <td>{agent.model_type}</td>
                  <td>{agent.status.replaceAll('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
