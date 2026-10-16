import type {
  AgentListItem,
  Ailment,
  RecommendedTherapy,
} from '../db/types.js';
import { Layout } from './Layout.js';

type AgentDetailProps = {
  agent: AgentListItem;
  ailments: Ailment[];
  recommendations: RecommendedTherapy[];
};

export function AgentDetail({
  agent,
  ailments,
  recommendations,
}: AgentDetailProps) {
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
        <section aria-labelledby="recommendations-heading">
          <h3 id="recommendations-heading">推荐疗法</h3>
          {recommendations.length === 0 ? (
            <p>
              {ailments.length === 0
                ? '尚未记录病症，暂无推荐疗法'
                : '当前病症暂无匹配的推荐疗法'}
            </p>
          ) : (
            <ul class="therapy-recommendations">
              {recommendations.map((therapy) => (
                <li key={therapy.id}>
                  <h4>{therapy.name}</h4>
                  <p>{therapy.description}</p>
                  <p>
                    匹配病症：
                    {therapy.matchedAilments
                      .map((ailment) => ailment.name)
                      .join('、')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
        {recommendations.length > 0 && (
          <p>
            <a href={`/agents/${agent.id}/appointments/new`}>创建预约</a>
          </p>
        )}
      </article>
      <p>
        <a href="/agents">← 返回 Agent 列表</a>
      </p>
    </Layout>
  );
}
