import type { AgentListItem, Therapy } from '../db/types.js';
import { therapists } from '../appointments.js';
import { Layout } from './Layout.js';
export type AppointmentValues = {
  therapy_id: string;
  therapist_id: string;
  date: string;
  time: string;
};
type AppointmentFormProps = {
  agent: AgentListItem;
  therapies: Therapy[];
  values?: AppointmentValues;
  error?: string;
};
export function AppointmentForm({
  agent,
  therapies,
  values,
  error,
}: AppointmentFormProps) {
  return (
    <Layout title={`预约 ${agent.name} · AgentClinic`}>
      <article class="agent-detail">
        <h2>为 {agent.name} 创建预约</h2>
        <p>
          时间使用 Asia/Shanghai（北京时间）。每次 30 分钟，从整点或半点开始。
        </p>
        {error && <p role="alert">{error}</p>}
        {therapies.length === 0 ? (
          <p>暂无匹配的推荐疗法，暂时无法预约。请返回详情查看已记录病症。</p>
        ) : (
          <form method="post" action={`/agents/${agent.id}/appointments`}>
            <label for="therapy_id">推荐疗法</label>
            <select id="therapy_id" name="therapy_id" required>
              <option value="">请选择疗法</option>
              {therapies.map((t) => (
                <option
                  value={t.id}
                  selected={values?.therapy_id === String(t.id)}
                >
                  {t.name}
                </option>
              ))}
            </select>
            <label for="therapist_id">治疗师</label>
            <select id="therapist_id" name="therapist_id" required>
              <option value="">请选择治疗师</option>
              {therapists.map((t) => (
                <option value={t.id} selected={values?.therapist_id === t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <label for="date">日期（北京时间）</label>
            <input
              id="date"
              name="date"
              type="date"
              required
              value={values?.date}
            />
            <label for="time">开始时间（北京时间）</label>
            <input
              id="time"
              name="time"
              type="time"
              step="1800"
              required
              value={values?.time}
            />
            <button type="submit">确认预约</button>
          </form>
        )}
        <a href={`/agents/${agent.id}`}>← 返回 Agent 详情</a>
      </article>
    </Layout>
  );
}
