import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import type { AgentListItem, Therapy } from '../db/types.js';
import {
  AppointmentForm,
  type AppointmentValues,
} from '../components/AppointmentForm.js';
import { Layout } from '../components/Layout.js';
import {
  appointmentState,
  appointmentLabels,
  therapists,
  parseShanghaiSlot,
  formatShanghaiSlot,
} from '../appointments.js';

function validId(raw: string) {
  return /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw));
}
export function appointmentsRouter(
  db: Database.Database,
  now: () => number = Date.now,
) {
  const router = new Hono();
  const agentQuery = db.prepare<[number], AgentListItem>(
    'SELECT id,name,model_type,status FROM agents WHERE id=?',
  );
  const recommended = db.prepare<[number], Therapy>(
    `SELECT DISTINCT t.id,t.name,t.description FROM therapies t JOIN ailment_therapies at ON at.therapy_id=t.id JOIN agent_ailments aa ON aa.ailment_id=at.ailment_id WHERE aa.agent_id=? ORDER BY t.name,t.id`,
  );
  const conflict = db.prepare(
    "SELECT 1 FROM appointments WHERE status='scheduled' AND starts_at=? AND (agent_id=? OR therapist_id=?)",
  );
  const insert = db.prepare(
    'INSERT INTO appointments(agent_id,therapy_id,therapist_id,starts_at) VALUES(?,?,?,?)',
  );
  const create = db.transaction((id: number, values: AppointmentValues) => {
    const startsAt = parseShanghaiSlot(values.date, values.time);
    if (startsAt === undefined || startsAt * 1000 <= now())
      return {
        error: '请选择未来的有效日期，以及整点或半点时间。',
        status: 400 as const,
      };
    if (!therapists.some((t) => t.id === values.therapist_id))
      return { error: '请选择名单中的治疗师。', status: 400 as const };
    if (
      !validId(values.therapy_id) ||
      !recommended.all(id).some((t) => t.id === Number(values.therapy_id))
    )
      return {
        error: '请选择此 Agent 当前匹配的推荐疗法。',
        status: 400 as const,
      };
    if (conflict.get(startsAt, id, values.therapist_id))
      return {
        error: '该 Agent 或治疗师在此时段已有预约，请选择其他时间或治疗师。',
        status: 409 as const,
      };
    return {
      id: Number(
        insert.run(id, Number(values.therapy_id), values.therapist_id, startsAt)
          .lastInsertRowid,
      ),
    };
  });
  router.get('/:id/appointments/new', (c) => {
    const raw = c.req.param('id');
    const agent = validId(raw) ? agentQuery.get(Number(raw)) : undefined;
    if (!agent) return c.notFound();
    return c.html(
      <AppointmentForm agent={agent} therapies={recommended.all(agent.id)} />,
    );
  });
  router.post('/:id/appointments', async (c) => {
    const raw = c.req.param('id');
    const agent = validId(raw) ? agentQuery.get(Number(raw)) : undefined;
    if (!agent) return c.notFound();
    const body = await c.req.parseBody({ all: true });
    const field = (name: string) =>
      typeof body[name] === 'string' ? (body[name] as string) : '';
    const values = {
      therapy_id: field('therapy_id'),
      therapist_id: field('therapist_id'),
      date: field('date'),
      time: field('time'),
    };
    const result = create.immediate(agent.id, values);
    if ('error' in result)
      return c.html(
        <AppointmentForm
          agent={agent}
          therapies={recommended.all(agent.id)}
          values={values}
          error={result.error}
        />,
        result.status,
      );
    return c.redirect(`/agents/${agent.id}/appointments/${result.id}`, 303);
  });
  router.get('/:id/appointments/:appointmentId', (c) => {
    const raw = c.req.param('id'),
      appt = c.req.param('appointmentId');
    if (!validId(raw) || !validId(appt)) return c.notFound();
    const row = db
      .prepare<
        [number, number],
        {
          agent_name: string;
          therapy_name: string;
          therapist_id: string;
          starts_at: number;
          status: string;
        }
      >(
        `SELECT a.name AS agent_name,t.name AS therapy_name,p.therapist_id,p.starts_at,p.status FROM appointments p JOIN agents a ON a.id=p.agent_id JOIN therapies t ON t.id=p.therapy_id WHERE p.id=? AND p.agent_id=?`,
      )
      .get(Number(appt), Number(raw));
    if (!row) return c.notFound();
    return c.html(
      <Layout title="预约确认 · AgentClinic">
        <article class="agent-detail">
          <h2>预约记录</h2>
          <p>Agent：{row.agent_name}</p>
          <p>疗法：{row.therapy_name}</p>
          <p>
            治疗师：{therapists.find((t) => t.id === row.therapist_id)?.name}
          </p>
          <p>时间：{formatShanghaiSlot(row.starts_at)}</p>
          <p>
            状态：
            {
              appointmentLabels[
                appointmentState(row.status, row.starts_at, now())
              ]
            }
          </p>
          <a href={`/agents/${raw}`}>← 返回 Agent 详情</a>
        </article>
      </Layout>,
    );
  });
  return router;
}
