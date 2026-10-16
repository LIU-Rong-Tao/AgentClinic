import { Layout } from './Layout.js';
import {
  appointmentState,
  appointmentLabels,
  formatShanghaiSlot,
  therapists,
} from '../appointments.js';
export type DashboardAppointment = {
  id: number;
  agent_id: number;
  agent_name: string;
  therapy_name: string;
  therapist_id: string;
  starts_at: number;
  status: 'scheduled' | 'completed' | 'cancelled';
};
type DashboardProps = {
  nowMs: number;
  stats: { agents: number; ailments: number; scheduled: number };
  appointments: DashboardAppointment[];
  view: 'scheduled' | 'all';
  updated?: DashboardAppointment;
};
export function Dashboard({
  stats,
  appointments,
  view,
  updated,
  nowMs,
}: DashboardProps) {
  return (
    <Layout title="员工仪表盘 · AgentClinic">
      <h2>员工仪表盘</h2>
      <p>
        <a href="/dashboard/feedback">查看访客反馈</a>
      </p>
      <p>
        Agent 总数：{stats.agents} · 病症种类数：{stats.ailments} · 有效预约数：
        {stats.scheduled}
      </p>
      {updated && (
        <p role="status">
          预约编号 #{updated.id} 当前状态：
          {
            appointmentLabels[
              appointmentState(updated.status, updated.starts_at, nowMs)
            ]
          }
        </p>
      )}
      <p>
        有效预约包括待开始和进行中。编号仅标识记录，不是预约数量；取消历史保留。状态按当前时间计算，刷新页面可更新。
      </p>
      <nav aria-label="预约筛选">
        <a
          href="/dashboard"
          aria-current={view === 'scheduled' ? 'page' : undefined}
        >
          有效预约
        </a>
        <a
          href="/dashboard?view=all"
          aria-current={view === 'all' ? 'page' : undefined}
        >
          全部记录
        </a>
      </nav>
      {appointments.length === 0 ? (
        <p>{view === 'all' ? '暂无预约记录' : '暂无有效预约'}</p>
      ) : (
        <div
          class="dashboard-table-region"
          role="region"
          aria-label="预约列表"
          tabIndex={0}
        >
          <table class="dashboard-table">
            <thead>
              <tr>
                <th scope="col">预约编号 / Agent</th>
                <th scope="col">疗法 / 治疗师</th>
                <th scope="col">时间</th>
                <th scope="col">状态 / 操作</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr>
                  <td>
                    预约编号 #{a.id}{' '}
                    <a href={`/agents/${a.agent_id}/appointments/${a.id}`}>
                      {a.agent_name}
                    </a>
                  </td>
                  <td>
                    {a.therapy_name}
                    <br />
                    {therapists.find((t) => t.id === a.therapist_id)?.name}
                  </td>
                  <td>{formatShanghaiSlot(a.starts_at)}</td>
                  <td>
                    {
                      appointmentLabels[
                        appointmentState(a.status, a.starts_at, nowMs)
                      ]
                    }
                    {appointmentState(a.status, a.starts_at, nowMs) ===
                      'scheduled' && (
                      <div class="appointment-actions">
                        <a
                          href={`/dashboard/appointments/${a.id}/status?target=cancelled&view=${view}`}
                        >
                          取消预约 #{a.id}
                        </a>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
type StatusConfirmationProps = {
  appointment: DashboardAppointment;
  target: 'cancelled';
  nowMs: number;
  view: 'scheduled' | 'all';
  conflict?: boolean;
};
export function StatusConfirmation({
  appointment: a,
  target,
  view,
  conflict,
  nowMs,
}: StatusConfirmationProps) {
  return (
    <Layout title="确认预约状态 · AgentClinic">
      <article class="agent-detail">
        <h2>确认取消预约 #{a.id}</h2>
        <p>Agent：{a.agent_name}</p>
        <p>疗法：{a.therapy_name}</p>
        <p>治疗师：{therapists.find((t) => t.id === a.therapist_id)?.name}</p>
        <p>时间：{formatShanghaiSlot(a.starts_at)}</p>
        <p>
          当前状态：
          {appointmentLabels[appointmentState(a.status, a.starts_at, nowMs)]}
        </p>
        <p>
          目标状态：已取消。开始时间到达后不能取消；取消后不能恢复，也不会改变
          Agent 的状态或已记录病症。
        </p>
        {conflict ? (
          <p role="alert">
            此预约已开始、已结束或已取消，不能再取消。本次没有修改记录。
          </p>
        ) : (
          <form method="post" action={`/dashboard/appointments/${a.id}/status`}>
            <input type="hidden" name="target" value={target} />
            <input type="hidden" name="view" value={view} />
            <button type="submit">确认取消</button>
          </form>
        )}
        <a href={view === 'all' ? '/dashboard?view=all' : '/dashboard'}>
          返回仪表盘，不执行操作
        </a>
      </article>
    </Layout>
  );
}
